import React, { useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Download, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const cartQuery = trpc.store.cart.useQuery(undefined, { enabled: isAuthenticated });
  const cartItems = cartQuery.data || [];

  const [shippingName, setShippingName] = useState(user?.name || "");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasPhysicalItems = cartItems.some(item => item.product?.type === 'physical');

  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = item.product ? parseFloat(item.product.price) : 0;
    return sum + price * item.quantity;
  }, 0);

  const checkoutMutation = trpc.store.checkout.useMutation({
    onSuccess: (data) => {
      toast.success("Thanh toán thành công! Đơn hàng đã được ghi nhận.");
      utils.store.cart.invalidate();
      setLocation("/account");
    },
    onError: (err) => {
      toast.error(err.message || "Thanh toán thất bại");
      setIsSubmitting(false);
    }
  });

  if (!isAuthenticated) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Vui lòng đăng nhập để thanh toán</h2>
          <Button onClick={() => window.location.href = "/"} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            Về trang chủ
          </Button>
        </div>
      </StoreLayout>
    );
  }

  if (cartItems.length === 0) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
          <ShoppingBag className="w-16 h-16 mx-auto text-slate-600" />
          <h2 className="text-2xl font-bold text-white">Giỏ hàng của bạn đang trống</h2>
          <p className="text-slate-400 text-xs">Hãy thêm sản phẩm vào giỏ hàng trước khi tiến hành thanh toán.</p>
          <Link href="/products">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              Khám phá sản phẩm
            </Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPhysicalItems && (!shippingName || !shippingPhone || !shippingAddress)) {
      toast.error("Vui lòng nhập đầy đủ thông tin nhận hàng cho sản phẩm vật lý (Áo bóng đá)");
      return;
    }

    setIsSubmitting(true);
    checkoutMutation.mutate({
      shippingName: hasPhysicalItems ? shippingName : undefined,
      shippingPhone: hasPhysicalItems ? shippingPhone : undefined,
      shippingAddress: hasPhysicalItems ? shippingAddress : undefined,
      shippingNote: hasPhysicalItems ? shippingNote : undefined,
      totalAmount: cartSubtotal,
      hasPhysicalItems,
      items: cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product ? parseFloat(item.product.price) : 0,
        attributes: item.attributes || undefined,
      }))
    });
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/products" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Tiếp tục mua sắm
        </Link>

        <h1 className="text-3xl font-black text-white mb-8">Thanh Toán Đơn Hàng</h1>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Shipping Info (if physical) & Payment method */}
          <div className="lg:col-span-7 space-y-8">
            {hasPhysicalItems ? (
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Thông Tin Giao Hàng Vật Lý</h2>
                    <p className="text-xs text-slate-400">Giỏ hàng có chứa sản phẩm vật lý (Áo bóng đá), vui lòng điền địa chỉ chính xác.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">Họ và tên người nhận (*)</label>
                    <Input
                      required
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="bg-slate-950 border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">Số điện thoại liên hệ (*)</label>
                    <Input
                      required
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      placeholder="0909xxxxxx"
                      className="bg-slate-950 border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">Địa chỉ nhận hàng chi tiết (*)</label>
                    <Textarea
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                      className="bg-slate-950 border-slate-700 text-slate-100 rounded-xl min-h-[100px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">Ghi chú đơn hàng (Tùy chọn)</label>
                    <Input
                      value={shippingNote}
                      onChange={(e) => setShippingNote(e.target.value)}
                      placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                      className="bg-slate-950 border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Đơn Hàng Sản Phẩm Số Kỹ Thuật Số</h2>
                    <p className="text-xs text-slate-400">Giỏ hàng chỉ chứa sản phẩm số. Bạn sẽ nhận link tải ngay lập tức sau khi thanh toán thành công.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white">Phương Thức Thanh Toán</h2>
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-950" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Thanh toán trực tuyến giả lập an toàn (Demo Checkout)</p>
                    <p className="text-xs text-slate-400">Xác nhận thanh toán ngay lập tức không cần thẻ ngân hàng thật.</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 border border-amber-500/40 text-amber-400">Miễn phí giao dịch</Badge>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6 sticky top-28 shadow-xl">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Tóm Tắt Đơn Hàng ({cartItems.length})</h2>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {cartItems.map(item => {
                  const p = item.product;
                  if (!p) return null;
                  return (
                    <div key={item.id} className="flex gap-3 items-center text-xs">
                      <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-slate-800" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{p.name}</p>
                        {item.attributes && <p className="text-amber-400 font-medium">{item.attributes}</p>}
                        <p className="text-slate-400">SL: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-white">{formatCurrency(Number(p.price) * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Tạm tính:</span>
                  <span className="text-white font-medium">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Phí vận chuyển:</span>
                  <span className="text-emerald-400 font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-3 border-t border-slate-800">
                  <span className="text-white">Tổng thanh toán:</span>
                  <span className="text-xl text-amber-400">{formatCurrency(cartSubtotal)}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-4 rounded-xl shadow-lg text-base"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
              </Button>

              <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Giao dịch an toàn & bảo mật 100%</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </StoreLayout>
  );
}
