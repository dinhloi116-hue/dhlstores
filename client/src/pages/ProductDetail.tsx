import { useEffect, useMemo, useState } from "react";
import vietnamAdminData from "@/data/vietnam-admin-2025.json";
import StoreLayout from "@/components/StoreLayout";
import AssetVisual from "@/components/AssetVisual";
import { CustomerHelpCard } from "@/components/CustomerHelpCard";
import { trpc } from "@/lib/trpc";
import { addRecentProduct, getComparedProductIds, toggleComparedProduct } from "@/lib/customer-tools";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { translations, getClientLanguage, setSelectedLanguage, Language } from "@/lib/i18n";
import { catalogDescription, catalogName } from "@/lib/catalogLocale";
import { parseYouTubeUrl } from "@/lib/youtube";
import { formatLocalizedPrice, localizedPriceUsd } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Download, ShieldCheck, ArrowLeft, Home, Clock3, Sparkles, Tag, Zap, CheckCircle2, QrCode, MapPin, Star, Ruler, ZoomIn, WalletCards, Heart, Scale, BellRing, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

function formatVariantOptions(variant: { size?: string; color?: string; attributes?: string }) {
  return [variant.size && `Size: ${variant.size}`, variant.color && `Màu: ${variant.color}`, ...(variant.attributes || "").split(/\n|;/).map(item => item.trim()).filter(Boolean)].filter(Boolean).join(" · ") || "Phiên bản chuẩn";
}

