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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Download, ShieldCheck, ArrowLeft, Clock3, Sparkles, Tag, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function formatVariantOptions(variant: { size?: string; color?: string; attributes?: string }) {
  return [variant.size && `Size: ${variant.size}`, variant.color && `Màu: ${variant.color}`, ...(variant.attributes || "").split(/\n|;/).map(item => item.trim()).filter(Boolean)].filter(Boolean).join(" · ") || "Phiên bản chuẩn";
}

function getVariantOptions(variant: { size?: string; color?: string; attributes?: string }) {
  const options: Array<{ name: string; value: string }> = [];
  if (variant.color) options.push({ name: "Màu sắc", value: variant.color });
  if (variant.size) options.push({ name: "Kích thước", value: variant.size });
  for (const item of (variant.attributes || "").split(/\n|;/).map(value => value.trim()).filter(Boolean)) {
    const [name, ...rest] = item.split(":");
    const value = rest.join(":").trim();
    options.push({ name: value ? name.trim() || "Lựa chọn" : "Lựa chọn", value: value || name.trim() });
  }
  return options;
}

export default function ProductDetail() {
  const [, singularParams] = useRoute("/product/:slug");
  const [, pluralParams] = useRoute("/products/:slug");
  const [, setLocation] = useLocation();
  const slug = singularParams?.slug || pluralParams?.slug || "";

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

  const productQuery = trpc.store.productBySlug.useQuery({ slug }, { enabled: !!slug, retry: false });
  const product = productQuery.data;
  const variantsQuery = trpc.store.productVariants.useQuery({ productId: product?.id || 1 }, { enabled: product?.type === "physical" });
  const variants = variantsQuery.data || [];

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [adding, setAdding] = useState<boolean>(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [variantSort, setVariantSort] = useState<'label' | 'price-asc' | 'price-desc'>('label');
  const [fulfillmentMode, setFulfillmentMode] = useState<'in_stock' | 'preorder'>('in_stock');
  const [hoveredPreview, setHoveredPreview] = useState<{ variantId: number; x: number; y: number } | null>(null);
  const [previewVariantId, setPreviewVariantId] = useState<number | null>(null);
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId);
  const sortedVariants = [...variants].sort((a, b) => {
    if (variantSort === 'price-asc') return Number(a.priceAdjustment) - Number(b.priceAdjustment);
    if (variantSort === 'price-desc') return Number(b.priceAdjustment) - Number(a.priceAdjustment);
    return formatVariantOptions(a).localeCompare(formatVariantOptions(b), 'vi');
  });
  const previewVariant = variants.find(variant => variant.id === previewVariantId);
  const hoveredVariant = variants.find(variant => variant.id === hoveredPreview?.variantId);
  const optionGroups = Array.from(new Set(sortedVariants.flatMap(variant => getVariantOptions(variant)).map(option => option.name))).map(name => ({ name, values: Array.from(new Set(sortedVariants.flatMap(variant => getVariantOptions(variant)).filter(option => option.name === name).map(option => option.value))) }));
  const selectedOptionValues = new Map(getVariantOptions(selectedVariant || {}).map(option => [option.name, option.value]));
  const availableStock = product?.type === "physical" ? (selectedVariant ? selectedVariant.stock : variants.length > 0 ? Math.max(...variants.map(variant => variant.stock)) : product.stock) : Number.MAX_SAFE_INTEGER;
  const requiresVariant = product?.type === "physical" && variants.length > 0;
  const isPreorder = product?.type === "physical" && fulfillmentMode === 'preorder';

  useEffect(() => {
    if (product?.type === "physical" && fulfillmentMode === 'in_stock' && availableStock > 0) setQuantity(current => Math.min(current, availableStock));
  }, [availableStock, product?.type, fulfillmentMode]);

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

  if (productQuery.isError || !product) {
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

    if (product.type === "physical" && variants.length > 0 && !selectedVariantId) return toast.error("Hãy chọn kích thước hoặc màu sắc");
    if (product.type === "physical" && fulfillmentMode === 'in_stock' && availableStock < quantity) return toast.error("Số lượng yêu cầu vượt tồn kho hiện có");
    setAdding(true);
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
      variantId: selectedVariantId || undefined,
      fulfillmentMode: product.type === "physical" ? fulfillmentMode : undefined,
    });
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error(lang === 'vi' ? "Vui lòng đăng nhập để mua tài nguyên" : "Please sign in to purchase");
      startLogin();
      return;
    }
    if (product.type === "physical" && variants.length > 0 && !selectedVariantId) return toast.error("Hãy chọn kích thước hoặc màu sắc");
    if (product.type === "physical" && fulfillmentMode === 'in_stock' && availableStock < quantity) return toast.error("Số lượng yêu cầu vượt tồn kho hiện có");
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
      variantId: selectedVariantId || undefined,
      fulfillmentMode: product.type === "physical" ? fulfillmentMode : undefined,
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
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
              {(selectedVariant?.image || product.image) ? <img src={selectedVariant?.image || product.image} alt={selectedVariant ? `${product.name} · ${formatVariantOptions(selectedVariant)}` : product.name} className="h-full w-full object-contain" /> : <AssetVisual categoryId={product.categoryId} title={product.name} fileSize={product.fileSize} />}
            </div>
            {product.description && <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xs font-black uppercase tracking-wide text-slate-800">{lang === 'vi' ? 'Mô tả sản phẩm' : 'Product description'}</h2>{product.description.length > 260 && <button type="button" onClick={() => setDescriptionExpanded(current => !current)} className="shrink-0 text-xs font-black text-amber-700 hover:text-amber-900">{descriptionExpanded ? (lang === 'vi' ? 'Thu gọn' : 'Show less') : (lang === 'vi' ? 'Xem thêm' : 'Read more')}</button>}</div><p className={`mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm ${descriptionExpanded ? '' : 'line-clamp-5'}`}>{product.description}</p></section>}
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{product.type === "physical" ? (isPreorder ? (lang === 'vi' ? 'Order trước · dự kiến 7–10 ngày' : 'Pre-order · estimated 7–10 days') : (lang === 'vi' ? `${availableStock > 0 ? `Còn ${availableStock}` : "Đã hết"} trong kho` : `${availableStock > 0 ? availableStock : "Out of"} stock`)) : (lang === 'vi' ? 'Bản quyền thương mại trọn đời' : 'Lifetime Commercial License')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{product.name}</h1>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1"><p className="text-2xl font-black text-amber-600">{formatCurrency((Number(product.price) + Number(variants.find(variant => variant.id === selectedVariantId)?.priceAdjustment || 0)) * (isPreorder ? 0.9 : 1))}</p>{isPreorder && <><p className="text-sm font-bold text-slate-400 line-through">{formatCurrency(Number(product.price) + Number(variants.find(variant => variant.id === selectedVariantId)?.priceAdjustment || 0))}</p><Badge className="bg-rose-100 text-rose-700">Giảm 10% Order</Badge></>}</div>
            </div>

            {product.type === "physical" && variants.length > 0 && (
              <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div><label className="text-xs font-black uppercase tracking-wide text-emerald-800">Chọn phiên bản & xem tồn kho</label><p className="mt-1 text-xs text-emerald-700">Chọn theo thuộc tính hoặc chọn trực tiếp một dòng SKU có ảnh và số lượng còn lại.</p></div>
                  <label className="text-xs font-bold text-slate-700">Sắp xếp SKU<select value={variantSort} onChange={event => setVariantSort(event.target.value as typeof variantSort)} className="mt-1 block h-9 w-full rounded-lg border border-emerald-200 bg-white px-2 text-xs font-bold text-slate-800"><option value="label">Theo tên</option><option value="price-asc">Giá thấp → cao</option><option value="price-desc">Giá cao → thấp</option></select></label>
                </div>
                {optionGroups.map(group => <div key={group.name} className="space-y-2"><p className="text-xs font-black uppercase tracking-wide text-slate-700">{group.name}</p><div className="flex flex-wrap gap-2">{group.values.map(value => { const compatible = sortedVariants.some(variant => { const options = new Map(getVariantOptions(variant).map(option => [option.name, option.value])); return options.get(group.name) === value && Array.from(selectedOptionValues.entries()).every(([selectedName, selectedValue]) => selectedName === group.name || options.get(selectedName) === selectedValue); }); const isSelected = selectedOptionValues.get(group.name) === value; return <button key={value} type="button" disabled={!compatible} onClick={() => { const candidate = sortedVariants.find(variant => { const options = new Map(getVariantOptions(variant).map(option => [option.name, option.value])); return options.get(group.name) === value && Array.from(selectedOptionValues.entries()).every(([selectedName, selectedValue]) => selectedName === group.name || options.get(selectedName) === selectedValue); }); setSelectedVariantId(candidate?.id ?? null); }} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-500"} disabled:cursor-not-allowed disabled:opacity-35`}>{value}</button>; })}</div></div>)}
                <div className="grid gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">SKU đang chọn</p><p className="mt-1 text-xs font-semibold text-emerald-900">{selectedVariant ? formatVariantOptions(selectedVariant) : 'Chọn một phiên bản ở phía trên'}</p></div><div><label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Số lượng</label><div className="mt-1 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-8 w-8 font-black text-slate-700 hover:text-black">−</button><span className="w-8 text-center text-sm font-black text-slate-900">{quantity}</span><button type="button" onClick={() => setQuantity(quantity + 1)} disabled={product.type === "physical" && !isPreorder && quantity >= availableStock} className="h-8 w-8 font-black text-slate-700 hover:text-black disabled:cursor-not-allowed disabled:opacity-35">+</button></div></div></div>
                <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setFulfillmentMode('in_stock')} className={`rounded-xl border p-3 text-left transition ${!isPreorder ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100" : "border-slate-200 bg-white hover:border-amber-300"}`}><span className="flex items-center gap-1.5 text-xs font-black text-slate-900"><Zap className="h-3.5 w-3.5 text-amber-600" />Mua ngay</span><span className="mt-1 block text-[11px] text-slate-600">Giao từ hàng sẵn có; áp dụng tồn kho thực tế.</span></button><button type="button" onClick={() => setFulfillmentMode('preorder')} className={`rounded-xl border p-3 text-left transition ${isPreorder ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100" : "border-slate-200 bg-white hover:border-rose-300"}`}><span className="flex items-center gap-1.5 text-xs font-black text-rose-700"><Clock3 className="h-3.5 w-3.5" />Order trước · giảm 10%</span><span className="mt-1 block text-[11px] text-slate-600">Dự kiến 7–10 ngày; dùng được với mọi SKU.</span></button></div>
              </section>
            )}

            {product.specs && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{lang === 'vi' ? 'Thông số kỹ thuật / Định dạng:' : 'Specifications / Format:'}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{product.specs}</p>
                {product.fileSize && (
                  <p className="text-xs text-purple-600 font-bold pt-1">File Size: {product.fileSize}</p>
                )}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={adding || (product.type === "physical" && ((fulfillmentMode === 'in_stock' && availableStock <= 0) || (requiresVariant && !selectedVariantId)))}
                variant="outline"
                className="flex-1 border-amber-500 bg-white hover:bg-amber-50 text-amber-700 font-bold py-3.5 rounded-xl shadow-xs text-sm"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {adding ? "Adding..." : (isPreorder ? "Thêm Order vào giỏ" : t.addToCart)}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={adding || (product.type === "physical" && ((fulfillmentMode === 'in_stock' && availableStock <= 0) || (requiresVariant && !selectedVariantId)))}
                className={`flex-1 font-bold py-3.5 rounded-xl shadow-md text-sm ${isPreorder ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-amber-500 text-slate-950 hover:bg-amber-600"}`}
              >
                {isPreorder ? <Clock3 className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                {product.type === "physical" ? (isPreorder ? 'Order ngay · giảm 10%' : (lang === 'vi' ? 'Mua ngay & chọn giao hàng' : 'Buy now & choose delivery')) : (lang === 'vi' ? 'Tải ngay 1-Click (Mua ngay)' : 'Instant 1-Click Buy')}
              </Button>
            </div>
            {product.type === "physical" && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-900"><div className="flex items-center gap-2 font-black"><Tag className="h-4 w-4" />Order trước 7–10 ngày giảm 10%</div><p className="mt-1">Tất cả SKU đều có thể Order trước với mức giá giảm 10%. Đơn được ghi rõ hình thức Order để cửa hàng xử lý riêng; không dùng tồn kho sẵn có.</p></div>}

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

            {product.type === "physical" && variants.length > 0 && <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xs font-black uppercase tracking-wide text-slate-800">Tồn kho theo SKU</h2><p className="mt-1 text-xs text-slate-500">Rê chuột vào ảnh để xem lớn; trên điện thoại, chạm ảnh để mở xem trước.</p></div><span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">{variants.length} SKU</span></div><div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="max-h-80 overflow-y-auto"><div className="sticky top-0 z-10 grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(7.5rem,auto)] gap-3 bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600"><span>Ảnh</span><span>Phiên bản</span><span className="text-right">SKU · tồn</span></div>{sortedVariants.map(variant => { const isSelected = variant.id === selectedVariantId; const outOfStock = variant.stock <= 0; return <button key={variant.id} type="button" disabled={outOfStock} onClick={() => setSelectedVariantId(variant.id)} className={`grid w-full grid-cols-[3.5rem_minmax(0,1fr)_minmax(7.5rem,auto)] items-center gap-3 border-t border-slate-100 px-3 py-2 text-left text-xs transition-colors ${isSelected ? "bg-emerald-50" : "hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-55`}><span role={variant.image ? "button" : undefined} tabIndex={variant.image ? 0 : undefined} aria-label={variant.image ? `Xem ảnh lớn ${formatVariantOptions(variant)}` : undefined} onMouseEnter={event => { if (variant.image && window.innerWidth >= 768) setHoveredPreview({ variantId: variant.id, x: Math.min(window.innerWidth - 250, event.clientX + 18), y: Math.min(window.innerHeight - 280, event.clientY - 32) }); }} onMouseLeave={() => setHoveredPreview(null)} onClick={event => { if (variant.image) { event.stopPropagation(); setPreviewVariantId(variant.id); } }} onKeyDown={event => { if (variant.image && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); setPreviewVariantId(variant.id); } }} className={`h-11 w-11 overflow-hidden rounded-md border border-slate-200 bg-slate-50 ${variant.image ? "cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-cyan-500" : ""}`}>{variant.image ? <img src={variant.image} alt={formatVariantOptions(variant)} className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-[9px] font-bold text-slate-400">SKU</span>}</span><span className="min-w-0"><span className="block truncate font-bold text-slate-800">{formatVariantOptions(variant)}</span>{isSelected && <span className="mt-0.5 block text-[10px] font-black text-emerald-700">Đang chọn</span>}</span><span className="flex min-w-[7.5rem] items-center justify-end gap-2"><span className="max-w-[4.5rem] truncate font-mono text-[10px] text-slate-500" title={variant.sku || "Không có SKU"}>{variant.sku || "—"}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${outOfStock ? "bg-rose-100 text-rose-700" : variant.stock <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{outOfStock ? "Hết" : variant.stock}</span></span></button>; })}</div></div></section>}
          </div>
        </div>
      </div>
      {hoveredPreview && hoveredVariant?.image && <div className="pointer-events-none fixed z-[90] hidden w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl md:block" style={{ left: hoveredPreview.x, top: hoveredPreview.y }}><img src={hoveredVariant.image} alt={formatVariantOptions(hoveredVariant)} className="aspect-square w-full rounded-lg object-contain" /><p className="mt-2 truncate px-1 text-[10px] font-bold text-slate-700">{formatVariantOptions(hoveredVariant)}</p></div>}
      <Dialog open={previewVariantId !== null} onOpenChange={open => { if (!open) setPreviewVariantId(null); }}><DialogContent className="max-w-sm border-slate-200 bg-white"><DialogHeader><DialogTitle className="text-left text-base font-black text-slate-900">Ảnh SKU</DialogTitle><DialogDescription className="text-left text-xs text-slate-500">{previewVariant ? formatVariantOptions(previewVariant) : ""}</DialogDescription></DialogHeader>{previewVariant?.image && <img src={previewVariant.image} alt={formatVariantOptions(previewVariant)} className="aspect-square w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />}</DialogContent></Dialog>
    </StoreLayout>
  );
}
