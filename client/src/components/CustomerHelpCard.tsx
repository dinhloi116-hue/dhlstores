import { useEffect, useState } from "react";
import { CircleHelp, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { getClientLanguage, Language } from "@/lib/i18n";

export function CustomerHelpCard({ context }: { context: "product" | "checkout" }) {
  const productMode = context === "product";
  const [lang, setLang] = useState<Language>(getClientLanguage());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => window.clearInterval(timer);
  }, [lang]);
  const vi = lang === "vi";
  return <aside className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sky-950">
    <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-600 text-white"><CircleHelp className="h-4 w-4" /></div><div><p className="text-xs font-black">{productMode ? (vi ? "Cần hỗ trợ chọn sản phẩm?" : "Need help choosing a product?") : (vi ? "Cần hỗ trợ hoàn tất đơn?" : "Need help completing your order?")}</p><p className="mt-1 text-[11px] leading-relaxed text-sky-900">{productMode ? (vi ? "Kiểm tra SKU, tồn kho và phí giao trước khi thêm giỏ. Với hàng hết, bạn có thể đăng ký nhắc lại hàng." : "Check SKU, stock and delivery fees before adding to cart. You can request a restock alert for unavailable items.") : (vi ? "Kiểm tra sản phẩm, địa chỉ và phương thức thanh toán trước khi tạo QR. Đơn hàng đã tạo luôn xem lại được trong tài khoản." : "Check the product, address and payment method before creating a QR payment. Created orders remain available in your account.")}</p></div></div>
    <div className="mt-3 flex flex-wrap gap-2"><Link href="/account#orders" className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-2 text-[11px] font-black text-sky-800 transition hover:bg-sky-100"><ShieldCheck className="h-3.5 w-3.5" />{vi ? "Theo dõi đơn" : "Track orders"}</Link>{vi ? <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("dhlstores-open-chat"))} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-[11px] font-black text-white transition hover:bg-sky-800"><MessageCircle className="h-3.5 w-3.5" />Nhắn cửa hàng</button> : <a href="https://wa.me/84963898871" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-700"><MessageCircle className="h-3.5 w-3.5" />Message on WhatsApp</a>}</div>
  </aside>;
}
