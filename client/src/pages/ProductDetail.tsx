import { useEffect, useMemo, useState } from "react";
import vietnamAdminData from "@/data/vietnam-admin-2025.json";
import StoreLayout from "@/components/StoreLayout";
import AssetVisual from "@/components/AssetVisual";
import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Download, ShieldCheck, ArrowLeft, Clock3, Sparkles, Tag, Zap, CheckCircle2, QrCode, MapPin, Star, Ruler, ZoomIn, WalletCards } from "lucide-react";
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

type AdminProvince = { tentinhmoi: string; phuongxa: Array<{ maphuongxa: number; tenphuongxa: string }> };
const adminProvinces = vietnamAdminData as AdminProvince[];

type InlinePayment = {
  orderId: number;
  orderCode: string;
  totalAmount: number;
  qrUrl: string | null;
  hasPhysicalItems: boolean;
  hasPreorderItems?: boolean;
  preorderEstimatedDays?: string | null;
  paymentFlow?: "wallet_balance" | "manual_techcombank" | "sepay_vietinbank";
  paymentStatus?: "paid" | "pending";
};

export default function ProductDetail() {
  const [, singularParams] = useRoute("/product/:slug");
  const [, pluralParams] = useRoute("/products/:slug");
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
  const wholesaleTiersQuery = trpc.store.productWholesaleTiers.useQuery({ productId: product?.id || 1 }, { enabled: product?.type === "physical" });
  const reviewsQuery = trpc.store.productReviews.useQuery({ productId: product?.id || 1 }, { enabled: Boolean(product?.id) });
  const variants = variantsQuery.data || [];
  const wholesaleTiers = wholesaleTiersQuery.data || [];

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [adding, setAdding] = useState<boolean>(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<'in_stock' | 'preorder'>('in_stock');
  const [hoveredPreview, setHoveredPreview] = useState<{ variantId: number; x: number; y: number } | null>(null);
  const [previewVariantId, setPreviewVariantId] = useState<number | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet_balance" | "qr">("qr");
  const [inlinePayment, setInlinePayment] = useState<InlinePayment | null>(null);
  const [inlinePaymentExpired, setInlinePaymentExpired] = useState(false);
  const [inlineShipping, setInlineShipping] = useState({ name: "", phone: "", address: "", note: "" });
  const [inlineProvince, setInlineProvince] = useState("");
  const [inlineWard, setInlineWard] = useState("");
  const [inlineDetailAddress, setInlineDetailAddress] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const submitReviewMutation = trpc.store.submitProductReview.useMutation({ onSuccess: () => { setReviewBody(""); setReviewRating(5); toast.success("Đã gửi đánh giá thành công."); void utils.store.productReviews.invalidate(); }, onError: error => toast.error(error.message) });
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId);
  const applicableWholesaleTier = [...wholesaleTiers].filter(tier => quantity >= tier.minQuantity).sort((a, b) => b.minQuantity - a.minQuantity)[0];
  const unitPrice = Number(applicableWholesaleTier?.unitPrice ?? product?.price ?? 0) + Number(selectedVariant?.priceAdjustment || 0);
  const sortedVariants = variants;
  const previewVariant = variants.find(variant => variant.id === previewVariantId);
  const hoveredVariant = variants.find(variant => variant.id === hoveredPreview?.variantId);
  const optionGroups = Array.from(new Set(sortedVariants.flatMap(variant => getVariantOptions(variant)).map(option => option.name))).map(name => ({ name, values: Array.from(new Set(sortedVariants.flatMap(variant => getVariantOptions(variant)).filter(option => option.name === name).map(option => option.value))) }));
  const selectedOptionValues = new Map(getVariantOptions(selectedVariant || {}).map(option => [option.name, option.value]));
  const availableStock = product?.type === "physical" ? (selectedVariant ? selectedVariant.stock : variants.length > 0 ? Math.max(...variants.map(variant => variant.stock)) : product.stock) : Number.MAX_SAFE_INTEGER;
  const requiresVariant = product?.type === "physical" && variants.length > 0;
  const isPreorder = product?.type === "physical" && fulfillmentMode === 'preorder';
  const shippingWeightGrams = product?.type === "physical" ? Math.max(0, Number(selectedVariant?.weightGrams ?? product.weightGrams ?? 0)) * quantity : 0;
  const estimatedSpxFee = product?.type === "physical" ? 10_000 + Math.max(1, Math.ceil(shippingWeightGrams / 1000)) * 10_000 : 0;
  const savedAddressesQuery = trpc.store.shippingAddresses.useQuery(undefined, { enabled: isAuthenticated && product?.type === "physical" });
  const walletQuery = trpc.store.walletSummary.useQuery(undefined, { enabled: isAuthenticated });
  const walletBalance = Number(walletQuery.data?.balance || 0);
  const savedAddresses = savedAddressesQuery.data || [];
  const selectedAdminProvince = adminProvinces.find(item => item.tentinhmoi === inlineProvince);
  const adminWards = selectedAdminProvince?.phuongxa || [];
  const updateInlineAddress = (province: string, ward: string, detail: string) => {
    const parts = [detail.trim(), ward, province].filter(Boolean);
    setInlineShipping(current => ({ ...current, address: parts.join(", ") }));
  };
  const inlinePaymentInput = useMemo(() => inlinePayment ? { orderId: inlinePayment.orderId } : undefined, [inlinePayment]);
  const inlinePaymentStatus = trpc.store.paymentStatus.useQuery(inlinePaymentInput!, { enabled: Boolean(inlinePaymentInput), refetchInterval: query => query.state.data?.paymentStatus === "paid" ? false : 3500 });
  const inlineDownloads = trpc.store.instantDownloads.useQuery(inlinePaymentInput!, { enabled: Boolean(inlinePaymentInput) && inlinePaymentStatus.data?.paymentStatus === "paid" && !inlinePayment?.hasPhysicalItems });

  useEffect(() => {
    if (product?.type === "physical" && fulfillmentMode === 'in_stock' && availableStock > 0) setQuantity(current => Math.min(current, availableStock));
  }, [availableStock, product?.type, fulfillmentMode]);

  useEffect(() => {
    if (product?.type !== "physical" || inlineShipping.name || savedAddresses.length === 0) return;
    const address = savedAddresses.find(item => item.isDefault) || savedAddresses[0];
    if (address) {
      setInlineShipping(current => ({ ...current, name: address.recipientName, phone: address.phone, address: address.address }));
      setInlineDetailAddress(address.address);
    }
  }, [product?.type, savedAddresses, inlineShipping.name]);

  useEffect(() => {
    const panel = document.getElementById("sku-inventory-panel");
    if (!panel) return;
    const skuRows = Array.from(panel.querySelectorAll<HTMLButtonElement>("[data-sku-preview-variant]"));
    const showPreview = (event: PointerEvent) => {
      if (window.innerWidth < 768) return;
      const row = event.currentTarget as HTMLButtonElement;
      const variantId = Number(row.dataset.skuPreviewVariant);
      const variant = variants.find(item => item.id === variantId && Boolean(item.image));
      if (variant) updateHoveredPreview(variant.id, event.clientX, event.clientY);
    };
    const clearPreview = () => setHoveredPreview(null);
    skuRows.forEach(row => {
      row.addEventListener("pointerenter", showPreview);
      row.addEventListener("pointermove", showPreview);
      row.addEventListener("pointerleave", clearPreview);
    });
    return () => skuRows.forEach(row => {
      row.removeEventListener("pointerenter", showPreview);
      row.removeEventListener("pointermove", showPreview);
      row.removeEventListener("pointerleave", clearPreview);
    });
  }, [variants]);

  useEffect(() => {
    const panel = document.getElementById("sku-inventory-panel");
    const purchaseActions = document.getElementById("product-purchase-actions");
    if (panel && purchaseActions && panel.previousElementSibling !== purchaseActions) panel.before(purchaseActions);
  }, [product?.id, selectedVariantId, fulfillmentMode, variants.length]);

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

  const cancelInlineOrder = trpc.store.cancelPendingOrder.useMutation();
  const quickCheckoutMutation = trpc.store.quickCheckout.useMutation({
    onSuccess: order => {
      setInlinePayment(order);
      setInlinePaymentExpired(false);
      toast.success(order.hasPhysicalItems ? "Mã QR Techcombank đã sẵn sàng trên trang sản phẩm." : "Mã QR VietinBank SePay đã sẵn sàng. Hệ thống sẽ tự mở tải ngay sau khi đối soát.");
    },
    onError: error => toast.error(error.message || "Không thể tạo đơn thanh toán"),
  });

  useEffect(() => {
    if (!inlinePayment || inlinePaymentStatus.data?.paymentStatus === "paid" || inlinePaymentExpired) return;
    const timer = window.setTimeout(() => {
      cancelInlineOrder.mutate({ orderId: inlinePayment.orderId }, { onSuccess: result => { if (result.cancelled) setInlinePaymentExpired(true); } });
    }, 10 * 60 * 1_000);
    return () => window.clearTimeout(timer);
  }, [inlinePayment?.orderId, inlinePaymentStatus.data?.paymentStatus, inlinePaymentExpired]);

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
    setInlinePayment(null);
    setInlinePaymentExpired(false);
    setPaymentDialogOpen(true);
  };

  const createInlinePayment = () => {
    if (product.type === "physical" && (!inlineShipping.name || !inlineShipping.phone || !inlineShipping.address)) return toast.error("Vui lòng điền đủ thông tin nhận hàng trước khi thanh toán.");
    if (paymentMethod === "wallet_balance" && walletBalance < (unitPrice * quantity * (isPreorder ? 0.9 : 1)) + estimatedSpxFee) return toast.error("Số dư ví không đủ cho đơn hàng này.");
    quickCheckoutMutation.mutate({
      item: { productId: product.id, quantity, variantId: selectedVariantId || undefined, fulfillmentMode: product.type === "physical" ? fulfillmentMode : undefined },
      shipping: product.type === "physical" ? inlineShipping : undefined,
      paymentMethod: paymentMethod === "wallet_balance" ? "wallet_balance" : undefined,
    });
  };

  const updateHoveredPreview = (variantId: number, clientX: number, clientY: number) => {
    const previewWidth = 176;
    const previewHeight = 230;
    setHoveredPreview({
      variantId,
      x: Math.max(12, Math.min(window.innerWidth - previewWidth - 12, clientX + 18)),
      y: Math.max(12, Math.min(window.innerHeight - previewHeight - 12, clientY - 48)),
    });
  };

  const skuInventoryPanel = product.type === "physical" && variants.length > 0 ? (
    <aside id="sku-inventory-panel" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3 xl:sticky xl:top-4">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xs font-black uppercase tracking-wide text-slate-800">Tồn kho theo SKU</h2><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Rê chuột vào bất kỳ vùng nào của SKU có ảnh để xem ảnh lớn. SKU hết hàng vẫn xem được ảnh.</p></div><span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">{variants.length} SKU</span></div>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="max-h-72 overflow-y-auto">
        <div className="sticky top-0 z-10 grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(10.5rem,auto)] gap-3 bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600"><span>Ảnh</span><span>Phiên bản</span><span className="text-right">SKU + tồn kho</span></div>
        {sortedVariants.map(variant => {
          const isSelected = variant.id === selectedVariantId;
          const outOfStock = variant.stock <= 0;
          return <button key={variant.id} type="button" data-sku-preview-variant={variant.image ? variant.id : undefined} aria-disabled={outOfStock} onClick={() => { if (!outOfStock) setSelectedVariantId(variant.id); }} className={`grid w-full grid-cols-[3.5rem_minmax(0,1fr)_minmax(10.5rem,auto)] items-center gap-3 border-t border-slate-100 px-3 py-2 text-left text-xs transition-colors ${isSelected ? "bg-emerald-50" : "hover:bg-slate-50"} ${outOfStock ? "cursor-not-allowed opacity-55" : ""}`}>
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-label={variant.image ? `Xem ảnh lớn ${formatVariantOptions(variant)}` : undefined} onClick={event => { if (variant.image) { event.stopPropagation(); setPreviewVariantId(variant.id); } }}><span className={`block h-11 w-11 overflow-hidden rounded-md border border-slate-200 bg-slate-50 ${variant.image ? "cursor-zoom-in" : ""}`}>{variant.image ? <img src={variant.image} alt={formatVariantOptions(variant)} className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-[9px] font-bold text-slate-400">SKU</span>}</span></span>
            <span className="min-w-0"><span className="flex min-w-0 items-center gap-1.5 truncate font-bold text-slate-800">{variant.image ? <img src={variant.image} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 rounded border border-slate-200 bg-white object-contain" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-dashed border-slate-200 text-[8px] font-black text-slate-400">SKU</span>}<span className="truncate">{formatVariantOptions(variant)}</span></span>{isSelected && <span className="mt-0.5 block text-[10px] font-black text-emerald-700">Đang chọn</span>}</span>
            <span className="justify-self-end inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-mono text-slate-600"><span className="font-sans text-[8px] font-black uppercase text-slate-400">SKU</span><span className="max-w-[6rem] truncate" title={variant.sku || "Không có SKU"}>{variant.sku || "—"}</span><span className="h-3 w-px bg-slate-300" aria-hidden="true" /><span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-black ${outOfStock ? "bg-rose-100 text-rose-700" : variant.stock <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}><span className="text-[8px] uppercase opacity-70">Tồn</span>{outOfStock ? "Hết" : variant.stock}</span></span>
          </button>;
        })}
      </div></div>
    </aside>
  ) : null;

  return (
    <StoreLayout>
      <div className={`mx-auto max-w-[1600px] py-10 sm:px-6 lg:px-8 2xl:px-10 ${product.type === 'physical' ? 'bg-[#f5f5f5] px-0 pb-36 sm:px-6 sm:pb-10' : 'px-4'}`}>
        <Link href={product.type === 'physical' ? '/products?type=physical' : '/products'} className="mx-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors mb-6 sm:mx-0">
          <ArrowLeft className="w-4 h-4" /> {lang === 'vi' ? 'Quay lại kho tài nguyên' : 'Back to library'}
        </Link>

        <div className={`grid grid-cols-1 items-start gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:h-[calc(100vh-9rem)] lg:min-h-[44rem] lg:grid-cols-12 lg:overflow-hidden ${product.type === 'physical' ? 'rounded-none border-0 p-0 shadow-none sm:rounded-2xl sm:border sm:p-10 sm:shadow-sm lg:rounded-md lg:border lg:p-6 lg:shadow-sm' : ''}`}>
          <div className="lg:col-span-5 lg:self-start">
            <div className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner md:cursor-zoom-in" title={product.type === 'physical' ? 'Rê chuột để phóng to ảnh' : undefined}>
              {(selectedVariant?.image || product.image) ? <img src={selectedVariant?.image || product.image} alt={selectedVariant ? `${product.name} · ${formatVariantOptions(selectedVariant)}` : product.name} className="h-full w-full object-contain transition-transform duration-300 ease-out motion-reduce:transition-none md:group-hover:scale-[1.65]" /> : <AssetVisual categoryId={product.categoryId} title={product.name} fileSize={product.fileSize} />}
              <span className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-black text-white shadow-lg md:flex md:opacity-0 md:transition-opacity md:group-hover:opacity-100"><ZoomIn className="h-3 w-3" />Rê chuột để phóng to</span>
            </div>
            {product.description && <>
              {product.type === 'physical' && <details className="mt-3 border-y border-slate-200 bg-white px-4 py-3 sm:hidden"><summary className="cursor-pointer list-none text-base font-bold text-slate-800">Thông số & Mô tả <span className="float-right text-slate-400">⌄</span></summary><p className="mt-3 text-sm leading-relaxed text-slate-600">{product.description}</p></details>}
              <section className={`${product.type === 'physical' ? 'hidden sm:block' : ''} mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4`}><div className="flex items-center justify-between gap-3"><h2 className="text-xs font-black uppercase tracking-wide text-slate-800">{lang === 'vi' ? 'Mô tả sản phẩm' : 'Product description'}</h2>{product.description.length > 260 && <button type="button" onClick={() => setDescriptionExpanded(current => !current)} className="shrink-0 text-xs font-black text-amber-700 hover:text-amber-900">{descriptionExpanded ? (lang === 'vi' ? 'Thu gọn' : 'Show less') : (lang === 'vi' ? 'Xem thêm' : 'Read more')}</button>}</div><p className={`mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm ${descriptionExpanded ? '' : 'line-clamp-5'}`}>{product.description}</p></section>
            </>}
          </div>

          <div className="space-y-6 lg:col-span-7 lg:h-full lg:overflow-y-auto lg:pr-3">
            <div>
              <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{product.type === "physical" ? (isPreorder ? (lang === 'vi' ? 'Order trước · dự kiến 7–10 ngày' : 'Pre-order · estimated 7–10 days') : (lang === 'vi' ? `${availableStock > 0 ? `Còn ${availableStock}` : "Đã hết"} trong kho` : `${availableStock > 0 ? availableStock : "Out of"} stock`)) : (lang === 'vi' ? 'Bản quyền thương mại trọn đời' : 'Lifetime Commercial License')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{product.name}</h1>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1"><p className={`text-2xl font-black ${product.type === 'physical' ? 'text-[#ee4d2d]' : 'text-amber-600'}`}>{formatCurrency(unitPrice * (isPreorder ? 0.9 : 1))}</p>{applicableWholesaleTier && <Badge className="bg-emerald-100 text-emerald-800">Giá sỉ từ {applicableWholesaleTier.minQuantity} cái</Badge>}{isPreorder && <><p className="text-sm font-bold text-slate-400 line-through">{formatCurrency(unitPrice)}</p><Badge className="bg-rose-100 text-rose-700">Giảm 10% Order</Badge></>}</div>
            </div>

            {product.type === "physical" && <section className="rounded-md border border-orange-200 bg-orange-50/70 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">DHL Stores · Shop thể thao</p><p className="mt-1 text-sm font-black text-slate-900">Hàng thể thao chọn SKU, giao SPX</p></div><span className="rounded bg-white px-2 py-1 text-[10px] font-black text-orange-700 shadow-sm">Hỗ trợ Zalo 0963.898.871</span></div><p className="mt-2 text-[11px] leading-relaxed text-slate-600">Kiểm tra màu, size, tồn kho và phí giao hàng trước khi đặt. Đơn vật lý thanh toán qua QR Techcombank.</p></section>}

            {product.type === "physical" && wholesaleTiers.length > 0 && <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-900">Giá sỉ theo số lượng</p><p className="mt-1 text-[11px] leading-relaxed text-emerald-800">Mua càng nhiều, đơn giá mỗi sản phẩm càng tốt. Giá sẽ tự áp dụng khi đạt mốc.</p></div>{applicableWholesaleTier && <Badge className="bg-emerald-600 text-white">Đang áp dụng</Badge>}</div><div className="mt-3 grid grid-cols-3 gap-2">{wholesaleTiers.map(tier => <div key={tier.id} className={`rounded-lg border p-2 text-center ${applicableWholesaleTier?.id === tier.id ? "border-emerald-600 bg-white ring-2 ring-emerald-100" : "border-emerald-100 bg-white/70"}`}><p className="text-[10px] font-black text-emerald-800">Từ {tier.minQuantity} cái</p><p className="mt-1 text-xs font-black text-slate-900">{formatCurrency(Number(tier.unitPrice) + Number(selectedVariant?.priceAdjustment || 0))}</p></div>)}</div></section>}

            {product.type === "physical" && variants.length > 0 && (
              <section className="space-y-4 rounded-md border border-orange-200 bg-orange-50/60 p-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#ee4d2d] text-[11px] font-black text-white">1</span><p className="text-xs font-black uppercase tracking-wide text-slate-900">Chọn hình thức mua trước</p></div>
                  <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setFulfillmentMode('in_stock')} className={`rounded-xl border p-3 text-left transition ${!isPreorder ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100" : "border-slate-200 bg-white hover:border-amber-300"}`}><span className="flex items-center gap-1.5 text-xs font-black text-slate-900"><Zap className="h-3.5 w-3.5 text-amber-600" />Mua ngay</span><span className="mt-1 block text-[11px] text-slate-600">Giao từ hàng sẵn có; áp dụng tồn kho thực tế.</span></button><button type="button" onClick={() => setFulfillmentMode('preorder')} className={`rounded-xl border p-3 text-left transition ${isPreorder ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100" : "border-slate-200 bg-white hover:border-rose-300"}`}><span className="flex items-center gap-1.5 text-xs font-black text-rose-700"><Clock3 className="h-3.5 w-3.5" />Order trước · giảm 10%</span><span className="mt-1 block text-[11px] text-slate-600">Dự kiến 7–10 ngày; dùng được với mọi SKU.</span></button></div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-emerald-800">Bước 2 · Chọn phiên bản & xem tồn kho</label>
                  <p className="mt-1 text-xs text-emerald-700">Thứ tự SKU được cửa hàng sắp xếp sẵn. Chọn theo thuộc tính hoặc chọn trực tiếp một dòng SKU có ảnh và số lượng còn lại.</p>
                </div>
                <div className="space-y-4">{optionGroups.map(group => <div key={group.name} className="space-y-2"><p className="text-xs font-black uppercase tracking-wide text-slate-700">{group.name}</p><div className="flex flex-wrap gap-2">{group.values.map(value => { const compatible = sortedVariants.some(variant => { const options = new Map(getVariantOptions(variant).map(option => [option.name, option.value])); return options.get(group.name) === value && Array.from(selectedOptionValues.entries()).every(([selectedName, selectedValue]) => selectedName === group.name || options.get(selectedName) === selectedValue); }); const isSelected = selectedOptionValues.get(group.name) === value; return <button key={value} type="button" disabled={!compatible} onClick={() => { const candidate = sortedVariants.find(variant => { const options = new Map(getVariantOptions(variant).map(option => [option.name, option.value])); return options.get(group.name) === value && Array.from(selectedOptionValues.entries()).every(([selectedName, selectedValue]) => selectedName === group.name || options.get(selectedName) === selectedValue); }); setSelectedVariantId(candidate?.id ?? null); }} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-500"} disabled:cursor-not-allowed disabled:opacity-35`}>{value}</button>; })}</div></div>)}<div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3"><div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-orange-700" /><p className="text-xs font-black uppercase tracking-wide text-orange-800">Hướng dẫn chọn size áo</p></div><p className="mt-1 text-[11px] leading-relaxed text-slate-600">Đo vòng ngực và chiều dài áo đang mặc, sau đó chọn size gần nhất. Nếu nằm giữa hai size, chọn size lớn hơn để mặc thoải mái. Size và màu có thể thay đổi theo từng sản phẩm.</p></div><div className="grid gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Bước 3 · Số lượng & giao hàng</p><p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">SKU đang chọn</p><p className="mt-1 text-xs font-semibold text-emerald-900">{selectedVariant ? formatVariantOptions(selectedVariant) : 'Chọn một phiên bản ở phía trên'}</p></div><div><label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Số lượng</label><div className="mt-1 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-8 w-8 font-black text-slate-700 hover:text-black">−</button><input aria-label="Số lượng sản phẩm" inputMode="numeric" value={quantity.toLocaleString("vi-VN")} onChange={event => { const next = Number(event.target.value.replace(/\D/g, "")); if (!Number.isFinite(next)) return; const max = product.type === "physical" && !isPreorder ? Math.max(1, availableStock) : 99; setQuantity(Math.min(max, Math.max(1, next || 1))); }} className="h-8 w-14 rounded-md border border-slate-300 bg-white px-1 text-center text-sm font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /><button type="button" onClick={() => setQuantity(quantity + 1)} disabled={product.type === "physical" && !isPreorder && quantity >= availableStock} className="h-8 w-8 font-black text-slate-700 hover:text-black disabled:cursor-not-allowed disabled:opacity-35">+</button></div></div></div><div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2.5 text-xs text-sky-900"><p className="font-black">Giao hàng SPX ước tính</p><p className="mt-1">{shippingWeightGrams.toLocaleString("vi-VN")} g · {formatCurrency(estimatedSpxFee)} cho {quantity} sản phẩm. Dự kiến giao: {isPreorder ? '7–10 ngày' : selectedVariant ? '2–5 ngày' : '2–5 ngày sau khi chọn SKU'}. Đến 1 kg: 20.000đ; mỗi kg hoặc phần kg tiếp theo: +10.000đ.</p></div>{skuInventoryPanel}</div>
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

            <div id="product-purchase-actions" className={`sticky bottom-0 z-20 rounded-xl bg-emerald-50/95 p-2 pt-3 shadow-[0_-8px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:flex sm:flex-row sm:gap-4 ${product.type === 'physical' ? 'fixed inset-x-0 bottom-0 rounded-none border-t border-slate-200 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:static sm:rounded-xl sm:border-0 sm:p-2' : ''}`}>
              <Button
                onClick={handleAddToCart}
                disabled={adding || (product.type === "physical" && ((fulfillmentMode === 'in_stock' && availableStock <= 0) || (requiresVariant && !selectedVariantId)))}
                variant="outline"
                className={`flex-1 bg-white font-bold py-3.5 rounded-xl shadow-xs text-sm ${product.type === 'physical' ? 'border-[#ee4d2d] text-[#ee4d2d] hover:bg-orange-50' : 'border-amber-500 text-amber-700 hover:bg-amber-50'}`}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {adding ? "Adding..." : (isPreorder ? "Thêm Order vào giỏ" : t.addToCart)}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={adding || (product.type === "physical" && ((fulfillmentMode === 'in_stock' && availableStock <= 0) || (requiresVariant && !selectedVariantId)))}
                className={`flex-1 font-bold py-3.5 rounded-xl shadow-md text-sm ${isPreorder ? "bg-rose-500 text-white hover:bg-rose-600" : product.type === 'physical' ? "bg-[#ee4d2d] text-white hover:bg-[#d94325]" : "bg-amber-500 text-slate-950 hover:bg-amber-600"}`}
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
          </div>
        </div>
        {product.type === 'physical' && <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">Đánh giá từ khách hàng</p><h2 className="mt-1 text-xl font-black text-slate-900">Trải nghiệm thật về sản phẩm</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{reviewsQuery.data?.length || 0} đánh giá</span></div>{reviewsQuery.data?.length ? <div className="mt-4 space-y-3">{reviewsQuery.data.map(review => <article key={review.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-800">{review.displayName}</p><div className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-current' : ''}`} />)}</div></div><p className="mt-2 text-sm leading-relaxed text-slate-600">{review.body}</p></article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ trải nghiệm sau khi mua hàng.</div>}<form className="mt-5 border-t border-slate-100 pt-5" onSubmit={event => { event.preventDefault(); if (!isAuthenticated) { startLogin(); return; } submitReviewMutation.mutate({ productId: product.id, rating: reviewRating, body: reviewBody }); }}><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-slate-700">Chấm điểm:</span>{Array.from({ length: 5 }).map((_, index) => <button key={index} type="button" aria-label={`Chấm ${index + 1} sao`} onClick={() => setReviewRating(index + 1)} className="text-amber-500 transition-transform hover:scale-110"><Star className={`h-5 w-5 ${index < reviewRating ? 'fill-current' : ''}`} /></button>)}</div><textarea value={reviewBody} onChange={event => setReviewBody(event.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" placeholder={isAuthenticated ? 'Chia sẻ trải nghiệm thật của bạn (tối thiểu 10 ký tự)…' : 'Đăng nhập để gửi đánh giá sau khi mua hàng…'} disabled={!isAuthenticated} /><Button type="submit" disabled={submitReviewMutation.isPending || !reviewBody.trim()} className="mt-3 bg-[#ee4d2d] font-black text-white hover:bg-[#d94325]">{isAuthenticated ? (submitReviewMutation.isPending ? 'ĐANG GỬI…' : 'GỬI ĐÁNH GIÁ') : 'ĐĂNG NHẬP ĐỂ ĐÁNH GIÁ'}</Button></form></section>}
      </div>
      {hoveredPreview && hoveredVariant?.image && <div className="pointer-events-none fixed z-[90] hidden w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl md:block" style={{ left: hoveredPreview.x, top: hoveredPreview.y }}><img src={hoveredVariant.image} alt={formatVariantOptions(hoveredVariant)} className="aspect-square w-full rounded-lg object-contain" /><p className="mt-1.5 truncate px-0.5 text-[10px] font-bold text-slate-700">{formatVariantOptions(hoveredVariant)}</p></div>}
      <Dialog open={previewVariantId !== null} onOpenChange={open => { if (!open) setPreviewVariantId(null); }}><DialogContent className="max-w-sm border-slate-200 bg-white"><DialogHeader><DialogTitle className="text-left text-base font-black text-slate-900">Ảnh SKU</DialogTitle><DialogDescription className="text-left text-xs text-slate-500">{previewVariant ? formatVariantOptions(previewVariant) : ""}</DialogDescription></DialogHeader>{previewVariant?.image && <img src={previewVariant.image} alt={formatVariantOptions(previewVariant)} className="aspect-square w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />}</DialogContent></Dialog>
      <Dialog open={paymentDialogOpen} onOpenChange={open => {
        if (!open && inlinePayment && inlinePayment.paymentStatus !== "paid" && inlinePaymentStatus.data?.paymentStatus !== "paid") cancelInlineOrder.mutate({ orderId: inlinePayment.orderId });
        setPaymentDialogOpen(open);
        if (!open) setInlinePayment(null);
      }}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-left text-lg font-black text-slate-900">Thanh toán ngay tại trang sản phẩm</DialogTitle>
            <DialogDescription className="text-left text-xs text-slate-500">{product.type === "physical" ? "Chọn số dư ví hoặc QR Techcombank. Bạn có thể nhập số lượng trực tiếp ở bước mua hàng." : "Chọn số dư ví hoặc QR VietinBank SePay để hoàn tất đơn tài nguyên số."}</DialogDescription>
          </DialogHeader>
          {!inlinePayment ? <div className="space-y-4">
            {product.type === "physical" && <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-emerald-700" /><div><p className="text-xs font-black uppercase tracking-wide text-emerald-800">Địa chỉ nhận hàng</p><p className="mt-1 text-[11px] text-emerald-700">Bạn vẫn ở nguyên trang sản phẩm khi tạo QR.</p></div></div>
              {savedAddresses.length > 0 && <div className="flex flex-wrap gap-2">{savedAddresses.map(address => <button key={address.id} type="button" onClick={() => setInlineShipping(current => ({ ...current, name: address.recipientName, phone: address.phone, address: address.address }))} className={`rounded-lg border px-3 py-2 text-left text-[11px] font-bold ${inlineShipping.address === address.address ? "border-emerald-500 bg-white text-emerald-800" : "border-emerald-100 bg-white text-slate-600"}`}>{address.recipientName} · {address.phone}</button>)}</div>}
              <input value={inlineShipping.name} onChange={event => setInlineShipping(current => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm" placeholder="Họ tên người nhận" />
              <input value={inlineShipping.phone} onChange={event => setInlineShipping(current => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm" placeholder="Số điện thoại" inputMode="tel" />
              <div className="grid gap-2 sm:grid-cols-2"><select value={inlineProvince} onChange={event => { const value = event.target.value; setInlineProvince(value); setInlineWard(""); updateInlineAddress(value, "", inlineDetailAddress); }} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"><option value="">Chọn tỉnh/thành phố mới</option>{adminProvinces.map(item => <option key={item.tentinhmoi} value={item.tentinhmoi}>{item.tentinhmoi}</option>)}</select><select value={inlineWard} onChange={event => { const value = event.target.value; setInlineWard(value); updateInlineAddress(inlineProvince, value, inlineDetailAddress); }} disabled={!inlineProvince} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"><option value="">Chọn xã/phường mới</option>{adminWards.map(item => <option key={item.maphuongxa} value={item.tenphuongxa}>{item.tenphuongxa}</option>)}</select></div>
              <textarea value={inlineDetailAddress} onChange={event => { const value = event.target.value; setInlineDetailAddress(value); updateInlineAddress(inlineProvince, inlineWard, value); }} className="min-h-20 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm" placeholder="Số nhà, tên đường, thôn/tổ…" />
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900"><p className="font-black">Giao hàng SPX tự tính</p><p className="mt-1">Tổng khối lượng {shippingWeightGrams.toLocaleString("vi-VN")} g · phí giao {formatCurrency(estimatedSpxFee)}. Phí chính thức được máy chủ tính lại khi tạo đơn.</p></div>
            </div>}
            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-violet-800">Phương thức thanh toán</p><p className="mt-1 text-[11px] text-violet-700">Chọn một phương án trước khi tạo đơn.</p></div><WalletCards className="h-5 w-5 text-violet-600" /></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setPaymentMethod("wallet_balance")} className={`rounded-xl border p-3 text-left transition ${paymentMethod === "wallet_balance" ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}><span className="block text-xs font-black text-emerald-800">Thanh toán bằng số dư ví</span><span className="mt-1 block text-[11px] text-slate-600">Đang có: <strong>{formatCurrency(walletBalance)}</strong></span></button><button type="button" onClick={() => setPaymentMethod("qr")} className={`rounded-xl border p-3 text-left transition ${paymentMethod === "qr" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100" : "border-slate-200 bg-white hover:border-amber-300"}`}><span className="block text-xs font-black text-amber-800">{product.type === "physical" ? "QR Techcombank" : "QR VietinBank SePay"}</span><span className="mt-1 block text-[11px] text-slate-600">{product.type === "physical" ? "Chủ cửa hàng xác nhận tiền về." : "SePay tự đối soát giao dịch."}</span></button></div></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-amber-800">Đơn đang tạo</p><p className="mt-1 text-sm font-bold text-slate-900">{product.name}{selectedVariant ? ` · ${formatVariantOptions(selectedVariant)}` : ""}</p><p className="mt-1 text-xs text-slate-600">Số lượng: {quantity}{isPreorder ? " · Order trước giảm 10%, dự kiến 7–10 ngày" : ""}</p></div>
            <Button onClick={createInlinePayment} disabled={quickCheckoutMutation.isPending || (paymentMethod === "wallet_balance" && walletBalance < (unitPrice * quantity * (isPreorder ? 0.9 : 1)) + estimatedSpxFee)} className="w-full bg-amber-500 py-5 font-black text-slate-950 hover:bg-amber-600">{paymentMethod === "wallet_balance" ? <WalletCards className="mr-2 h-4 w-4" /> : <QrCode className="mr-2 h-4 w-4" />}{quickCheckoutMutation.isPending ? "ĐANG XỬ LÝ…" : paymentMethod === "wallet_balance" ? "THANH TOÁN BẰNG VÍ" : product.type === "physical" ? "HIỆN QR TECHCOMBANK" : "HIỆN QR VIETINBANK SEPAY"}</Button>
          </div> : (inlinePayment.paymentStatus === "paid" || inlinePaymentStatus.data?.paymentStatus === "paid") ? <div className="space-y-4 py-4 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><p className="font-black text-slate-900">{inlinePayment.hasPhysicalItems ? "Thanh toán đã được chủ cửa hàng xác nhận." : "Thanh toán đã được SePay đối soát thành công."}</p>{inlinePayment.hasPhysicalItems ? <p className="text-sm text-slate-600">Đơn hàng đang được xử lý{inlinePayment.hasPreorderItems ? `, dự kiến ${inlinePayment.preorderEstimatedDays || "7–10 ngày"}` : ""}.</p> : inlineDownloads.data?.length ? <div className="space-y-2">{inlineDownloads.data.map(download => <a key={`${download.orderId}-${download.productId}`} href={download.driveUrl || "#"} target="_blank" rel="noreferrer" className="block rounded-xl bg-purple-600 px-4 py-3 text-sm font-black text-white">Tải ngay: {download.productName}</a>)}</div> : <p className="text-sm text-slate-600">Đang chuẩn bị liên kết tải tệp.</p>}</div> : inlinePaymentExpired ? <div className="space-y-3 py-4 text-center"><QrCode className="mx-auto h-12 w-12 text-rose-500" /><p className="font-black text-slate-900">Mã QR đã hết hạn sau 10 phút.</p><Button onClick={() => { setInlinePayment(null); setInlinePaymentExpired(false); }} className="bg-amber-500 font-black text-slate-950">Tạo QR mới</Button></div> : <div className="grid gap-5 sm:grid-cols-[1fr_190px] sm:items-center"><div className="space-y-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Số tiền cần chuyển</p><p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(inlinePayment.totalAmount)}</p></div>{inlinePayment.hasPhysicalItems ? <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-900"><p className="font-black">Không cần nội dung chuyển khoản.</p><p className="mt-1">Sau khi bạn chuyển tiền, chủ cửa hàng sẽ kiểm tra giao dịch Techcombank và xác nhận đơn trực tiếp.</p></div> : <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-relaxed text-violet-900"><p className="font-black">QR VietinBank đã kèm nội dung đối soát SePay.</p><p className="mt-1">Hãy chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản. SePay sẽ tự xác nhận để mở nút tải ngay.</p></div>}<p className="text-[11px] text-slate-500">QR giữ chỗ trong 10 phút. Đơn: <span className="font-black text-slate-700">{inlinePayment.orderCode}</span></p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">{inlinePayment.qrUrl ? <img src={inlinePayment.qrUrl} alt={inlinePayment.hasPhysicalItems ? "Mã QR Techcombank DHL Stores" : "Mã QR VietinBank SePay DHL Stores"} className="w-full rounded-xl bg-white" /> : <QrCode className="mx-auto h-16 w-16 text-slate-400" />}<p className="mt-2 text-[10px] font-bold text-slate-500">Quét bằng ứng dụng ngân hàng</p></div></div>}
        </DialogContent>
      </Dialog>
    </StoreLayout>
  );
}
