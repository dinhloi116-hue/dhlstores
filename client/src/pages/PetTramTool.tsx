import StoreLayout from "@/components/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ImageDown, ShieldCheck, WandSparkles } from "lucide-react";

const TOOL_URL = "/manus-storage/pet-tram-pro-x_89dce948.html";

export default function PetTramTool() {
  return (
    <StoreLayout>
      <main className="mx-auto max-w-[1600px] px-3 py-5 sm:px-6 lg:px-8">
        <section className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2"><Badge className="bg-cyan-100 text-cyan-800">Tool thiết kế</Badge><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Chạy ngay trong trình duyệt</span></div>
            <h1 className="mt-2 font-display text-3xl font-black uppercase text-slate-900">PET TRAM PRO X</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">Xử lý ảnh, tạo tram, vector hóa, xem mockup áo và xuất hàng loạt. Ảnh bạn chọn được xử lý trực tiếp trong phiên trình duyệt này.</p>
          </div>
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" />Xử lý cục bộ</span><a href={TOOL_URL} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="border-cyan-200 text-cyan-800 hover:bg-cyan-50"><ExternalLink className="mr-1.5 h-4 w-4" />Mở riêng</Button></a></div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 shadow-xl">
          <iframe title="PET TRAM PRO X" src={TOOL_URL} sandbox="allow-scripts allow-forms allow-downloads allow-popups" className="h-[calc(100vh-14rem)] min-h-[700px] w-full bg-slate-950" />
        </section>
        <section className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-4"><WandSparkles className="h-5 w-5 text-cyan-600" /><p className="mt-2 text-sm font-black text-slate-900">Xử lý & tạo tram</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Xóa phông, crop, tạo viền và tinh chỉnh hạt tram trước khi in.</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><ImageDown className="h-5 w-5 text-violet-600" /><p className="mt-2 text-sm font-black text-slate-900">Xuất PNG / SVG</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Thiết lập cm, DPI, preview mockup và xuất các tệp theo danh sách.</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><ShieldCheck className="h-5 w-5 text-emerald-600" /><p className="mt-2 text-sm font-black text-slate-900">Lưu ý khi dùng</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Tải ảnh trực tiếp trong Tool; xuất tệp từ các nút ở thanh điều khiển bên trái.</p></div></section>
      </main>
    </StoreLayout>
  );
}
