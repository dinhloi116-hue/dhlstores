import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Download, ShieldCheck, ArrowLeft, Sparkles, Zap } from "lucide-react";
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
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [adding, setAdding] = useState<boolean>(false);

  const addToCartMutation = trpc.store.addToCart.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Đã thêm sản phẩm vào giỏ hàng thành công!" : "Added product to cart successfully!");
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
          <h2 className="text-2xl font-bold text-white mb-4">
            {lang === 'vi' ? 'Không tìm thấy sản phẩm' : 'Product not found'}
          </h2>
          <Link href="/products">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              {lang === 'vi' ? 'Quay lại danh sách sản phẩm' : 'Back to products'}
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
    const attributes = product.type === 'physical' ? `Size: ${selectedSize}` : undefined;
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
      attributes,
    });
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error(lang === 'vi' ? "Vui lòng đăng nhập để mua hàng" : "Please sign in to purchase");
      startLogin();
      return;
    }
    const attributes = product.type === 'physical' ? `Size: ${selectedSize}` : undefined;
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
      attributes,
    }, {
      onSuccess: () => {
        setLocation("/checkout");
      }
    });
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/products" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> {lang === 'vi' ? 'Quay lại danh sách sản phẩm' : 'Back to products'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-6">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4">
                <Badge className={product.type === 'physical' ? 'bg-blue-600 text-white font-bold px-3 py-1 text-xs' : 'bg-purple-600 text-white font-bold px-3 py-1 text-xs'}>
                  {product.type === 'physical' ? (lang === 'vi' ? 'Áo đấu vật lý' : 'Physical Jersey') : (lang === 'vi' ? 'Sản phẩm số' : 'Digital Asset')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{product.type === 'physical' ? (lang === 'vi' ? 'Áo bóng đá chính hãng DHL Stores' : 'Official DHL Stores Jersey') : (lang === 'vi' ? 'Sản phẩm số độc quyền' : 'Exclusive Digital Product')}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">{product.name}</h1>
              <p className="text-2xl font-black text-amber-400 mt-3">{formatCurrency(product.price)}</p>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed border-t border-b border-slate-800 py-4">
              {product.description}
            </p>

            {product.specs && (
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">{lang === 'vi' ? 'Thông số kỹ thuật / Chi tiết:' : 'Specifications / Details:'}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{product.specs}</p>
                {product.fileSize && (
                  <p className="text-xs text-purple-400 font-semibold pt-1">File Size: {product.fileSize}</p>
                )}
              </div>
            )}

            {product.type === 'physical' && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">{lang === 'vi' ? 'Chọn kích thước (Size):' : 'Select Size:'}</label>
                <div className="flex items-center gap-3">
                  {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-xl font-bold text-sm transition-all border ${selectedSize === size ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.type === 'physical' && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">{lang === 'vi' ? 'Số lượng:' : 'Quantity:'}</label>
                <div className="flex items-center gap-3 w-36 bg-slate-900 border border-slate-700 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white font-bold"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* 1-Click Buy & Add to Cart buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={adding}
                variant="outline"
                className="flex-1 border-amber-500/50 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold py-4 rounded-xl shadow-lg text-base"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                {adding ? "Adding..." : t.addToCart}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={adding}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-4 rounded-xl shadow-lg text-base"
              >
                <Zap className="w-5 h-5 mr-2" />
                {lang === 'vi' ? 'Mua ngay 1-Click' : 'Buy Now 1-Click'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{product.type === 'physical' ? (lang === 'vi' ? 'Đổi trả size trong 7 ngày' : '7-day size exchange') : (lang === 'vi' ? 'Bản quyền thương mại trọn đời' : 'Lifetime commercial license')}</span>
              </div>
              <div className="flex items-center gap-2">
                {product.type === 'physical' ? (
                  <>
                    <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>{lang === 'vi' ? 'Giao hàng toàn quốc nhanh chóng' : 'Fast global delivery'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{lang === 'vi' ? 'Tải xuống tự động 24/7' : 'Instant 24/7 downloads'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
