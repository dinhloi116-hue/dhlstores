import { CircleHelp, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export function CustomerHelpCard({ context }: { context: "product" | "checkout" }) {
  const productMode = context === "product";
  return <aside className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sky-950">
    <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-600 text-white"><CircleHelp className="h-4 w-4" /></div><div><p className="text-xs font-black">{productMode ? "Cần hỗ trợ chọn sản phẩm?" : "Cần hỗ trợ hoàn tất đơn?"}</p><p className="mt-1 text-[11px] leading-relaxed text-sky-900">{productMode ? "Kiểm tra SKU, tồn kho và phí giao trước khi thêm giỏ. Với hàng hết, bạn có thể đăng ký nhắc lại hàng." : "Kiểm tra sản phẩm, địa chỉ và phương thức thanh toán trước khi tạo QR. Đơn hàng đã tạo luôn xem lại được trong tài khoản."}</p></div></div>
    <div className="mt-3 flex flex-wrap gap-2"><Link href="/account#orders" className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-2 text-[11px] font-black text-sky-800 transition hover:bg-sky-100"><ShieldCheck className="h-3.5 w-3.5" />Theo dõi đơn</Link><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("dhlstores-open-chat"))} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-[11px] font-black text-white transition hover:bg-sky-800"><MessageCircle className="h-3.5 w-3.5" />Nhắn cửa hàng</button></div>
  </aside>;
}
