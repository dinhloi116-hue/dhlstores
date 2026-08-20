import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import StoreLayout from "@/components/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Download, FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Plus, Printer, Trash2, Upload, WandSparkles } from "lucide-react";

type LabelRow = { school: string; className: string; student: string; year: string; subject: string };
type Illustration = { id: string; name: string; url: string; tone: string };
type LabelTemplate = { id: string; name: string; colors: [string, string]; accent: string; icon: string };

const templates: LabelTemplate[] = [
  { id: "schoolbook", name: "Bé học giỏi", colors: ["#fff7ed", "#fde68a"], accent: "#ea580c", icon: "★" },
  { id: "rainbow", name: "Cầu vồng vui học", colors: ["#ecfeff", "#c4b5fd"], accent: "#7c3aed", icon: "✦" },
  { id: "sport", name: "Năng lượng thể thao", colors: ["#ecfdf5", "#99f6e4"], accent: "#047857", icon: "⚽" },
  { id: "minimal", name: "Tối giản dễ in", colors: ["#ffffff", "#e2e8f0"], accent: "#0f172a", icon: "✎" },
];

const illustrations: Illustration[] = [
  { id: "space", name: "Vũ trụ", url: "/manus-storage/notebook-sticker-space_aab69864.png", tone: "bg-indigo-50" },
  { id: "dinosaur", name: "Khủng long", url: "/manus-storage/notebook-sticker-dinosaur_b524c275.png", tone: "bg-lime-50" },
  { id: "football", name: "Bóng đá", url: "/manus-storage/notebook-sticker-football_63203e47.png", tone: "bg-emerald-50" },
  { id: "flower", name: "Hoa lá", url: "/manus-storage/notebook-sticker-flower_f9681aa3.png", tone: "bg-pink-50" },
];

const emptyRow = (): LabelRow => ({ school: "THCS Lê Lợi", className: "6A1", student: "Nguyễn Văn An", year: "2026 - 2027", subject: "" });

function normalizeRow(raw: Record<string, unknown>): LabelRow {
  const get = (...keys: string[]) => {
    const key = Object.keys(raw).find((candidate) => keys.some((wanted) => candidate.toLowerCase().replace(/\s/g, "").includes(wanted)));
    return key ? String(raw[key] ?? "") : "";
  };
  return { school: get("truong", "school") || "THCS Lê Lợi", className: get("lop", "class", "grade") || "6A1", student: get("hoten", "student", "name") || "Nguyễn Văn An", year: get("namhoc", "year", "schoolyear") || "2026 - 2027", subject: get("monhoc", "subject") };
}

async function drawLabel(row: LabelRow, template: LabelTemplate, illustrationUrl?: string, width = 1000, height = 540) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, template.colors[0]);
  gradient.addColorStop(1, template.colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = template.accent;
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  ctx.fillStyle = template.accent;
  ctx.font = "bold 72px Arial";
  ctx.fillText(template.icon, 55, 105);
  ctx.font = "bold 42px Arial";
  ctx.fillText(row.subject || "Nhãn vở", 155, 92);
  ctx.fillStyle = "#172033";
  ctx.font = "bold 25px Arial";
  const lines = [["Trường", row.school], ["Lớp", row.className], ["Họ và tên", row.student], ["Năm học", row.year]];
  lines.forEach(([label, value], index) => {
    const y = 175 + index * 70;
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = template.accent;
    ctx.fillText(`${label}:`, 60, y);
    ctx.font = "bold 27px Arial";
    ctx.fillStyle = "#172033";
    ctx.fillText(value.slice(0, 43), 220, y);
  });
  if (illustrationUrl) {
    try {
      const illustration = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const timeout = window.setTimeout(() => reject(new Error("illustration-timeout")), 300);
        image.onload = () => { window.clearTimeout(timeout); resolve(image); };
        image.onerror = () => { window.clearTimeout(timeout); reject(new Error("illustration-error")); };
        image.src = illustrationUrl;
      });
      ctx.globalAlpha = 0.92;
      ctx.drawImage(illustration, width - 245, height - 235, 190, 190);
      ctx.globalAlpha = 1;
    } catch {
      // Keep the label usable while a generated asset is still processing or unavailable.
      ctx.fillStyle = template.accent;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(width - 150, height - 150, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = template.accent;
      ctx.font = "bold 82px Arial";
      ctx.fillText(template.icon, width - 190, height - 120);
    }
  }
  ctx.fillStyle = template.accent;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(width - 90, height - 65, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  return canvas.toDataURL("image/png");
}

