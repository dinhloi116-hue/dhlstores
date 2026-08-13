import React, { useEffect, useMemo, useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, Copy, Download, QrCode, ShieldCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

type PendingPayment = {
  orderId: number;
  orderCode: string;
  totalAmount: number;
  qrUrl: string | null;
};

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [lang, setLang] = useState<Language>(getClientLanguage());
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  useEffect(() => {
    const onStorage = () => setLang(getClientLanguage());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const t = translations[lang];
  const cartQuery = trpc.store.cart.useQuery(undefined, { enabled: isAuthenticated });
  const cartItems = cartQuery.data || [];
  const paymentInput = useMemo(() => pendingPayment ? { orderId: pendingPayment.orderId } : undefined, [pendingPayment]);
  const paymentQuery = trpc.store.paymentStatus.useQuery(paymentInput!, {
    enabled: Boolean(paymentInput),
    refetchInterval: query => query.state.data?.paymentStatus === "paid" ? false : 3500,
  });

  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = item.product ? Number(item.product.price) : 0;
    return sum + price * item.quantity;
  }, 0);

  const checkoutMutation = trpc.store.checkout.useMutation({
    onSuccess: order => {
      setPendingPayment(order);
      utils.store.cart.invalidate();
      toast.info(lang === "vi" ? "Đơn hàng đã được tạo. Hãy quét QR để thanh toán." : "Order created. Scan the QR code to pay.");
    },
    onError: error => toast.error(error.message || (lang === "vi" ? "Không thể tạo đơn hàng" : "Could not create order")),
  });

  const formatCurrency = (value: number) => lang === "en"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 25000)
    : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  const copyMemo = async () => {
    if (!pendingPayment) return;
    await navigator.clipboard.writeText(`SEVQR ${pendingPayment.orderCode}`);
    toast.success(lang === "vi" ? "Đã sao chép nội dung chuyển khoản" : "Transfer memo copied");
  };

  if (!isAuthenticated) {
    return (
      <StoreLayout>
        <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <ShieldCheck className="w-14 h-14 mx-auto text-amber-500" />
          <h1 className="text-2xl font-black text-slate-900">{lang === "vi" ? "Đăng nhập để thanh toán" : "Sign in to checkout"}</h1>
          <p className="text-sm text-slate-500">{lang === "vi" ? "Bạn cần có tài khoản DHL Stores để theo dõi đơn và nhận link tải an toàn." : "A DHL Stores account is required to track the order and access secure downloads."}</p>
          <Link href="/"><Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black">{t.home}</Button></Link>
        </div>
      </StoreLayout>
    );
  }

  if (pendingPayment) {
    const isPaid = paymentQuery.data?.paymentStatus === "paid";
    return (
      <StoreLayout>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <section className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-5 bg-slate-900 text-white">
              <p className="text-[11px] tracking-[0.18em] font-bold uppercase text-amber-300">DHL Stores · SePay / VietQR</p>
              <h1 className="text-xl font-black mt-1">{isPaid ? (lang === "vi" ? "Thanh toán đã xác nhận" : "Payment confirmed") : (lang === "vi" ? "Quét QR để hoàn tất thanh toán" : "Scan QR to complete payment")}</h1>
            </div>

            {isPaid ? (
              <div className="p-8 text-center space-y-5">
                <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
                <div>
                  <h2 className="font-black text-xl text-slate-900">{lang === "vi" ? "File của bạn đã được mở khóa" : "Your files have been unlocked"}</h2>
                  <p className="text-sm text-slate-500 mt-2">{lang === "vi" ? "Mở Tài khoản để tải các tài nguyên thuộc đơn hàng này." : "Open your account to download the resources from this order."}</p>
                </div>
                <Link href="/account"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black">{lang === "vi" ? "Đi tới Tài khoản" : "Go to account"}</Button></Link>
              </div>
            ) : (
              <div className="p-6 sm:p-8 grid gap-7 sm:grid-cols-[1fr_260px] items-center">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{lang === "vi" ? "Mã đơn hàng" : "Order code"}</p>
                    <p className="text-xl font-black text-purple-700 mt-1">{pendingPayment.orderCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{lang === "vi" ? "Số tiền cần chuyển" : "Amount to transfer"}</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(pendingPayment.totalAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold text-slate-800">{lang === "vi" ? "Nội dung chuyển khoản bắt buộc" : "Required transfer memo"}</p>
                    <button type="button" onClick={copyMemo} className="mt-2 flex items-center gap-2 font-black text-amber-700 hover:text-amber-800">
                      <span>SEVQR {pendingPayment.orderCode}</span><Copy className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] leading-relaxed text-slate-600 mt-2">{lang === "vi" ? "Hệ thống chỉ tự động xác nhận khi số tiền và mã đơn hàng trùng khớp." : "The order is confirmed only when both amount and order code match."}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />{lang === "vi" ? "Đang chờ SePay xác nhận giao dịch…" : "Waiting for SePay transaction confirmation…"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  {pendingPayment.qrUrl ? <img src={pendingPayment.qrUrl} alt="SePay VietQR payment code" className="w-full rounded-xl bg-white" /> : <div className="aspect-square grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-6"><div><QrCode className="w-12 h-12 mx-auto text-slate-400" /><p className="text-xs text-slate-500 mt-3">{lang === "vi" ? "QR sẽ hiển thị khi cấu hình ngân hàng được hoàn tất." : "The QR will appear after bank configuration is complete."}</p></div></div>}
                  <p className="text-[11px] text-slate-500 mt-3">{lang === "vi" ? "Mở app ngân hàng và quét mã QR" : "Open your banking app and scan the QR"}</p>
                </div>
              </div>
            )}
          </section>
        </main>
      </StoreLayout>
    );
  }

  if (cartItems.length === 0) {
    return <StoreLayout><div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4"><ShoppingBag className="w-14 h-14 mx-auto text-slate-300" /><h1 className="text-xl font-black text-slate-900">{t.emptyCart}</h1><Link href="/products"><Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black">{t.exploreShop}</Button></Link></div></StoreLayout>;
  }

  return (
    <StoreLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/products" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-amber-600 mb-6"><ArrowLeft className="w-4 h-4" />{lang === "vi" ? "Tiếp tục mua sắm" : "Continue shopping"}</Link>
        <div className="grid gap-7 lg:grid-cols-[1fr_360px] items-start">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 grid place-items-center"><Download className="w-5 h-5" /></div><div><h1 className="text-xl font-black text-slate-900">{lang === "vi" ? "Thanh toán tài nguyên số" : "Digital resource checkout"}</h1><p className="text-xs text-slate-500">{lang === "vi" ? "Tệp sẽ chỉ được mở khóa sau khi SePay xác nhận tiền vào." : "Files are unlocked only after SePay confirms the incoming payment."}</p></div></div>
            <div className="space-y-3">{cartItems.map(item => item.product && <div key={item.id} className="flex gap-3 items-center"><img src={item.product.image} alt={item.product.name} className="w-14 h-14 object-cover rounded-lg border border-slate-200" /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{item.product.name}</p><p className="text-xs text-slate-500">× {item.quantity}</p></div><p className="text-sm font-black text-slate-900">{formatCurrency(Number(item.product.price) * item.quantity)}</p></div>)}</div>
          </section>
          <form onSubmit={event => { event.preventDefault(); if (!acceptedTerms) return toast.error(lang === "vi" ? "Vui lòng đồng ý điều khoản trước khi đặt hàng." : "Please accept the terms before placing your order."); checkoutMutation.mutate({ totalAmount: cartSubtotal, items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity, price: Number(item.product?.price ?? 0), attributes: item.attributes || undefined })) }); }} className="bg-white p-6 rounded-2xl border-2 border-sky-600 shadow-sm space-y-5">
            <h2 className="text-base font-black text-purple-700 uppercase">{lang === "vi" ? "Đơn hàng của bạn" : "Your order"}</h2>
            <div className="space-y-2 text-sm border-y border-slate-100 py-4"><div className="flex justify-between"><span className="text-slate-500">{lang === "vi" ? "Tạm tính" : "Subtotal"}</span><span className="font-bold">{formatCurrency(cartSubtotal)}</span></div><div className="flex justify-between"><span className="text-slate-500">{lang === "vi" ? "Phương thức" : "Method"}</span><span className="font-bold text-sky-700">SePay · VietQR</span></div><div className="flex justify-between text-base pt-2"><span className="font-black">{lang === "vi" ? "Tổng" : "Total"}</span><span className="font-black">{formatCurrency(cartSubtotal)}</span></div></div>
            <div className="flex gap-3 items-start"><Checkbox id="terms" checked={acceptedTerms} onCheckedChange={checked => setAcceptedTerms(checked === true)} className="mt-0.5" /><label htmlFor="terms" className="text-xs leading-relaxed text-slate-600">{lang === "vi" ? <>Tôi đã đọc và đồng ý với <span className="font-bold text-rose-600">điều khoản và điều kiện của website</span>.</> : <>I have read and agree to the <span className="font-bold text-rose-600">website terms and conditions</span>.</>}</label></div>
            <Button type="submit" disabled={checkoutMutation.isPending} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black rounded-md py-5">{checkoutMutation.isPending ? (lang === "vi" ? "ĐANG TẠO ĐƠN..." : "CREATING ORDER...") : (lang === "vi" ? "ĐẶT HÀNG & LẤY MÃ QR" : "PLACE ORDER & GET QR")}</Button>
            <p className="text-[11px] leading-relaxed text-slate-500">{lang === "vi" ? "Thông tin đơn hàng được dùng để xử lý giao dịch và bảo vệ quyền tải tài nguyên của bạn." : "Order data is used to process the transaction and protect your download access."}</p>
          </form>
        </div>
      </main>
    </StoreLayout>
  );
}
