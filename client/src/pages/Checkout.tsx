import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Download, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = item.product ? parseFloat(item.product.price) : 0;
    return sum + price * item.quantity;
  }, 0);

  const checkoutMutation = trpc.store.checkout.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Thanh toán thành công! Mở khóa tải tệp số ngay lập tức." : "Checkout successful! Files unlocked instantly.");
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
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
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
          <ShoppingBag className="w-16 h-16 mx-auto text-slate-300" />
          <h2 className="text-xl font-bold text-slate-800">{t.emptyCart}</h2>
          <p className="text-xs text-slate-500">{t.emptyCartDesc}</p>
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
    setIsSubmitting(true);
    checkoutMutation.mutate({
      totalAmount: cartSubtotal,
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/products" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> {lang === 'vi' ? 'Tiếp tục mua sắm' : 'Continue Shopping'}
        </Link>

        <h1 className="text-2xl font-black text-slate-900 mb-6">{t.checkoutTitle}</h1>

        <form onSubmit={handleCheckout} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{lang === 'vi' ? 'Đơn Hàng Tài Nguyên Số 100%' : '100% Digital Resource Order'}</h2>
                <p className="text-xs text-slate-500">{lang === 'vi' ? 'Không cần địa chỉ giao hàng. Tải file tự động 24/7 ngay sau xác nhận.' : 'No shipping address needed. Instant 24/7 downloads.'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{lang === 'vi' ? 'Sản phẩm trong đơn hàng:' : 'Order Items:'}</h3>
              {cartItems.map(item => {
                const p = item.product;
                if (!p) return null;
                return (
                  <div key={item.id} className="flex gap-3 items-center text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-black text-amber-600">{formatCurrency(Number(p.price) * item.quantity)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">{t.paymentMethod}</h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-amber-500/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{t.onlinePayment}</p>
                  <p className="text-[11px] text-slate-500">{t.onlinePaymentDesc}</p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-800 font-bold border border-amber-200">Free</Badge>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-sm font-bold border-b border-slate-100 pb-3">
              <span className="text-slate-600">{t.totalPayment}:</span>
              <span className="text-xl font-black text-amber-600">{formatCurrency(cartSubtotal)}</span>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl shadow-md text-base"
            >
              {isSubmitting ? "Processing..." : t.confirmCheckout}
            </Button>

            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Instant Digital Delivery Guaranteed</span>
            </div>
          </div>
        </form>
      </div>
    </StoreLayout>
  );
}
