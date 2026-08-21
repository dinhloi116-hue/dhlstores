import { useEffect, useRef, useState } from "react";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import StoreLayout from "@/components/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowDown, Film, Loader2, Plus, Scissors, SlidersHorizontal, Trash2, Upload, WandSparkles } from "lucide-react";

type VideoItem = { id: string; file: File; url: string; duration: number; width: number; height: number };

const MAX_FILE_SIZE = 300 * 1024 * 1024;
const MAX_FILES = 8;
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const total = Math.max(0, Math.floor(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function explainVideoError(action: string, error: unknown) {
  const detail = String(error ?? "").toLowerCase();
  if (detail.includes("codec") || detail.includes("decoder") || detail.includes("invalid data") || detail.includes("unsupported")) {
    return `Không thể ${action}: codec không tương thích. Hãy đổi video sang MP4 H.264/AAC rồi thử lại.`;
  }
  return `Không thể ${action} video trên trình duyệt. Hãy thử tệp MP4 H.264/AAC hoặc tệp nhỏ hơn.`;
}

export default function VideoCutterJoiner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
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

  const active = videos.find((item) => item.id === activeId) ?? videos[0];

  useEffect(() => {
    if (!active) return;
    setStart(0);
    setEnd(active.duration);
  }, [activeId, active?.duration]);

  useEffect(() => () => {
    videos.forEach((item) => URL.revokeObjectURL(item.url));
    if (outputUrl) URL.revokeObjectURL(outputUrl);
  }, []);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const accepted: VideoItem[] = [];
    for (const file of incoming) {
      if (!file.type.startsWith("video/")) { toast.error(`${file.name} không phải tệp video.`); continue; }
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} vượt giới hạn 300 MB.`); continue; }
      if (videos.length + accepted.length >= MAX_FILES) { toast.error(`Tối đa ${MAX_FILES} video mỗi lần.`); break; }
      const url = URL.createObjectURL(file);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: VideoItem = { id, file, url, duration: 0, width: 0, height: 0 };
      accepted.push(item);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => setVideos((current) => current.map((entry) => entry.id === id ? { ...entry, duration: probe.duration || 0, width: probe.videoWidth, height: probe.videoHeight } : entry));
      probe.src = url;
    }
    if (accepted.length) {
      setVideos((current) => [...current, ...accepted]);
      setActiveId((current) => current ?? accepted[0].id);
      setOutputUrl("");
      setStatus(`${videos.length + accepted.length} video đã sẵn sàng`);
    }
  };

  const removeVideo = (id: string) => {
    setVideos((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.url);
      const next = current.filter((entry) => entry.id !== id);
      setActiveId((currentId) => currentId === id ? (next[0]?.id ?? null) : currentId);
      return next;
    });
    setOutputUrl("");
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress: value }) => setProgress(Math.round(value * 100)));
    setStatus("Đang tải bộ xử lý video lần đầu…");
    await ffmpeg.load({ coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm") });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const runTrim = async () => {
    if (!active) return toast.error("Hãy chọn một video trước.");
    if (active.duration <= 0) return toast.error("Video chưa đọc được thời lượng.");
    const safeStart = Math.max(0, Math.min(start, active.duration - 0.05));
    const safeEnd = Math.max(safeStart + 0.05, Math.min(end || active.duration, active.duration));
    setBusy(true); setProgress(0);
    try {
      const ffmpeg = await loadFFmpeg();
      const input = `input-${active.id}.mp4`;
      const output = "trimmed.mp4";
      await ffmpeg.writeFile(input, await fetchFile(active.file));
      setStatus("Đang cắt video…");
      await ffmpeg.exec(["-ss", safeStart.toFixed(3), "-i", input, "-t", (safeEnd - safeStart).toFixed(3), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", output]);
      const data = await ffmpeg.readFile(output);
      const bytes = new Uint8Array(data as Uint8Array);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputName("dhl-video-trimmed.mp4");
      setStatus(`Đã cắt ${formatTime(safeStart)} – ${formatTime(safeEnd)}`);
      toast.success("Đã cắt video, bạn có thể xem và tải xuống.");
    } catch (error) { const message = explainVideoError("cắt", error); setStatus(message); toast.error(message); }
    finally { setBusy(false); }
  };

  const runCompress = async () => {
    if (!active) return toast.error("Hãy chọn một video trước.");
    if (active.duration <= 0) return toast.error("Video chưa đọc được thời lượng.");
    setBusy(true); setProgress(0);
    try {
      const ffmpeg = await loadFFmpeg();
      const input = `compress-${active.id}.mp4`;
      const output = "compressed.mp4";
      const profile = compression === "tiny" ? ["-crf", "32", "-preset", "veryfast", "-b:a", "96k"] : compression === "small" ? ["-crf", "28", "-preset", "fast", "-b:a", "128k"] : ["-crf", "24", "-preset", "fast", "-b:a", "160k"];
      await ffmpeg.writeFile(input, await fetchFile(active.file));
      setStatus("Đang nén video…");
      await ffmpeg.exec(["-i", input, "-c:v", "libx264", ...profile.slice(0, 4), "-c:a", "aac", profile[5], "-movflags", "+faststart", output]);
      const data = await ffmpeg.readFile(output);
      const bytes = new Uint8Array(data as Uint8Array);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputName("dhl-video-compressed.mp4");
      setStatus(`Đã nén video · ${compression === "tiny" ? "nhẹ nhất" : compression === "small" ? "nhẹ" : "cân bằng"}`);
      toast.success("Đã nén video, bạn có thể xem và tải xuống.");
    } catch (error) { const message = explainVideoError("nén", error); setStatus(message); toast.error(message); }
    finally { setBusy(false); }
  };

  const runJoin = async () => {
    if (videos.length < 2) return toast.error("Hãy thêm ít nhất 2 video để nối.");
    setBusy(true); setProgress(0);
    try {
      const ffmpeg = await loadFFmpeg();
      const entries: string[] = [];
      for (let index = 0; index < videos.length; index += 1) {
        const fileName = `join-${index}.mp4`;
        await ffmpeg.writeFile(fileName, await fetchFile(videos[index].file));
        entries.push(`file '${fileName}'`);
      }
      await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(entries.join("\n")));
      setStatus("Đang nối các video…");
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", "joined.mp4"]);
      const data = await ffmpeg.readFile("joined.mp4");
      const bytes = new Uint8Array(data as Uint8Array);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputName("dhl-video-joined.mp4");
      setStatus(`Đã nối ${videos.length} video`);
      toast.success("Đã nối video thành công.");
    } catch (error) { const message = explainVideoError("nối", error); setStatus(message); toast.error(message); }
    finally { setBusy(false); }
  };

  return <StoreLayout><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-6 shadow-sm sm:p-9"><Badge className="bg-cyan-100 text-cyan-800"><Film className="mr-1 h-3.5 w-3.5" />DHL Stores · Công cụ</Badge><h1 className="mt-4 font-display text-4xl font-black uppercase leading-none text-slate-950 sm:text-6xl">Cắt & nối video</h1><p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">Cắt một đoạn video hoặc ghép nhiều video thành một tệp MP4 ngay trên thiết bị. Tệp không tự tải lên máy chủ.</p><div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Thêm video</Button><Button variant="outline" onClick={runTrim} disabled={busy || !active}><Scissors className="mr-2 h-4 w-4" />Cắt đoạn đang chọn</Button><Button variant="outline" onClick={runJoin} disabled={busy || videos.length < 2}><WandSparkles className="mr-2 h-4 w-4" />Nối {videos.length} video</Button><Button variant="outline" onClick={runCompress} disabled={busy || !active}><SlidersHorizontal className="mr-2 h-4 w-4" />Nén video</Button><Button onClick={() => { if (!outputUrl) return; const link = document.createElement("a"); link.href = outputUrl; link.download = outputName; link.click(); }} disabled={!outputUrl || busy} className={outputUrl ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}><ArrowDown className="mr-2 h-4 w-4" />{outputUrl ? "Tải video kết quả" : "Tải video sau khi xử lý"}</Button><input ref={inputRef} type="file" hidden multiple accept="video/*" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} /></div></section><div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"><Card><CardHeader><CardTitle>Danh sách video</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl border border-dashed border-cyan-300 bg-cyan-50 p-4 text-center text-sm text-slate-600"><Plus className="mx-auto mb-2 h-5 w-5 text-cyan-700" />Tối đa 8 video · mỗi tệp 300 MB</div>{videos.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Chưa có video. Bấm “Thêm video” để bắt đầu.</p>}{videos.map((item, index) => <button type="button" key={item.id} onClick={() => setActiveId(item.id)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${active?.id === item.id ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100" : "border-slate-200 hover:border-cyan-300"}`}><video src={item.url} muted className="h-14 w-20 rounded-lg bg-slate-900 object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{index + 1}. {item.file.name}</strong><span className="text-xs text-slate-500">{formatTime(item.duration)} · {item.width || "?"}×{item.height || "?"}</span></span><Trash2 className="h-4 w-4 shrink-0 text-slate-400 hover:text-red-600" onClick={(event) => { event.stopPropagation(); removeVideo(item.id); }} /></button>)}</CardContent></Card><div className="space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-cyan-600" />Xem trước và cắt đoạn</CardTitle></CardHeader><CardContent>{active ? <div className="space-y-5"><video key={active.id} src={active.url} controls className="max-h-[460px] w-full rounded-2xl bg-slate-950" /><div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-cyan-800">Timeline cắt nhanh</p><p className="text-xs text-slate-500">Kéo hai đầu để chọn đoạn cần giữ</p></div><strong className="rounded-full bg-white px-3 py-1 text-xs text-cyan-800">{formatTime(Math.max(0, (end || active.duration) - start))}</strong></div><div className="relative h-10"><div className="absolute inset-x-0 top-4 h-2 rounded-full bg-slate-200" /><div className="absolute top-4 h-2 rounded-full bg-cyan-500" style={{ left: `${active.duration ? (start / active.duration) * 100 : 0}%`, right: `${active.duration ? 100 - ((end || active.duration) / active.duration) * 100 : 0}%` }} /><input aria-label="Thời điểm bắt đầu" type="range" min={0} max={active.duration || 1} step={0.1} value={start} onChange={(event) => setStart(Math.min(Number(event.target.value), Math.max(0, (end || active.duration) - 0.1)))} className="pointer-events-none absolute inset-x-0 top-1 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-cyan-700 [&::-webkit-slider-thumb]:shadow" /><input aria-label="Thời điểm kết thúc" type="range" min={0} max={active.duration || 1} step={0.1} value={end || active.duration} onChange={(event) => setEnd(Math.max(Number(event.target.value), start + 0.1))} className="pointer-events-none absolute inset-x-0 top-1 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-cyan-700 [&::-webkit-slider-thumb]:shadow" /></div><div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500"><span>{formatTime(start)}</span><span>{formatTime(end || active.duration)} / {formatTime(active.duration)}</span></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Thời điểm bắt đầu (giây)</Label><Input type="number" min={0} max={active.duration} step={0.1} value={start} onChange={(event) => setStart(Math.min(Number(event.target.value), Math.max(0, (end || active.duration) - 0.1)))} /></div><div><Label>Thời điểm kết thúc (giây)</Label><Input type="number" min={0} max={active.duration} step={0.1} value={end || active.duration} onChange={(event) => setEnd(Math.max(Number(event.target.value), start + 0.1))} /></div></div><div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-end"><div><Label>Mức nén</Label><select value={compression} onChange={(event) => setCompression(event.target.value as "balanced" | "small" | "tiny")} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"><option value="balanced">Cân bằng · giữ chất lượng tốt</option><option value="small">Nhẹ · giảm dung lượng rõ</option><option value="tiny">Nhẹ nhất · ưu tiên gửi nhanh</option></select></div><Button variant="outline" onClick={runCompress} disabled={busy}><SlidersHorizontal className="mr-2 h-4 w-4" />Nén video này</Button></div><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>Đoạn chọn: <strong>{formatTime(start)} – {formatTime(end || active.duration)}</strong></span><span className="max-w-[45%] truncate">{active.file.name}</span></div></div> : <div className="grid min-h-[320px] place-items-center rounded-2xl bg-slate-100 text-center text-slate-500"><Film className="mx-auto mb-3 h-10 w-10" />Thêm video để xem trước</div>}</CardContent></Card>{outputUrl && <Card><CardHeader><CardTitle>Kết quả</CardTitle></CardHeader><CardContent className="space-y-4"><video src={outputUrl} controls className="max-h-[420px] w-full rounded-2xl bg-slate-950" /><div className="flex flex-col gap-2 sm:flex-row"><Input value={outputName} onChange={(event) => setOutputName(event.target.value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "dhl-video-result.mp4")} /><a href={outputUrl} download={outputName} className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"><ArrowDown className="mr-2 h-4 w-4" />Tải video kết quả</a></div></CardContent></Card>}<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">{busy && <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />}<span>{status}{busy && ` · ${progress}%`}</span></div></div></div></main></StoreLayout>;
}
