import { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import AssetVisual from "@/components/AssetVisual";
import { trpc } from "@/lib/trpc";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Download, ShieldCheck, ArrowLeft, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug || "";

  const { isAuthenticated } = useAuth();
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

  const productQuery = trpc.store.productBySlug.useQuery({ slug }, { enabled: !!slug });
  const product = productQuery.data;

  const [quantity, setQuantity] = useState<number>(1);
  const [adding, setAdding] = useState<boolean>(false);

  const addToCartMutation = trpc.store.addToCart.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Đã thêm tài nguyên vào giỏ hàng thành công!" : "Added resource to cart successfully!");
      utils.store.cart.invalidate();
      setAdding(false);
    },
    onError: (err) => {
      toast.error(err.message || "Không thể thêm vào giỏ hàng");
      setAdding(false);
    }
  });

  if (productQuery.isLoading) {
    return (
      <StoreLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            {lang === 'vi' ? 'Không tìm thấy tài nguyên' : 'Resource not found'}
          </h2>
          <Link href="/products">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              {lang === 'vi' ? 'Quay lại danh sách' : 'Back to library'}
            </Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error(lang === 'vi' ? "Vui lòng đăng nhập để thêm vào giỏ hàng" : "Please sign in to add to cart");
      startLogin();
      return;
    }

    setAdding(true);
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
    });
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error(lang === 'vi' ? "Vui lòng đăng nhập để mua tài nguyên" : "Please sign in to purchase");
      startLogin();
      return;
    }
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
    }, {
      onSuccess: () => {
        setLocation("/checkout");
      }
    });
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/products" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> {lang === 'vi' ? 'Quay lại kho tài nguyên' : 'Back to library'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
              <AssetVisual categoryId={product.categoryId} title={product.name} fileSize={product.fileSize} imageUrl={product.image} />
              <div className="absolute top-4 left-4">
                <Badge className="bg-purple-600 text-white font-bold px-3 py-1 text-xs">
                  {lang === 'vi' ? 'Tài nguyên số cao cấp (Digital Asset)' : 'Premium Digital Asset'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'vi' ? 'Bản quyền thương mại trọn đời' : 'Lifetime Commercial License'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{product.name}</h1>
              <p className="text-2xl font-black text-amber-600 mt-2">{formatCurrency(product.price)}</p>
            </div>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-b border-slate-100 py-4">
              {product.description}
            </p>

            {product.specs && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{lang === 'vi' ? 'Thông số kỹ thuật / Định dạng:' : 'Specifications / Format:'}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{product.specs}</p>
                {product.fileSize && (
                  <p className="text-xs text-purple-600 font-bold pt-1">File Size: {product.fileSize}</p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{lang === 'vi' ? 'Số lượng gói:' : 'Quantity:'}</label>
              <div className="flex items-center gap-3 w-36 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-black font-bold"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-black font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={adding}
                variant="outline"
                className="flex-1 border-amber-500 bg-white hover:bg-amber-50 text-amber-700 font-bold py-3.5 rounded-xl shadow-xs text-sm"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {adding ? "Adding..." : t.addToCart}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={adding}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 rounded-xl shadow-md text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                {lang === 'vi' ? 'Tải ngay 1-Click (Mua ngay)' : 'Instant 1-Click Buy'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{lang === 'vi' ? 'Bản quyền thương mại trọn đời' : 'Lifetime commercial license'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span>{lang === 'vi' ? 'Tải xuống tự động 24/7' : 'Instant 24/7 downloads'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
