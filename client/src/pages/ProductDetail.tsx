import React, { useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Download, ShieldCheck, CheckCircle2, ArrowLeft, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const slug = params?.slug || "";

  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const productQuery = trpc.store.productBySlug.useQuery({ slug }, { enabled: !!slug });
  const product = productQuery.data;

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [adding, setAdding] = useState<boolean>(false);

  const addToCartMutation = trpc.store.addToCart.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm sản phẩm vào giỏ hàng thành công!");
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
          <h2 className="text-2xl font-bold text-white mb-4">Không tìm thấy sản phẩm</h2>
          <p className="text-slate-400 mb-8">Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ.</p>
          <Link href="/products">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              Quay lại danh sách sản phẩm
            </Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
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

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link href="/products" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách sản phẩm
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Product Image */}
          <div className="lg:col-span-6">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4">
                <Badge className={product.type === 'physical' ? 'bg-blue-600 text-white font-bold px-3 py-1 text-xs' : 'bg-purple-600 text-white font-bold px-3 py-1 text-xs'}>
                  {product.type === 'physical' ? 'Sản phẩm vật lý (Áo đấu)' : 'Sản phẩm số (File / Font)'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Product Details & Actions */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{product.type === 'physical' ? 'Áo bóng đá chính hãng DHL Stores' : 'Sản phẩm số độc quyền'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">{product.name}</h1>
              <p className="text-2xl font-black text-amber-400 mt-3">{formatCurrency(product.price)}</p>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed border-t border-b border-slate-800 py-4">
              {product.description}
            </p>

            {/* Specs / Details */}
            {product.specs && (
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Thông số kỹ thuật / Chi tiết:</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{product.specs}</p>
                {product.fileSize && (
                  <p className="text-xs text-purple-400 font-semibold pt-1">Dung lượng tệp: {product.fileSize}</p>
                )}
              </div>
            )}

            {/* Size selection for physical products */}
            {product.type === 'physical' && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Chọn kích thước (Size):</label>
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

            {/* Quantity */}
            {product.type === 'physical' && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Số lượng:</label>
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

            {/* Action buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={adding}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-4 rounded-xl shadow-lg text-base"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                {adding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
              </Button>
            </div>

            {/* Features Guarantee */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{product.type === 'physical' ? 'Đổi trả size trong 7 ngày' : 'Bản quyền thương mại trọn đời'}</span>
              </div>
              <div className="flex items-center gap-2">
                {product.type === 'physical' ? (
                  <>
                    <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Giao hàng toàn quốc nhanh chóng</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Tải xuống tệp tự động sau thanh toán</span>
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
