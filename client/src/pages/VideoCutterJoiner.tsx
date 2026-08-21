import { useEffect, useRef, useState } from "react";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import StoreLayout from "@/components/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowDown, Film, Loader2, Plus, Scissors, SlidersHorizontal, Trash2, Upload, WandSparkles } from "lucide-react";

type VideoItem = { id: string; file: File; url: string; duration: number; width: number; height: number };

const MAX_FILE_SIZE = 300 * 1024 * 1024;
const MAX_FILES = 8;
const SERVER_TRANSCODE_MAX_BYTES = 20 * 1024 * 1024;
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const total = Math.max(0, Math.floor(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function explainVideoError(action: string, error: unknown, logs: string[]) {
  const detail = `${String(error ?? "")} ${logs.join(" ")}`.toLowerCase();
  if (detail.includes("decoder") || detail.includes("unsupported codec")) return `Không thể ${action}: trình duyệt không có decoder cho codec của video này. Hãy dùng Xử lý trên máy chủ.`;
  if (detail.includes("encoder") || detail.includes("libx264")) return `Không thể ${action}: trình duyệt không tải được bộ mã hóa H.264.`;
  if (detail.includes("memory") || detail.includes("allocation") || detail.includes("abort")) return `Không thể ${action}: trình duyệt thiếu bộ nhớ cho tệp video này.`;
  return `Không thể ${action} video trên trình duyệt. Với tệp tối đa 20 MB, hãy dùng Xử lý trên máy chủ.`;
}

export default function VideoCutterJoiner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffmpegLogs = useRef<string[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [compression, setCompression] = useState<"balanced" | "small" | "tiny">("balanced");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputName, setOutputName] = useState("dhl-video-result.mp4");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Sẵn sàng xử lý trong trình duyệt");
  const [diagnostic, setDiagnostic] = useState("");
  const prepareServerUpload = trpc.videoTools.prepareServerUpload.useMutation();
  const serverTranscode = trpc.videoTools.transcodeServer.useMutation();
  const active = videos.find(item => item.id === activeId) ?? videos[0];

  useEffect(() => {
    if (!active) return;
    setStart(0);
    setEnd(active.duration);
  }, [activeId, active?.duration]);

  useEffect(() => () => {
    videos.forEach(item => URL.revokeObjectURL(item.url));
  }, []);

  const discardOutput = () => {
    if (outputUrl.startsWith("blob:")) URL.revokeObjectURL(outputUrl);
    setOutputUrl("");
  };

  const setOutput = (blob: Blob, name: string, nextStatus: string) => {
    discardOutput();
    setOutputUrl(URL.createObjectURL(blob));
    setOutputName(name);
    setStatus(nextStatus);
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted: VideoItem[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("video/")) { toast.error(`${file.name} không phải tệp video.`); continue; }
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} vượt giới hạn 300 MB.`); continue; }
      if (videos.length + accepted.length >= MAX_FILES) { toast.error(`Tối đa ${MAX_FILES} video mỗi lần.`); break; }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = URL.createObjectURL(file);
      const item: VideoItem = { id, file, url, duration: 0, width: 0, height: 0 };
      accepted.push(item);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => setVideos(current => current.map(entry => entry.id === id ? { ...entry, duration: probe.duration || 0, width: probe.videoWidth, height: probe.videoHeight } : entry));
      probe.src = url;
    }
    if (accepted.length) {
      setVideos(current => [...current, ...accepted]);
      setActiveId(current => current ?? accepted[0].id);
      discardOutput();
      setStatus(`${videos.length + accepted.length} video đã sẵn sàng`);
    }
  };

  const removeVideo = (id: string) => {
    setVideos(current => {
      const target = current.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const next = current.filter(item => item.id !== id);
      setActiveId(currentId => currentId === id ? (next[0]?.id ?? null) : currentId);
      return next;
    });
    discardOutput();
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress: value }) => setProgress(Math.round(value * 100)));
    ffmpeg.on("log", ({ message }) => {
      if (/error|invalid|unknown|decoder|encoder|failed|memory|unsupported/i.test(message)) ffmpegLogs.current = [...ffmpegLogs.current, message].slice(-5);
    });
    setStatus("Đang tải bộ xử lý video lần đầu…");
    await ffmpeg.load({ coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm") });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const browserProcess = async (action: "trim" | "compress" | "join") => {
    if (!active && action !== "join") return toast.error("Hãy chọn một video trước.");
    if (action === "join" && videos.length < 2) return toast.error("Hãy thêm ít nhất 2 video để nối.");
    if (action !== "join" && (!active || active.duration <= 0)) return toast.error("Video chưa đọc được thời lượng.");
    ffmpegLogs.current = []; setDiagnostic(""); setBusy(true); setProgress(0);
    try {
      const ffmpeg = await loadFFmpeg();
      if (action === "trim" && active) {
        const safeStart = Math.max(0, Math.min(start, active.duration - 0.05));
        const safeEnd = Math.max(safeStart + 0.05, Math.min(end || active.duration, active.duration));
        const extension = active.file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp4";
        const input = `trim-${active.id}.${extension}`;
        await ffmpeg.writeFile(input, await fetchFile(active.file));
        setStatus("Đang cắt video…");
        await ffmpeg.exec(["-ss", safeStart.toFixed(3), "-i", input, "-t", (safeEnd - safeStart).toFixed(3), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", "trimmed.mp4"]);
        const data = await ffmpeg.readFile("trimmed.mp4");
        setOutput(new Blob([new Uint8Array(data as Uint8Array).buffer as ArrayBuffer], { type: "video/mp4" }), "dhl-video-trimmed.mp4", `Đã cắt ${formatTime(safeStart)} – ${formatTime(safeEnd)}`);
      }
      if (action === "compress" && active) {
        const settings = compression === "tiny" ? { crf: "32", preset: "veryfast", audio: "96k" } : compression === "small" ? { crf: "28", preset: "fast", audio: "128k" } : { crf: "24", preset: "fast", audio: "160k" };
        const extension = active.file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp4";
        const input = `compress-${active.id}.${extension}`;
        await ffmpeg.writeFile(input, await fetchFile(active.file));
        setStatus("Đang nén video…");
        await ffmpeg.exec(["-i", input, "-c:v", "libx264", "-crf", settings.crf, "-preset", settings.preset, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", settings.audio, "-movflags", "+faststart", "compressed.mp4"]);
        const data = await ffmpeg.readFile("compressed.mp4");
        setOutput(new Blob([new Uint8Array(data as Uint8Array).buffer as ArrayBuffer], { type: "video/mp4" }), "dhl-video-compressed.mp4", "Đã nén video.");
      }
      if (action === "join") {
        const entries: string[] = [];
        for (let index = 0; index < videos.length; index += 1) {
          const extension = videos[index].file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp4";
          const fileName = `join-${index}.${extension}`;
          await ffmpeg.writeFile(fileName, await fetchFile(videos[index].file));
          entries.push(`file '${fileName}'`);
        }
        await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(entries.join("\n")));
        setStatus("Đang nối các video…");
        await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", "joined.mp4"]);
        const data = await ffmpeg.readFile("joined.mp4");
        setOutput(new Blob([new Uint8Array(data as Uint8Array).buffer as ArrayBuffer], { type: "video/mp4" }), "dhl-video-joined.mp4", `Đã nối ${videos.length} video.`);
      }
      toast.success("Đã xử lý video, bạn có thể tải kết quả.");
    } catch (error) {
      const message = explainVideoError(action === "trim" ? "cắt" : action === "compress" ? "nén" : "nối", error, ffmpegLogs.current);
      setDiagnostic(ffmpegLogs.current.join("\n") || String(error));
      setStatus(message);
      toast.error(message);
    } finally { setBusy(false); }
  };

  const runServerTranscode = async () => {
    if (!active) return toast.error("Hãy chọn một video trước.");
    if (active.file.size > SERVER_TRANSCODE_MAX_BYTES) return toast.error("Xử lý máy chủ hiện hỗ trợ video tối đa 20 MB.");
    setBusy(true); setProgress(0); setDiagnostic(""); setStatus("Đang chuẩn bị tải video trực tiếp…");
    try {
      const mimeType = active.file.type || "video/mp4";
      const upload = await prepareServerUpload.mutateAsync({ fileName: active.file.name, mimeType, size: active.file.size });
      setStatus("Đang tải trực tiếp video lên kho tạm…");
      const uploadResponse = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: active.file });
      if (!uploadResponse.ok) throw new Error("Không thể tải video lên kho tạm. Vui lòng thử lại.");
      setStatus("Đã tải video, đang chuyển đổi trên máy chủ…");
      const result = await serverTranscode.mutateAsync({ fileName: active.file.name, mimeType, key: upload.key });
      discardOutput();
      setOutputUrl(result.url);
      setOutputName(result.fileName);
      setStatus(`Đã chuyển đổi trên máy chủ · ${Math.max(1, Math.round(result.size / 1024 / 1024))} MB`);
      toast.success("Đã chuyển đổi trên máy chủ. Bạn có thể tải video kết quả.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Máy chủ không thể chuyển đổi video này.";
      setStatus(message); toast.error(message);
    } finally { setBusy(false); }
  };

  const selectionDuration = active ? Math.max(0, (end || active.duration) - start) : 0;
  const serverEligible = Boolean(active && active.file.size <= SERVER_TRANSCODE_MAX_BYTES);

  return <StoreLayout><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-6 shadow-sm sm:p-9">
      <Badge className="bg-cyan-100 text-cyan-800"><Film className="mr-1 h-3.5 w-3.5" />DHL Stores · Công cụ</Badge>
      <h1 className="mt-4 font-display text-4xl font-black uppercase leading-none text-slate-950 sm:text-6xl">Cắt & nối video</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">Cắt, nối, nén video trên thiết bị. Với codec trình duyệt không hỗ trợ, dùng xử lý FFmpeg phía máy chủ cho tệp tối đa 20 MB.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Thêm video</Button>
        <Button variant="outline" onClick={() => browserProcess("trim")} disabled={busy || !active}><Scissors className="mr-2 h-4 w-4" />Cắt đoạn đang chọn</Button>
        <Button variant="outline" onClick={() => browserProcess("join")} disabled={busy || videos.length < 2}><WandSparkles className="mr-2 h-4 w-4" />Nối {videos.length} video</Button>
        <Button variant="outline" onClick={() => browserProcess("compress")} disabled={busy || !active}><SlidersHorizontal className="mr-2 h-4 w-4" />Nén video</Button>
        <Button variant="outline" onClick={runServerTranscode} disabled={busy || !serverEligible || prepareServerUpload.isPending || serverTranscode.isPending}><Film className="mr-2 h-4 w-4" />Xử lý máy chủ (≤20 MB)</Button>
        <Button onClick={() => { if (!outputUrl) return; const link = document.createElement("a"); link.href = outputUrl; link.download = outputName; link.click(); }} disabled={!outputUrl || busy} className={outputUrl ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}><ArrowDown className="mr-2 h-4 w-4" />{outputUrl ? "Tải video kết quả" : "Tải video sau khi xử lý"}</Button>
        <input ref={inputRef} type="file" hidden multiple accept="video/*" onChange={event => { addFiles(event.target.files); event.currentTarget.value = ""; }} />
      </div>
    </section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card><CardHeader><CardTitle>Danh sách video</CardTitle></CardHeader><CardContent className="space-y-3">
        <button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-xl border border-dashed border-cyan-300 bg-cyan-50 p-4 text-center text-sm text-slate-600 hover:bg-cyan-100"><Plus className="mx-auto mb-2 h-5 w-5 text-cyan-700" />Tối đa 8 video · mỗi tệp 300 MB</button>
        {videos.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Chưa có video. Bấm “Thêm video” để bắt đầu.</p>}
        {videos.map((item, index) => <button type="button" key={item.id} onClick={() => setActiveId(item.id)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${active?.id === item.id ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100" : "border-slate-200 hover:border-cyan-300"}`}><video src={item.url} muted className="h-14 w-20 rounded-lg bg-slate-900 object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{index + 1}. {item.file.name}</strong><span className="text-xs text-slate-500">{formatTime(item.duration)} · {item.width || "?"}×{item.height || "?"}</span></span><Trash2 className="h-4 w-4 shrink-0 text-slate-400 hover:text-red-600" onClick={event => { event.stopPropagation(); removeVideo(item.id); }} /></button>)}
      </CardContent></Card>
      <div className="space-y-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-cyan-600" />Xem trước và cắt đoạn</CardTitle></CardHeader><CardContent>
          {active ? <div className="space-y-5"><video key={active.id} src={active.url} controls className="max-h-[460px] w-full rounded-2xl bg-slate-950" />
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-cyan-800">Timeline cắt nhanh</p><p className="text-xs text-slate-500">Kéo hai đầu để chọn đoạn cần giữ</p></div><strong className="rounded-full bg-white px-3 py-1 text-xs text-cyan-800">{formatTime(selectionDuration)}</strong></div><div className="relative h-10"><div className="absolute inset-x-0 top-4 h-2 rounded-full bg-slate-200" /><div className="absolute top-4 h-2 rounded-full bg-cyan-500" style={{ left: `${active.duration ? (start / active.duration) * 100 : 0}%`, right: `${active.duration ? 100 - ((end || active.duration) / active.duration) * 100 : 0}%` }} /><input aria-label="Thời điểm bắt đầu" type="range" min={0} max={active.duration || 1} step={0.1} value={start} onChange={event => setStart(Math.min(Number(event.target.value), Math.max(0, (end || active.duration) - 0.1)))} className="pointer-events-none absolute inset-x-0 top-1 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-cyan-700" /><input aria-label="Thời điểm kết thúc" type="range" min={0} max={active.duration || 1} step={0.1} value={end || active.duration} onChange={event => setEnd(Math.max(Number(event.target.value), start + 0.1))} className="pointer-events-none absolute inset-x-0 top-1 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-cyan-700" /></div><div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500"><span>{formatTime(start)}</span><span>{formatTime(end || active.duration)} / {formatTime(active.duration)}</span></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label>Thời điểm bắt đầu (giây)</Label><Input type="number" min={0} max={active.duration} step={0.1} value={start} onChange={event => setStart(Math.min(Number(event.target.value), Math.max(0, (end || active.duration) - 0.1)))} /></div><div><Label>Thời điểm kết thúc (giây)</Label><Input type="number" min={0} max={active.duration} step={0.1} value={end || active.duration} onChange={event => setEnd(Math.max(Number(event.target.value), start + 0.1))} /></div></div>
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-end"><div><Label>Mức nén</Label><select value={compression} onChange={event => setCompression(event.target.value as "balanced" | "small" | "tiny")} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"><option value="balanced">Cân bằng · giữ chất lượng tốt</option><option value="small">Nhẹ · giảm dung lượng rõ</option><option value="tiny">Nhẹ nhất · ưu tiên gửi nhanh</option></select></div><Button variant="outline" onClick={() => browserProcess("compress")} disabled={busy}><SlidersHorizontal className="mr-2 h-4 w-4" />Nén video này</Button></div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><p className="truncate font-semibold text-slate-800">{active.file.name}</p><p className="mt-1 text-xs text-slate-500">{active.file.type || "Định dạng không xác định"} · {Math.max(1, Math.round(active.file.size / 1024 / 1024))} MB</p><p className="mt-2 text-xs leading-relaxed text-slate-500">Video không xử lý được trong trình duyệt? Dùng <strong>Xử lý máy chủ</strong> cho tệp tối đa 20 MB.</p></div>
          </div> : <div className="grid min-h-[320px] place-items-center rounded-2xl bg-slate-100 text-center text-slate-500"><span><Film className="mx-auto mb-3 h-10 w-10" />Thêm video để xem trước</span></div>}
        </CardContent></Card>
        {outputUrl && <Card><CardHeader><CardTitle>Kết quả</CardTitle></CardHeader><CardContent className="space-y-4"><video src={outputUrl} controls className="max-h-[420px] w-full rounded-2xl bg-slate-950" /><div className="flex flex-col gap-2 sm:flex-row"><Input value={outputName} onChange={event => setOutputName(event.target.value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "dhl-video-result.mp4")} /><a href={outputUrl} download={outputName} className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"><ArrowDown className="mr-2 h-4 w-4" />Tải video kết quả</a></div></CardContent></Card>}
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><div className="flex items-center gap-3">{busy && <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />}<span>{status}{busy && ` · ${progress}%`}</span></div>{diagnostic && <details className="rounded-lg border border-red-200 bg-red-50 p-3"><summary className="cursor-pointer text-xs font-bold text-red-800">Chi tiết chẩn đoán</summary><pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-red-900">{diagnostic}</pre></details>}</div>
      </div>
    </div>
  </main></StoreLayout>;
}
