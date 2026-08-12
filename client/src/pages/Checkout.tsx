import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Download, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

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
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Thanh toán thành công! Đơn hàng đã được ghi nhận." : "Checkout successful! Order placed.");
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
          <h2 className="text-2xl font-bold text-white mb-4">
            {lang === 'vi' ? 'Vui lòng đăng nhập để thanh toán' : 'Please sign in to checkout'}
          </h2>
          <Button onClick={() => window.location.href = "/"} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            {t.home}
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
          <h2 className="text-2xl font-bold text-white">{t.emptyCart}</h2>
          <p className="text-slate-400 text-xs">{t.emptyCartDesc}</p>
          <Link href="/products">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              {t.exploreShop}
            </Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const formatCurrency = (val: number) => {
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPhysicalItems && (!shippingName || !shippingPhone || !shippingAddress)) {
      toast.error(lang === 'vi' ? "Vui lòng nhập đầy đủ thông tin nhận hàng cho sản phẩm vật lý" : "Please fill in all shipping details for physical items");
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
          <ArrowLeft className="w-4 h-4" /> {lang === 'vi' ? 'Tiếp tục mua sắm' : 'Continue Shopping'}
        </Link>

        <h1 className="text-3xl font-black text-white mb-8">{t.checkoutTitle}</h1>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-8">
            {hasPhysicalItems ? (
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{t.shippingInfo}</h2>
                    <p className="text-xs text-slate-400">{t.shippingDesc}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">{t.fullName}</label>
                    <Input
                      required
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="John Doe"
                      className="bg-slate-950 border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">{t.phone}</label>
                    <Input
                      required
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      placeholder="+1 234 567 890"
                      className="bg-slate-950 border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">{t.address}</label>
                    <Textarea
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="123 Street, City, Country"
                      className="bg-slate-950 border-slate-700 text-slate-100 rounded-xl min-h-[100px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">{t.note}</label>
                    <Input
                      value={shippingNote}
                      onChange={(e) => setShippingNote(e.target.value)}
                      placeholder="Deliver during office hours..."
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
                    <h2 className="text-lg font-bold text-white">{lang === 'vi' ? 'Sản phẩm số' : 'Digital Products'}</h2>
                    <p className="text-xs text-slate-400">{lang === 'vi' ? 'Nhận link tải ngay sau khi thanh toán.' : 'Instant download link upon checkout.'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white">{t.paymentMethod}</h2>
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-950" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.onlinePayment}</p>
                    <p className="text-xs text-slate-400">{t.onlinePaymentDesc}</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 border border-amber-500/40 text-amber-400">Free</Badge>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6 sticky top-28 shadow-xl">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-4">{t.orderSummary} ({cartItems.length})</h2>

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
                        <p className="text-slate-400">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-white">{formatCurrency(Number(p.price) * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>{t.subtotal}:</span>
                  <span className="text-white font-medium">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t.shippingFee}:</span>
                  <span className="text-emerald-400 font-medium">{t.free}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-3 border-t border-slate-800">
                  <span className="text-white">{t.totalPayment}:</span>
                  <span className="text-xl text-amber-400">{formatCurrency(cartSubtotal)}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-4 rounded-xl shadow-lg text-base"
              >
                {isSubmitting ? "Processing..." : t.confirmCheckout}
              </Button>

              <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Secure Checkout</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </StoreLayout>
  );
}
