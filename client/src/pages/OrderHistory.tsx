import { useEffect, useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { History, Package, Download, ExternalLink, Search, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, Clock3, Truck } from "lucide-react";
import { toast } from "sonner";
import { translations, getClientLanguage, Language } from "@/lib/i18n";

export default function OrderHistory() {
  const { isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Language>(getClientLanguage());
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "cancelled">("all");
  const [query, setQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const t = translations[lang];

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const ordersQuery = trpc.store.myOrders.useQuery(undefined, { enabled: isAuthenticated });
  const addToCartMutation = trpc.store.addToCart.useMutation({
    onSuccess: () => toast.success(lang === "vi" ? "Đã thêm sản phẩm vào giỏ hàng" : "Product added to cart"),
    onError: error => toast.error(error.message),
  });
  const downloadsQuery = trpc.store.downloads.useQuery(undefined, { enabled: isAuthenticated });
  const orders = ordersQuery.data || [];
  const downloads = downloadsQuery.data || [];
  const filteredOrders = orders.filter(order => {
    if (filter === "pending" && (order.paymentStatus === "paid" || order.status === "cancelled")) return false;
    if (filter === "paid" && order.paymentStatus !== "paid") return false;
    if (filter === "cancelled" && order.status !== "cancelled") return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return String(order.id).includes(needle) || String(order.orderCode || "").toLowerCase().includes(needle) || (order.items || []).some(item => item.product?.name?.toLowerCase().includes(needle));
  });

  const formatCurrency = (value: string | number) => new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", { style: "currency", currency: lang === "vi" ? "VND" : "USD" }).format(Number(value || 0) / (lang === "vi" ? 1 : 25000));
  const statusLabel = (order: (typeof orders)[number]) => order.status === "cancelled" ? (lang === "vi" ? "Đã hủy" : "Cancelled") : order.paymentStatus === "paid" ? (order.hasPhysicalItems ? (lang === "vi" ? "Đang xử lý giao hàng" : "Preparing delivery") : (lang === "vi" ? "Đã thanh toán" : "Paid")) : (lang === "vi" ? "Chờ thanh toán" : "Payment pending");
  const statusSteps = (order: (typeof orders)[number]) => {
    if (order.status === "cancelled") return [{ label: lang === "vi" ? "Đã hủy" : "Cancelled", done: true }];
    if (!order.hasPhysicalItems) return [{ label: lang === "vi" ? "Đã thanh toán" : "Paid", done: order.paymentStatus === "paid" }, { label: lang === "vi" ? "Đã mở quyền tải" : "Download unlocked", done: order.status === "completed" }];
    const stage = order.trackingStage;
    return [
      { label: lang === "vi" ? "Đã đặt" : "Placed", done: order.paymentStatus === "paid" },
      { label: lang === "vi" ? "Đã xác nhận" : "Confirmed", done: order.paymentStatus === "paid" && ["processing", "completed"].includes(order.status) },
      { label: lang === "vi" ? (order.hasPreorderItems ? "Hàng đang về kho" : "Đang chuẩn bị gửi") : (order.hasPreorderItems ? "Inbound to warehouse" : "Preparing shipment"), done: Boolean(stage) || order.status === "completed" },
      { label: lang === "vi" ? "Đã giao" : "Delivered", done: order.status === "completed" },
    ];
  };
  const reorder = async (order: (typeof orders)[number]) => {
    const items = (order.items || []).filter(item => item.product);
    if (!items.length) return;
    for (const item of items) {
      await addToCartMutation.mutateAsync({ productId: item.productId, quantity: item.quantity, variantId: item.variantId || undefined, attributes: item.attributes || undefined, fulfillmentMode: item.fulfillmentMode || undefined });
    }
    window.location.href = "/cart";
  };
  const bulkReorder = async () => {
    const selectedOrders = filteredOrders.filter(order => selectedOrderIds.includes(order.id) && order.status !== "cancelled");
    const uniqueItems = new Map<string, { productId: number; quantity: number; variantId?: number; attributes?: string; fulfillmentMode?: "in_stock" | "preorder" }>();
    selectedOrders.forEach(order => (order.items || []).forEach(rawItem => {
      const item = rawItem as { product?: unknown; productId: number; quantity: number; variantId?: number | null; attributes?: string; fulfillmentMode?: "in_stock" | "preorder" };
      if (!item.product) return;
      const key = `${item.productId}:${item.variantId || 0}:${item.attributes || ""}:${item.fulfillmentMode || "in_stock"}`;
      const current = uniqueItems.get(key);
      uniqueItems.set(key, current ? { ...current, quantity: current.quantity + item.quantity } : { productId: item.productId, quantity: item.quantity, variantId: item.variantId || undefined, attributes: item.attributes || undefined, fulfillmentMode: item.fulfillmentMode || "in_stock" });
    }));
    for (const item of Array.from(uniqueItems.values())) await addToCartMutation.mutateAsync(item);
    setSelectedOrderIds([]);
    if (uniqueItems.size) window.location.href = "/cart";
  };

  if (!isAuthenticated) {
    return <StoreLayout><main className="mx-auto max-w-3xl px-4 py-24 text-center"><History className="mx-auto mb-4 h-12 w-12 text-amber-500" /><h1 className="text-2xl font-black text-slate-900">{lang === "vi" ? "Đăng nhập để xem lịch sử đơn hàng" : "Sign in to view order history"}</h1><Button onClick={() => startLogin()} className="mt-5 bg-amber-500 font-black text-slate-950 hover:bg-amber-400">{t.login}</Button></main></StoreLayout>;
  }

  return <StoreLayout><main className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">DHL Stores · Account</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900"><History className="h-6 w-6 text-amber-500" />{lang === "vi" ? "Lịch sử đơn hàng" : "Order history"}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{lang === "vi" ? "Xem lại các giao dịch, trạng thái thanh toán và quyền tải tệp của bạn." : "Review your transactions, payment status and download access."}</p></div><Link href="/account"><Button variant="outline" className="font-bold">{lang === "vi" ? "Về tài khoản" : "Back to account"}</Button></Link></div><div className="mt-5 flex flex-col gap-3 md:flex-row"><div className="flex flex-wrap items-center gap-2 md:order-2"><button type="button" disabled={!selectedOrderIds.length || addToCartMutation.isPending} onClick={() => void bulkReorder()} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">{addToCartMutation.isPending ? (lang === "vi" ? "Đang thêm…" : "Adding…") : (lang === "vi" ? `Mua lại ${selectedOrderIds.length} đơn` : `Buy ${selectedOrderIds.length} orders again`)}</button>{selectedOrderIds.length > 0 && <button type="button" onClick={() => setSelectedOrderIds([])} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{lang === "vi" ? "Bỏ chọn" : "Clear selection"}</button>}</div><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={lang === "vi" ? "Tìm theo mã đơn hoặc tên sản phẩm…" : "Search order code or product…"} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" /></label><div className="flex flex-wrap gap-2">{([['all', 'Tất cả'], ['pending', 'Chờ thanh toán'], ['paid', 'Đã thanh toán'], ['cancelled', 'Đã hủy']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-black transition ${filter === value ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:border-amber-200"}`}>{lang === "vi" ? label : value === "all" ? "All" : value === "pending" ? "Pending" : value === "paid" ? "Paid" : "Cancelled"}</button>)}</div></div></header>
    {ordersQuery.isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{lang === "vi" ? "Đang tải lịch sử đơn hàng…" : "Loading order history…"}</div> : filteredOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="font-bold text-slate-700">{query ? (lang === "vi" ? "Không tìm thấy đơn phù hợp" : "No matching orders") : (lang === "vi" ? "Bạn chưa có giao dịch nào" : "No transactions yet")}</p><Link href="/products"><Button className="mt-4 bg-amber-500 font-black text-slate-950 hover:bg-amber-400">{lang === "vi" ? "Khám phá sản phẩm" : "Explore products"}</Button></Link></div> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{filteredOrders.map(order => { const firstItem = order.items?.[0]; const product = firstItem?.product; const orderDownloads = downloads.filter(item => item.orderId === order.id && item.driveUrl); return <article key={order.id} className="border-b border-slate-100 p-4 last:border-b-0 sm:p-5"><div className="flex flex-wrap items-center gap-2"><input type="checkbox" aria-label={`${lang === "vi" ? "Chọn đơn" : "Select order"} #${order.orderCode || order.id}`} checked={selectedOrderIds.includes(order.id)} onChange={event => setSelectedOrderIds(current => event.target.checked ? [...current, order.id] : current.filter(id => id !== order.id))} className="h-4 w-4 accent-amber-500" /><span className="font-black text-slate-900">#{order.orderCode || order.id}</span><span className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")}</span><Badge className={order.status === "cancelled" ? "bg-rose-100 text-rose-800" : order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{statusLabel(order)}</Badge><span className="ml-auto font-black text-amber-700">{formatCurrency(order.totalAmount)}</span></div><div className="mt-3 flex flex-wrap items-center gap-3"><div className="flex min-w-0 flex-1 items-center gap-2">{product?.image ? <img src={product.image} alt="" className="h-10 w-10 rounded-lg border border-slate-200 object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><Package className="h-4 w-4 text-slate-400" /></div>}<span className="max-w-[24rem] truncate text-sm font-semibold text-slate-700">{product?.name || (lang === "vi" ? "Sản phẩm" : "Product")}{(order.items?.length || 0) > 1 ? ` +${(order.items?.length || 1) - 1}` : ""}</span></div>{orderDownloads.map(download => <a key={`${download.orderId}-${download.productId}`} href={download.driveUrl || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:underline"><Download className="h-3 w-3" />{lang === "vi" ? "Tải tệp" : "Download"}</a>)}<button type="button" disabled={addToCartMutation.isPending || order.status === "cancelled"} onClick={() => void reorder(order)} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${addToCartMutation.isPending ? "animate-spin" : ""}`} />{lang === "vi" ? "Mua lại" : "Buy again"}</button><button type="button" onClick={() => setExpandedOrderId(current => current === order.id ? null : order.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">{expandedOrderId === order.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}{lang === "vi" ? "Chi tiết" : "Details"}</button>{order.hasPhysicalItems && order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-violet-700 hover:underline"><ExternalLink className="h-3 w-3" />{lang === "vi" ? "Theo dõi giao hàng" : "Track delivery"}</a>}</div>{expandedOrderId === order.id && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs font-black text-slate-800"><Truck className="h-4 w-4 text-violet-600" />{lang === "vi" ? "Trạng thái đơn hàng" : "Order status"}</div><div className="mt-3 grid gap-2 sm:grid-cols-4">{statusSteps(order).map((step, index) => <div key={`${order.id}-${index}`} className={`rounded-lg border px-2.5 py-2 text-xs ${step.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}><div className="flex items-center gap-1.5 font-black">{step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{step.label}</div></div>)}</div>{order.trackingStage && <p className="mt-3 text-xs font-semibold text-slate-600">{lang === "vi" ? `Cập nhật hiện tại: ${order.trackingStage}` : `Current update: ${order.trackingStage}`}</p>}{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-violet-700 hover:underline"><ExternalLink className="h-3 w-3" />{lang === "vi" ? "Mở link theo dõi" : "Open tracking link"}</a>}</div>}</article>; })}</section>}
  </main></StoreLayout>;
}