function LabelPreview({ row, template, illustrationUrl, index, onSelect }: { row: LabelRow; template: LabelTemplate; illustrationUrl?: string; index: number; onSelect: () => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => { let active = true; void drawLabel(row, template, illustrationUrl, 600, 324).then((value) => { if (active) setSrc(value); }); return () => { active = false; }; }, [row, template, illustrationUrl]);
  return <button type="button" onClick={onSelect} className="overflow-hidden rounded-lg border-2 bg-white text-left transition hover:-translate-y-0.5 border-slate-200">{src ? <img src={src} alt={`Nhãn ${index + 1}`} className="w-full" /> : <div className="grid aspect-[600/324] place-items-center bg-slate-100 text-xs font-bold text-slate-400">Đang dựng preview…</div>}</button>;
}

export default function NotebookLabelMaker() {
  const [templateId, setTemplateId] = useState("schoolbook");
  const [rows, setRows] = useState<LabelRow[]>([emptyRow()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [pageSize, setPageSize] = useState(12);
  const [illustrationId, setIllustrationId] = useState("space");
  const fileRef = useRef<HTMLInputElement>(null);
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  const illustration = illustrations.find((item) => item.id === illustrationId) ?? illustrations[0];
  const activeRow = rows[activeIndex] ?? emptyRow();
  const pages = useMemo(() => Array.from({ length: Math.ceil(rows.length / pageSize) }, (_, index) => rows.slice(index * pageSize, (index + 1) * pageSize)), [rows, pageSize]);

  const updateActive = (key: keyof LabelRow, value: string) => setRows((current) => current.map((row, index) => index === activeIndex ? { ...row, [key]: value } : row));
  const addRow = () => { setRows((current) => [...current, { ...emptyRow(), subject: activeRow.subject }]); setActiveIndex(rows.length); };
  const removeRow = () => { if (rows.length === 1) return; setRows((current) => current.filter((_, index) => index !== activeIndex)); setActiveIndex(Math.max(0, activeIndex - 1)); };

  const importSpreadsheet = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("File tối đa 5 MB để trình duyệt xử lý ổn định.");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!data.length) return toast.error("Không tìm thấy dòng dữ liệu trong file.");
      const parsed = data.slice(0, 240).map(normalizeRow).filter((row) => row.student.trim());
      if (!parsed.length) return toast.error("File cần có cột Họ tên hoặc Student.");
      setRows(parsed); setActiveIndex(0);
      toast.success(`Đã nhập ${parsed.length} học sinh${data.length > 240 ? " (giới hạn 240 nhãn)" : ""}.`);
    } catch { toast.error("Không đọc được file. Hãy dùng .xlsx, .xls hoặc .csv."); }
  };

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const marginX = 10; const marginY = 12; const gap = 4; const cellW = 91; const cellH = 42;
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const position = index % pageSize;
        if (index > 0 && position === 0) pdf.addPage();
        const col = position % 2; const line = Math.floor(position / 2);
        const x = marginX + col * (cellW + gap); const y = marginY + line * (cellH + gap);
        pdf.addImage(await drawLabel(row, template, illustration.url), "PNG", x, y, cellW, cellH, undefined, "FAST");
      }
      pdf.save(`nhan-vo-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`Đã xuất ${rows.length} nhãn thành PDF.`);
    } catch { toast.error("Không thể xuất PDF trên trình duyệt này."); } finally { setIsExporting(false); }
  };

  return <StoreLayout><main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8"><section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 shadow-sm sm:p-9"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" /><div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><Badge className="bg-amber-100 text-amber-900"><BookOpen className="mr-1 h-3.5 w-3.5" />DHL Stores · Công cụ</Badge><h1 className="mt-4 font-display text-4xl font-black uppercase leading-none text-slate-950 sm:text-6xl">Tạo nhãn vở online</h1><p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">Nhập thông tin một học sinh hoặc tải danh sách Excel, chọn mẫu nhãn, dàn trang sẵn theo A4 rồi tải PDF để in.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Nhập Excel</Button><Button onClick={exportPdf} disabled={isExporting}>{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Xuất PDF</Button><input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSpreadsheet(file); event.currentTarget.value = ""; }} /></div></div></section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)_330px]"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><WandSparkles className="h-5 w-5 text-violet-600" />Thông tin học sinh</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label>Trường</Label><Input value={activeRow.school} onChange={(e) => updateActive("school", e.target.value)} /></div><div><Label>Lớp</Label><Input value={activeRow.className} onChange={(e) => updateActive("className", e.target.value)} /></div></div><div><Label>Họ và tên</Label><Input value={activeRow.student} onChange={(e) => updateActive("student", e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Năm học</Label><Input value={activeRow.year} onChange={(e) => updateActive("year", e.target.value)} /></div><div><Label>Môn học</Label><Input value={activeRow.subject} onChange={(e) => updateActive("subject", e.target.value)} placeholder="Toán, Tiếng Việt…" /></div></div><div className="flex gap-2"><Button className="flex-1" variant="outline" onClick={addRow}><Plus className="mr-2 h-4 w-4" />Thêm nhãn</Button><Button variant="outline" size="icon" onClick={removeRow} disabled={rows.length === 1} aria-label="Xóa nhãn"><Trash2 className="h-4 w-4" /></Button></div><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Đang chỉnh nhãn {activeIndex + 1}/{rows.length}. Dữ liệu chỉ được xử lý trong trình duyệt và không tự tải lên máy chủ.</div></CardContent></Card>
        <Card className="min-w-0 overflow-hidden"><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg"><ImageIcon className="h-5 w-5 text-amber-600" />Xem trước nhãn</CardTitle><Badge variant="outline">{rows.length} nhãn · {pages.length} trang A4</Badge></CardHeader><CardContent><div className="rounded-2xl bg-slate-100 p-4 sm:p-8"><div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm">{Array.from({ length: Math.min(pageSize, 12) }, (_, index) => { const row = rows[index] ?? emptyRow(); return <LabelPreview key={index} row={row} template={template} illustrationUrl={illustration.url} index={index} onSelect={() => setActiveIndex(Math.min(index, rows.length - 1))} />; })}</div></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Chọn mẫu & dàn trang</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2">{templates.map((item) => <button type="button" key={item.id} onClick={() => setTemplateId(item.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${templateId === item.id ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"}`}><span className="grid h-10 w-10 place-items-center rounded-lg text-lg font-black" style={{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})`, color: item.accent }}>{item.icon}</span><span><strong className="block text-sm text-slate-900">{item.name}</strong><span className="text-xs text-slate-500">Mẫu nhãn A4 dễ in</span></span></button>)}</div><div><Label>Thư viện hình minh họa</Label><div className="mt-2 grid grid-cols-2 gap-2">{illustrations.map((item) => <button type="button" key={item.id} onClick={() => setIllustrationId(item.id)} className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${illustrationId === item.id ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${item.tone}`}><img src={item.url} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} className="h-9 w-9 object-contain" /></span><span className="text-xs font-black text-slate-700">{item.name}</span></button>)}</div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Hình minh họa nguyên bản, dùng được cho preview và PDF.</p></div><div><Label>Số nhãn mỗi trang</Label><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value={12}>12 nhãn · 2 cột × 6 hàng</option><option value={8}>8 nhãn · nhãn lớn</option></select></div><Button variant="outline" className="w-full" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />In trực tiếp từ trình duyệt</Button><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><FileSpreadsheet className="mr-1 inline h-4 w-4" />Excel nên có các cột: Trường, Lớp, Họ tên, Năm học, Môn học. Có thể dùng tên cột tiếng Anh tương ứng.</div></CardContent></Card></div><section className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><FileText className="h-5 w-5 text-violet-600" /><h2 className="mt-3 font-black text-slate-900">PDF sẵn để in</h2><p className="mt-1 text-sm text-slate-500">PDF A4 dàn 2 cột, khoảng cách đều, phù hợp in tại nhà hoặc tiệm.</p></div><div className="rounded-2xl border bg-white p-5"><Upload className="h-5 w-5 text-emerald-600" /><h2 className="mt-3 font-black text-slate-900">Hàng loạt từ Excel</h2><p className="mt-1 text-sm text-slate-500">Tối đa 240 nhãn mỗi lần để trình duyệt xử lý ổn định.</p></div><div className="rounded-2xl border bg-white p-5"><Printer className="h-5 w-5 text-amber-600" /><h2 className="mt-3 font-black text-slate-900">Không cần đăng nhập</h2><p className="mt-1 text-sm text-slate-500">Dữ liệu demo được xử lý ngay trên thiết bị, không lưu danh sách học sinh.</p></div></section></main></StoreLayout>;
}