async function compressReviewImage(file: File) {
  const maxDimension = 1280;
  const quality = 0.82;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể xử lý ảnh trên thiết bị này");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] || "";
  if (!base64) throw new Error("Không thể đọc ảnh sau khi nén");
  return { fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg", mimeType: "image/jpeg" as const, base64 };
}

function playCartSuccessSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1180, context.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.13);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
    window.setTimeout(() => void context.close(), 220);
  } catch {
    // Audio is optional feedback; never block adding an item to the cart.
  }
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
  const productName = product ? catalogName(product, lang) : "";
  const productDescription = product ? catalogDescription(product, lang) : "";
  const productSpecs = product ? (lang === "en" ? product.specsEn || product.specs : product.specs) : "";
  const youtubeVideo = parseYouTubeUrl(product?.videoUrl);
  const sizeGuideRows = Array.from((productSpecs || "").matchAll(/\b(S|M|L|XL|XXL)\s+(\d+cm)\/([^/]+)\/([^.;]+kg)/gi)).map(match => ({ size: match[1].toUpperCase(), length: match[2], height: match[3], weight: match[4] }));
  useEffect(() => {
    if (!product) return;
    const canonicalUrl = `${window.location.origin}/product/${product.slug}`;
    const imageUrl = product.gallery?.[0] || product.image;
    const description = productDescription.slice(0, 160).trim() || `${productName} — DHL Stores`;
    document.title = `${productName} | DHL Stores`;
    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) { element = document.createElement("meta"); element.setAttribute(property ? "property" : "name", name); document.head.appendChild(element); }
      element.content = content;
    };
    setMeta("description", description);
    setMeta("og:type", "product", true);
    setMeta("og:title", productName, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:image", imageUrl, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", productName);
    setMeta("twitter:description", description);
    setMeta("twitter:image", imageUrl);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
    const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: productName, alternateName: lang === "vi" ? product.nameEn : product.name, inLanguage: lang === "en" ? "en" : "vi", description, disambiguatingDescription: lang === "vi" ? product.descriptionEn : product.description, image: product.gallery?.length ? product.gallery : [product.image], url: canonicalUrl, brand: { "@type": "Brand", name: "DHL Stores" }, additionalProperty: sizeGuideRows.map(row => ({ "@type": "PropertyValue", name: `Size ${row.size}`, value: `${row.length} / ${row.height} / ${row.weight}` })), offers: { "@type": "Offer", url: canonicalUrl, priceCurrency: lang === "en" ? "USD" : "VND", price: lang === "en" ? localizedPriceUsd(Number(product.price), lang, product.priceUsd) : product.price, availability: product.type === "digital" || product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder" } };
    let schema = document.getElementById("dhl-product-jsonld") as HTMLScriptElement | null;
    if (!schema) { schema = document.createElement("script"); schema.id = "dhl-product-jsonld"; schema.type = "application/ld+json"; document.head.appendChild(schema); }
    schema.textContent = JSON.stringify(youtubeVideo ? { ...jsonLd, subjectOf: { "@type": "VideoObject", name: `${productName} — ${lang === "en" ? "product video" : "video giới thiệu"}`, description, thumbnailUrl: youtubeVideo.thumbnailUrl, embedUrl: youtubeVideo.embedUrl, contentUrl: youtubeVideo.watchUrl, uploadDate: new Date(product.createdAt).toISOString() } } : jsonLd);
    return () => { schema?.remove(); };
  }, [product, productName, productDescription, youtubeVideo?.id]);
  const productsQuery = trpc.store.products.useQuery({}, { enabled: Boolean(product?.id), staleTime: 60_000 });
  const variantsQuery = trpc.store.productVariants.useQuery({ productId: product?.id || 1 }, { enabled: Boolean(product?.id) });
  const wholesaleTiersQuery = trpc.store.productWholesaleTiers.useQuery({ productId: product?.id || 1 }, { enabled: Boolean(product?.id) });
  const reviewsQuery = trpc.store.productReviews.useQuery({ productId: product?.id || 1 }, { enabled: Boolean(product?.id) });
  const favoritesQuery = trpc.store.favorites.useQuery(undefined, { enabled: isAuthenticated });
  const restockSubscriptionsQuery = trpc.store.restockSubscriptions.useQuery(undefined, { enabled: isAuthenticated });
  const variants = variantsQuery.data || [];
  const wholesaleTiers = wholesaleTiersQuery.data || [];
  const reviewItems = reviewsQuery.data || [];
  const reviewAverage = reviewItems.length ? reviewItems.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewItems.length : 0;
  const variantIdsForSync = useMemo(() => variants.map(variant => variant.id), [variants]);
  const latestSapoSyncQuery = trpc.operations.sapoLatestSync.useQuery({ variantIds: variantIdsForSync }, { enabled: product?.type === "physical" && variantIdsForSync.length > 0, staleTime: 60_000 });
  const latestSapoSyncAt = useMemo(() => { const values = latestSapoSyncQuery.data ? Array.from(latestSapoSyncQuery.data.values()).map(value => new Date(value).getTime()).filter(Number.isFinite) : []; return values.length ? new Date(Math.max(...values)) : null; }, [latestSapoSyncQuery.data]);

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [variantQuantities, setVariantQuantities] = useState<Record<number, number>>({});
  const [quantityUpdatingVariantId, setQuantityUpdatingVariantId] = useState<number | null>(null);
  const [quantityUpdatedVariantId, setQuantityUpdatedVariantId] = useState<number | null>(null);
  const [quantityWarnings, setQuantityWarnings] = useState<Record<number, string>>({});
  const [quantityShakeVariantId, setQuantityShakeVariantId] = useState<number | null>(null);
  const [skuSearch, setSkuSearch] = useState("");
  const [adding, setAdding] = useState<boolean>(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [addingRecommended, setAddingRecommended] = useState<number | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<{ id: number; slug: string; name: string; image?: string | null; price: string | number; priceUsd?: string | number } | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<'in_stock' | 'preorder'>('in_stock');
  const [skuStockFilter, setSkuStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [skuSort, setSkuSort] = useState<"stock_priority" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc">("stock_priority");
  const [hoveredPreview, setHoveredPreview] = useState<{ variantId: number; x: number; y: number } | null>(null);
  const [previewVariantId, setPreviewVariantId] = useState<number | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet_balance" | "qr">("qr");
  const [inlinePayment, setInlinePayment] = useState<InlinePayment | null>(null);
  const [inlinePaymentExpired, setInlinePaymentExpired] = useState(false);
  const [inlineShipping, setInlineShipping] = useState({ name: "", phone: "", address: "", note: "" });
  const [inlineProvince, setInlineProvince] = useState("");
  const [inlineWard, setInlineWard] = useState("");
  const [inlineDetailAddress, setInlineDetailAddress] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFilter, setReviewFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewImage, setReviewImage] = useState<{ fileName: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string } | null>(null);
  const filteredReviewItems = reviewFilter === 0 ? reviewItems : reviewItems.filter(review => Number(review.rating) === reviewFilter);
  const [cartFly, setCartFly] = useState<{ id: number; image: string; startX: number; startY: number; endX: number; endY: number; active: boolean } | null>(null);
  const [primaryImageFailed, setPrimaryImageFailed] = useState(false);
  const [zoomPoint, setZoomPoint] = useState<{ x: number; y: number } | null>(null);
  const [mobileZoomOpen, setMobileZoomOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>(getComparedProductIds);
  const submitReviewMutation = trpc.store.submitProductReview.useMutation({ onSuccess: () => { setReviewBody(""); setReviewRating(5); setReviewImage(null); toast.success("Đã gửi đánh giá thành công."); void utils.store.productReviews.invalidate(); }, onError: error => toast.error(error.message) });
  const toggleFavoriteMutation = trpc.store.toggleFavorite.useMutation({ onSuccess: result => { void utils.store.favorites.invalidate(); toast.success(result.isFavorite ? "Đã lưu vào Yêu thích" : "Đã bỏ khỏi Yêu thích"); }, onError: error => toast.error(error.message) });
  const requestRestockMutation = trpc.store.requestRestock.useMutation({ onSuccess: () => { void utils.store.restockSubscriptions.invalidate(); toast.success("Đã đăng ký nhắc lại hàng. Khi kho được cập nhật, trạng thái sẽ hiện trong Tài khoản."); }, onError: error => toast.error(error.message) });
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId);
  const isFavorite = Boolean(product && (favoritesQuery.data || []).some(item => item.productId === product.id));
  const sortedVariants = [...variants].sort((a, b) => {
    if (skuSort === "price_asc" || skuSort === "price_desc") {
      const priceA = Number(product?.price || 0) + Number(a.priceAdjustment || 0);
      const priceB = Number(product?.price || 0) + Number(b.priceAdjustment || 0);
      return skuSort === "price_asc" ? priceA - priceB : priceB - priceA;
    }
    if (skuSort === "stock_asc" || skuSort === "stock_desc") return skuSort === "stock_asc" ? Number(a.stock) - Number(b.stock) : Number(b.stock) - Number(a.stock);
    return Number(b.stock > 0) - Number(a.stock > 0);
  });
  const inStockSkuCount = variants.filter(variant => Number(variant.stock) > 0).length;
  const totalSkuStock = variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0);
  const allPhysicalSkusOutOfStock = product?.type === "physical" && (variants.length > 0 ? totalSkuStock <= 0 : Number(product.stock || 0) <= 0);
  const restockVariantId = selectedVariant && Number(selectedVariant.stock) <= 0 ? selectedVariant.id : undefined;
  const restockSubscription = product ? (restockSubscriptionsQuery.data || []).find(item => item.productId === product.id && item.variantId === (restockVariantId || 0) && item.status !== "cancelled") : undefined;
  const normalizedSkuSearch = skuSearch.trim().toLocaleLowerCase("vi-VN");
  const visibleVariants = sortedVariants.filter(variant => {
    const matchesSearch = !normalizedSkuSearch || `${formatVariantOptions(variant)} ${variant.sku || ""}`.toLocaleLowerCase("vi-VN").includes(normalizedSkuSearch);
    const matchesStock = skuStockFilter === "all" || (skuStockFilter === "in_stock" ? Number(variant.stock) > 0 : Number(variant.stock) <= 0);
    return matchesSearch && matchesStock;
  });
  const selectedSkuItems = sortedVariants.map(variant => ({ variant, quantity: variantQuantities[variant.id] ?? 0 })).filter(item => item.quantity > 0);
  const selectedSkuTotal = selectedSkuItems.reduce((total, item) => total + item.quantity, 0);
  const directPurchaseQuantity = product?.type === "physical" && variants.length > 0 ? (selectedVariantId ? variantQuantities[selectedVariantId] ?? 0 : 0) : quantity;
  const wholesaleQuantity = product?.type === "physical" && product.purchaseLayout === "marketplace" ? selectedSkuTotal : directPurchaseQuantity;
  const applicableWholesaleTier = [...wholesaleTiers].filter(tier => wholesaleQuantity >= tier.minQuantity).sort((a, b) => b.minQuantity - a.minQuantity)[0];
  const unitPrice = Number(applicableWholesaleTier?.unitPrice ?? product?.price ?? 0) + Number(selectedVariant?.priceAdjustment || 0);
  const previewVariant = variants.find(variant => variant.id === previewVariantId);
  const hoveredVariant = variants.find(variant => variant.id === hoveredPreview?.variantId);
  const galleryImages = useMemo(() => Array.from(new Set([selectedVariant?.image, ...(product?.gallery || []), product?.image].filter((value): value is string => Boolean(value)))), [product?.gallery, product?.image, selectedVariant?.image]);
  const primaryImageUrl = galleryImages[galleryIndex] || galleryImages[0] || "";
  const recommendedProducts = useMemo(() => {
    if (!product) return [];
    const all = productsQuery.data || [];
    return all.filter(candidate => candidate.id !== product.id && (candidate.categoryId === product.categoryId || candidate.type === product.type)).slice(0, 4);
  }, [product, productsQuery.data]);
  const normalizeOptionName = (name: string) => /kích\s*(cỡ|thước)|size/i.test(name) ? "Kích cỡ" : name.trim();
  const optionGroups = Array.from(new Set(sortedVariants.flatMap(variant => getVariantOptions(variant)).map(option => normalizeOptionName(option.name)))).map(name => ({ name, values: Array.from(new Set(sortedVariants.flatMap(variant => getVariantOptions(variant)).filter(option => normalizeOptionName(option.name) === name).map(option => option.value))) }));
  const availableSizes = Array.from(new Set(sortedVariants.map(variant => variant.size).filter((size): size is string => Boolean(size))));
  const selectedOptionValues = new Map(getVariantOptions(selectedVariant || {}).map(option => [normalizeOptionName(option.name), option.value]));
  const isHdFootballProduct = product?.type === "physical" && optionGroups.some(group => /kiểu|style/i.test(group.name)) && optionGroups.some(group => /kích\s*cỡ|kích\s*thước|size/i.test(group.name));
  useEffect(() => {
    if (!isHdFootballProduct || !selectedVariant) return;
    const desiredMode = Number(selectedVariant.stock) <= 0 ? "preorder" : "in_stock";
    if (fulfillmentMode !== desiredMode) setFulfillmentMode(desiredMode);
  }, [isHdFootballProduct, selectedVariant?.id, selectedVariant?.stock, fulfillmentMode]);
  useEffect(() => {
    if (isHdFootballProduct && selectedVariantId === null && sortedVariants.length > 0) setSelectedVariantId(sortedVariants[0].id);
  }, [isHdFootballProduct, selectedVariantId, sortedVariants[0]?.id]);
  const hdVariantPrices = isHdFootballProduct ? sortedVariants.map(variant => Number(product?.price || 0) + Number(variant.priceAdjustment || 0)).filter(price => Number.isFinite(price) && price > 0) : [];
  const hdPriceMin = hdVariantPrices.length > 0 ? Math.min(...hdVariantPrices) : Number(product?.price || 0);
  const hdPriceMax = hdVariantPrices.length > 0 ? Math.max(...hdVariantPrices) : hdPriceMin;
  const availableStock = product?.type === "physical" ? (selectedVariant ? selectedVariant.stock : variants.length > 0 ? totalSkuStock : product.stock) : Number.MAX_SAFE_INTEGER;
  const hasSellablePrice = Number(product?.price ?? 0) > 0 && Number.isFinite(Number(product?.price));
  const canRequestRestock = Boolean(product?.type === "physical" && (allPhysicalSkusOutOfStock || restockVariantId));
  const requiresVariant = product?.type === "physical" && variants.length > 0;
  const isPreorder = product?.type === "physical" && fulfillmentMode === 'preorder';
  const isMarketplaceLayout = product?.type === "physical" && product.purchaseLayout === "marketplace";
  const shippingWeightGrams = product?.type === "physical" ? Math.max(0, Number(selectedVariant?.weightGrams ?? product.weightGrams ?? 0)) * directPurchaseQuantity : 0;
  const estimatedSpxFee = product?.type === "physical" && directPurchaseQuantity > 0 ? 10_000 + Math.max(1, Math.ceil(shippingWeightGrams / 1000)) * 10_000 : 0;
  const selectedSkuWeightGrams = product?.type === "physical" ? selectedSkuItems.reduce((total, item) => total + Math.max(0, Number(item.variant.weightGrams ?? product.weightGrams ?? 0)) * item.quantity, 0) : 0;
  const selectedSkuShippingFee = selectedSkuTotal > 0 ? 10_000 + Math.max(1, Math.ceil(selectedSkuWeightGrams / 1000)) * 10_000 : 0;
  const selectedSkuBaseTotal = selectedSkuItems.reduce((total, item) => total + (Number(product?.price ?? 0) + Number(item.variant.priceAdjustment || 0)) * item.quantity, 0);
  const selectedSkuWholesaleTotal = selectedSkuItems.reduce((total, item) => total + (Number(applicableWholesaleTier?.unitPrice ?? product?.price ?? 0) + Number(item.variant.priceAdjustment || 0)) * item.quantity, 0);
  const selectedSkuWholesaleSavings = Math.max(0, selectedSkuBaseTotal - selectedSkuWholesaleTotal);
  const selectedSkuMerchandiseTotal = selectedSkuWholesaleTotal * (isPreorder ? 0.9 : 1);
  const selectedSkuEstimatedTotal = selectedSkuMerchandiseTotal + selectedSkuShippingFee;
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
    setPrimaryImageFailed(false);
    setZoomPoint(null);
    setMobileZoomOpen(false);
    setGalleryIndex(0);
  }, [product?.slug, selectedVariant?.id]);

  useEffect(() => {
    if (product?.type === "physical" && fulfillmentMode === 'in_stock' && availableStock > 0) setQuantity(current => Math.min(current, availableStock));
  }, [availableStock, product?.type, fulfillmentMode]);

  useEffect(() => {
    if (!product?.id) return;
    addRecentProduct(product.id);
    const refreshCompare = () => setCompareIds(getComparedProductIds());
    window.addEventListener("dhlstores-customer-tools", refreshCompare);
    return () => window.removeEventListener("dhlstores-customer-tools", refreshCompare);
  }, [product?.id]);

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

  const animateProductToCart = () => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const source = document.querySelector<HTMLElement>("[data-product-primary-image]");
    const target = document.getElementById("header-cart-trigger");
    if (!source || !target || !product?.image) return;
    const start = source.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const id = Date.now();
    setCartFly({ id, image: selectedVariant?.image || product.image, startX: start.left + start.width / 2, startY: start.top + start.height / 2, endX: end.left + end.width / 2, endY: end.top + end.height / 2, active: false });
    window.requestAnimationFrame(() => setCartFly(current => current?.id === id ? { ...current, active: true } : current));
    window.setTimeout(() => {
      setCartFly(current => current?.id === id ? null : current);
      window.dispatchEvent(new CustomEvent("dhlstores-cart-animation-complete"));
    }, 720);
  };

  const addToCartMutation = trpc.store.addToCart.useMutation({
    onSuccess: () => {
      playCartSuccessSound();
      animateProductToCart();
      const recommendedToast = addingRecommended !== null;
      toast.success(recommendedToast ? (lang === "vi" ? "Sản phẩm vừa được thêm vào giỏ hàng" : "Product just added to your cart") : (lang === 'vi' ? "Sản phẩm vừa được thêm vào giỏ hàng" : "Product just added to your cart"), { duration: 3000, position: "bottom-right", action: { label: lang === "vi" ? "Đi đến giỏ hàng" : "Go to cart", onClick: () => { window.location.href = "/cart"; } } });
      setAddingRecommended(null);
      utils.store.cart.invalidate();
      setAdding(false);
    },
    onError: (err) => {
      setAddingRecommended(null);
      toast.error(err.message || "Không thể thêm vào giỏ hàng");
      setAdding(false);
    }
  });
  const addManyToCartMutation = trpc.store.addManyToCart.useMutation({
    onSuccess: result => {
      playCartSuccessSound();
      animateProductToCart();
      toast.success(lang === "vi" ? `Sản phẩm vừa được thêm vào giỏ hàng · ${result.addedCount} SKU` : `${result.addedCount} products just added to your cart`, { duration: 3000, position: "bottom-right", action: { label: lang === "vi" ? "Đi đến giỏ hàng" : "Go to cart", onClick: () => { window.location.href = "/cart"; } } });
      utils.store.cart.invalidate();
      setAdding(false);
    },
    onError: err => {
      toast.error(err.message || "Không thể thêm các SKU vào giỏ hàng");
      setAdding(false);
    },
  });

  const cancelInlineOrder = trpc.store.cancelPendingOrder.useMutation();
  const quickCheckoutMutation = trpc.store.quickCheckout.useMutation({
    onSuccess: order => {
      setInlinePayment(order);
      setInlinePaymentExpired(false);
	      toast.success(order.hasPhysicalItems ? "Mã QR thanh toán đã sẵn sàng trên trang sản phẩm." : "Mã QR thanh toán đã sẵn sàng. Hệ thống sẽ tự mở quyền tải sau khi giao dịch được xác nhận.");
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500" />
        </div>
      </StoreLayout>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-2xl px-4 py-20 sm:py-28"><div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] p-8 text-center text-white shadow-xl sm:p-12"><div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:24px_24px]" /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">DHL Stores · Resource Library</p><div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-3xl font-black text-sky-300">404</div><h2 className="mt-5 text-2xl font-black uppercase tracking-tight sm:text-3xl">{lang === 'vi' ? 'Không tìm thấy tài nguyên' : 'Resource not found'}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">{lang === 'vi' ? 'Liên kết có thể đã thay đổi hoặc sản phẩm đã được gỡ khỏi kho. Hãy quay lại danh mục để chọn tài nguyên khác.' : 'This link may have changed or the resource may have been removed. Return to the library to choose another resource.'}</p><Link href="/products"><Button className="mt-7 bg-sky-500 px-5 font-black text-slate-950 hover:bg-sky-400"><Home className="mr-2 h-4 w-4" />{lang === 'vi' ? 'Quay lại kho tài nguyên' : 'Back to library'}</Button></Link></div></div></div>
      </StoreLayout>
    );
  }

  const formatCurrency = (val: string | number, usdOverride?: string | number) => {
    const num = Number(val);
    return formatLocalizedPrice(num, lang, usdOverride);
  };
  const hdStyleGroup = optionGroups.find(group => /kiểu|style/i.test(group.name));
  const hdSizeGroup = optionGroups.find(group => group.name === "Kích cỡ");
  const getHdVariant = (style: string, size: string) => sortedVariants.find(variant => {
    const options = new Map(getVariantOptions(variant).map(option => [normalizeOptionName(option.name), option.value]));
    return options.get(normalizeOptionName(hdStyleGroup?.name || "Kiểu")) === style && options.get("Kích cỡ") === size;
  });

  const handleAddToCart = () => {
    if (!hasSellablePrice) {
      toast.error(lang === 'vi' ? "Sản phẩm đang được cập nhật giá. Bạn vẫn có thể xem chi tiết hoặc nhắn cửa hàng." : "The price is being updated. You can still view details or contact the store.");
      return;
    }
    if (!isAuthenticated) {
      toast.error(lang === 'vi' ? "Vui lòng đăng nhập để thêm vào giỏ hàng" : "Please sign in to add to cart");
      startLogin();
      return;
    }

    if (product.type === "physical" && variants.length > 0) {
      if (selectedSkuItems.length === 0) return toast.error("Hãy tăng số lượng cho ít nhất một SKU");
      setAdding(true);
      addManyToCartMutation.mutate({
        productId: product.id,
        fulfillmentMode,
        items: selectedSkuItems.map(item => ({ variantId: item.variant.id, quantity: item.quantity })),
      });
      return;
    }
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
    if (!hasSellablePrice) {
      toast.error(lang === 'vi' ? "Sản phẩm đang được cập nhật giá. Bạn vẫn có thể xem chi tiết hoặc nhắn cửa hàng." : "The price is being updated. You can still view details or contact the store.");
      return;
    }
    if (!isAuthenticated) {
      toast.error(lang === 'vi' ? "Vui lòng đăng nhập để mua tài nguyên" : "Please sign in to purchase");
      startLogin();
      return;
    }
    if (product.type === "physical" && variants.length > 0 && (!selectedVariantId || directPurchaseQuantity < 1)) return toast.error("Hãy chọn một SKU có số lượng từ 1 để mua ngay");
    if (product.type === "physical" && fulfillmentMode === 'in_stock' && availableStock < directPurchaseQuantity) return toast.error("Số lượng yêu cầu vượt tồn kho hiện có");
    setInlinePayment(null);
    setInlinePaymentExpired(false);
    setBuyNowLoading(true);
    setPaymentDialogOpen(true);
    window.setTimeout(() => setBuyNowLoading(false), 450);
  };

  const createInlinePayment = () => {
    if (product.type === "physical" && (!inlineShipping.name || !inlineShipping.phone || !inlineShipping.address)) return toast.error("Vui lòng điền đủ thông tin nhận hàng trước khi thanh toán.");
    if (paymentMethod === "wallet_balance" && walletBalance < (unitPrice * directPurchaseQuantity * (isPreorder ? 0.9 : 1)) + estimatedSpxFee) return toast.error("Số dư ví không đủ cho đơn hàng này.");
    quickCheckoutMutation.mutate({
      item: { productId: product.id, quantity: directPurchaseQuantity, variantId: selectedVariantId || undefined, fulfillmentMode: product.type === "physical" ? fulfillmentMode : undefined },
      shipping: product.type === "physical" ? inlineShipping : undefined,
      paymentMethod: paymentMethod === "wallet_balance" ? "wallet_balance" : undefined,
      internationalPricing: lang === "en",
    });
  };

  const updateHoveredPreview = (variantId: number, clientX: number, clientY: number) => {
    if (typeof window === "undefined" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const previewWidth = 176;
    const previewHeight = 230;
    setHoveredPreview({
      variantId,
      x: Math.max(12, Math.min(window.innerWidth - previewWidth - 12, clientX + 18)),
      y: Math.max(12, Math.min(window.innerHeight - previewHeight - 12, clientY - previewHeight - 16)),
    });
  };

  const clearAllVariantQuantities = () => {
    if (selectedSkuTotal > 0 && typeof window !== "undefined" && !window.confirm("Bạn có chắc muốn đưa toàn bộ số lượng SKU về 0 không?")) return;
    setVariantQuantities({});
    toast.success("Đã xóa toàn bộ số lượng SKU về 0.");
  };

  const setAllVisibleVariantQuantities = (quantity: number) => {
    const selectable = visibleVariants.filter(variant => isPreorder || Number(variant.stock) > 0);
    if (quantity === 0 && selectedSkuTotal > 0 && typeof window !== "undefined" && !window.confirm("Đưa số lượng các SKU đang lọc về 0 và bỏ khỏi giỏ dự kiến?")) return;
    setVariantQuantities(current => {
      const next = { ...current };
      selectable.forEach(variant => { next[variant.id] = quantity === 0 ? 0 : Math.min(quantity, isPreorder ? 99 : Math.max(0, Number(variant.stock) || 0)); });
      return next;
    });
    toast.success(quantity === 0 ? "Đã bỏ chọn các SKU đang lọc." : `Đã chọn ${selectable.length} SKU đang hiển thị.`);
  };

  const updateVariantQuantity = (variantId: number, requestedQuantity: number) => {
    const variant = variants.find(item => item.id === variantId);
    if (!variant || !Number.isFinite(requestedQuantity)) return;
    const orderableHd = isHdFootballProduct;
    const max = isPreorder || orderableHd ? 99 : Math.max(0, variant.stock);
    const nextQuantity = Math.min(max, Math.max(0, Math.floor(requestedQuantity)));
    if (!isPreorder && !orderableHd && requestedQuantity > max) {
      setQuantityWarnings(current => ({ ...current, [variantId]: `Chỉ còn ${max} sản phẩm trong kho` }));
      setQuantityShakeVariantId(variantId);
      window.setTimeout(() => setQuantityShakeVariantId(current => current === variantId ? null : current), 500);
      toast.error(`SKU ${formatVariantOptions(variant)} chỉ còn ${max} sản phẩm trong kho`, { duration: 2200 });
    } else {
      setQuantityWarnings(current => { const next = { ...current }; delete next[variantId]; return next; });
    }
    const currentQuantity = variantQuantities[variantId] ?? 0;
    if (currentQuantity > 0 && nextQuantity === 0 && typeof window !== "undefined" && !window.confirm(`Đưa số lượng “${formatVariantOptions(variant)}” về 0 và bỏ SKU này khỏi giỏ dự kiến?`)) return;
    setVariantQuantities(current => ({ ...current, [variantId]: nextQuantity }));
    if (nextQuantity > 0) setSelectedVariantId(variantId);
    setQuantityUpdatingVariantId(variantId);
    setQuantityUpdatedVariantId(null);
    window.setTimeout(() => {
      setQuantityUpdatingVariantId(current => current === variantId ? null : current);
      setQuantityUpdatedVariantId(variantId);
      window.setTimeout(() => setQuantityUpdatedVariantId(current => current === variantId ? null : current), 1400);
    }, 260);
  };

  const stockProgress = (stock: number) => Math.min(100, Math.max(0, Number(stock) > 0 ? (Number(stock) / 50) * 100 : 0));
  const requestRestockForVariant = (variantId: number) => {
    if (!isAuthenticated) { toast.info("Đăng nhập để nhận thông báo khi có hàng"); startLogin(); return; }
    requestRestockMutation.mutate({ productId: product.id, variantId });
  };
  const restockButton = (variant: (typeof variants)[number]) => !isPreorder && Number(variant.stock) <= 0 ? <button type="button" onClick={event => { event.stopPropagation(); requestRestockForVariant(variant.id); }} disabled={requestRestockMutation.isPending} className="mt-1 inline-flex min-h-7 max-w-full items-center justify-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2 text-center text-[9px] font-black break-words whitespace-normal text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"><BellRing className="h-3 w-3 shrink-0" />Nhận thông báo khi có hàng</button> : null;
  const quantityStatus = (variantId: number) => quantityUpdatingVariantId === variantId ? <span className="ml-1 inline-flex items-center text-[9px] font-bold text-sky-700" aria-live="polite"><Loader2 className="mr-0.5 h-3 w-3 animate-spin" />Đang cập nhật</span> : quantityUpdatedVariantId === variantId ? <span className="ml-1 text-[9px] font-bold text-emerald-700" aria-live="polite">Đã cập nhật</span> : null;

  const skuBatchSelector = product.type === "physical" && variants.length > 1 && !isHdFootballProduct ? (
    <section className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sky-100 pb-3">
        <div><p className="text-xs font-black uppercase tracking-wide text-slate-900">Chọn nhiều SKU, thêm giỏ một lần</p><p className="mt-1 text-[11px] leading-relaxed text-slate-600">Để số lượng <strong>0</strong> cho SKU không lấy. Mỗi dòng có giá, tồn kho và số lượng riêng; bấm Thêm vào giỏ sẽ thêm toàn bộ SKU đang có số lượng.</p></div>
        <div className="flex items-center gap-2"><div className="rounded-lg bg-sky-50 px-3 py-2 text-right"><p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Đang chọn</p><p className="text-sm font-black text-slate-900">{selectedSkuTotal} sản phẩm · {selectedSkuItems.length} SKU</p><p className="mt-1 text-[10px] font-bold text-slate-500">Kho khả dụng: {totalSkuStock} · {inStockSkuCount}/{variants.length} SKU</p>{latestSapoSyncAt && <p className="mt-1 text-[10px] font-semibold text-slate-500">Sapo cập nhật gần nhất: {latestSapoSyncAt.toLocaleString("vi-VN")}</p>}{applicableWholesaleTier && <p className="mt-1 text-[10px] font-black text-emerald-700">Giá sỉ mốc {applicableWholesaleTier.minQuantity} cái</p>}</div><button type="button" onClick={clearAllVariantQuantities} disabled={selectedSkuTotal === 0} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">Xóa tất cả</button></div>
      </div>
      <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]"><div className="flex min-w-0 items-center gap-2"><label className="sr-only" htmlFor="sku-search">Tìm SKU</label><input id="sku-search" value={skuSearch} onChange={event => setSkuSearch(event.target.value)} placeholder="Tìm tên, thuộc tính hoặc mã SKU…" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100" />{skuSearch && <button type="button" onClick={() => setSkuSearch("")} className="rounded-lg px-2 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 hover:text-slate-800">Xóa</button>}<span className="shrink-0 text-[10px] font-black text-slate-500">{visibleVariants.length}/{sortedVariants.length} SKU</span></div><div className="flex flex-wrap items-center gap-1.5"><label className="sr-only" htmlFor="sku-sort">Sắp xếp SKU</label><select id="sku-sort" value={skuSort} onChange={event => setSkuSort(event.target.value as typeof skuSort)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-700 outline-none focus:border-sky-400"><option value="stock_priority">Ưu tiên còn hàng</option><option value="price_asc">Giá thấp → cao</option><option value="price_desc">Giá cao → thấp</option><option value="stock_desc">Tồn kho nhiều → ít</option><option value="stock_asc">Tồn kho ít → nhiều</option></select><div className="flex rounded-lg border border-slate-200 bg-white p-0.5" aria-label="Lọc tồn kho"><button type="button" onClick={() => setSkuStockFilter("all")} className={`rounded-md px-2 py-1.5 text-[10px] font-black ${skuStockFilter === "all" ? "bg-slate-900 text-white" : "text-slate-500"}`}>Tất cả</button><button type="button" onClick={() => setSkuStockFilter("in_stock")} className={`rounded-md px-2 py-1.5 text-[10px] font-black ${skuStockFilter === "in_stock" ? "bg-emerald-600 text-white" : "text-slate-500"}`}>Còn hàng</button><button type="button" onClick={() => setSkuStockFilter("out_of_stock")} className={`rounded-md px-2 py-1.5 text-[10px] font-black ${skuStockFilter === "out_of_stock" ? "bg-rose-600 text-white" : "text-slate-500"}`}>Hết hàng</button></div><button type="button" onClick={() => setAllVisibleVariantQuantities(1)} disabled={visibleVariants.every(variant => !isPreorder && Number(variant.stock) <= 0)} className="rounded-lg bg-[#0875e1] px-2.5 py-2 text-[10px] font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">Chọn tất cả</button><button type="button" onClick={() => setAllVisibleVariantQuantities(0)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-600 hover:border-rose-300 hover:text-rose-700">Bỏ chọn</button></div></div>
      <div className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-600 lg:grid-cols-[4.5rem_minmax(0,1fr)_8rem_11rem]"><span>Ảnh</span><span className="min-w-0 whitespace-normal">Thông tin phiên bản / SKU</span><span className="hidden text-right lg:block">Đơn giá</span><span className="col-span-2 hidden text-right lg:block">Khả dụng & thao tác</span></div>
        <div className="space-y-2 p-2 sm:p-3">
          {visibleVariants.map(variant => {
            const rowQuantity = variantQuantities[variant.id] ?? 0;
            const outOfStock = !isPreorder && variant.stock <= 0;
            const lowStock = !outOfStock && !isPreorder && variant.stock <= 5;
            const rowUnitPrice = Number(applicableWholesaleTier?.unitPrice ?? product.price) + Number(variant.priceAdjustment || 0);
            return <div key={variant.id} data-sku-preview-variant={variant.image ? variant.id : undefined} onPointerEnter={event => { if (variant.image) updateHoveredPreview(variant.id, event.clientX, event.clientY); }} onPointerMove={event => { if (variant.image) updateHoveredPreview(variant.id, event.clientX, event.clientY); }} onPointerLeave={() => setHoveredPreview(null)} onClick={() => setSelectedVariantId(variant.id)} className={`grid min-w-0 cursor-pointer grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-200 lg:grid-cols-[4.5rem_minmax(0,1fr)_8rem_11rem] lg:rounded-none lg:border-0 lg:px-4 lg:py-4 ${quantityUpdatedVariantId === variant.id ? "animate-[pulse_0.45s_ease-out]" : ""} ${rowQuantity > 0 ? "border-sky-200 bg-sky-50 ring-1 ring-inset ring-sky-200" : selectedVariantId === variant.id ? "border-sky-100 bg-sky-50/70" : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/30"}`}>
              <button type="button" aria-label={variant.image ? `Mở ảnh ${formatVariantOptions(variant)}` : "SKU không có ảnh"} onClick={event => { event.stopPropagation(); if (variant.image) setPreviewVariantId(variant.id); }} className={`h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${variant.image ? "cursor-zoom-in" : "cursor-default"}`}>{variant.image ? <img src={variant.image} alt={formatVariantOptions(variant)} className="h-full w-full object-contain" /> : <span className="grid h-full place-items-center text-[9px] font-black text-slate-400">SKU</span>}</button>
              <div className="min-w-[8.5rem] overflow-hidden"><button type="button" disabled={!variant.image} onClick={event => { event.stopPropagation(); if (variant.image) setPreviewVariantId(variant.id); }} className="line-clamp-2 w-full whitespace-normal text-left text-xs font-black leading-relaxed text-slate-900 transition hover:text-[#0875e1] disabled:cursor-default disabled:hover:text-slate-900">{formatVariantOptions(variant)}{variant.image && <span className="ml-1 text-[9px] font-bold text-slate-400">Xem ảnh</span>}</button><p className="mt-1 break-all text-[10px] font-mono text-slate-500">{variant.sku || "Không có mã SKU"}</p><p className="mt-1 text-[11px] font-black text-[#0875e1] sm:hidden">{isPreorder ? <><span className="mr-1 text-[10px] font-bold text-slate-400 line-through">{formatCurrency(rowUnitPrice)}</span>{formatCurrency(rowUnitPrice * 0.9)}</> : formatCurrency(rowUnitPrice)} · {isPreorder ? "Order trước" : outOfStock ? "Hết hàng" : lowStock ? `Sắp hết · còn ${variant.stock}` : `Còn ${variant.stock}`}</p></div>
              <p className="hidden text-right text-xs font-black text-[#0875e1] lg:block">{isPreorder ? <span className="inline-flex flex-col items-end leading-tight"><span className="text-[10px] font-bold text-slate-400 line-through">{formatCurrency(rowUnitPrice)}</span><span>{formatCurrency(rowUnitPrice * 0.9)}</span></span> : formatCurrency(rowUnitPrice)}</p>

              <div className="col-span-2 min-w-0 max-w-full flex flex-wrap items-center justify-between gap-2 lg:col-span-1 lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-2 lg:justify-self-end"><div className="flex min-w-0 max-w-full flex-wrap items-center gap-2"><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-800">{isPreorder ? <span title="Hàng đặt trước, dự kiến giao trong 7–10 ngày">Order</span> : <span className={variant.stock < 10 ? "text-rose-700" : "text-emerald-800"}>Kho: {variant.stock}</span>} {!isPreorder && <span className="mt-1 block h-1 w-16 overflow-hidden rounded-full bg-slate-200"><span className={`block h-full rounded-full ${variant.stock < 10 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${stockProgress(variant.stock)}%` }} /></span>}</span><div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white"><button type="button" onClick={event => { event.stopPropagation(); updateVariantQuantity(variant.id, rowQuantity - 1); }} disabled={rowQuantity <= 0} className="grid h-11 w-11 place-items-center text-xl font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 sm:h-9 sm:w-9 sm:text-base">−</button><input aria-label={`Số lượng ${formatVariantOptions(variant)}`} inputMode="numeric" value={rowQuantity} onClick={event => event.stopPropagation()} onChange={event => { const digits = event.target.value.replace(/\D/g, ""); updateVariantQuantity(variant.id, digits ? Number(digits) : 0); }} className={`h-11 w-12 border-x border-slate-200 text-center text-sm font-black text-slate-900 outline-none focus:bg-sky-50 sm:h-9 sm:w-10 sm:text-xs ${quantityShakeVariantId === variant.id ? "animate-[dhl-shake_0.35s_ease-in-out]" : ""}`} /><button type="button" onClick={event => { event.stopPropagation(); updateVariantQuantity(variant.id, rowQuantity + 1); }} disabled={outOfStock || (!isPreorder && rowQuantity >= variant.stock) || (isPreorder && rowQuantity >= 99)} className="grid h-11 w-11 place-items-center text-xl font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 sm:h-9 sm:w-9 sm:text-base">+</button></div></div>{quantityStatus(variant.id)}{restockButton(variant)}{quantityWarnings[variant.id] && <p className="mt-1 max-w-[8rem] text-right text-[9px] font-black leading-tight text-rose-700">{quantityWarnings[variant.id]}</p>}<button type="button" aria-label={isFavorite ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm để mua sau"} onClick={event => { event.stopPropagation(); if (!isAuthenticated) { toast.info("Đăng nhập để lưu sản phẩm mua sau"); startLogin(); return; } toggleFavoriteMutation.mutate({ productId: product.id }); }} className={`mt-1 inline-flex items-center gap-1 text-[9px] font-black ${isFavorite ? "text-rose-700" : "text-slate-500 hover:text-rose-700"}`}><Heart className={`h-3 w-3 ${isFavorite ? "fill-current" : ""}`} />{isFavorite ? "Đã lưu" : "Lưu mua sau"}</button></div>
            </div>;
          })}
          {visibleVariants.length === 0 && <div className="px-4 py-10 text-center text-xs font-semibold text-slate-500">Không tìm thấy SKU phù hợp. Hãy thử tên màu, size hoặc mã SKU khác.</div>}
        </div>
      </div>
      <div className="mt-3 grid min-w-0 gap-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate"><strong>Ước tính đơn trong giỏ:</strong> {selectedSkuTotal > 0 ? `${selectedSkuWeightGrams.toLocaleString("vi-VN")} g · phí SPX ${formatCurrency(selectedSkuShippingFee)}` : "chọn SKU để xem phí SPX"}</p>{selectedSkuTotal > 0 && <p className="mt-1 font-black text-slate-900">Tạm tính: {formatCurrency(selectedSkuEstimatedTotal)}</p>}</div><span className="font-black sm:text-right">{applicableWholesaleTier ? `Giá sỉ mốc ${applicableWholesaleTier.minQuantity} cái` : isPreorder ? "Order trước · 7–10 ngày" : "Hàng sẵn · giao 2–5 ngày"}</span></div>
    </section>
  ) : null;

  const classicQuantitySelector = (!isMarketplaceLayout || isHdFootballProduct) && product.type === "physical" && variants.length > 1 ? <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Số lượng</p><p className="mt-1 text-xs font-semibold text-slate-800">{selectedVariant ? formatVariantOptions(selectedVariant) : "Chọn màu và size trước"}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-800">{isPreorder ? <span title="Hàng đặt trước, dự kiến giao trong 7–10 ngày">Order</span> : selectedVariant ? <span className={selectedVariant.stock < 10 ? "text-rose-700" : "text-emerald-800"}>Kho: {selectedVariant.stock}</span> : "Chưa chọn SKU"}</span><div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><button type="button" disabled={!selectedVariantId || directPurchaseQuantity <= 0} onClick={() => selectedVariantId && updateVariantQuantity(selectedVariantId, directPurchaseQuantity - 1)} className="grid h-11 w-11 place-items-center text-xl font-black text-slate-700 disabled:text-slate-300 sm:h-9 sm:w-9 sm:text-lg">−</button><input aria-label="Số lượng sản phẩm" value={directPurchaseQuantity} onChange={event => selectedVariantId && updateVariantQuantity(selectedVariantId, Number(event.target.value.replace(/\\D/g, "")) || 0)} className={`h-11 w-14 border-x border-slate-200 bg-white text-center text-sm font-black outline-none sm:h-9 ${quantityShakeVariantId === selectedVariantId ? "animate-[dhl-shake_0.35s_ease-in-out]" : ""}`} /><button type="button" disabled={!selectedVariantId || (!isPreorder && !isHdFootballProduct && directPurchaseQuantity >= (selectedVariant?.stock || 0))} onClick={() => selectedVariantId && updateVariantQuantity(selectedVariantId, directPurchaseQuantity + 1)} className="grid h-11 w-11 place-items-center text-xl font-black text-slate-700 disabled:text-slate-300 sm:h-9 sm:w-9 sm:text-lg">+</button></div></div></div></div> : null;
  const singleVariant = variants.length === 1 ? variants[0] : null;
  const singleVariantQuantity = singleVariant ? variantQuantities[singleVariant.id] ?? 0 : 0;
  const singleVariantInlineSelector = product.type === "physical" && singleVariant ? <div className="rounded-xl border border-sky-200 bg-white p-3 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">SKU duy nhất · chọn số lượng</p><p className="mt-1 truncate text-sm font-black text-slate-900">{formatVariantOptions(singleVariant)}</p><p className="mt-1 break-all text-[10px] font-mono text-slate-500">{singleVariant.sku || "Không có mã SKU"} · Tồn {isPreorder ? "nhận order" : singleVariant.stock}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-800">{isPreorder ? <span title="Hàng đặt trước, dự kiến giao trong 7–10 ngày">Order</span> : <span className={singleVariant.stock < 10 ? "text-rose-700" : "text-emerald-800"}>Kho: {singleVariant.stock}</span>}</span><div className="flex items-center overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50"><button type="button" aria-label="Giảm số lượng" disabled={singleVariantQuantity <= 0} onClick={() => updateVariantQuantity(singleVariant.id, singleVariantQuantity - 1)} className="grid h-11 w-11 place-items-center text-xl font-black text-slate-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:text-slate-300 sm:h-10 sm:w-10 sm:text-lg">−</button><input aria-label={`Số lượng ${formatVariantOptions(singleVariant)}`} inputMode="numeric" value={singleVariantQuantity} onChange={event => updateVariantQuantity(singleVariant.id, Number(event.target.value.replace(/\\D/g, "")) || 0)} className={`h-11 w-14 border-x border-emerald-200 bg-white text-center text-sm font-black text-slate-900 outline-none focus:bg-sky-50 sm:h-10 ${quantityShakeVariantId === singleVariant.id ? "animate-[dhl-shake_0.35s_ease-in-out]" : ""}`} /><button type="button" aria-label="Tăng số lượng" disabled={(!isPreorder && singleVariant.stock <= 0) || (!isPreorder && singleVariantQuantity >= singleVariant.stock) || (isPreorder && singleVariantQuantity >= 99)} onClick={() => updateVariantQuantity(singleVariant.id, singleVariantQuantity + 1)} className="grid h-11 w-11 place-items-center text-xl font-black text-slate-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:text-slate-300 sm:h-10 sm:w-10 sm:text-lg">+</button></div></div>{quantityStatus(singleVariant.id)}{restockButton(singleVariant)}</div></div> : null;

  const skuInventoryPanel = product.type === "physical" && variants.length > 0 ? (
    <aside id="sku-inventory-panel" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xs font-black uppercase tracking-wide text-slate-800">Tồn kho theo SKU</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">{latestSapoSyncAt ? `Đồng bộ Sapo gần nhất: ${latestSapoSyncAt.toLocaleString("vi-VN")}` : "Chưa có lịch sử đồng bộ Sapo"}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Rê chuột vào bất kỳ vùng nào của SKU có ảnh để xem ảnh lớn. SKU hết hàng vẫn xem được ảnh.</p></div><span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">{variants.length} SKU</span></div>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white"><div>
        <div className="sticky top-0 z-10 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 bg-slate-100 px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-600 lg:grid-cols-[4.5rem_minmax(0,1fr)_8rem_11rem]"><span>Ảnh</span><span>Thông tin phiên bản / SKU</span><span className="hidden text-right lg:block">Đơn giá</span><span className="col-span-2 text-right lg:col-span-1">Khả dụng & thao tác</span></div>
        {sortedVariants.map(variant => {
          const isSelected = variant.id === selectedVariantId;
          const outOfStock = variant.stock <= 0;
          const rowQuantity = variantQuantities[variant.id] ?? 0;
          const rowUnitPrice = Number(applicableWholesaleTier?.unitPrice ?? product.price) + Number(variant.priceAdjustment || 0);
          return <div key={variant.id} role="button" tabIndex={0} data-sku-preview-variant={variant.image ? variant.id : undefined} aria-disabled={outOfStock} onClick={() => { if (!outOfStock) setSelectedVariantId(variant.id); }} onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !outOfStock) setSelectedVariantId(variant.id); }} className={`grid w-full grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 border-t border-slate-100 px-3 py-3 text-left text-xs transition-colors lg:grid-cols-[4.5rem_minmax(0,1fr)_8rem_11rem] ${quantityUpdatedVariantId === variant.id ? "animate-[pulse_0.45s_ease-out]" : ""} ${isSelected ? "bg-emerald-50" : "hover:bg-slate-50"} ${outOfStock ? "cursor-not-allowed opacity-55" : ""}`}>
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-label={variant.image ? `Xem ảnh lớn ${formatVariantOptions(variant)}` : undefined} onClick={event => { if (variant.image) { event.stopPropagation(); setPreviewVariantId(variant.id); } }}><span className={`block h-11 w-11 overflow-hidden rounded-md border border-slate-200 bg-slate-50 ${variant.image ? "cursor-zoom-in" : ""}`}>{variant.image ? <img src={variant.image} alt={formatVariantOptions(variant)} className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-[9px] font-bold text-slate-400">SKU</span>}</span></span>
            <span className="min-w-0"><span className="block truncate font-bold text-slate-800">{formatVariantOptions(variant)}</span><span className="mt-0.5 block truncate text-[10px] font-mono text-slate-500" title={variant.sku || "Không có SKU"}>{variant.sku || "Không có SKU"}</span>{isSelected && <span className="mt-1 block text-[10px] font-black text-emerald-700">Đang chọn</span>}<span className="mt-1 block text-[11px] font-black text-[#0875e1] lg:hidden">{formatCurrency(rowUnitPrice)}</span></span>
            <span className="hidden text-right text-xs font-black text-[#0875e1] lg:block">{isPreorder ? <span className="inline-flex flex-col items-end leading-tight"><span className="text-[10px] font-bold text-slate-400 line-through">{formatCurrency(rowUnitPrice)}</span><span>{formatCurrency(rowUnitPrice * 0.9)}</span></span> : formatCurrency(rowUnitPrice)}</span><span className="col-span-2 min-w-0 flex w-full flex-col items-stretch justify-end gap-1 lg:col-span-1 lg:items-end" onClick={event => event.stopPropagation()}><span className="mb-1 inline-flex flex-col items-end rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black shadow-sm sm:mb-1"><span className={outOfStock || variant.stock < 10 ? "text-rose-700" : "text-emerald-800"}>Kho: {outOfStock ? "Hết" : variant.stock}</span>{!outOfStock && <span className="mt-1 block h-1 w-16 overflow-hidden rounded-full bg-slate-200"><span className={`block h-full rounded-full ${variant.stock < 10 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${stockProgress(variant.stock)}%` }} /></span>}</span><span className="flex items-center overflow-hidden rounded-xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-sky-100 shadow-[0_4px_12px_rgba(234,88,12,0.18)] ring-1 ring-sky-200/70 transition-all hover:border-sky-400 hover:shadow-[0_6px_16px_rgba(234,88,12,0.28)]"><button type="button" aria-label={`Giảm số lượng ${formatVariantOptions(variant)}`} disabled={rowQuantity <= 0} onClick={() => updateVariantQuantity(variant.id, rowQuantity - 1)} className="grid h-12 w-11 place-items-center bg-sky-100/80 text-2xl font-black text-sky-800 transition hover:bg-sky-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 sm:h-9 sm:w-8 sm:text-lg">−</button><input aria-label={`Số lượng ${formatVariantOptions(variant)}`} inputMode="numeric" value={rowQuantity} onChange={event => updateVariantQuantity(variant.id, Number(event.target.value.replace(/\D/g, "")) || 0)} className={`h-12 w-14 border-x-2 border-sky-200 bg-white text-center text-base font-black text-slate-950 outline-none focus:bg-sky-50 sm:h-9 sm:w-10 sm:text-sm ${quantityShakeVariantId === variant.id ? "animate-[dhl-shake_0.35s_ease-in-out]" : ""}`} /><button type="button" aria-label={`Tăng số lượng ${formatVariantOptions(variant)}`} disabled={outOfStock || (!isPreorder && rowQuantity >= variant.stock) || (isPreorder && rowQuantity >= 99)} onClick={() => updateVariantQuantity(variant.id, rowQuantity + 1)} className="grid h-12 w-11 place-items-center bg-sky-100/80 text-2xl font-black text-sky-800 transition hover:bg-sky-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 sm:h-9 sm:w-8 sm:text-lg">+</button></span>{quantityStatus(variant.id)}{restockButton(variant)}{quantityWarnings[variant.id] && <p className="mt-1 max-w-[7rem] text-right text-[9px] font-black leading-tight text-rose-700">{quantityWarnings[variant.id]}</p>}<button type="button" disabled={outOfStock || (!isPreorder && variant.stock <= 0)} onClick={() => { setSelectedVariantId(variant.id); updateVariantQuantity(variant.id, Math.max(1, rowQuantity)); window.setTimeout(() => handleBuyNow(), 0); }} className="mt-1 inline-flex min-h-7 w-full items-center justify-center gap-1 rounded-md bg-[#0875e1] px-2 text-[9px] font-black text-white shadow-sm transition hover:bg-[#0759b8] active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">Mua ngay</button><button type="button" aria-label={isFavorite ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm để mua sau"} onClick={event => { event.stopPropagation(); if (!isAuthenticated) { toast.info("Đăng nhập để lưu sản phẩm mua sau"); startLogin(); return; } toggleFavoriteMutation.mutate({ productId: product.id }); }} className={`mt-1 inline-flex items-center gap-1 text-[9px] font-black ${isFavorite ? "text-rose-700" : "text-slate-500 hover:text-rose-700"}`}><Heart className={`h-3 w-3 ${isFavorite ? "fill-current" : ""}`} />{isFavorite ? "Đã lưu" : "Lưu mua sau"}</button></span>
          </div>;
        })}
      </div></div>
    </aside>
  ) : null;

  return (
    <StoreLayout>
      <div className={`mx-auto max-w-[1600px] py-10 sm:px-6 lg:px-8 2xl:px-10 ${product.type === 'physical' ? 'bg-[#f5f5f5] px-0 pb-36 sm:px-6 sm:pb-10' : 'px-4'}`}>
        <Link href={product.type === 'physical' ? '/products?type=physical' : '/products'} className="mx-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-600 transition-colors mb-6 sm:mx-0">
          <ArrowLeft className="w-4 h-4" /> {lang === 'vi' ? 'Quay lại kho tài nguyên' : 'Back to library'}
        </Link>

        <div className={`grid grid-cols-1 items-start gap-4 md:gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-12 ${product.type === 'physical' ? 'rounded-none border-0 p-0 shadow-none sm:rounded-2xl sm:border sm:p-10 sm:shadow-sm lg:rounded-md lg:border lg:p-6 lg:shadow-sm' : ''}`}>
          <div className="contents lg:col-span-7 lg:block lg:self-start">
            <div className={`order-1 grid gap-3 lg:order-none lg:gap-4 ${isHdFootballProduct ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
              <div
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner md:cursor-crosshair"
                title={primaryImageUrl && !primaryImageFailed ? 'Rê chuột để xem vùng phóng to' : undefined}
                onMouseMove={(event) => {
                  if (!primaryImageUrl || primaryImageFailed) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  setZoomPoint({
                    x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
                    y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
                  });
                }}
                onMouseLeave={() => setZoomPoint(null)}
                onClick={() => { if (primaryImageUrl && !primaryImageFailed) setMobileZoomOpen(true); }}
              >
                {primaryImageUrl && !primaryImageFailed ? <img data-product-primary-image src={primaryImageUrl} alt={selectedVariant ? `${productName} · ${formatVariantOptions(selectedVariant)}` : productName} onError={() => { setPrimaryImageFailed(true); setZoomPoint(null); }} className="h-full w-full object-contain" /> : <AssetVisual categoryId={product.categoryId} title={productName} fileSize={product.fileSize} />}
                {zoomPoint && <span className="pointer-events-none absolute hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/10 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] md:block" style={{ left: `${zoomPoint.x}%`, top: `${zoomPoint.y}%` }} />}
                <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-black text-white shadow-lg md:opacity-0 md:transition-opacity md:group-hover:opacity-100"><ZoomIn className="h-3 w-3" />{zoomPoint ? 'Đang phóng to' : 'Chạm để phóng to'}</span>
              </div>
              {product.type === "digital" ? <div className="hidden min-h-0 grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner lg:grid" aria-label="4 ảnh xem nhanh">{galleryImages.slice(0, 4).map((image, index) => <button key={`digital-preview-${image}-${index}`} type="button" onClick={() => { setGalleryIndex(index); setPrimaryImageFailed(false); }} className={`group/preview relative min-h-0 overflow-hidden rounded-xl border-2 bg-white transition ${galleryIndex === index ? "border-[#0875e1] ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-300"}`}><img src={image} alt={`Preview ${index + 1} của ${productName}`} className="h-full w-full object-contain p-1" /><span className="absolute bottom-1.5 right-1.5 rounded-full bg-slate-950/75 px-2 py-0.5 text-[9px] font-black text-white">{index + 1}/4</span></button>)}</div> : <div className={`${isHdFootballProduct ? "hidden" : "hidden min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner lg:block"}`}>
                {zoomPoint && primaryImageUrl && !primaryImageFailed ? <div className="h-full min-h-[22rem] w-full bg-no-repeat" role="img" aria-label={`Vùng phóng to của ${productName}`} style={{ backgroundImage: `url(${primaryImageUrl})`, backgroundPosition: `${zoomPoint.x}% ${zoomPoint.y}%`, backgroundSize: '220%' }} /> : <div className="grid min-h-[22rem] place-items-center p-6 text-center text-xs font-bold text-slate-400"><ZoomIn className="mb-2 h-5 w-5" />Rê chuột lên ảnh để xem chi tiết</div>}
              </div>}
            </div>
            {galleryImages.length > 1 && <div className="order-1 mt-2 lg:order-none lg:mt-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-600">{lang === "vi" ? "Toàn bộ ảnh preview" : "All preview images"}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{galleryImages.length} ảnh</span></div><div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible" aria-label="Thư viện ảnh sản phẩm">{galleryImages.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => { setGalleryIndex(index); setPrimaryImageFailed(false); }} aria-label={`Xem ảnh ${index + 1}`} className={`h-20 w-[22vw] max-w-24 min-w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition sm:h-auto sm:w-auto sm:min-w-0 sm:flex-1 ${galleryIndex === index ? "border-[#0875e1] ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-300"}`}><img src={image} alt={`Ảnh sản phẩm ${index + 1}`} loading="lazy" className="h-full w-full object-contain p-0.5" /></button>)}</div></div>}
            <Dialog open={mobileZoomOpen} onOpenChange={setMobileZoomOpen}><DialogContent className="max-w-[calc(100vw-2rem)] border-slate-200 bg-white p-3 sm:max-w-3xl"><DialogHeader><DialogTitle>{productName}</DialogTitle><DialogDescription>Ảnh phóng to của sản phẩm</DialogDescription></DialogHeader>{primaryImageUrl && !primaryImageFailed ? <img src={primaryImageUrl} alt={productName} className="max-h-[75vh] w-full object-contain" /> : <AssetVisual categoryId={product.categoryId} title={productName} fileSize={product.fileSize} />}</DialogContent></Dialog>
          </div>

          <div className="order-2 space-y-5 lg:order-none lg:col-span-5">
            <div className="order-2 -mx-4 bg-white px-4 py-4 lg:order-none lg:mx-0 lg:bg-transparent lg:p-0">
              <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{product.type === "physical" ? (isPreorder ? (lang === 'vi' ? 'Order trước · dự kiến 7–10 ngày' : 'Pre-order · estimated 7–10 days') : (lang === 'vi' ? `${availableStock > 0 ? `Còn ${availableStock}` : "Đã hết"} trong kho` : `${availableStock > 0 ? availableStock : "Out of"} stock`)) : (lang === 'vi' ? 'Bản quyền thương mại trọn đời' : 'Lifetime Commercial License')}</span>
              </div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{lang === "vi" ? "Thông tin sản phẩm" : "Product information"}</span><div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-[10px] font-black shadow-sm" aria-label={lang === "vi" ? "Ngôn ngữ sản phẩm" : "Product language"}><button type="button" onClick={() => { setSelectedLanguage("vi"); setLang("vi"); }} className={`rounded-full px-2.5 py-1 transition ${lang === "vi" ? "bg-[#0875e1] text-white" : "text-slate-500 hover:bg-slate-100"}`}>VI</button><button type="button" onClick={() => { setSelectedLanguage("en"); setLang("en"); }} className={`rounded-full px-2.5 py-1 transition ${lang === "en" ? "bg-[#0875e1] text-white" : "text-slate-500 hover:bg-slate-100"}`}>EN</button></div></div><h1 className="text-[1.8rem] leading-[1.12] sm:text-3xl font-black text-slate-900">{productName}</h1>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1"><p className={`text-[2rem] leading-none font-black ${product.type === 'physical' ? 'text-[#0875e1]' : 'text-sky-600'}`}>{hasSellablePrice ? (isHdFootballProduct ? <>{formatCurrency(hdPriceMin * (isPreorder ? 0.9 : 1))}{hdPriceMax > hdPriceMin && <> – {formatCurrency(hdPriceMax * (isPreorder ? 0.9 : 1))}</>}</> : formatCurrency(unitPrice * (isPreorder ? 0.9 : 1), product.type === "digital" ? product.priceUsd : undefined)) : (lang === 'vi' ? 'Đang cập nhật giá' : 'Price being updated')}</p>{applicableWholesaleTier && <Badge className="bg-emerald-100 text-emerald-800">Giá sỉ từ {applicableWholesaleTier.minQuantity} cái</Badge>}{isPreorder && <><p className="text-sm font-bold text-slate-400 line-through">{formatCurrency(unitPrice)}</p><Badge className="bg-rose-100 text-rose-700">Giảm 10% Order</Badge></>}</div>
              {!isHdFootballProduct && <div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" className={isFavorite ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"} disabled={toggleFavoriteMutation.isPending} onClick={() => { if (!isAuthenticated) { toast.info("Đăng nhập để lưu sản phẩm yêu thích"); startLogin(); return; } toggleFavoriteMutation.mutate({ productId: product.id }); }}><Heart className={`mr-1.5 h-3.5 w-3.5 ${isFavorite ? "fill-current" : ""}`} />{isFavorite ? "Đã yêu thích" : "Yêu thích"}</Button><Button type="button" size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => { const result = toggleComparedProduct(product.id); if (result.limitReached) { toast.error("Bạn chỉ có thể so sánh tối đa 4 sản phẩm."); return; } setCompareIds(getComparedProductIds()); toast.success(result.added ? "Đã thêm vào danh sách so sánh" : "Đã bỏ khỏi danh sách so sánh"); }}><Scale className="mr-1.5 h-3.5 w-3.5" />{compareIds.includes(product.id) ? "Đã chọn so sánh" : "So sánh"}</Button>{compareIds.length > 0 && <Link href="/compare" className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50">So sánh ({compareIds.length})</Link>}{canRequestRestock && <Button type="button" size="sm" variant="outline" disabled={requestRestockMutation.isPending || Boolean(restockSubscription?.status === "active")} className={restockSubscription?.status === "ready" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100"} onClick={() => { if (!isAuthenticated) { toast.info("Đăng nhập để đăng ký nhắc lại hàng"); startLogin(); return; } requestRestockMutation.mutate({ productId: product.id, variantId: restockVariantId }); }}><BellRing className="mr-1.5 h-3.5 w-3.5" />{restockSubscription?.status === "ready" ? "SKU đã về hàng" : restockSubscription?.status === "active" ? "Đã đăng ký nhắc hàng" : "Nhắc lại khi có hàng"}</Button>}</div>}
            </div>

	            {product.type === "physical" && !isHdFootballProduct && <section className="rounded-md border border-sky-200 bg-sky-50/70 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">DHL Stores · Shop thể thao</p><p className="mt-1 text-sm font-black text-slate-900">Hàng thể thao chọn SKU, giao SPX</p></div><span className="rounded bg-white px-2 py-1 text-[10px] font-black text-sky-700 shadow-sm">Hỗ trợ Zalo 0963.898.871</span></div><p className="mt-2 text-[11px] leading-relaxed text-slate-600">Kiểm tra màu, size, tồn kho và phí giao hàng trước khi đặt. Đơn vật lý thanh toán qua QR chuyển khoản.</p></section>}

            {product.type === "physical" && !isHdFootballProduct && wholesaleTiers.length > 0 && <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-900">Giá sỉ theo số lượng</p><p className="mt-1 text-[11px] leading-relaxed text-emerald-800">Mua càng nhiều, đơn giá mỗi sản phẩm càng tốt. Giá sẽ tự áp dụng khi đạt mốc.</p></div>{applicableWholesaleTier && <Badge className="bg-emerald-600 text-white">Đang áp dụng</Badge>}</div><div className="mt-3 grid grid-cols-3 gap-2">{wholesaleTiers.map(tier => <div key={tier.id} className={`rounded-lg border p-2 text-center ${applicableWholesaleTier?.id === tier.id ? "border-emerald-600 bg-white ring-2 ring-emerald-100" : "border-emerald-100 bg-white/70"}`}><p className="text-[10px] font-black text-emerald-800">Từ {tier.minQuantity} cái</p><p className="mt-1 text-xs font-black text-slate-900">{formatCurrency(Number(tier.unitPrice) + Number(selectedVariant?.priceAdjustment || 0))}</p></div>)}</div></section>}
            {product.type === "physical" && !isHdFootballProduct && sizeGuideRows.length > 0 && <section id="size-chart" className="rounded-xl border border-amber-200 bg-amber-50/70 p-4" aria-labelledby="size-chart-title"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-amber-900">{lang === "vi" ? "Bảng size áo" : "Jersey size chart"}</p><p id="size-chart-title" className="mt-1 text-[11px] leading-relaxed text-amber-800">{lang === "vi" ? "Đối chiếu chiều dài, chiều cao và cân nặng trước khi chọn SKU." : "Compare length, height and weight before choosing a SKU."}</p></div><Ruler className="h-5 w-5 shrink-0 text-amber-700" /></div><div className="mt-3 overflow-hidden rounded-lg border border-amber-200 bg-white"><table className="w-full text-left text-[11px]"><thead className="bg-amber-100/70 text-amber-900"><tr><th className="px-3 py-2 font-black">{lang === "vi" ? "Size" : "Size"}</th><th className="px-3 py-2 font-black">{lang === "vi" ? "Dài áo" : "Length"}</th><th className="px-3 py-2 font-black">{lang === "vi" ? "Chiều cao" : "Height"}</th><th className="px-3 py-2 font-black">{lang === "vi" ? "Cân nặng" : "Weight"}</th></tr></thead><tbody className="divide-y divide-amber-100">{sizeGuideRows.map(row => <tr key={row.size}><td className="px-3 py-2 font-black text-slate-900">{row.size}</td><td className="px-3 py-2 text-slate-700">{row.length}</td><td className="px-3 py-2 text-slate-700">{row.height}</td><td className="px-3 py-2 text-slate-700">{row.weight}</td></tr>)}</tbody></table></div><p className="mt-2 text-[10px] font-semibold text-amber-800">{lang === "vi" ? "Nếu ở giữa hai size hoặc thích mặc rộng, nên tăng một size." : "Size up when between sizes or when you prefer a looser fit."}</p></section>}
            {product.type === "physical" && !isHdFootballProduct && availableSizes.length > 0 && <section id="size-guide" className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-blue-900">Chọn Size nhanh</p><p className="mt-1 text-[11px] leading-relaxed text-blue-800">Các size dưới đây là lựa chọn thực tế do cửa hàng khai báo theo SKU. Hãy kiểm tra tồn và mô tả sản phẩm trước khi đặt; không áp dụng bảng số đo chung cho mọi mẫu.</p></div><Ruler className="h-5 w-5 shrink-0 text-blue-700" /></div><div className="mt-3 flex flex-wrap gap-2">{availableSizes.map(size => <button key={size} type="button" onClick={() => { const candidate = sortedVariants.find(variant => variant.size === size && (isPreorder || variant.stock > 0)); if (candidate) setSelectedVariantId(candidate.id); document.getElementById("sku-inventory-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }} className={`rounded-lg border px-3 py-2 text-xs font-black transition ${selectedVariant?.size === size ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-white text-blue-800 hover:border-blue-500 hover:bg-blue-100"}`}>Size {size}</button>)}</div><p className="mt-3 text-[10px] font-semibold text-blue-800">Mẹo: nếu chưa chắc Size, xem thông số do cửa hàng ghi ở mô tả hoặc nhắn cửa hàng trước khi thanh toán.</p></section>}

            {product.type === "physical" && variants.length > 0 && (
              <section className="space-y-4 rounded-md border border-sky-200 bg-sky-50/60 p-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-emerald-800">{isHdFootballProduct ? (lang === "vi" ? "Chọn Kiểu và Kích cỡ" : "Choose style and size") : "Chọn phiên bản & xem tồn kho"}</label>
                  <p className="mt-1 text-xs text-emerald-700">{isHdFootballProduct ? (lang === "vi" ? "Chọn Không in hoặc Có in (nhãn shop), sau đó chọn size S–XXL. Giá sẽ đổi theo Kiểu." : "Choose No print or With print, then select size S–XXL. Price changes with style.") : "Thứ tự SKU được cửa hàng sắp xếp sẵn. Chọn theo thuộc tính hoặc chọn trực tiếp một dòng SKU có ảnh và số lượng còn lại."}</p>
                </div>
                {variants.length > 1 && !isHdFootballProduct ? <><div className="relative z-10 mt-3 grid min-h-[8.25rem] gap-2 rounded-2xl border border-sky-200 bg-white p-3 shadow-lg sm:min-h-0 sm:grid-cols-2"><div className="col-span-full border-b border-sky-100 pb-2 text-xs"><div className="flex min-w-0 items-center justify-between gap-3"><span className="truncate font-bold text-slate-600">Đã chọn {selectedSkuTotal} sản phẩm · {selectedSkuItems.length} SKU</span><span className="shrink-0 font-black text-[#0875e1]">{formatCurrency(selectedSkuEstimatedTotal)}</span></div>{selectedSkuWholesaleSavings > 0 && <p className="mt-1 font-black text-emerald-700">Tiết kiệm giá sỉ: {formatCurrency(selectedSkuWholesaleSavings)}</p>}{selectedSkuTotal === 0 && <p className="mt-1 font-semibold text-slate-500">Hãy tăng số lượng ít nhất một SKU để tiếp tục.</p>}</div><Button type="button" onClick={handleAddToCart} disabled={adding || selectedSkuTotal < 1} variant="outline" className="h-12 border-[#0875e1] bg-white font-black text-[#0875e1] hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100"><ShoppingBag className="mr-2 h-4 w-4" />{adding ? "Đang thêm…" : `Thêm vào giỏ${selectedSkuTotal > 0 ? ` · ${selectedSkuTotal} sản phẩm` : ""}`}</Button><Button type="button" onClick={handleBuyNow} disabled={adding || !selectedVariantId || directPurchaseQuantity < 1} className="h-12 bg-gradient-to-r from-[#0875e1] via-[#0875e1] to-[#0759b8] font-black text-white shadow-[0_8px_18px_rgba(7,89,184,0.3)] ring-2 ring-sky-200 hover:from-[#0759b8] hover:to-[#06458f] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100"><Zap className="mr-2 h-4 w-4" />Mua ngay SKU đang chọn</Button></div></> : null}
                {singleVariantInlineSelector}
                {isHdFootballProduct && <div className="space-y-4">{optionGroups.map(group => <div key={group.name} className="space-y-2"><p className="text-xs font-black uppercase tracking-wide text-slate-700">{group.name}</p><div className="flex flex-wrap gap-2">{group.values.map(value => { const compatible = sortedVariants.some(variant => { const options = new Map(getVariantOptions(variant).map(option => [option.name, option.value])); return options.get(group.name) === value && Array.from(selectedOptionValues.entries()).every(([selectedName, selectedValue]) => selectedName === group.name || options.get(selectedName) === selectedValue); }); const isSelected = selectedOptionValues.get(group.name) === value; return <button key={value} type="button" disabled={!compatible} onClick={() => { const candidate = sortedVariants.find(variant => { const options = new Map(getVariantOptions(variant).map(option => [option.name, option.value])); return options.get(group.name) === value && Array.from(selectedOptionValues.entries()).every(([selectedName, selectedValue]) => selectedName === group.name || options.get(selectedName) === selectedValue); }); setSelectedVariantId(candidate?.id ?? null); }} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-500"} disabled:cursor-not-allowed disabled:opacity-35`}>{value}</button>; })}</div></div>)}{isHdFootballProduct && hdStyleGroup && hdSizeGroup && <section id="hd-size-chart" className="overflow-hidden rounded-xl border border-emerald-200 bg-white" aria-labelledby="hd-size-chart-title"><div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2"><h3 id="hd-size-chart-title" className="text-xs font-black uppercase tracking-wide text-emerald-900">{lang === "vi" ? "Bảng size & giá theo kiểu" : "Size and price by style"}</h3><p className="mt-1 text-[10px] font-semibold text-emerald-800">{lang === "vi" ? "Chạm vào giá để chọn nhanh Kiểu và Kích cỡ. Hết kho vẫn có thể Order." : "Tap a price to select style and size. Out-of-stock sizes can still be ordered."}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-[11px]"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 font-black">{lang === "vi" ? "Kiểu" : "Style"}</th>{hdSizeGroup.values.map(size => <th key={size} className="px-3 py-2 text-center font-black">{size}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{hdStyleGroup.values.map(style => <tr key={style}><th className="whitespace-nowrap px-3 py-2 font-black text-slate-800">{style}</th>{hdSizeGroup.values.map(size => { const variant = getHdVariant(style, size); const selected = variant?.id === selectedVariantId; return <td key={`${style}-${size}`} className="px-2 py-2 text-center"><button type="button" disabled={!variant} onClick={() => variant && setSelectedVariantId(variant.id)} className={`w-full rounded-lg border px-2 py-2 font-black transition ${selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-sky-700 hover:border-sky-400 hover:bg-sky-50"} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300`}>{variant ? formatCurrency(Number(product.price) + Number(variant.priceAdjustment || 0)) : "—"}</button></td>; })}</tr>)}</tbody></table></div></section>}{isHdFootballProduct && <section id="hd-measurement-chart" className="overflow-hidden rounded-xl border border-sky-200 bg-white" aria-labelledby="hd-measurement-chart-title"><div className="border-b border-sky-100 bg-sky-50 px-3 py-2"><h3 id="hd-measurement-chart-title" className="text-xs font-black uppercase tracking-wide text-sky-900">{lang === "vi" ? "Bảng số đo tham khảo" : "Reference size guide"}</h3><p className="mt-1 text-[10px] font-semibold text-sky-800">{lang === "vi" ? "Chọn theo chiều cao và cân nặng; bảng chỉ mang tính tham khảo." : "Choose by height and weight; this guide is for reference only."}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-left text-[11px]"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 font-black">{lang === "vi" ? "Size" : "Size"}</th><th className="px-3 py-2 font-black">{lang === "vi" ? "Chiều cao (cm)" : "Height (cm)"}</th><th className="px-3 py-2 font-black">{lang === "vi" ? "Cân nặng (kg)" : "Weight (kg)"}</th></tr></thead><tbody className="divide-y divide-slate-100">{[{size:"S",height:"145–155",weight:"40–50"},{size:"M",height:"157–165",weight:"50–60"},{size:"L",height:"165–173",weight:"60–65"},{size:"XL",height:"170–175",weight:"65–70"},{size:"XXL",height:"175–185",weight:"70–80"}].map(row => <tr key={row.size}><th className="px-3 py-2 font-black text-slate-800">{row.size}</th><td className="px-3 py-2 text-slate-700">{row.height}</td><td className="px-3 py-2 text-slate-700">{row.weight}</td></tr>)}</tbody></table></div></section>}{classicQuantitySelector}{!isHdFootballProduct && skuInventoryPanel}{isHdFootballProduct && <div className="grid gap-2 sm:grid-cols-2"><Button type="button" onClick={handleAddToCart} disabled={adding || !selectedVariantId || directPurchaseQuantity < 1} variant="outline" className="h-12 border-[#0875e1] bg-white font-black text-[#0875e1] hover:bg-sky-50"><ShoppingBag className="mr-2 h-4 w-4" />{adding ? "Đang thêm…" : (lang === "vi" ? "Thêm vào giỏ hàng" : "Add to cart")}</Button><Button type="button" onClick={handleBuyNow} disabled={adding || buyNowLoading || !selectedVariantId || directPurchaseQuantity < 1} className="h-12 bg-gradient-to-r from-[#0875e1] to-[#0759b8] font-black text-white shadow-[0_8px_18px_rgba(7,89,184,0.3)] hover:from-[#0759b8] hover:to-[#06458f]"><Zap className="mr-2 h-4 w-4" />{buyNowLoading ? "Đang mở thanh toán…" : (lang === "vi" ? "Mua ngay" : "Buy now")}</Button></div>}<a href="https://zalo.me/0963898871" target="_blank" rel="noreferrer" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0068ff] px-4 py-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(0,104,255,0.25)] transition hover:bg-[#0057d9] active:scale-[0.99]"><MessageCircle className="h-5 w-5" />{lang === "vi" ? "Nhắn Zalo tư vấn chọn size" : "Chat on Zalo for size advice"}</a></div>}
              </section>
            )}



            {productSpecs && !isHdFootballProduct && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{lang === 'vi' ? 'Thông số kỹ thuật / Định dạng:' : 'Specifications / Format:'}</h4>
                <p className="whitespace-pre-line text-xs text-slate-600 leading-relaxed">{productSpecs}</p>
                {product.fileSize && (
                  <p className="text-xs text-blue-600 font-bold pt-1">File Size: {product.fileSize}</p>
                )}
              </div>
            )}

            <div id="product-purchase-actions" className={`sticky bottom-0 z-20 rounded-xl bg-emerald-50/95 p-2 pt-3 shadow-[0_-8px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:flex sm:flex-row sm:gap-4 ${product.type === 'physical' ? 'fixed inset-x-0 bottom-16 rounded-none border-t border-slate-200 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:static sm:bottom-auto sm:rounded-xl sm:border-0 sm:p-2' : ''} ${isMarketplaceLayout || isHdFootballProduct ? 'hidden sm:hidden' : ''}`}>
              <Button
                onClick={handleAddToCart}
                disabled={adding || !hasSellablePrice || (product.type === "physical" && ((variants.length > 0 && selectedSkuTotal < 1) || (variants.length === 0 && fulfillmentMode === 'in_stock' && availableStock <= 0)))}
                variant="outline"
                className={`flex-1 bg-white font-bold py-3.5 rounded-xl shadow-xs text-sm ${product.type === 'physical' ? 'border-[#0875e1] text-[#0875e1] hover:bg-sky-50' : 'border-sky-500 text-sky-700 hover:bg-sky-50'}`}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {adding ? "Adding..." : (isPreorder ? "Thêm Order vào giỏ" : t.addToCart)}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={adding || buyNowLoading || !hasSellablePrice || (product.type === "physical" && ((fulfillmentMode === 'in_stock' && availableStock <= 0) || (requiresVariant && (!selectedVariantId || directPurchaseQuantity < 1))))}
                className={`flex-1 font-bold py-3.5 rounded-xl shadow-md text-sm ${isPreorder ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-gradient-to-r from-[#0875e1] via-[#0875e1] to-[#0759b8] text-white shadow-[0_8px_20px_rgba(7,89,184,0.35)] ring-2 ring-sky-200 hover:from-[#0759b8] hover:to-[#06458f]"}`}
              >
                {buyNowLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (isPreorder ? <Clock3 className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />)}
                {buyNowLoading ? (lang === "vi" ? "Đang mở thanh toán…" : "Opening checkout…") : product.type === "physical" ? (isPreorder ? 'Order ngay · giảm 10%' : (lang === 'vi' ? 'Mua ngay & chọn giao hàng' : 'Buy now & choose delivery')) : (lang === 'vi' ? 'Tải ngay 1-Click (Mua ngay)' : 'Instant 1-Click Buy')}
              </Button>
            </div>
            {product.type === "physical" && !isHdFootballProduct && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-900"><div className="flex items-center gap-2 font-black"><Tag className="h-4 w-4" />Order trước 7–10 ngày giảm 10%</div><p className="mt-1">Tất cả SKU đều có thể Order trước với mức giá giảm 10%. Đơn được ghi rõ hình thức Order để cửa hàng xử lý riêng; không dùng tồn kho sẵn có.</p></div>}

            {!isHdFootballProduct && <CustomerHelpCard context="product" />}

            {recommendedProducts.length > 0 && !isHdFootballProduct && <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm" aria-label="Sản phẩm thường được mua kèm"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Gợi ý cho đơn hàng</p><h2 className="mt-1 text-sm font-black text-slate-900">Sản phẩm thường được mua kèm</h2></div><Sparkles className="h-5 w-5 text-blue-600" /></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{recommendedProducts.map(recommended => <article key={recommended.id} className="group min-w-0 overflow-hidden rounded-xl border border-blue-100 bg-white transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"><button type="button" onClick={() => setQuickViewProduct(recommended)} className="block w-full text-left"><div className="aspect-square overflow-hidden bg-slate-100">{recommended.image ? <img src={recommended.image} alt={catalogName(recommended, lang)} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-200 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[10px] font-black text-blue-500">DHL</div>}</div><div className="p-2"><p className="line-clamp-2 text-[11px] font-black leading-snug text-slate-900 group-hover:text-blue-700">{catalogName(recommended, lang)}</p><p className="mt-1 text-[10px] font-black text-[#0875e1]">{formatCurrency(recommended.price, recommended.priceUsd)}</p></div></button><div className="px-2 pb-2"><button type="button" disabled={addToCartMutation.isPending || addingRecommended === recommended.id} onClick={event => { event.preventDefault(); if (!isAuthenticated) { toast.info("Đăng nhập để thêm sản phẩm vào giỏ"); startLogin(); return; } setAddingRecommended(recommended.id); addToCartMutation.mutate({ productId: recommended.id, quantity: 1 }); }} className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#0875e1] px-2 py-1.5 text-[10px] font-black text-white transition hover:bg-[#0759b8] disabled:cursor-wait disabled:opacity-60"><ShoppingBag className="h-3 w-3" />{addingRecommended === recommended.id ? "Đã thêm…" : "Thêm vào giỏ"}</button></div></article>)}</div></section>}

            <Dialog open={Boolean(quickViewProduct)} onOpenChange={open => { if (!open) setQuickViewProduct(null); }}><DialogContent className="max-w-md overflow-hidden rounded-2xl p-0"><DialogHeader className="sr-only"><DialogTitle>Xem nhanh sản phẩm</DialogTitle><DialogDescription>Thông tin nhanh của sản phẩm mua kèm</DialogDescription></DialogHeader>{quickViewProduct && <div><div className="aspect-video bg-slate-100">{quickViewProduct.image ? <img src={quickViewProduct.image} alt={catalogName(quickViewProduct, lang)} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center font-black text-blue-500">DHL</div>}</div><div className="space-y-3 p-5"><p className="text-xs font-black uppercase tracking-wide text-blue-700">Xem nhanh</p><h3 className="text-lg font-black text-slate-900">{catalogName(quickViewProduct, lang)}</h3><p className="text-xl font-black text-[#0875e1]">{formatCurrency(quickViewProduct.price, quickViewProduct.priceUsd)}</p><div className="grid grid-cols-2 gap-2"><Link href={`/product/${quickViewProduct.slug}`} onClick={() => setQuickViewProduct(null)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Xem chi tiết</Link><button type="button" onClick={() => { if (!isAuthenticated) { toast.info("Đăng nhập để thêm sản phẩm vào giỏ"); startLogin(); return; } setAddingRecommended(quickViewProduct.id); addToCartMutation.mutate({ productId: quickViewProduct.id, quantity: 1 }); setQuickViewProduct(null); }} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0875e1] px-3 py-2 text-xs font-black text-white hover:bg-[#0759b8]"><ShoppingBag className="h-3.5 w-3.5" />Thêm vào giỏ</button></div></div></div>}</DialogContent></Dialog>

            <div className={`${isHdFootballProduct ? "hidden" : "grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500"}`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>{lang === 'vi' ? 'Bản quyền thương mại trọn đời' : 'Lifetime commercial license'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{lang === 'vi' ? 'Tải xuống tự động 24/7' : 'Instant 24/7 downloads'}</span>
              </div>
            </div>
          </div>
        </div>
        {skuBatchSelector && <div className="mt-6">{skuBatchSelector}</div>}
        <section className="mt-6 grid gap-4">
{productDescription && <div className="order-3 lg:order-none">
              {product.type === 'physical' && <details className="mt-3 border-y border-slate-200 bg-white px-4 py-3 sm:hidden"><summary className="cursor-pointer list-none text-base font-bold text-slate-800">{lang === 'vi' ? 'Thông số & Mô tả' : 'Details & description'} <span className="float-right text-slate-400">⌄</span></summary><p className="mt-3 text-sm leading-relaxed text-slate-600">{productDescription}</p></details>}
              <section className={`${product.type === 'physical' ? 'hidden sm:block' : ''} mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4`}><div className="flex items-center justify-between gap-3"><h2 className="text-xs font-black uppercase tracking-wide text-slate-800">{lang === 'vi' ? 'Mô tả sản phẩm' : 'Product description'}</h2>{productDescription.length > 260 && <button type="button" onClick={() => setDescriptionExpanded(current => !current)} className="shrink-0 text-xs font-black text-sky-700 hover:text-sky-900">{descriptionExpanded ? (lang === 'vi' ? 'Thu gọn' : 'Show less') : (lang === 'vi' ? 'Xem thêm' : 'Read more')}</button>}</div><p className={`mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm ${descriptionExpanded ? '' : 'line-clamp-5'}`}>{productDescription}</p></section>
            </div>}
            {productSpecs && <section id="product-specs" className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="product-specs-title"><div className="flex items-center justify-between gap-3"><h2 id="product-specs-title" className="text-xs font-black uppercase tracking-wide text-slate-800">{lang === "vi" ? "Thông số sản phẩm" : "Product specifications"}</h2><span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">{lang === "vi" ? "VI" : "EN"}</span></div><p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600 sm:text-sm">{productSpecs}</p></section>}
        </section>
        {youtubeVideo && !isHdFootballProduct && <section className="mt-6 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="product-video-heading">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">{lang === "vi" ? "Video sản phẩm" : "Product video"}</p><h2 id="product-video-heading" className="mt-1 text-xl font-black text-slate-900">{lang === "vi" ? "Xem trực tiếp trên DHL Stores" : "Watch on DHL Stores"}</h2></div><a href={youtubeVideo.watchUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-50">{lang === "vi" ? "Mở YouTube" : "Open YouTube"}</a></div>
          <div className={`mt-4 overflow-hidden rounded-xl bg-slate-950 shadow-inner ${youtubeVideo.isShorts ? "mx-auto aspect-[9/14] w-full max-w-[320px] sm:max-h-[480px]" : "aspect-video w-full"}`}><iframe src={youtubeVideo.embedUrl} title={`${productName} — ${lang === "vi" ? "video giới thiệu" : "product video"}`} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
        </section>}
        {<section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Đánh giá sản phẩm</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Trải nghiệm thật từ khách hàng</h2>
            </div>
            <div className="rounded-xl bg-sky-50 px-3 py-2 text-right">
              <p className="text-lg font-black text-[#0875e1]">{reviewItems.length ? reviewAverage.toFixed(1) : '—'} <span className="text-sky-500">★</span></p>
              <p className="text-[10px] font-bold text-slate-500">{reviewItems.length} đánh giá</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Lọc đánh giá theo số sao">
            <span className="text-xs font-black text-slate-700">Lọc đánh giá:</span>
            {[0, 5, 4, 3, 2, 1].map(star => <button key={star} type="button" onClick={() => setReviewFilter(star as 0 | 1 | 2 | 3 | 4 | 5)} className={`rounded-full border px-2.5 py-1 text-[10px] font-black transition ${reviewFilter === star ? "border-sky-400 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600 hover:border-sky-200"}`}>{star === 0 ? "Tất cả" : `${star} ★`}</button>)}
            <span className="text-[10px] font-bold text-slate-500">{filteredReviewItems.length}/{reviewItems.length}</span>
          </div>
          {reviewItems.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ trải nghiệm sau khi mua hàng.</div> : filteredReviewItems.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Chưa có đánh giá phù hợp với bộ lọc hiện tại.</div> : <div className="mt-4 space-y-3">
            {filteredReviewItems.map(review => <article key={review.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-800">{review.displayName}</p><div className="flex items-center gap-0.5 text-sky-500">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-current' : ''}`} />)}</div></div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.body}</p>
              {review.imageUrl && <a href={review.imageUrl} target="_blank" rel="noreferrer" className="mt-3 block w-fit"><img src={review.imageUrl} alt="Ảnh đính kèm trong đánh giá" loading="lazy" className="h-24 w-24 rounded-lg border border-slate-200 object-cover transition hover:opacity-90" /></a>}
            </article>)}
          </div>}
          <form className="mt-5 border-t border-slate-100 pt-5" onSubmit={event => { event.preventDefault(); if (!isAuthenticated) { startLogin(); return; } submitReviewMutation.mutate({ productId: product.id, rating: reviewRating, body: reviewBody, image: reviewImage || undefined }); }}>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-slate-700">Chấm điểm:</span>{Array.from({ length: 5 }).map((_, index) => <button key={index} type="button" aria-label={`Chấm ${index + 1} sao`} onClick={() => setReviewRating(index + 1)} className="text-sky-500 transition-transform hover:scale-110"><Star className={`h-5 w-5 ${index < reviewRating ? 'fill-current' : ''}`} /></button>)}</div>
            <textarea value={reviewBody} onChange={event => setReviewBody(event.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder={isAuthenticated ? 'Chia sẻ trải nghiệm thật của bạn (tối thiểu 10 ký tự)…' : 'Đăng nhập để gửi đánh giá sau khi mua hàng…'} disabled={!isAuthenticated} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-sky-300"><span>Đính kèm ảnh</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={!isAuthenticated || submitReviewMutation.isPending} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast.error("Ảnh đánh giá tối đa 5 MB"); return; } if (!(file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif")) { toast.error("Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF"); return; } void compressReviewImage(file).then(compressed => { setReviewImage(compressed); toast.success("Ảnh đã được nén để tải nhanh hơn."); }).catch(error => toast.error(error instanceof Error ? error.message : "Không thể nén ảnh")); }} /></label>
              {reviewImage && <div className="flex items-center gap-2"><img src={`data:${reviewImage.mimeType};base64,${reviewImage.base64}`} alt="Ảnh sẽ đính kèm" className="h-12 w-12 rounded-md border border-sky-200 object-cover" /><button type="button" onClick={() => setReviewImage(null)} className="text-[10px] font-black text-rose-700 hover:underline">Bỏ ảnh</button></div>}
            </div>
            <Button type="submit" disabled={submitReviewMutation.isPending || !reviewBody.trim()} className="mt-3 bg-[#0875e1] font-black text-white hover:bg-[#0759b8]">{isAuthenticated ? (submitReviewMutation.isPending ? 'ĐANG GỬI…' : 'GỬI ĐÁNH GIÁ') : 'ĐĂNG NHẬP ĐỂ ĐÁNH GIÁ'}</Button>
          </form>
        </section>}
        {recommendedProducts.length > 0 && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Sản phẩm liên quan"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Có thể bạn cũng thích</p><h2 className="mt-1 text-xl font-black text-slate-900">Sản phẩm liên quan</h2><p className="mt-1 text-xs text-slate-500">Các sản phẩm cùng loại hoặc phù hợp với lựa chọn hiện tại.</p></div><Sparkles className="h-5 w-5 text-blue-600" /></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{recommendedProducts.map(related => <article key={`related-${related.id}`} className="group overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><Link href={`/product/${related.slug}`} className="block"><div className="aspect-square overflow-hidden bg-white">{related.image ? <img src={related.image} alt={catalogName(related, lang)} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-200 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-xs font-black text-blue-500">DHL</div>}</div><div className="p-3"><p className="line-clamp-2 text-xs font-black leading-snug text-slate-900 group-hover:text-blue-700">{catalogName(related, lang)}</p><p className="mt-1 text-xs font-black text-[#0875e1]">{formatCurrency(related.price, related.priceUsd)}</p></div></Link></article>)}</div></section>}
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
	            <DialogDescription className="text-left text-xs text-slate-500">Chọn số dư ví hoặc QR chuyển khoản để hoàn tất đơn. Bạn có thể nhập số lượng trực tiếp ở bước mua hàng.</DialogDescription>
          </DialogHeader>
          {!inlinePayment ? <div className="space-y-4">
            {product.type === "physical" && <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4" aria-labelledby="checkout-fulfillment-title">
              <div><p id="checkout-fulfillment-title" className="text-xs font-black uppercase tracking-wide text-sky-900">Chọn hình thức mua</p><p className="mt-1 text-[11px] text-sky-700">Chọn cách xử lý đơn trước khi nhập địa chỉ và thanh toán.</p></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setFulfillmentMode('in_stock')} className={`rounded-xl border p-3 text-left transition ${!isPreorder ? "border-sky-500 bg-white ring-2 ring-sky-100" : "border-slate-200 bg-white hover:border-sky-300"}`}><span className="flex items-center gap-1.5 text-xs font-black text-slate-900"><Zap className="h-3.5 w-3.5 text-sky-600" />Mua ngay</span><span className="mt-1 block text-[11px] text-slate-600">Giao từ hàng sẵn có; áp dụng tồn kho thực tế.</span></button><button type="button" onClick={() => setFulfillmentMode('preorder')} className={`rounded-xl border p-3 text-left transition ${isPreorder ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100" : "border-slate-200 bg-white hover:border-rose-300"}`}><span className="flex items-center gap-1.5 text-xs font-black text-rose-700"><Clock3 className="h-3.5 w-3.5" />Order trước · giảm 10%</span><span className="mt-1 block text-[11px] text-slate-600">Dự kiến 7–10 ngày; dùng được với mọi SKU.</span></button></div>
            </section>}
            {product.type === "physical" && <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-emerald-700" /><div><p className="text-xs font-black uppercase tracking-wide text-emerald-800">Địa chỉ nhận hàng</p><p className="mt-1 text-[11px] text-emerald-700">Bạn vẫn ở nguyên trang sản phẩm khi tạo QR.</p></div></div>
              {savedAddresses.length > 0 && <div className="flex flex-wrap gap-2">{savedAddresses.map(address => <button key={address.id} type="button" onClick={() => setInlineShipping(current => ({ ...current, name: address.recipientName, phone: address.phone, address: address.address }))} className={`rounded-lg border px-3 py-2 text-left text-[11px] font-bold ${inlineShipping.address === address.address ? "border-emerald-500 bg-white text-emerald-800" : "border-emerald-100 bg-white text-slate-600"}`}>{address.recipientName} · {address.phone}</button>)}</div>}
              <input value={inlineShipping.name} onChange={event => setInlineShipping(current => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm" placeholder="Họ tên người nhận" />
              <input value={inlineShipping.phone} onChange={event => setInlineShipping(current => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm" placeholder="Số điện thoại" inputMode="tel" />
              <div className="grid gap-2 sm:grid-cols-2"><select value={inlineProvince} onChange={event => { const value = event.target.value; setInlineProvince(value); setInlineWard(""); updateInlineAddress(value, "", inlineDetailAddress); }} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"><option value="">Chọn tỉnh/thành phố mới</option>{adminProvinces.map(item => <option key={item.tentinhmoi} value={item.tentinhmoi}>{item.tentinhmoi}</option>)}</select><select value={inlineWard} onChange={event => { const value = event.target.value; setInlineWard(value); updateInlineAddress(inlineProvince, value, inlineDetailAddress); }} disabled={!inlineProvince} className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"><option value="">Chọn xã/phường mới</option>{adminWards.map(item => <option key={item.maphuongxa} value={item.tenphuongxa}>{item.tenphuongxa}</option>)}</select></div>
              <textarea value={inlineDetailAddress} onChange={event => { const value = event.target.value; setInlineDetailAddress(value); updateInlineAddress(inlineProvince, inlineWard, value); }} className="min-h-20 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm" placeholder="Số nhà, tên đường, thôn/tổ…" />
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900"><p className="font-black">Giao hàng SPX tự tính</p><p className="mt-1">Tổng khối lượng {shippingWeightGrams.toLocaleString("vi-VN")} g · phí giao {formatCurrency(estimatedSpxFee)}. Phí chính thức được máy chủ tính lại khi tạo đơn.</p></div>
            </div>}
	            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-blue-800">Phương thức thanh toán</p><p className="mt-1 text-[11px] text-blue-700">Chọn một phương án trước khi tạo đơn.</p></div><WalletCards className="h-5 w-5 text-blue-600" /></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setPaymentMethod("wallet_balance")} className={`rounded-xl border p-3 text-left transition ${paymentMethod === "wallet_balance" ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}><span className="block text-xs font-black text-emerald-800">Thanh toán bằng số dư ví</span><span className="mt-1 block text-[11px] text-slate-600">Đang có: <strong>{formatCurrency(walletBalance)}</strong></span></button><button type="button" onClick={() => setPaymentMethod("qr")} className={`rounded-xl border p-3 text-left transition ${paymentMethod === "qr" ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100" : "border-slate-200 bg-white hover:border-sky-300"}`}><span className="block text-xs font-black text-sky-800">QR chuyển khoản</span><span className="mt-1 block text-[11px] text-slate-600">Giao dịch được hệ thống hoặc cửa hàng xác nhận theo loại đơn.</span></button></div></div><div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-sky-800">Đơn đang tạo</p><p className="mt-1 text-sm font-bold text-slate-900">{product.name}{selectedVariant ? ` · ${formatVariantOptions(selectedVariant)}` : ""}</p><p className="mt-1 text-xs text-slate-600">Số lượng: {directPurchaseQuantity}{isPreorder ? " · Order trước giảm 10%, dự kiến 7–10 ngày" : ""}</p></div>
	            <Button onClick={createInlinePayment} disabled={quickCheckoutMutation.isPending || directPurchaseQuantity < 1 || (paymentMethod === "wallet_balance" && walletBalance < (unitPrice * directPurchaseQuantity * (isPreorder ? 0.9 : 1)) + estimatedSpxFee)} className="w-full bg-sky-500 py-5 font-black text-slate-950 hover:bg-sky-600">{paymentMethod === "wallet_balance" ? <WalletCards className="mr-2 h-4 w-4" /> : <QrCode className="mr-2 h-4 w-4" />}{quickCheckoutMutation.isPending ? "ĐANG XỬ LÝ…" : paymentMethod === "wallet_balance" ? "THANH TOÁN BẰNG VÍ" : "HIỆN QR THANH TOÁN"}</Button>
	          </div> : (inlinePayment.paymentStatus === "paid" || inlinePaymentStatus.data?.paymentStatus === "paid") ? <div className="space-y-4 py-4 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><p className="font-black text-slate-900">{inlinePayment.hasPhysicalItems ? "Thanh toán đã được chủ cửa hàng xác nhận." : "Thanh toán đã được hệ thống xác nhận thành công."}</p>{inlinePayment.hasPhysicalItems ? <p className="text-sm text-slate-600">Đơn hàng đang được xử lý{inlinePayment.hasPreorderItems ? `, dự kiến ${inlinePayment.preorderEstimatedDays || "7–10 ngày"}` : ""}.</p> : inlineDownloads.data?.length ? <div className="space-y-2">{inlineDownloads.data.map(download => <a key={`${download.orderId}-${download.productId}`} href={download.driveUrl || "#"} target="_blank" rel="noreferrer" className="block rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">Tải ngay: {download.productName}</a>)}</div> : <p className="text-sm text-slate-600">Đang chuẩn bị liên kết tải tệp.</p>}</div> : inlinePaymentExpired ? <div className="space-y-3 py-4 text-center"><QrCode className="mx-auto h-12 w-12 text-rose-500" /><p className="font-black text-slate-900">Mã QR đã hết hạn sau 10 phút.</p><Button onClick={() => { setInlinePayment(null); setInlinePaymentExpired(false); }} className="bg-sky-500 font-black text-slate-950">Tạo QR mới</Button></div> : <div className="grid gap-5 sm:grid-cols-[1fr_190px] sm:items-center"><div className="space-y-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Số tiền cần chuyển</p><p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(inlinePayment.totalAmount, product.type === "digital" && product.priceUsd ? Number(product.priceUsd) * directPurchaseQuantity : undefined)}</p></div>{inlinePayment.hasPhysicalItems ? <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-900"><p className="font-black">Không cần nội dung chuyển khoản.</p><p className="mt-1">Sau khi bạn chuyển tiền, cửa hàng sẽ kiểm tra giao dịch và xác nhận đơn trực tiếp.</p></div> : <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900"><p className="font-black">Mã QR đã kèm nội dung đối soát.</p><p className="mt-1">Hãy chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản. Hệ thống sẽ tự xác nhận để mở nút tải ngay.</p></div>}<p className="text-[11px] text-slate-500">QR giữ chỗ trong 10 phút. Đơn: <span className="font-black text-slate-700">{inlinePayment.orderCode}</span></p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">{inlinePayment.qrUrl ? <img src={inlinePayment.qrUrl} alt="Mã QR thanh toán DHL Stores" className="w-full rounded-xl bg-white" /> : <QrCode className="mx-auto h-16 w-16 text-slate-400" />}<p className="mt-2 text-[10px] font-bold text-slate-500">Quét bằng ứng dụng ngân hàng</p></div></div>}
        </DialogContent>
      </Dialog>
      {cartFly && <img src={cartFly.image} alt="" aria-hidden="true" className="pointer-events-none fixed z-[100] h-16 w-16 rounded-xl border-2 border-sky-400 bg-white object-cover shadow-2xl transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ left: cartFly.startX - 32, top: cartFly.startY - 32, transform: cartFly.active ? `translate(${cartFly.endX - cartFly.startX}px, ${cartFly.endY - cartFly.startY}px) scale(0.22) rotate(12deg)` : "translate(0, 0) scale(1)", opacity: cartFly.active ? 0.25 : 1 }} />}
    </StoreLayout>
  );
}
