import React, { useEffect, useMemo, useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, Copy, Download, MapPin, Plus, QrCode, ShieldCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_QR_TEST_TTL_MS = 10 * 60 * 1_000;

type PendingPayment = {
  orderId: number;
  orderCode: string;
  totalAmount: number;
  qrUrl: string | null;
  hasPhysicalItems?: boolean;
};

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [lang, setLang] = useState<Language>(getClientLanguage());
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [paymentExpired, setPaymentExpired] = useState(false);
  const [shipping, setShipping] = useState({ name: "", phone: "", address: "", note: "", method: "standard" as "pickup" | "standard" | "express" });
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState("");

  useEffect(() => {
    const onStorage = () => setLang(getClientLanguage());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const t = translations[lang];
  const cartQuery = trpc.store.cart.useQuery(undefined, { enabled: isAuthenticated });
  const cartItems = cartQuery.data || [];
  const addressesQuery = trpc.store.shippingAddresses.useQuery(undefined, { enabled: isAuthenticated });
  const savedAddresses = addressesQuery.data || [];
  const paymentInput = useMemo(() => pendingPayment ? { orderId: pendingPayment.orderId } : undefined, [pendingPayment]);
  const paymentQuery = trpc.store.paymentStatus.useQuery(paymentInput!, {
    enabled: Boolean(paymentInput),
    refetchInterval: query => query.state.data?.paymentStatus === "paid" ? false : 3500,
  });
  const instantDownloadsQuery = trpc.store.instantDownloads.useQuery(paymentInput!, {
    enabled: Boolean(paymentInput) && paymentQuery.data?.paymentStatus === "paid" && !pendingPayment?.hasPhysicalItems,
  });
  const cancelPendingOrder = trpc.store.cancelPendingOrder.useMutation({
    onSuccess: result => {
      if (result.cancelled) {
        setPaymentExpired(true);
        toast.warning("Mã QR đã hết hạn sau 10 phút. Vui lòng tạo đơn mới để thanh toán.");
      }
    },
  });

  useEffect(() => {
    if (!pendingPayment || paymentQuery.data?.paymentStatus === "paid" || paymentExpired) return;
    const timer = window.setTimeout(() => cancelPendingOrder.mutate({ orderId: pendingPayment.orderId }), PAYMENT_QR_TEST_TTL_MS);
    return () => window.clearTimeout(timer);
  }, [pendingPayment?.orderId, paymentQuery.data?.paymentStatus, paymentExpired]);

  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = item.product ? Number(item.product.price) + Number(item.variant?.priceAdjustment || 0) : 0;
    return sum + price * item.quantity;
  }, 0);
  const hasPhysicalItems = cartItems.some(item => item.product?.type === "physical");
  const shippingFee = hasPhysicalItems ? ({ pickup: 0, standard: 30000, express: 50000 }[shipping.method]) : 0;
  const checkoutTotal = cartSubtotal + shippingFee;

  const selectSavedAddress = (address: { id: number; recipientName: string; phone: string; address: string }) => {
    setSelectedAddressId(address.id);
    setShipping(current => ({ ...current, name: address.recipientName, phone: address.phone, address: address.address }));
  };

  useEffect(() => {
    if (!hasPhysicalItems || selectedAddressId !== null || savedAddresses.length === 0) return;
    selectSavedAddress(savedAddresses.find(address => address.isDefault) || savedAddresses[0]);
  }, [hasPhysicalItems, savedAddresses, selectedAddressId]);

  const checkoutMutation = trpc.store.checkout.useMutation({
    onSuccess: order => {
      setPendingPayment(order);
      setPaymentExpired(false);
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
    const isExpired = paymentExpired || paymentQuery.data?.status === "cancelled";
    return (
      <StoreLayout>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <section className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-5 bg-slate-900 text-white">
              <p className="text-[11px] tracking-[0.18em] font-bold uppercase text-amber-300">DHL Stores · SePay / VietQR</p>
              <h1 className="text-xl font-black mt-1">{isPaid ? (lang === "vi" ? "Thanh toán đã xác nhận" : "Payment confirmed") : isExpired ? (lang === "vi" ? "Mã QR đã hết hạn" : "QR code expired") : (lang === "vi" ? "Quét QR để hoàn tất thanh toán" : "Scan QR to complete payment")}</h1>
            </div>

            {isPaid ? (
              <div className="p-8 text-center space-y-5">
                <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
                <div>
                  <h2 className="font-black text-xl text-slate-900">{pendingPayment.hasPhysicalItems ? (lang === "vi" ? "Đơn hàng đang được xử lý" : "Your order is being processed") : (lang === "vi" ? "File của bạn đã được mở khóa" : "Your files have been unlocked")}</h2>
                  <p className="text-sm text-slate-500 mt-2">{pendingPayment.hasPhysicalItems ? (lang === "vi" ? "Cửa hàng sẽ đóng gói và cập nhật trạng thái giao hàng cho đơn của bạn." : "The store will pack your order and update delivery status.") : (lang === "vi" ? "Mã QR đã được đóng. Bấm Tải ngay bên dưới để nhận tài nguyên của bạn." : "The QR code is now closed. Use Download now below to receive your resources.")}</p>
                </div>
                {pendingPayment.hasPhysicalItems ? <Link href="/account"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black">{lang === "vi" ? "Đi tới Tài khoản" : "Go to account"}</Button></Link> : instantDownloadsQuery.isLoading ? <p className="text-sm text-slate-500">Đang chuẩn bị liên kết tải…</p> : instantDownloadsQuery.data?.length ? <div className="flex flex-col items-center gap-3">{instantDownloadsQuery.data.map(download => <a key={`${download.orderId}-${download.productId}`} href={download.driveUrl || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-purple-500"><Download className="h-4 w-4" />Tải ngay: {download.productName}</a>)}<p className="text-xs text-slate-500">Liên kết tải hiển thị trong website trong 7 ngày sau thanh toán.</p></div> : <div className="space-y-3"><p className="text-sm text-slate-500">Liên kết tải đã hết hạn hoặc đang được chuẩn bị.</p><Link href="/account"><Button variant="outline" className="font-bold">Đi tới Tài khoản</Button></Link></div>}
              </div>
            ) : isExpired ? (
              <div className="space-y-5 p-8 text-center"><QrCode className="mx-auto h-16 w-16 text-rose-500" /><div><h2 className="text-xl font-black text-slate-900">Mã thanh toán đã hết hạn</h2><p className="mt-2 text-sm text-slate-500">Mã QR tự hủy sau 10 phút. Hãy quay lại giỏ để tạo mã QR mới.</p></div><Button onClick={() => { setPendingPayment(null); setPaymentExpired(false); }} className="bg-amber-500 font-black text-slate-950 hover:bg-amber-400">Tạo đơn mới</Button></div>
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
                  <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />{lang === "vi" ? "Đang chờ SePay xác nhận giao dịch… Mã sẽ hết hạn sau 10 phút." : "Waiting for SePay transaction confirmation… QR expires in 10 minutes."}</div>
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
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><div className={`w-10 h-10 rounded-xl grid place-items-center ${hasPhysicalItems ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"}`}><Download className="w-5 h-5" /></div><div><h1 className="text-xl font-black text-slate-900">{hasPhysicalItems ? (lang === "vi" ? "Thanh toán đơn hàng & giao nhận" : "Order and delivery checkout") : (lang === "vi" ? "Thanh toán tài nguyên số" : "Digital resource checkout")}</h1><p className="text-xs text-slate-500">{hasPhysicalItems ? "Điền địa chỉ nhận hàng và chọn hình thức giao." : (lang === "vi" ? "Tệp sẽ chỉ được mở khóa sau khi SePay xác nhận tiền vào." : "Files are unlocked only after SePay confirms the incoming payment.")}</p></div></div>
            <div className="space-y-3">{cartItems.map(item => item.product && <div key={item.id} className="flex gap-3 items-center"><img src={item.product.image} alt={item.product.name} className="w-14 h-14 object-cover rounded-lg border border-slate-200" /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{item.product.name}</p><p className="text-xs text-slate-500">{item.variant ? `${[item.variant.size && `Size: ${item.variant.size}`, item.variant.color && `Màu: ${item.variant.color}`, ...(item.variant.attributes || "").split(/\n|;/).map(value => value.trim()).filter(Boolean)].filter(Boolean).join(" · ")} · ` : ""}× {item.quantity}</p></div><p className="text-sm font-black text-slate-900">{formatCurrency((Number(item.product.price) + Number(item.variant?.priceAdjustment || 0)) * item.quantity)}</p></div>)}</div>
          </section>
          <form onSubmit={event => { event.preventDefault(); if (!acceptedTerms) return toast.error(lang === "vi" ? "Vui lòng đồng ý điều khoản trước khi đặt hàng." : "Please accept the terms before placing your order."); if (hasPhysicalItems && (!shipping.name || !shipping.phone || !shipping.address)) return toast.error("Vui lòng điền đủ thông tin nhận hàng."); checkoutMutation.mutate({ totalAmount: checkoutTotal, discountCode: discountCode.trim() || undefined, items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity, price: Number(item.product?.price ?? 0), variantId: item.variantId || undefined, attributes: item.attributes || undefined })), shipping: hasPhysicalItems ? shipping : undefined }); }} className="bg-white p-6 rounded-2xl border-2 border-sky-600 shadow-sm space-y-5">
            <h2 className="text-base font-black text-purple-700 uppercase">{lang === "vi" ? "Đơn hàng của bạn" : "Your order"}</h2>
            {hasPhysicalItems && <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><p className="text-xs font-black uppercase tracking-wide text-emerald-800">Thông tin nhận hàng</p><p className="mt-1 text-[11px] leading-relaxed text-emerald-700">Chọn địa chỉ đã lưu hoặc nhập một địa chỉ mới cho đơn hàng này.</p></div></div>{addressesQuery.isLoading ? <p className="text-xs text-slate-500">Đang tải địa chỉ đã lưu...</p> : savedAddresses.length > 0 && <div className="space-y-2">{savedAddresses.map(address => <button key={address.id} type="button" onClick={() => selectSavedAddress(address)} className={`w-full rounded-lg border p-3 text-left text-xs transition-colors ${selectedAddressId === address.id ? "border-emerald-500 bg-white ring-2 ring-emerald-100" : "border-emerald-100 bg-white hover:border-emerald-300"}`}><div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{address.recipientName} · {address.phone}</span>{address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">Mặc định</span>}</div><span className="mt-1 block leading-relaxed text-slate-600">{address.address}</span></button>)}<button type="button" onClick={() => { setSelectedAddressId(null); setShipping(current => ({ ...current, name: "", phone: "", address: "" })); }} className={`inline-flex items-center gap-1 text-xs font-bold ${selectedAddressId === null ? "text-emerald-800" : "text-slate-600 hover:text-emerald-700"}`}><Plus className="h-3.5 w-3.5" />Dùng địa chỉ khác</button></div>}<input required className="flex h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm" value={shipping.name} onChange={event => { setSelectedAddressId(null); setShipping(value => ({ ...value, name: event.target.value })); }} placeholder="Họ và tên người nhận" /><input required className="flex h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm" value={shipping.phone} onChange={event => { setSelectedAddressId(null); setShipping(value => ({ ...value, phone: event.target.value })); }} placeholder="Số điện thoại" inputMode="tel" /><textarea required className="flex min-h-20 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm" value={shipping.address} onChange={event => { setSelectedAddressId(null); setShipping(value => ({ ...value, address: event.target.value })); }} placeholder="Địa chỉ nhận hàng" /><Link href="/account" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">Quản lý địa chỉ đã lưu trong Tài khoản <ArrowLeft className="h-3 w-3 rotate-180" /></Link><select className="flex h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm" value={shipping.method} onChange={event => setShipping(value => ({ ...value, method: event.target.value as "pickup" | "standard" | "express" }))}><option value="pickup">Nhận tại cửa hàng — 0 đ</option><option value="standard">Giao tiêu chuẩn — 30.000 đ</option><option value="express">Giao nhanh — 50.000 đ</option></select><textarea className="flex min-h-16 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm" value={shipping.note} onChange={event => setShipping(value => ({ ...value, note: event.target.value }))} placeholder="Ghi chú giao hàng (tùy chọn)" /></div>}
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3"><label className="text-xs font-black uppercase tracking-wide text-violet-800">Mã giảm giá<input value={discountCode} onChange={event => setDiscountCode(event.target.value.toUpperCase())} className="mt-2 flex h-10 w-full rounded-md border border-violet-200 bg-white px-3 text-sm font-mono uppercase" placeholder="NHẬP MÃ ƯU ĐÃI" /></label><p className="mt-2 text-[11px] text-violet-700">Mã được kiểm tra tại máy chủ trước khi tạo mã QR. Số tiền QR sẽ là số tiền đã giảm.</p></div>
            <div className="space-y-2 text-sm border-y border-slate-100 py-4"><div className="flex justify-between"><span className="text-slate-500">{lang === "vi" ? "Tạm tính" : "Subtotal"}</span><span className="font-bold">{formatCurrency(cartSubtotal)}</span></div>{hasPhysicalItems && <div className="flex justify-between"><span className="text-slate-500">Phí giao hàng</span><span className="font-bold">{formatCurrency(shippingFee)}</span></div>}<div className="flex justify-between"><span className="text-slate-500">{lang === "vi" ? "Phương thức" : "Method"}</span><span className="font-bold text-sky-700">SePay · VietQR</span></div><div className="flex justify-between text-base pt-2"><span className="font-black">{lang === "vi" ? "Tổng" : "Total"}</span><span className="font-black">{formatCurrency(checkoutTotal)}</span></div></div>
            <div className="flex gap-3 items-start"><Checkbox id="terms" checked={acceptedTerms} onCheckedChange={checked => setAcceptedTerms(checked === true)} className="mt-0.5" /><label htmlFor="terms" className="text-xs leading-relaxed text-slate-600">{lang === "vi" ? <>Tôi đã đọc và đồng ý với <span className="font-bold text-rose-600">điều khoản và điều kiện của website</span>.</> : <>I have read and agree to the <span className="font-bold text-rose-600">website terms and conditions</span>.</>}</label></div>
            <Button type="submit" disabled={checkoutMutation.isPending} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black rounded-md py-5">{checkoutMutation.isPending ? (lang === "vi" ? "ĐANG TẠO ĐƠN..." : "CREATING ORDER...") : (lang === "vi" ? "ĐẶT HÀNG & LẤY MÃ QR" : "PLACE ORDER & GET QR")}</Button>
            <p className="text-[11px] leading-relaxed text-slate-500">{lang === "vi" ? "Thông tin đơn hàng được dùng để xử lý giao dịch và bảo vệ quyền tải tài nguyên của bạn." : "Order data is used to process the transaction and protect your download access."}</p>
          </form>
        </div>
      </main>
    </StoreLayout>
  );
}
