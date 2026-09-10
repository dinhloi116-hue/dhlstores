import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Printer, Share2, X } from "lucide-react";
import { toast } from "sonner";

type ProductSummary = {
  id: number;
  name: string;
};

type Props = {
  orderCode: string;
  order?: any;
  products: ProductSummary[];
  onPrint: (order: any) => void;
  onClose: () => void;
};

function formatCurrency(value: string | number | null | undefined) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getProductLabel(item: any, products: ProductSummary[]) {
  const product = item.product || products.find(candidate => candidate.id === item.productId);
  const name = product?.name || `Sản phẩm #${item.productId}`;
  return `${name}${item.variantLabel ? ` · ${item.variantLabel}` : ""}`;
}

function buildShareText(order: any, products: ProductSummary[]) {
  const items = order.items || [];
  const rows = items.map((item: any, index: number) => {
    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
    return `${index + 1}. ${getProductLabel(item, products)}\n   SL: ${item.quantity} · ${formatCurrency(item.price)} · ${formatCurrency(lineTotal)}`;
  });

  return [
    "DHL STORES - XÁC NHẬN ĐƠN HÀNG",
    `Mã đơn: #${order.orderCode}`,
    order.shippingName ? `Người nhận: ${order.shippingName}` : "",
    order.shippingPhone ? `SĐT: ${order.shippingPhone}` : "",
    order.shippingAddress ? `Địa chỉ: ${order.shippingAddress}` : "",
    "",
    ...rows,
    "",
    Number(order.shippingFee || 0) > 0 ? `Phí giao hàng: ${formatCurrency(order.shippingFee)}` : "",
    `TỔNG THANH TOÁN: ${formatCurrency(order.totalAmount)}`,
    order.shippingNote ? `Ghi chú: ${order.shippingNote}` : "",
    "",
    "DHL Stores cảm ơn bạn đã đặt hàng.",
  ].filter(Boolean).join("\n");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

export default function AdminOrderCreatedPanel({ orderCode, order, products, onPrint, onClose }: Props) {
  const handleCopy = async () => {
    if (!order) return;
    await copyText(buildShareText(order, products));
    toast.success("Đã sao chép nội dung đơn để gửi khách");
  };

  const handleShare = async () => {
    if (!order) return;
    const text = buildShareText(order, products);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Đơn hàng #${order.orderCode} · DHL Stores`, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText(text);
    toast.success("Thiết bị không mở được bảng chia sẻ; nội dung đơn đã được sao chép");
  };

  return (
    <section id="admin-order-created" className="m-5 scroll-mt-24 overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white shadow-lg shadow-emerald-100/60">
      <div className="flex flex-col gap-3 border-b border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Tạo đơn thành công</p>
            <h3 className="mt-1 font-display text-2xl font-black uppercase text-slate-950">Đơn vừa tạo #{orderCode}</h3>
            <p className="mt-1 text-xs text-slate-600">Kiểm tra lại đơn ngay tại đây rồi in, lưu PDF, sao chép hoặc chia sẻ cho khách.</p>
          </div>
        </div>
        <Button type="button" size="icon" variant="ghost" aria-label="Đóng đơn vừa tạo" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!order ? (
        <div className="p-6 text-sm font-semibold text-slate-600">Đang tải đầy đủ chi tiết đơn vừa tạo…</div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-black text-slate-950">#{order.orderCode}</p>
                <Badge className={order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                  {order.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                </Badge>
                <Badge variant="outline">{order.status === "completed" ? "Hoàn tất" : order.status === "shipping" ? "Đang giao" : order.status === "processing" ? "Đang xử lý" : "Chờ xử lý"}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="font-bold text-slate-500">Người nhận:</span> <strong>{order.shippingName || "—"}</strong></p>
                <p><span className="font-bold text-slate-500">Điện thoại:</span> <strong>{order.shippingPhone || "—"}</strong></p>
                <p className="sm:col-span-2"><span className="font-bold text-slate-500">Địa chỉ:</span> {order.shippingAddress || "—"}</p>
                {order.shippingNote && <p className="sm:col-span-2"><span className="font-bold text-slate-500">Ghi chú:</span> {order.shippingNote}</p>}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:min-w-56">
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Tổng thanh toán</p>
              <p className="mt-2 text-2xl font-black text-emerald-800">{formatCurrency(order.totalAmount)}</p>
              {Number(order.shippingFee || 0) > 0 && <p className="mt-1 text-xs text-slate-600">Đã gồm phí giao {formatCurrency(order.shippingFee)}</p>}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_4rem_7rem] bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:grid-cols-[minmax(0,1fr)_5rem_8rem_8rem]">
              <span>Sản phẩm / SKU</span><span className="text-center">SL</span><span className="text-right">Đơn giá</span><span className="hidden text-right sm:block">Thành tiền</span>
            </div>
            <div className="divide-y divide-slate-100">
              {(order.items || []).map((item: any, index: number) => {
                const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                return <div key={item.id || `${item.productId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_4rem_7rem] items-center gap-2 px-4 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_5rem_8rem_8rem]">
                  <div className="min-w-0"><p className="font-bold text-slate-900">{getProductLabel(item, products)}</p>{item.attributes && <p className="mt-0.5 text-[10px] text-slate-500">{item.attributes}</p>}</div>
                  <span className="text-center font-black">{item.quantity}</span>
                  <span className="text-right font-bold">{formatCurrency(item.price)}</span>
                  <span className="hidden text-right font-black sm:block">{formatCurrency(lineTotal)}</span>
                </div>;
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" className="bg-slate-950 font-black text-white hover:bg-slate-800" onClick={() => onPrint(order)}>
              <Printer className="mr-2 h-4 w-4" />In / Lưu PDF
            </Button>
            <Button type="button" variant="outline" className="font-black" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />Sao chép đơn gửi khách
            </Button>
            <Button type="button" className="bg-emerald-600 font-black text-white hover:bg-emerald-700" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />Chia sẻ đơn
            </Button>
            <Button type="button" variant="ghost" className="sm:ml-auto" onClick={onClose}>Đóng</Button>
          </div>
        </div>
      )}
    </section>
  );
}
