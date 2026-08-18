import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, ArrowDown, ArrowUp, Check, ChevronLeft, CircleOff, CloudUpload, DollarSign, FileArchive, FileSpreadsheet, Image, Link2, Package, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_ICON_OPTIONS, getCategoryIcon } from "@/lib/category-icons";

type CategoryDraft = { name: string; slug: string; description: string; iconKey: string; isActive: boolean };
type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  price: string;
  categoryId: number;
  image: string;
  fileUrl: string;
  fileSize: string;
  specs: string;
  stock: string;
  weightGrams: string;
  purchaseLayout: "classic" | "marketplace";
  featured: boolean;
  isActive: boolean;
};
type VariantDraft = { size: string; color: string; attributes: string; sku: string; image: string; priceAdjustment: string; costPrice: string; stock: string; weightGrams?: string; isActive: boolean };
type WholesaleTierDraft = { minQuantity: string; unitPrice: string };
type ExcelPreview = { sheetName: string; rowCount: number; productCount: number; variantCount: number; errors: Array<{ row: number; message: string }>; duplicates: string[]; products: Array<{ name: string; slug: string; price: number; image: string; tags: string; variants: number; options: Array<{ name: string; values: string[] }> }> };

const emptyCategory: CategoryDraft = { name: "", slug: "", description: "", iconKey: "Package", isActive: true };
const emptyProduct: ProductDraft = {
  name: "", slug: "", description: "", price: "", categoryId: 0, image: "generated:catalog-cover", fileUrl: "", fileSize: "", specs: "", stock: "0", weightGrams: "0", purchaseLayout: "classic", featured: false, isActive: true,
};
const emptyVariant: VariantDraft = { size: "", color: "", attributes: "", sku: "", image: "", priceAdjustment: "0", costPrice: "0", stock: "0", weightGrams: "", isActive: true };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminOrders() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const uploadRef = useRef<HTMLInputElement>(null);
  const withdrawalQrUploadRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategory);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [selectedVariantProductId, setSelectedVariantProductId] = useState<number | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(emptyVariant);
  const [draggedVariantId, setDraggedVariantId] = useState<number | null>(null);
  const [selectedSkuIds, setSelectedSkuIds] = useState<number[]>([]);
  const [skuDrafts, setSkuDrafts] = useState<Record<number, Pick<VariantDraft, "priceAdjustment" | "costPrice" | "stock" | "isActive">>>({});
  const [skuSortMode, setSkuSortMode] = useState<"manual" | "name" | "priceLow" | "priceHigh">("manual");
  const [variantOrderDraft, setVariantOrderDraft] = useState<number[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuFilter, setSkuFilter] = useState<"all" | "attention" | "low" | "out" | "hidden" | "noImage">("all");
  const [bulkSkuStock, setBulkSkuStock] = useState("");
  const [bulkSkuPrice, setBulkSkuPrice] = useState("");
  const [bulkSkuCost, setBulkSkuCost] = useState("");
  const [wholesaleTierDrafts, setWholesaleTierDrafts] = useState<WholesaleTierDraft[]>([{ minQuantity: "10", unitPrice: "" }, { minQuantity: "25", unitPrice: "" }, { minQuantity: "50", unitPrice: "" }]);
  const [orderTrackingDrafts, setOrderTrackingDrafts] = useState<Record<number, string>>({});
  const [orderTrackingStageDrafts, setOrderTrackingStageDrafts] = useState<Record<number, "ordered" | "central_warehouse" | "ready_hanoi" | "tracking">>({});
  const [uploadTarget, setUploadTarget] = useState<"image" | "file" | null>(null);
  const [activeTab, setActiveTab] = useState("products");
  const [inventorySearch, setInventorySearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [inventoryReason, setInventoryReason] = useState("Kiểm kê kho");
  const [inventoryDraftStocks, setInventoryDraftStocks] = useState<Record<string, string>>({});
  const [selectedInventoryRows, setSelectedInventoryRows] = useState<string[]>([]);
  const [optionGroupsDraft, setOptionGroupsDraft] = useState("");
  const [combinationDefaults, setCombinationDefaults] = useState({ skuPrefix: "SKU", stock: "0", priceAdjustment: "0" });
  const [excelImportFile, setExcelImportFile] = useState<{ fileName: string; base64: string } | null>(null);
  const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);
  const [excelCategoryId, setExcelCategoryId] = useState(0);
  const [revenueRange, setRevenueRange] = useState<"today" | "7d" | "30d" | "month" | "year">("month");

  const isAdmin = isAuthenticated && (user?.role === "admin" || user?.role === "owner");
  const categoriesQuery = trpc.catalogAdmin.categories.useQuery(undefined, { enabled: isAdmin });
  const productsQuery = trpc.catalogAdmin.products.useQuery(undefined, { enabled: isAdmin });
  const variantsQuery = trpc.catalogAdmin.productVariants.useQuery({ productId: selectedVariantProductId || undefined }, { enabled: isAdmin && Boolean(selectedVariantProductId) });
  const wholesaleTiersQuery = trpc.catalogAdmin.productWholesaleTiers.useQuery({ productId: selectedVariantProductId || 1 }, { enabled: isAdmin && Boolean(selectedVariantProductId) });
  const optionGroupsQuery = trpc.catalogAdmin.productOptionGroups.useQuery({ productId: selectedVariantProductId || 1 }, { enabled: isAdmin && Boolean(selectedVariantProductId) });
  const mediaQuery = trpc.catalogAdmin.media.useQuery(undefined, { enabled: isAdmin });
  const siteSettingsQuery = trpc.operations.siteSettings.useQuery(undefined, { enabled: isAdmin });
  const ordersQuery = trpc.store.orders.useQuery(undefined, { enabled: isAdmin });
  const usersQuery = trpc.store.usersList.useQuery(undefined, { enabled: isAdmin });
  const inventoryQuery = trpc.operations.inventory.useQuery(undefined, { enabled: isAdmin });
  const categories = categoriesQuery.data || [];
  const products = productsQuery.data || [];
  const variants = variantsQuery.data || [];
  const wholesaleTiers = wholesaleTiersQuery.data || [];
  const media = mediaQuery.data || [];
  const orders = ordersQuery.data || [];
  const users = usersQuery.data || [];
  const inventoryRows = (inventoryQuery.data || []).filter(row => `${row.productName} ${row.variantLabel} ${row.sku}`.toLowerCase().includes(inventorySearch.toLowerCase()));
  const selectedInventoryChanges = inventoryRows.filter(row => selectedInventoryRows.includes(`${row.target}:${row.id}`)).map(row => ({ target: row.target, id: row.id, stock: Number(inventoryDraftStocks[`${row.target}:${row.id}`] ?? row.stock) }));
  const catalogSearchTerm = catalogSearch.trim().toLocaleLowerCase("vi");
  const catalogSearchResults = !catalogSearchTerm ? [] : products.filter(product => {
    const productText = `${product.name} ${product.slug} ${selectedCategoryName(product.categoryId)}`.toLocaleLowerCase("vi");
    if (productText.includes(catalogSearchTerm)) return true;
    return (inventoryQuery.data || []).some(row => row.productName === product.name && `${row.variantLabel} ${row.sku}`.toLocaleLowerCase("vi").includes(catalogSearchTerm));
  });
  const savedVariantOrder = variants.map(variant => variant.id);
  const orderedVariants = variantOrderDraft.length === variants.length ? variantOrderDraft.map(id => variants.find(variant => variant.id === id)).filter((variant): variant is typeof variants[number] => Boolean(variant)) : [...variants];
  const hasPendingSkuOrder = variantOrderDraft.length === savedVariantOrder.length && variantOrderDraft.some((id, index) => id !== savedVariantOrder[index]);
  const skuSearchTerm = skuSearch.trim().toLocaleLowerCase("vi");
  const skuHealth = { low: variants.filter(variant => variant.stock > 0 && variant.stock <= 5).length, out: variants.filter(variant => variant.stock <= 0).length, hidden: variants.filter(variant => !variant.isActive).length, noImage: variants.filter(variant => !variant.image).length };
  const changedSkuCount = variants.filter(variant => {
    const draft = skuDrafts[variant.id];
    return Boolean(draft) && (String(draft.stock) !== String(variant.stock) || String(draft.costPrice) !== String(variant.costPrice) || String(draft.priceAdjustment) !== String(variant.priceAdjustment) || draft.isActive !== variant.isActive);
  }).length;
  const filteredSkuVariants = orderedVariants.filter(variant => {
    const matchesSearch = !skuSearchTerm || `${variant.sku || ""} ${variant.color || ""} ${variant.size || ""} ${variant.attributes || ""}`.toLocaleLowerCase("vi").includes(skuSearchTerm);
    if (!matchesSearch) return false;
    if (skuFilter === "low") return variant.stock > 0 && variant.stock <= 5;
    if (skuFilter === "out") return variant.stock <= 0;
    if (skuFilter === "hidden") return !variant.isActive;
    if (skuFilter === "noImage") return !variant.image;
    if (skuFilter === "attention") return variant.stock <= 5 || !variant.isActive || !variant.image;
    return true;
  });
  const visibleSkuVariants = [...filteredSkuVariants].sort((a, b) => {
    if (skuSortMode === "name") return `${a.color || ""} ${a.size || ""} ${a.sku || ""}`.localeCompare(`${b.color || ""} ${b.size || ""} ${b.sku || ""}`, "vi");
    if (skuSortMode === "priceLow") return Number(a.priceAdjustment) - Number(b.priceAdjustment) || a.sortOrder - b.sortOrder;
    if (skuSortMode === "priceHigh") return Number(b.priceAdjustment) - Number(a.priceAdjustment) || a.sortOrder - b.sortOrder;
    return a.sortOrder - b.sortOrder || a.id - b.id;
  });

  const selectProductForEdit = (product: typeof products[number]) => {
    setEditingProductId(product.id);
    setSelectedVariantProductId(product.type === "physical" ? product.id : null);
    setEditingVariantId(null);
    setVariantDraft(emptyVariant);
    setProductDraft({ name: product.name, slug: product.slug, description: product.description || "", price: product.price, categoryId: product.categoryId, image: product.image, fileUrl: product.fileUrl || "", fileSize: product.fileSize || "", specs: product.specs || "", stock: String(product.stock), weightGrams: String(product.weightGrams || 0), purchaseLayout: product.purchaseLayout || "classic", featured: product.featured, isActive: product.isActive !== false });
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const targetId = Number(query.get("editProduct"));
    const target = products.find(product => product.id === targetId);
    if (target) {
      selectProductForEdit(target);
      setActiveTab("products");
    }
    const variantProductId = Number(query.get("variantProduct"));
    if (variantProductId) {
      setSelectedVariantProductId(variantProductId);
      setActiveTab("variants");
    }
  }, [location, products]);

  useEffect(() => {
    const editVariantId = Number(new URLSearchParams(window.location.search).get("editVariant"));
    const variant = variants.find(item => item.id === editVariantId);
    if (variant) {
      setEditingVariantId(variant.id);
      setVariantDraft({ size: variant.size || "", color: variant.color || "", attributes: variant.attributes || "", sku: variant.sku || "", image: variant.image || "", priceAdjustment: variant.priceAdjustment, costPrice: variant.costPrice, stock: String(variant.stock), weightGrams: variant.weightGrams === undefined ? "" : String(variant.weightGrams), isActive: variant.isActive });
    }
  }, [location, variants]);

  useEffect(() => {
    if (inventoryQuery.data) setInventoryDraftStocks(Object.fromEntries(inventoryQuery.data.map(row => [`${row.target}:${row.id}`, String(row.stock)])));
  }, [inventoryQuery.data]);

  useEffect(() => {
    if (optionGroupsQuery.data) setOptionGroupsDraft(optionGroupsQuery.data.map(group => `${group.name}: ${group.values.join(", ")}`).join("\n"));
  }, [optionGroupsQuery.data]);

  useEffect(() => {
    setSelectedSkuIds([]);
    setSkuDrafts(Object.fromEntries(variants.map(variant => [variant.id, { priceAdjustment: variant.priceAdjustment, costPrice: variant.costPrice, stock: String(variant.stock), isActive: variant.isActive }])));
    setVariantOrderDraft(variants.map(variant => variant.id));
  }, [selectedVariantProductId, variantsQuery.data]);

  useEffect(() => {
    if (skuSortMode === "manual" || variants.length === 0) return;
    const ordered = [...variants].sort((a, b) => {
      if (skuSortMode === "name") return `${a.color || ""} ${a.size || ""} ${a.sku || ""}`.localeCompare(`${b.color || ""} ${b.size || ""} ${b.sku || ""}`, "vi") || a.sortOrder - b.sortOrder;
      if (skuSortMode === "priceLow") return Number(a.priceAdjustment) - Number(b.priceAdjustment) || a.sortOrder - b.sortOrder;
      return Number(b.priceAdjustment) - Number(a.priceAdjustment) || a.sortOrder - b.sortOrder;
    }).map(variant => variant.id);
    setVariantOrderDraft(ordered);
  }, [skuSortMode, variantsQuery.data]);

  useEffect(() => {
    setWholesaleTierDrafts(wholesaleTiers.length ? wholesaleTiers.map(tier => ({ minQuantity: String(tier.minQuantity), unitPrice: tier.unitPrice })) : [{ minQuantity: "10", unitPrice: "" }, { minQuantity: "25", unitPrice: "" }, { minQuantity: "50", unitPrice: "" }]);
  }, [selectedVariantProductId, wholesaleTiersQuery.data]);

  const refreshCatalog = () => {
    utils.catalogAdmin.categories.invalidate();
    utils.catalogAdmin.products.invalidate();
    utils.store.categories.invalidate();
    utils.store.products.invalidate();
  };

  const saveCategory = trpc.catalogAdmin.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo danh mục");
      setCategoryDraft(emptyCategory);
      setEditingCategoryId(null);
      refreshCatalog();
    },
    onError: error => toast.error(error.message),
  });
  const updateCategory = trpc.catalogAdmin.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật danh mục");
      setCategoryDraft(emptyCategory);
      setEditingCategoryId(null);
      refreshCatalog();
    },
    onError: error => toast.error(error.message),
  });
  const createProduct = trpc.catalogAdmin.createProduct.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo sản phẩm");
      setProductDraft({ ...emptyProduct, categoryId: categories[0]?.id || 0 });
      setEditingProductId(null);
      refreshCatalog();
    },
    onError: error => toast.error(error.message),
  });
  const updateProduct = trpc.catalogAdmin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật sản phẩm");
      setProductDraft({ ...emptyProduct, categoryId: categories[0]?.id || 0 });
      setEditingProductId(null);
      refreshCatalog();
    },
    onError: error => toast.error(error.message),
  });
  const createVariant = trpc.catalogAdmin.createProductVariant.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm biến thể");
      setVariantDraft(emptyVariant);
      setEditingVariantId(null);
      utils.catalogAdmin.productVariants.invalidate();
      utils.catalogAdmin.products.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateVariant = trpc.catalogAdmin.updateProductVariant.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật biến thể");
      setVariantDraft(emptyVariant);
      setEditingVariantId(null);
      utils.catalogAdmin.productVariants.invalidate();
      utils.catalogAdmin.products.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reorderProductVariants = trpc.catalogAdmin.reorderProductVariants.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu thứ tự hiển thị SKU");
      setSkuSortMode("manual");
      utils.catalogAdmin.productVariants.invalidate();
      utils.store.productVariants.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const bulkUpdateProductVariants = trpc.catalogAdmin.bulkUpdateProductVariants.useMutation({
    onSuccess: result => {
      toast.success(`Đã cập nhật ${result.updated} SKU`);
      utils.catalogAdmin.productVariants.invalidate();
      utils.operations.inventory.invalidate();
      utils.catalogAdmin.products.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const saveWholesaleTiers = trpc.catalogAdmin.replaceProductWholesaleTiers.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu bảng giá sỉ");
      utils.catalogAdmin.productWholesaleTiers.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const bulkSetInventory = trpc.operations.bulkSetInventory.useMutation({
    onSuccess: result => {
      toast.success(`Đã cập nhật tồn kho cho ${result.updated} dòng`);
      setSelectedInventoryRows([]);
      utils.operations.inventory.invalidate();
      utils.catalogAdmin.products.invalidate();
      utils.catalogAdmin.productVariants.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const saveProductOptionGroups = trpc.catalogAdmin.saveProductOptionGroups.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu nhóm lựa chọn");
      utils.catalogAdmin.productOptionGroups.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const generateProductVariantCombinations = trpc.catalogAdmin.generateProductVariantCombinations.useMutation({
    onSuccess: result => {
      toast.success(`Đã tạo ${result.created} biến thể${result.skipped ? `, bỏ qua ${result.skipped} tổ hợp trùng` : ""}`);
      utils.catalogAdmin.productVariants.invalidate();
      utils.catalogAdmin.products.invalidate();
      utils.operations.inventory.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const previewExcelImport = trpc.catalogAdmin.previewExcelImport.useMutation({
    onSuccess: preview => {
      setExcelPreview(preview);
      if (preview.errors.length) toast.error(`Phát hiện ${preview.errors.length} lỗi cần sửa trong file Excel`);
      else toast.success(`Đã đọc ${preview.productCount} sản phẩm và ${preview.variantCount} biến thể từ Excel`);
    },
    onError: error => { setExcelPreview(null); toast.error(error.message); },
  });
  const importExcelProducts = trpc.catalogAdmin.importExcelProducts.useMutation({
    onSuccess: result => {
      toast.success(`Đã nhập ${result.createdProducts} sản phẩm và ${result.createdVariants} biến thể${result.skipped.length ? `; bỏ qua ${result.skipped.length} sản phẩm trùng` : ""}`);
      setExcelPreview(null);
      setExcelImportFile(null);
      refreshCatalog();
      utils.catalogAdmin.productVariants.invalidate();
      utils.operations.inventory.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const uploadWithdrawalQr = trpc.operations.uploadWithdrawalQr.useMutation({
    onSuccess: () => { toast.success("Đã cập nhật mã QR rút tiền"); siteSettingsQuery.refetch(); },
    onError: error => toast.error(error.message),
  });
  const uploadMedia = trpc.catalogAdmin.uploadMedia.useMutation({
    onSuccess: asset => {
      toast.success(`Đã tải lên ${asset.fileName}`);
      if (uploadTarget === "image") setProductDraft(prev => ({ ...prev, image: asset.url }));
      if (uploadTarget === "file") setProductDraft(prev => ({ ...prev, fileUrl: asset.url, fileSize: formatBytes(asset.sizeBytes) }));
      setUploadTarget(null);
      utils.catalogAdmin.media.invalidate();
    },
    onError: error => toast.error(`Không thể tải tệp: ${error.message}. Bạn có thể dán URL trực tiếp vào biểu mẫu sản phẩm.`),
  });

  const updateOrderStatus = trpc.store.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật đơn hàng");
      utils.store.orders.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateOrderTracking = trpc.store.updateOrderTracking.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật mốc theo dõi đơn");
      utils.store.orders.invalidate();
      utils.store.myOrders.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const deleteOrder = trpc.store.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa đơn hàng khỏi danh sách");
      utils.store.orders.invalidate();
      utils.operations.inventory.invalidate();
      utils.catalogAdmin.productVariants.invalidate();
      utils.catalogAdmin.products.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const confirmManualPayment = trpc.operations.confirmManualPayment.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận tiền về Techcombank. Đơn hàng đã được mở xử lý.");
      utils.store.orders.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateUserStatus = trpc.store.updateUserStatus.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật tài khoản");
      utils.store.usersList.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateUserRole = trpc.store.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật quyền tài khoản");
      utils.store.usersList.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const saveVariantOrder = (nextDraft?: number[]) => {
    if (nextDraft) {
      setVariantOrderDraft(nextDraft);
      return;
    }
    if (!selectedVariantProductId || reorderProductVariants.isPending) return;
    reorderProductVariants.mutate({ productId: selectedVariantProductId, variantIds: variantOrderDraft });
  };

  const moveVariant = (variantId: number, direction: -1 | 1) => {
    const currentIndex = variantOrderDraft.indexOf(variantId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= variantOrderDraft.length) return;
    const nextOrder = [...variantOrderDraft];
    [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
    setVariantOrderDraft(nextOrder);
  };

  const selectFile = (target: "image" | "file") => {
    setUploadTarget(target);
    uploadRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !uploadTarget) return;
    if (uploadTarget === "image" && !file.type.startsWith("image/")) {
      toast.error("Ảnh đại diện phải là PNG, JPEG, WebP hoặc GIF");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Mỗi tệp có dung lượng tối đa 20 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
      if (!base64) return toast.error("Không thể đọc tệp đã chọn");
      uploadMedia.mutate({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleWithdrawalQrChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error("Mã QR phải là PNG, JPEG hoặc WebP");
    if (file.size > 5 * 1024 * 1024) return toast.error("Mã QR tối đa 5 MB");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
      if (!base64) return toast.error("Không thể đọc ảnh mã QR");
      uploadWithdrawalQr.mutate({ fileName: file.name, mimeType: file.type as "image/png" | "image/jpeg" | "image/webp", base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleExcelFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) return toast.error("Chỉ hỗ trợ file Excel .xlsx");
    if (file.size > 10 * 1024 * 1024) return toast.error("File Excel tối đa 10 MB");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
      if (!base64) return toast.error("Không thể đọc file Excel");
      const payload = { fileName: file.name, base64 };
      setExcelImportFile(payload);
      setExcelPreview(null);
      previewExcelImport.mutate(payload);
    };
    reader.readAsDataURL(file);
  };

  const handleCategorySubmit = (event: FormEvent) => {
    event.preventDefault();
    const data = { ...categoryDraft, slug: categoryDraft.slug || slugify(categoryDraft.name) };
    if (!data.slug) return toast.error("Hãy nhập tên danh mục hợp lệ");
    if (editingCategoryId) updateCategory.mutate({ categoryId: editingCategoryId, data });
    else saveCategory.mutate(data);
  };

  const handleProductSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!productDraft.categoryId) return toast.error("Hãy chọn danh mục cho sản phẩm");
    if (!productDraft.price || Number(productDraft.price) < 0) return toast.error("Hãy nhập giá bán hợp lệ");
    const data = {
      ...productDraft,
      slug: productDraft.slug || slugify(productDraft.name),
      price: Number(productDraft.price),
      stock: Number(productDraft.stock || 0),
      weightGrams: Number(productDraft.weightGrams || 0),
    };
    if (!data.slug) return toast.error("Hãy nhập tên sản phẩm hợp lệ");
    if (editingProductId) updateProduct.mutate({ productId: editingProductId, data });
    else createProduct.mutate(data);
  };

  const handleVariantSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedVariantProductId) return toast.error("Hãy chọn sản phẩm vật lý trước");
    if (!variantDraft.size && !variantDraft.color) return toast.error("Hãy nhập ít nhất kích thước hoặc màu sắc");
    const data = { ...variantDraft, productId: selectedVariantProductId, priceAdjustment: Number(variantDraft.priceAdjustment || 0), costPrice: Number(variantDraft.costPrice || 0), stock: Number(variantDraft.stock || 0), weightGrams: !variantDraft.weightGrams?.trim() ? undefined : Number(variantDraft.weightGrams) };
    if (editingVariantId) updateVariant.mutate({ variantId: editingVariantId, data: { size: data.size || undefined, color: data.color || undefined, attributes: data.attributes || undefined, sku: data.sku || undefined, image: data.image || undefined, priceAdjustment: data.priceAdjustment, costPrice: data.costPrice, stock: data.stock, weightGrams: data.weightGrams, isActive: data.isActive } });
    else createVariant.mutate(data);
  };

  const saveSkuQuick = (variantId: number) => {
    if (!selectedVariantProductId) return;
    const draft = skuDrafts[variantId];
    if (!draft || Number(draft.stock) < 0 || Number(draft.costPrice) < 0 || !Number.isFinite(Number(draft.priceAdjustment))) return toast.error("Giá, giá vốn hoặc tồn kho SKU không hợp lệ");
    bulkUpdateProductVariants.mutate({ productId: selectedVariantProductId, changes: [{ variantId, stock: Number(draft.stock), priceAdjustment: Number(draft.priceAdjustment), costPrice: Number(draft.costPrice), isActive: draft.isActive }] });
  };

  const applyBulkSkuValues = () => {
    if (!selectedVariantProductId || !selectedSkuIds.length) return toast.error("Hãy chọn ít nhất một SKU");
    const stock = bulkSkuStock.trim() === "" ? undefined : Number(bulkSkuStock);
    const priceAdjustment = bulkSkuPrice.trim() === "" ? undefined : Number(bulkSkuPrice);
    const costPrice = bulkSkuCost.trim() === "" ? undefined : Number(bulkSkuCost);
    if (stock === undefined && priceAdjustment === undefined && costPrice === undefined) return toast.error("Nhập giá, giá vốn hoặc tồn kho muốn áp dụng");
    if ((stock !== undefined && (!Number.isInteger(stock) || stock < 0)) || (priceAdjustment !== undefined && !Number.isFinite(priceAdjustment)) || (costPrice !== undefined && (!Number.isFinite(costPrice) || costPrice < 0))) return toast.error("Giá, giá vốn hoặc tồn kho hàng loạt không hợp lệ");
    bulkUpdateProductVariants.mutate({ productId: selectedVariantProductId, changes: selectedSkuIds.map(variantId => ({ variantId, ...(stock === undefined ? {} : { stock }), ...(priceAdjustment === undefined ? {} : { priceAdjustment }), ...(costPrice === undefined ? {} : { costPrice }) })) });
  };

  if (!isAdmin) {
    return <StoreLayout><div className="mx-auto max-w-3xl px-4 py-24 text-center"><ShieldCheck className="mx-auto mb-4 h-14 w-14 text-rose-500" /><h1 className="font-display text-4xl font-black uppercase text-slate-900">Khu vực quản trị</h1><p className="mt-2 text-sm text-slate-500">Bạn cần đăng nhập bằng tài khoản quản trị để tiếp tục.</p><Link href="/"><Button className="mt-6 bg-amber-500 font-bold text-slate-950">Về trang chủ</Button></Link></div></StoreLayout>;
  }

  const revenueRangeLabels = { today: "Hôm nay", "7d": "7 ngày", "30d": "30 ngày", month: "Tháng này", year: "Năm nay" } as const;
  const revenueStart = new Date();
  revenueStart.setHours(0, 0, 0, 0);
  if (revenueRange === "7d") revenueStart.setDate(revenueStart.getDate() - 6);
  if (revenueRange === "30d") revenueStart.setDate(revenueStart.getDate() - 29);
  if (revenueRange === "month") revenueStart.setDate(1);
  if (revenueRange === "year") { revenueStart.setMonth(0, 1); }
  const paidOrdersInRange = orders.filter(order => order.paymentStatus === "paid" && new Date(order.createdAt).getTime() >= revenueStart.getTime());
  const totalRevenue = paidOrdersInRange.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const revenueByType = paidOrdersInRange.reduce((totals, order) => {
    const items = order.items || [];
    const itemGross = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const physicalGross = items.filter(item => products.find(product => product.id === item.productId)?.type === "physical").reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const shippingFee = Math.max(0, Number(order.shippingFee || 0));
    const merchandiseRevenue = Math.max(0, Number(order.totalAmount) - shippingFee);
    if (!itemGross) {
      if (order.hasPhysicalItems) totals.physical += Number(order.totalAmount);
      else totals.digital += Number(order.totalAmount);
      return totals;
    }
    const physicalShare = physicalGross / itemGross;
    totals.physical += merchandiseRevenue * physicalShare + (physicalGross > 0 ? shippingFee : 0);
    totals.digital += merchandiseRevenue * (1 - physicalShare);
    return totals;
  }, { digital: 0, physical: 0 });
  const costByType = paidOrdersInRange.reduce((totals, order) => {
    for (const item of order.items || []) {
      const cost = Number(item.costPrice || 0) * Number(item.quantity);
      const type = products.find(product => product.id === item.productId)?.type === "physical" ? "physical" : "digital";
      totals[type] += cost;
    }
    return totals;
  }, { digital: 0, physical: 0 });
  const totalCost = costByType.digital + costByType.physical;
  const totalGrossProfit = Math.max(0, totalRevenue - totalCost);
  const grossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const profitByType = { digital: Math.max(0, revenueByType.digital - costByType.digital), physical: Math.max(0, revenueByType.physical - costByType.physical) };
  const selectedCategoryName = (categoryId: number) => categories.find(category => category.id === categoryId)?.name || "Chưa phân loại";
  const selectedProductCategory = categories.find(category => category.id === productDraft.categoryId);
  const selectedProduct = products.find(product => product.id === editingProductId) || null;

  return (
    <StoreLayout>
      <input ref={uploadRef} type="file" className="hidden" accept={uploadTarget === "image" ? "image/png,image/jpeg,image/webp,image/gif" : "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,application/pdf,application/zip,.zip"} onChange={handleFileChange} />
      <input ref={withdrawalQrUploadRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleWithdrawalQrChange} />
      {selectedProduct?.type === "physical" && skuSortMode === "manual" && hasPendingSkuOrder && <div className="fixed inset-x-4 bottom-5 z-[80] mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-violet-300 bg-white p-3 shadow-2xl sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-violet-950">Thứ tự SKU đã thay đổi</p><p className="mt-0.5 text-xs text-slate-600">Bấm lưu để cập nhật đúng thứ tự khách hàng nhìn thấy.</p></div><div className="flex shrink-0 gap-2"><Button type="button" variant="outline" className="border-slate-300 bg-white text-slate-700" onClick={() => setVariantOrderDraft(savedVariantOrder)}>Hoàn tác</Button><Button type="button" className="bg-violet-600 font-black text-white hover:bg-violet-700" disabled={reorderProductVariants.isPending} onClick={() => saveVariantOrder()}>{reorderProductVariants.isPending ? "Đang lưu…" : "Lưu thứ tự SKU"}</Button></div></div>}
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8 2xl:px-10">
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">DHL Stores · Quản trị</p><h1 className="mt-1 font-display text-3xl font-black uppercase text-slate-900">Quản trị cửa hàng</h1><p className="mt-1 text-xs leading-relaxed text-slate-500">Quản lý sản phẩm, tồn kho, tệp và đơn hàng tại một nơi. Liên kết email tại mục Tài khoản cá nhân.</p></div><div className="flex flex-wrap gap-2">{user?.role === "owner" && <Link href="/admin/operations"><Button className="bg-slate-900 text-white hover:bg-slate-800">Trung tâm vận hành</Button></Link>}<Link href="/account"><Button variant="outline" className="border-purple-200 bg-purple-50 text-purple-800 hover:border-purple-400 hover:bg-purple-100">Tài khoản & Email</Button></Link><Link href="/products"><Button variant="outline" className="border-slate-300 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-50">Xem cửa hàng <ChevronLeft className="ml-1 h-4 w-4 rotate-180" /></Button></Link></div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dhl-hover-card flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><DollarSign className="h-5 w-5" /></div><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Doanh thu đã thanh toán</p><p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(totalRevenue)}</p></div></div></div><select aria-label="Khoảng thời gian doanh thu" value={revenueRange} onChange={event => setRevenueRange(event.target.value as typeof revenueRange)} className="h-9 w-full rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-200"><option value="today">Hôm nay</option><option value="7d">7 ngày gần đây</option><option value="30d">30 ngày gần đây</option><option value="month">Tháng này</option><option value="year">Năm nay</option></select><div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2"><p className="text-[9px] font-black uppercase text-violet-700">Sản phẩm số</p><p className="mt-1 text-sm font-black text-violet-900">{formatCurrency(revenueByType.digital)}</p></div><div className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2"><p className="text-[9px] font-black uppercase text-emerald-700">Hàng vật lý</p><p className="mt-1 text-sm font-black text-emerald-900">{formatCurrency(revenueByType.physical)}</p></div></div><p className="text-[10px] font-semibold text-emerald-700">Đang xem: {revenueRangeLabels[revenueRange]}</p><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"><p className="text-[9px] font-black uppercase text-slate-500">Giá vốn</p><p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(totalCost)}</p></div><div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2"><p className="text-[9px] font-black uppercase text-emerald-700">Lợi nhuận gộp</p><p className="mt-1 text-sm font-black text-emerald-900">{formatCurrency(totalGrossProfit)}</p><p className="mt-0.5 text-[10px] font-bold text-emerald-700">Biên {grossMargin.toFixed(1)}%</p></div></div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><p className="rounded-lg bg-violet-50 px-2.5 py-2 font-black text-violet-800">Lãi số: {formatCurrency(profitByType.digital)}</p><p className="rounded-lg bg-cyan-50 px-2.5 py-2 font-black text-cyan-800">Lãi vật lý: {formatCurrency(profitByType.physical)}</p></div></div>
          {[{ label: "Sản phẩm", value: products.length, icon: Package, tone: "text-blue-600 bg-blue-100" }, { label: "Danh mục", value: categories.length, icon: Archive, tone: "text-violet-600 bg-violet-100" }, { label: "Tệp đã tải", value: media.length, icon: FileArchive, tone: "text-amber-600 bg-amber-100" }].map(card => <div key={card.label} className="dhl-hover-card flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="h-5 w-5" /></div><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{card.label}</p><p className="mt-1 text-xl font-black text-slate-900">{card.value}</p></div></div>)}
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="products" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Catalog · Sản phẩm</TabsTrigger>
            <TabsTrigger value="variants" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Catalog · Biến thể</TabsTrigger>
            <TabsTrigger value="categories" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Catalog · Danh mục</TabsTrigger>
            <TabsTrigger value="media" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Nội dung · Tệp</TabsTrigger>
            <TabsTrigger value="orders" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Bán hàng · Đơn</TabsTrigger>
            <TabsTrigger value="users" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Khách hàng</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="catalog-products space-y-6">
            <style>{`.catalog-products > section:last-child { display: none; }`}</style>
            <input ref={excelInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleExcelFileChange} />
            <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-emerald-100 bg-emerald-50/70 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Nhập hàng loạt</p><h2 className="font-display text-2xl font-black uppercase text-slate-900">Nhập sản phẩm từ Excel</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">Dùng file .xlsx xuất từ Bizweb/Sapo: hệ thống đọc tên sản phẩm, alias, giá, ảnh, SKU và tối đa ba thuộc tính biến thể. Bạn luôn xem trước trước khi nhập; sản phẩm trùng slug sẽ được bỏ qua.</p></div><Button type="button" onClick={() => excelInputRef.current?.click()} disabled={previewExcelImport.isPending} className="bg-emerald-600 font-black text-white hover:bg-emerald-700"><FileSpreadsheet className="mr-2 h-4 w-4" />{previewExcelImport.isPending ? "Đang đọc Excel..." : "Chọn file Excel"}</Button></div>{excelPreview && <div className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-5"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Sheet / dòng</p><p className="mt-1 text-sm font-black text-slate-900">{excelPreview.sheetName} · {excelPreview.rowCount}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Sản phẩm</p><p className="mt-1 text-sm font-black text-slate-900">{excelPreview.productCount}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Biến thể</p><p className="mt-1 text-sm font-black text-slate-900">{excelPreview.variantCount}</p></div><div className={`rounded-xl p-3 ${excelPreview.duplicates.length ? "bg-amber-50" : "bg-emerald-50"}`}><p className="text-[10px] font-black uppercase text-slate-500">Trùng slug</p><p className={`mt-1 text-sm font-black ${excelPreview.duplicates.length ? "text-amber-800" : "text-emerald-800"}`}>{excelPreview.duplicates.length || "Không có"}</p></div><div className={`rounded-xl p-3 ${excelPreview.errors.length ? "bg-rose-50" : "bg-emerald-50"}`}><p className="text-[10px] font-black uppercase text-slate-500">Lỗi dữ liệu</p><p className={`mt-1 text-sm font-black ${excelPreview.errors.length ? "text-rose-800" : "text-emerald-800"}`}>{excelPreview.errors.length || "Không có"}</p></div></div>{excelPreview.errors.length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><p className="font-black">Sửa các dòng sau trước khi nhập:</p>{excelPreview.errors.slice(0, 8).map(error => <p key={`${error.row}-${error.message}`} className="mt-1">Dòng {error.row}: {error.message}</p>)}</div>}{excelPreview.duplicates.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Các sản phẩm trùng sẽ không bị ghi đè: {excelPreview.duplicates.slice(0, 4).join(" · ")}{excelPreview.duplicates.length > 4 ? "…" : ""}</p>}<div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-[720px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Sản phẩm</th><th className="px-3 py-3">Giá</th><th className="px-3 py-3">Biến thể</th><th className="px-3 py-3">Thuộc tính</th></tr></thead><tbody className="divide-y divide-slate-100">{excelPreview.products.map(product => <tr key={product.slug}><td className="px-3 py-3"><p className="font-bold text-slate-900">{product.name}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{product.slug}</p></td><td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(product.price)}</td><td className="px-3 py-3 text-slate-700">{product.variants}</td><td className="px-3 py-3 text-slate-600">{product.options.map(group => `${group.name}: ${group.values.join(", ")}`).join(" · ") || "—"}</td></tr>)}</tbody></table></div><div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center"><select className="flex h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm" value={excelCategoryId} onChange={event => setExcelCategoryId(Number(event.target.value))}><option value={0}>Chọn danh mục đích để nhập</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name} · {category.type === "physical" ? "Hàng vật lý" : "Tài nguyên số"}</option>)}</select><Button type="button" disabled={!excelImportFile || !excelCategoryId || Boolean(excelPreview.errors.length) || importExcelProducts.isPending} onClick={() => importExcelProducts.mutate({ ...excelImportFile!, categoryId: excelCategoryId, skipDuplicates: true })} className="bg-emerald-600 font-black text-white hover:bg-emerald-700"><Check className="mr-2 h-4 w-4" />{importExcelProducts.isPending ? "Đang nhập..." : `Xác nhận nhập ${excelPreview.productCount} sản phẩm`}</Button></div><p className="text-[11px] leading-relaxed text-slate-500">Lưu ý: nếu chọn danh mục hàng vật lý, các cột Thuộc tính 1–3 sẽ thành nhóm lựa chọn và từng dòng Excel sẽ thành một biến thể. Giá sẽ được gắn theo biến thể; tồn kho mặc định là 0 để bạn kiểm tra trước khi mở bán.</p></div>}</section>
            <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><label htmlFor="catalog-search" className="text-[10px] font-black uppercase tracking-wide text-slate-500">Tìm trong Catalog</label><Input id="catalog-search" value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} placeholder="Tên sản phẩm, SKU, biến thể, thuộc tính…" className="mt-1" /></div><div className="flex shrink-0 flex-wrap gap-2">{selectedProduct?.type === "physical" && <Button type="button" className="bg-violet-600 font-black text-white hover:bg-violet-700" disabled={reorderProductVariants.isPending || !hasPendingSkuOrder} onClick={() => saveVariantOrder()}>{reorderProductVariants.isPending ? "Đang lưu…" : "Lưu toàn bộ thứ tự SKU"}</Button>}{selectedProduct?.type === "physical" && <Button type="button" variant="outline" disabled={!hasPendingSkuOrder} onClick={() => setVariantOrderDraft(savedVariantOrder)}>Hoàn tác thứ tự</Button>}</div>{catalogSearchTerm && <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2"><p className="mb-2 text-[11px] font-black text-slate-600">Tìm thấy {catalogSearchResults.length} sản phẩm</p><div className="flex flex-wrap gap-2">{catalogSearchResults.slice(0, 8).map(product => <Button key={product.id} type="button" size="sm" variant="outline" onClick={() => { selectProductForEdit(product); setCatalogSearch(""); }}>{product.name}</Button>)}{catalogSearchResults.length === 0 && <span className="text-xs text-slate-500">Không có tên sản phẩm, SKU hoặc biến thể phù hợp.</span>}</div></div>}</section>
            <div className="grid gap-6 xl:h-[52rem] xl:grid-cols-3 xl:[&>div:nth-of-type(1)]:order-1 xl:[&>section]:order-2 xl:[&>div:nth-of-type(2)]:order-3">
              <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm xl:flex xl:min-h-0 xl:flex-col">
                <div className="shrink-0 border-b border-violet-100 bg-violet-50/70 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Cột 2 · SKU, giá & tồn kho</p><h2 className="font-display text-2xl font-black uppercase text-slate-900">{selectedProduct?.name || "Chọn sản phẩm"}</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Sửa giá SKU, tồn kho và trạng thái ngay tại đây. Kéo thả chỉ ảnh hưởng thứ tự khách nhìn thấy.</p></div>{selectedProduct && <Badge className={selectedProduct.type === "physical" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"}>{selectedProduct.type === "physical" ? `${variants.length} SKU` : "Tài nguyên số"}</Badge>}</div>{selectedProduct?.type === "physical" && <div className="mt-4 grid gap-2 sm:grid-cols-2"><select value={skuSortMode} onChange={event => setSkuSortMode(event.target.value as typeof skuSortMode)} className="h-10 rounded-md border border-violet-200 bg-white px-3 text-xs font-bold text-slate-700"><option value="manual">Thứ tự thủ công</option><option value="name">Sắp xếp theo tên / SKU</option><option value="priceLow">Giá SKU thấp → cao</option><option value="priceHigh">Giá SKU cao → thấp</option></select><Button type="button" variant="outline" className="border-violet-200 text-violet-800" onClick={() => setSelectedSkuIds(selectedSkuIds.length === variants.length ? [] : variants.map(variant => variant.id))}>{selectedSkuIds.length === variants.length ? "Bỏ chọn tất cả" : `Chọn tất cả (${variants.length})`}</Button></div>}</div>
                {!selectedProduct ? <div className="p-8 text-center text-sm leading-relaxed text-slate-500">Chọn một sản phẩm ở cột bên trái để xem hình SKU, tồn kho và biểu mẫu chỉnh sửa.</div> : selectedProduct.type !== "physical" ? <div className="p-8 text-center text-sm leading-relaxed text-slate-500">Sản phẩm số không dùng SKU vật lý. Bạn có thể cập nhật ảnh, tệp và liên kết tải ở biểu mẫu bên phải.</div> : <div className="flex min-h-0 flex-1 flex-col"><div className="shrink-0 border-b border-violet-100 bg-violet-50/40 p-3"><div className="grid grid-cols-4 gap-2"><button type="button" onClick={() => setSkuFilter("all")} className={`rounded-lg border p-2 text-left ${skuFilter === "all" ? "border-violet-500 bg-white ring-2 ring-violet-100" : "border-violet-100 bg-violet-50"}`}><p className="text-[9px] font-black uppercase text-slate-500">Tất cả</p><p className="text-sm font-black text-slate-900">{variants.length}</p></button><button type="button" onClick={() => setSkuFilter("low")} className={`rounded-lg border p-2 text-left ${skuFilter === "low" ? "border-amber-500 bg-white ring-2 ring-amber-100" : "border-amber-100 bg-amber-50"}`}><p className="text-[9px] font-black uppercase text-amber-700">Sắp hết</p><p className="text-sm font-black text-amber-900">{skuHealth.low}</p></button><button type="button" onClick={() => setSkuFilter("out")} className={`rounded-lg border p-2 text-left ${skuFilter === "out" ? "border-rose-500 bg-white ring-2 ring-rose-100" : "border-rose-100 bg-rose-50"}`}><p className="text-[9px] font-black uppercase text-rose-700">Hết hàng</p><p className="text-sm font-black text-rose-900">{skuHealth.out}</p></button><button type="button" onClick={() => setSkuFilter("attention")} className={`rounded-lg border p-2 text-left ${skuFilter === "attention" ? "border-slate-600 bg-white ring-2 ring-slate-100" : "border-slate-200 bg-slate-50"}`}><p className="text-[9px] font-black uppercase text-slate-500">Cần xem</p><p className="text-sm font-black text-slate-900">{skuHealth.low + skuHealth.out + skuHealth.hidden + skuHealth.noImage}</p></button></div><div className="mt-2 flex gap-2"><Input value={skuSearch} onChange={event => setSkuSearch(event.target.value)} placeholder="Tìm SKU, màu, size..." className="h-9 bg-white text-xs" /><Button type="button" size="sm" variant="outline" className="shrink-0 border-violet-200 text-violet-800" onClick={() => { setSkuSearch(""); setSkuFilter("all"); }}>Xóa lọc</Button></div><div className="mt-3 flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-violet-800">Cập nhật hàng loạt · {selectedSkuIds.length} SKU đã chọn · đang xem {visibleSkuVariants.length} SKU</p>{changedSkuCount > 0 && <Badge className="shrink-0 bg-amber-100 text-amber-800">{changedSkuCount} dòng chưa lưu</Badge>}</div><div className="mt-2 grid gap-2 sm:grid-cols-3"><label className="text-[10px] font-black text-slate-600">Tồn kho mới<Input type="number" min="0" value={bulkSkuStock} onChange={event => setBulkSkuStock(event.target.value)} placeholder="Ví dụ: 20" className="mt-1 h-9 bg-white text-xs" /></label><label className="text-[10px] font-black text-slate-600">Giá bán mới<Input type="number" min="0" value={bulkSkuPrice} onChange={event => setBulkSkuPrice(event.target.value)} placeholder="Ví dụ: 199000" className="mt-1 h-9 bg-white text-xs" /></label><label className="text-[10px] font-black text-amber-800">Giá vốn mới<Input type="number" min="0" value={bulkSkuCost} onChange={event => setBulkSkuCost(event.target.value)} placeholder="Ví dụ: 90000" className="mt-1 h-9 border-amber-200 bg-amber-50 text-xs" /></label></div><Button type="button" size="sm" className="mt-3 w-full bg-violet-600 font-black text-white hover:bg-violet-700 disabled:bg-slate-300" disabled={!selectedSkuIds.length || (!bulkSkuStock && !bulkSkuPrice && !bulkSkuCost) || bulkUpdateProductVariants.isPending} onClick={applyBulkSkuValues}>Áp dụng cho {selectedSkuIds.length} SKU đã chọn</Button></div><div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">{visibleSkuVariants.map((variant, index) => { const draft = skuDrafts[variant.id] || { priceAdjustment: variant.priceAdjustment, costPrice: variant.costPrice, stock: String(variant.stock), isActive: variant.isActive }; const originalIndex = variants.findIndex(item => item.id === variant.id); const isSkuDirty = String(draft.stock) !== String(variant.stock) || String(draft.costPrice) !== String(variant.costPrice) || String(draft.priceAdjustment) !== String(variant.priceAdjustment) || draft.isActive !== variant.isActive; const stockTone = Number(draft.stock) <= 0 ? "bg-rose-100 text-rose-700" : Number(draft.stock) <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"; const stockLabel = Number(draft.stock) <= 0 ? "Hết hàng" : Number(draft.stock) <= 5 ? `Sắp hết · ${draft.stock}` : `Còn ${draft.stock}`; return <article key={variant.id} draggable={skuSortMode === "manual"} onDragStart={() => skuSortMode === "manual" && setDraggedVariantId(variant.id)} onDragEnd={() => setDraggedVariantId(null)} onDragOver={event => skuSortMode === "manual" && event.preventDefault()} onDrop={() => { if (skuSortMode !== "manual" || !draggedVariantId || draggedVariantId === variant.id) return; const ids = variants.map(item => item.id); const fromIndex = ids.indexOf(draggedVariantId); const toIndex = ids.indexOf(variant.id); ids.splice(fromIndex, 1); ids.splice(toIndex, 0, draggedVariantId); saveVariantOrder(ids); setDraggedVariantId(null); }} className={`group grid grid-cols-[1.4rem_3.5rem_minmax(0,1fr)] gap-3 p-3 transition ${skuSortMode === "manual" ? "cursor-grab active:cursor-grabbing" : ""} ${isSkuDirty ? "bg-amber-50/70" : editingVariantId === variant.id ? "bg-violet-50" : "hover:bg-slate-50"}`}><input type="checkbox" className="mt-1.5 h-4 w-4 accent-violet-600" checked={selectedSkuIds.includes(variant.id)} onChange={event => setSelectedSkuIds(current => event.target.checked ? [...current, variant.id] : current.filter(id => id !== variant.id))} /><div className="flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">{variant.image || selectedProduct.image ? <img src={variant.image || selectedProduct.image} alt={`Ảnh SKU ${variant.sku || index + 1}`} className="h-full w-full object-contain" /> : <div className="grid h-full w-full place-items-center text-[10px] font-black text-slate-400">SKU</div>}</div><div className="min-w-0"><button type="button" onClick={() => { setEditingVariantId(variant.id); setVariantDraft({ size: variant.size || "", color: variant.color || "", attributes: variant.attributes || "", sku: variant.sku || "", image: variant.image || "", priceAdjustment: variant.priceAdjustment, costPrice: variant.costPrice, stock: String(variant.stock), weightGrams: variant.weightGrams === undefined ? "" : String(variant.weightGrams), isActive: variant.isActive }); }} className="w-full text-left"><p className="truncate text-sm font-black text-slate-900">{[variant.color, variant.size].filter(Boolean).join(" · ") || `SKU ${originalIndex + 1}`}</p><p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{variant.sku || "Chưa có mã SKU"}</p></button><div className="mt-1.5 flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${stockTone}`}>{stockLabel}</span>{!draft.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">Đang ẩn</span>}{isSkuDirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">Chưa lưu</span>}</div><div className="mt-2 grid grid-cols-3 gap-2"><label className="text-[10px] font-bold text-slate-500">Giá bán<Input type="number" min="0" value={Number(selectedProduct.price) + Number(draft.priceAdjustment)} onChange={event => setSkuDrafts(current => ({ ...current, [variant.id]: { ...draft, priceAdjustment: String(Number(event.target.value || 0) - Number(selectedProduct.price)) } }))} className="mt-1 h-9 bg-white text-sm font-black text-slate-900" /></label><label className="text-[10px] font-bold text-amber-700">Giá vốn<Input type="number" min="0" value={draft.costPrice} onChange={event => setSkuDrafts(current => ({ ...current, [variant.id]: { ...draft, costPrice: event.target.value } }))} className="mt-1 h-9 border-amber-200 bg-amber-50 text-sm font-black text-slate-900" /></label><label className="text-[10px] font-bold text-emerald-700">Tồn kho<Input type="number" min="0" value={draft.stock} onChange={event => setSkuDrafts(current => ({ ...current, [variant.id]: { ...draft, stock: event.target.value } }))} className="mt-1 h-9 border-emerald-200 bg-emerald-50 text-sm font-black text-slate-900" /></label></div><div className="mt-2 flex items-center justify-between gap-2"><label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><input type="checkbox" checked={draft.isActive} onChange={event => setSkuDrafts(current => ({ ...current, [variant.id]: { ...draft, isActive: event.target.checked } }))} />Đang bán</label><div className="flex gap-1"><Button type="button" size="sm" variant="outline" className="h-7 border-violet-200 px-2 text-[10px] font-black text-violet-800 disabled:border-slate-200 disabled:text-slate-400" onClick={() => saveSkuQuick(variant.id)} disabled={bulkUpdateProductVariants.isPending || !isSkuDirty}>{bulkUpdateProductVariants.isPending ? "Đang lưu…" : "Lưu thay đổi"}</Button>{skuSortMode === "manual" && <><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveVariant(variant.id, -1)} disabled={originalIndex === 0 || reorderProductVariants.isPending} aria-label="Đưa SKU lên"><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveVariant(variant.id, 1)} disabled={originalIndex === variants.length - 1 || reorderProductVariants.isPending} aria-label="Đưa SKU xuống"><ArrowDown className="h-3.5 w-3.5" /></Button></>}</div></div></div></article>; })}{visibleSkuVariants.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Không có SKU khớp bộ lọc. Hãy đổi bộ lọc hoặc xóa từ khóa tìm.</div>}</div></div>}
              </section>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex xl:min-h-0 xl:flex-col"><div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-display text-2xl font-black uppercase text-slate-900">Danh sách sản phẩm</h2><p className="mt-1 text-xs text-slate-500">Chọn sửa để chỉnh giá, ảnh, file hoặc trạng thái hiển thị.</p></div><Badge variant="outline">{products.length} mục</Badge></div><div className="divide-y divide-slate-100 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">{products.map(product => <div key={product.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-violet-600 text-xs font-black text-white">{product.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{product.name}</p><p className="mt-0.5 text-xs text-slate-500">{selectedCategoryName(product.categoryId)} · {formatCurrency(product.price)}</p></div></div><div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"><Badge className={product.type === "physical" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"}>{product.type === "physical" ? "Hàng vật lý" : "Tài nguyên số"}</Badge>{product.type === "physical" && <Badge className={Number(product.stock) <= 5 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>{Number(product.stock) <= 5 ? `Sắp hết · ${product.stock}` : `Kho chung · ${product.stock}`}</Badge>}<Badge className={product.isActive === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}>{product.isActive === false ? "Đang ẩn" : "Đang hiển thị"}</Badge><Button size="sm" variant="outline" onClick={() => selectProductForEdit(product)}><Pencil className="mr-1 h-3.5 w-3.5" />Sửa</Button></div></div>)}{products.length === 0 && <div className="p-12 text-center text-sm text-slate-500">Chưa có sản phẩm. Hãy tạo sản phẩm đầu tiên ở biểu mẫu bên phải.</div>}</div></div>
              <div className="space-y-6 xl:min-h-0 xl:overflow-y-auto xl:pr-1"><form onSubmit={handleProductSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Cột 3 · Biểu mẫu</p><h2 className="font-display text-2xl font-black uppercase text-slate-900">{editingProductId ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2><p className="mt-1 text-xs text-slate-500">Ảnh và file được lưu trong kho của website.</p></div>{editingProductId && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingProductId(null); setSelectedVariantProductId(null); setEditingVariantId(null); setProductDraft({ ...emptyProduct, categoryId: categories[0]?.id || 0 }); }}>Tạo mới</Button>}</div>
                <Input value={productDraft.name} onChange={event => setProductDraft(prev => ({ ...prev, name: event.target.value, slug: prev.slug || slugify(event.target.value) }))} placeholder="Tên sản phẩm" required />
                <Input value={productDraft.slug} onChange={event => setProductDraft(prev => ({ ...prev, slug: slugify(event.target.value) }))} placeholder="slug-san-pham" required />
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={productDraft.categoryId} onChange={event => setProductDraft(prev => ({ ...prev, categoryId: Number(event.target.value) }))} required><option value={0}>Chọn danh mục</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-black uppercase tracking-wide text-slate-700">Giá bán (VND)<span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-slate-500">Giá cơ bản của sản phẩm; có thể cộng chênh lệch theo SKU.</span><Input type="number" min="0" value={productDraft.price} onChange={event => setProductDraft(prev => ({ ...prev, price: event.target.value }))} placeholder="Ví dụ: 211700" required className="mt-2" /></label>{selectedProductCategory?.type === "physical" && <label className="block text-xs font-black uppercase tracking-wide text-slate-700">Tồn kho tổng<span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-slate-500">Chỉ dùng khi sản phẩm chưa có SKU; nếu có SKU, tồn thực tế lấy từ từng biến thể.</span><Input type="number" min="0" value={productDraft.stock} onChange={event => setProductDraft(prev => ({ ...prev, stock: event.target.value }))} placeholder="Ví dụ: 0" required className="mt-2" /></label>}</div>
                {selectedProductCategory?.type === "physical" && <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3"><label className="text-xs font-black uppercase tracking-wide text-sky-900">Khối lượng mặc định (gram)<Input type="number" min="0" value={productDraft.weightGrams} onChange={event => setProductDraft(prev => ({ ...prev, weightGrams: event.target.value }))} placeholder="Ví dụ: 450" className="mt-2 bg-white" /></label><p className="mt-2 text-[11px] leading-relaxed text-sky-800">Dùng để tính giao SPX: đến 1 kg 20.000đ, sau đó thêm 10.000đ cho mỗi kg hoặc phần kg. SKU có thể ghi đè nếu nặng khác nhau.</p></div>}
                {selectedProductCategory?.type === "physical" && <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3"><p className="text-xs font-black uppercase tracking-wide text-orange-900">Giao diện mua hàng</p><p className="mt-1 text-[11px] leading-relaxed text-orange-800">Chọn cách khách chọn SKU trên trang sản phẩm. Bạn có thể đổi lại bất cứ lúc nào.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className={`cursor-pointer rounded-xl border p-3 text-xs transition ${productDraft.purchaseLayout === "classic" ? "border-orange-500 bg-white ring-2 ring-orange-100" : "border-orange-200 bg-orange-50 hover:border-orange-400"}`}><input type="radio" name="purchase-layout" value="classic" checked={productDraft.purchaseLayout === "classic"} onChange={() => setProductDraft(prev => ({ ...prev, purchaseLayout: "classic" }))} className="sr-only" /><span className="block font-black text-slate-900">Giao diện cũ</span><span className="mt-1 block text-slate-600">Chọn màu/size trước, sau đó mua một SKU.</span></label><label className={`cursor-pointer rounded-xl border p-3 text-xs transition ${productDraft.purchaseLayout === "marketplace" ? "border-orange-500 bg-white ring-2 ring-orange-100" : "border-orange-200 bg-orange-50 hover:border-orange-400"}`}><input type="radio" name="purchase-layout" value="marketplace" checked={productDraft.purchaseLayout === "marketplace"} onChange={() => setProductDraft(prev => ({ ...prev, purchaseLayout: "marketplace" }))} className="sr-only" /><span className="block font-black text-slate-900">Giao diện bảng marketplace</span><span className="mt-1 block text-slate-600">Hiện từng SKU, ảnh, giá, tồn kho và số lượng để thêm nhiều SKU cùng lúc.</span></label></div></div>}
                {selectedProduct?.type === "physical" && <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-900">Giá sỉ theo số lượng</p><p className="mt-1 text-[11px] leading-relaxed text-emerald-800">Đơn giá áp dụng khi khách mua đủ số lượng của cùng sản phẩm. Giá riêng của SKU vẫn cộng thêm phần chênh giá SKU.</p></div>{wholesaleTierDrafts.map((tier, index) => <div key={`${tier.minQuantity}-${index}`} className="grid grid-cols-[1fr_1.3fr_auto] gap-2"><Input type="number" min="2" value={tier.minQuantity} onChange={event => setWholesaleTierDrafts(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, minQuantity: event.target.value } : item))} placeholder="Mốc SL" /><Input type="number" min="0" value={tier.unitPrice} onChange={event => setWholesaleTierDrafts(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitPrice: event.target.value } : item))} placeholder="Giá / cái" /><Button type="button" size="icon" variant="ghost" className="h-10 w-10 text-rose-600 hover:bg-rose-100" onClick={() => setWholesaleTierDrafts(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa mốc giá sỉ"><Trash2 className="h-4 w-4" /></Button></div>)}<div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" className="border-emerald-200 text-emerald-800" onClick={() => setWholesaleTierDrafts(current => [...current, { minQuantity: "", unitPrice: "" }])}><Plus className="mr-1 h-4 w-4" />Thêm mốc</Button><Button type="button" className="bg-emerald-600 font-black text-white hover:bg-emerald-700" disabled={saveWholesaleTiers.isPending} onClick={() => { if (!selectedProduct) return; const tiers = wholesaleTierDrafts.map(tier => ({ minQuantity: Number(tier.minQuantity), unitPrice: Number(tier.unitPrice) })); if (tiers.some(tier => !Number.isInteger(tier.minQuantity) || tier.minQuantity < 2 || !Number.isFinite(tier.unitPrice) || tier.unitPrice < 0)) return toast.error("Mỗi mốc giá sỉ cần số lượng từ 2 và giá hợp lệ"); saveWholesaleTiers.mutate({ productId: selectedProduct.id, tiers }); }}><Check className="mr-1 h-4 w-4" />Lưu giá sỉ</Button></div></div>}
                <Textarea value={productDraft.description} onChange={event => setProductDraft(prev => ({ ...prev, description: event.target.value }))} placeholder="Mô tả sản phẩm" />
                <Textarea value={productDraft.specs} onChange={event => setProductDraft(prev => ({ ...prev, specs: event.target.value }))} placeholder="Thông số / định dạng tệp" />
                <div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={() => selectFile("image")} disabled={uploadMedia.isPending}><Image className="mr-2 h-4 w-4" />{productDraft.image.startsWith("/manus-storage/") ? "Đổi ảnh" : "Tải ảnh"}</Button><Button type="button" variant="outline" onClick={() => selectFile("file")} disabled={uploadMedia.isPending}><CloudUpload className="mr-2 h-4 w-4" />{productDraft.fileUrl ? "Đổi file" : "Tải file"}</Button></div>
                <div className="space-y-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-3"><div><p className="text-xs font-black uppercase tracking-wide text-violet-800">Liên kết tải xuống</p><p className="mt-1 text-[11px] leading-relaxed text-slate-600">Bạn có thể thay link mới bất cứ lúc nào. Khách đã thanh toán sẽ nhận liên kết mới sau khi bạn bấm lưu.</p></div><Input value={productDraft.image} onChange={event => setProductDraft(prev => ({ ...prev, image: event.target.value }))} placeholder="URL ảnh đại diện" /><Input value={productDraft.fileUrl} onChange={event => setProductDraft(prev => ({ ...prev, fileUrl: event.target.value }))} placeholder="Dán hoặc thay URL tệp tải xuống tại đây" aria-label="Liên kết tải xuống của sản phẩm" /></div>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs"><label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={productDraft.featured} onChange={event => setProductDraft(prev => ({ ...prev, featured: event.target.checked }))} />Nổi bật</label><label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={productDraft.isActive} onChange={event => setProductDraft(prev => ({ ...prev, isActive: event.target.checked }))} />Hiển thị công khai</label></div>
                <Button type="submit" className="w-full bg-amber-500 font-black text-slate-950 hover:bg-amber-400" disabled={createProduct.isPending || updateProduct.isPending}><Check className="mr-2 h-4 w-4" />{editingProductId ? "Lưu thay đổi & cập nhật link tải" : "Tạo sản phẩm"}</Button>
              </form>{selectedProduct?.type === "physical" && <form onSubmit={handleVariantSubmit} className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h3 className="font-display text-xl font-black uppercase text-slate-900">{editingVariantId ? "Sửa SKU đã chọn" : "Thêm SKU"}</h3><p className="mt-1 text-xs text-slate-600">Ảnh, SKU, giá và tồn kho của từng phiên bản.</p></div><Button type="button" size="sm" variant="outline" onClick={() => { setEditingVariantId(null); setVariantDraft(emptyVariant); }}>SKU mới</Button></div><Input value={variantDraft.sku} onChange={event => setVariantDraft(prev => ({ ...prev, sku: event.target.value }))} placeholder="Mã SKU" /><div className="grid grid-cols-2 gap-3"><Input value={variantDraft.color} onChange={event => setVariantDraft(prev => ({ ...prev, color: event.target.value }))} placeholder="Màu sắc" /><Input value={variantDraft.size} onChange={event => setVariantDraft(prev => ({ ...prev, size: event.target.value }))} placeholder="Size" /></div><Textarea value={variantDraft.attributes} onChange={event => setVariantDraft(prev => ({ ...prev, attributes: event.target.value }))} placeholder="Kiểu, chất liệu… mỗi dòng một mục" /><Input value={variantDraft.image} onChange={event => setVariantDraft(prev => ({ ...prev, image: event.target.value }))} placeholder="URL ảnh SKU" /><div className="grid grid-cols-4 gap-3"><Input type="number" value={variantDraft.priceAdjustment} onChange={event => setVariantDraft(prev => ({ ...prev, priceAdjustment: event.target.value }))} placeholder="Chênh giá" /><Input type="number" min="0" value={variantDraft.stock} onChange={event => setVariantDraft(prev => ({ ...prev, stock: event.target.value }))} placeholder="Tồn kho" /><Input type="number" min="0" value={variantDraft.weightGrams ?? ""} onChange={event => setVariantDraft(prev => ({ ...prev, weightGrams: event.target.value }))} placeholder="Khối lượng g" /></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={variantDraft.isActive} onChange={event => setVariantDraft(prev => ({ ...prev, isActive: event.target.checked }))} />Đang bán</label><Button type="submit" disabled={createVariant.isPending || updateVariant.isPending} className="w-full bg-violet-600 font-black text-white hover:bg-violet-700"><Check className="mr-2 h-4 w-4" />{editingVariantId ? "Lưu SKU" : "Tạo SKU"}</Button></form>}</div>
            </div>
            <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-violet-100 bg-violet-50/60 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Kho trong Catalog</p><h2 className="font-display text-2xl font-black uppercase text-slate-900">Tồn kho & SKU</h2><p className="mt-1 text-xs text-slate-600">Chọn các sản phẩm hoặc biến thể cần sửa, nhập số lượng mới rồi lưu một lần.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Input value={inventorySearch} onChange={event => setInventorySearch(event.target.value)} className="sm:w-60" placeholder="Tìm sản phẩm, SKU..." /><Input value={inventoryReason} onChange={event => setInventoryReason(event.target.value)} className="sm:w-48" placeholder="Lý do điều chỉnh" /><Button disabled={!selectedInventoryChanges.length || bulkSetInventory.isPending} onClick={() => bulkSetInventory.mutate({ changes: selectedInventoryChanges, reason: inventoryReason })} className="bg-violet-600 text-white hover:bg-violet-700"><Archive className="mr-2 h-4 w-4" />Lưu {selectedInventoryChanges.length || ""} dòng</Button></div></div><div className="overflow-x-auto"><div className="min-w-[780px]"><div className="grid grid-cols-[2.5rem_minmax(16rem,1fr)_minmax(8rem,0.7fr)_7rem_6rem_7rem] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500"><span></span><span>Sản phẩm / lựa chọn</span><span>SKU</span><span>Tồn</span><span>Đã giữ</span><span>Số lượng mới</span></div>{inventoryRows.map(row => { const key = `${row.target}:${row.id}`; return <div key={key} className="grid grid-cols-[2.5rem_minmax(16rem,1fr)_minmax(8rem,0.7fr)_7rem_6rem_7rem] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><input type="checkbox" checked={selectedInventoryRows.includes(key)} onChange={event => setSelectedInventoryRows(current => event.target.checked ? [...current, key] : current.filter(item => item !== key))} /><div><p className="text-sm font-bold text-slate-900">{row.productName}</p><p className="text-xs text-slate-500">{row.variantLabel}</p></div><span className="font-mono text-xs text-slate-600">{row.sku || "—"}</span><span className={row.stock <= 5 ? "font-black text-rose-600" : "font-black text-slate-900"}>{row.stock}</span><span className="text-sm text-amber-700">{row.reserved}</span><Input type="number" min="0" value={inventoryDraftStocks[key] ?? String(row.stock)} onChange={event => setInventoryDraftStocks(current => ({ ...current, [key]: event.target.value }))} className="h-9" /></div>})}{inventoryRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Chưa có hàng vật lý hoặc biến thể để quản lý tồn kho.</p>}</div></div></section>
          </TabsContent>

          <TabsContent value="variants" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-display text-2xl font-black uppercase text-slate-900">Biến thể hàng vật lý</h2>
                <p className="mt-1 text-xs text-slate-500">Chọn sản phẩm để quản lý kích thước, màu sắc, mã SKU và tồn kho từng phiên bản.</p>
              </div>
              <div className="space-y-4 p-5">
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={selectedVariantProductId || 0} onChange={event => { setSelectedVariantProductId(Number(event.target.value) || null); setEditingVariantId(null); setVariantDraft(emptyVariant); }}>
                  <option value={0}>Chọn sản phẩm vật lý</option>
                  {products.filter(product => product.type === "physical").map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                {!selectedVariantProductId ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Hãy tạo hoặc chọn một sản phẩm thuộc danh mục hàng vật lý trước.</div> : <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{variants.map(variant => <div key={variant.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{[variant.size && `Size: ${variant.size}`, variant.color && `Màu: ${variant.color}`, ...(variant.attributes || "").split(/\n|;/).map(item => item.trim()).filter(Boolean)].filter(Boolean).join(" · ") || "Biến thể chưa đặt tên"}</p><p className="mt-1 text-xs text-slate-500">SKU: {variant.sku || "—"} · Tồn: {variant.stock} · Điều chỉnh: {formatCurrency(variant.priceAdjustment)}</p></div><div className="flex items-center gap-2"><Badge className={variant.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{variant.isActive ? "Đang bán" : "Đang ẩn"}</Badge><Button size="sm" variant="outline" onClick={() => { setEditingVariantId(variant.id); setVariantDraft({ size: variant.size || "", color: variant.color || "", attributes: variant.attributes || "", sku: variant.sku || "", image: variant.image || "", priceAdjustment: variant.priceAdjustment, costPrice: variant.costPrice, stock: String(variant.stock), isActive: variant.isActive }); }}><Pencil className="h-3.5 w-3.5" /></Button></div></div>)}{variants.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Chưa có biến thể. Thêm size, màu hoặc kiểu đầu tiên ở biểu mẫu bên phải.</div>}</div>}
              </div>
            </section>
            <form onSubmit={handleVariantSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><div><h2 className="font-display text-2xl font-black uppercase text-slate-900">{editingVariantId ? "Sửa biến thể" : "Thêm biến thể"}</h2><p className="mt-1 text-xs text-slate-500">Mỗi biến thể có tồn kho riêng.</p></div>{editingVariantId && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingVariantId(null); setVariantDraft(emptyVariant); }}>Tạo mới</Button>}</div>
              <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/70 p-4"><div><p className="text-xs font-black uppercase tracking-wide text-violet-900">Tạo tổ hợp nhanh</p><p className="mt-1 text-[11px] leading-relaxed text-violet-800">Mỗi dòng là một nhóm. Ví dụ: <strong>Màu sắc: Đỏ, Xanh</strong> hoặc <strong>Kiểu: Sân nhà, Sân khách</strong>. Lưu nhóm trước, rồi hệ thống sẽ tạo mọi tổ hợp cùng SKU và tồn kho mặc định.</p></div><Textarea value={optionGroupsDraft} onChange={event => setOptionGroupsDraft(event.target.value)} placeholder={"Màu sắc: Đỏ, Xanh\nKiểu: Sân nhà, Sân khách\nKích thước: M, L"} disabled={!selectedVariantProductId} /><div className="grid grid-cols-3 gap-2"><Input value={combinationDefaults.skuPrefix} onChange={event => setCombinationDefaults(current => ({ ...current, skuPrefix: event.target.value }))} placeholder="Tiền tố SKU" disabled={!selectedVariantProductId} /><Input type="number" min="0" value={combinationDefaults.stock} onChange={event => setCombinationDefaults(current => ({ ...current, stock: event.target.value }))} placeholder="Tồn mỗi SKU" disabled={!selectedVariantProductId} /><Input type="number" value={combinationDefaults.priceAdjustment} onChange={event => setCombinationDefaults(current => ({ ...current, priceAdjustment: event.target.value }))} placeholder="Chênh giá" disabled={!selectedVariantProductId} /></div><div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={!selectedVariantProductId || saveProductOptionGroups.isPending} onClick={() => { const groups = optionGroupsDraft.split("\n").map(line => { const [name, ...values] = line.split(":"); return { name: name.trim(), values: values.join(":").split(",").map(value => value.trim()).filter(Boolean) }; }).filter(group => group.name && group.values.length); if (!groups.length) return toast.error("Hãy nhập ít nhất một nhóm, ví dụ: Màu sắc: Đỏ, Xanh"); saveProductOptionGroups.mutate({ productId: selectedVariantProductId!, groups }); }}>Lưu nhóm lựa chọn</Button><Button type="button" disabled={!selectedVariantProductId || generateProductVariantCombinations.isPending} onClick={() => generateProductVariantCombinations.mutate({ productId: selectedVariantProductId!, skuPrefix: combinationDefaults.skuPrefix || undefined, stock: Number(combinationDefaults.stock || 0), priceAdjustment: Number(combinationDefaults.priceAdjustment || 0) })} className="bg-violet-600 text-white hover:bg-violet-700">Tạo tổ hợp biến thể</Button></div></div>
              <Input value={variantDraft.size} onChange={event => setVariantDraft(prev => ({ ...prev, size: event.target.value }))} placeholder="Kích thước, ví dụ: L" disabled={!selectedVariantProductId} />
              <Input value={variantDraft.color} onChange={event => setVariantDraft(prev => ({ ...prev, color: event.target.value }))} placeholder="Màu sắc, ví dụ: Đỏ" disabled={!selectedVariantProductId} />
              <Textarea value={variantDraft.attributes} onChange={event => setVariantDraft(prev => ({ ...prev, attributes: event.target.value }))} placeholder={"Lựa chọn bổ sung, mỗi dòng một mục\nVí dụ: Kiểu: Sân khách\nChất liệu: Thun lạnh"} disabled={!selectedVariantProductId} />
              <Input value={variantDraft.sku} onChange={event => setVariantDraft(prev => ({ ...prev, sku: event.target.value }))} placeholder="Mã SKU (tùy chọn)" disabled={!selectedVariantProductId} />
              <Input value={variantDraft.image} onChange={event => setVariantDraft(prev => ({ ...prev, image: event.target.value }))} placeholder="URL ảnh riêng của biến thể (tùy chọn)" disabled={!selectedVariantProductId} />
              <div className="grid grid-cols-3 gap-3"><Input type="number" value={variantDraft.priceAdjustment} onChange={event => setVariantDraft(prev => ({ ...prev, priceAdjustment: event.target.value }))} placeholder="Chênh giá" disabled={!selectedVariantProductId} /><Input type="number" min="0" value={variantDraft.costPrice} onChange={event => setVariantDraft(prev => ({ ...prev, costPrice: event.target.value }))} placeholder="Giá vốn" disabled={!selectedVariantProductId} /><Input type="number" min="0" value={variantDraft.stock} onChange={event => setVariantDraft(prev => ({ ...prev, stock: event.target.value }))} placeholder="Tồn kho" disabled={!selectedVariantProductId} /><Input type="number" min="0" value={variantDraft.weightGrams ?? ""} onChange={event => setVariantDraft(prev => ({ ...prev, weightGrams: event.target.value }))} placeholder="Khối lượng g" disabled={!selectedVariantProductId} /></div>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><input type="checkbox" checked={variantDraft.isActive} onChange={event => setVariantDraft(prev => ({ ...prev, isActive: event.target.checked }))} disabled={!selectedVariantProductId} />Đang bán</label>
              <Button type="submit" disabled={!selectedVariantProductId || createVariant.isPending || updateVariant.isPending} className="w-full bg-violet-600 font-black text-white hover:bg-violet-500"><Check className="mr-2 h-4 w-4" />{editingVariantId ? "Lưu biến thể" : "Thêm biến thể"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="categories" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-display text-2xl font-black uppercase text-slate-900">Danh mục hiện có</h2><p className="mt-1 text-xs text-slate-500">Mỗi danh mục có icon riêng, dùng đồng bộ ở cửa hàng.</p></div><div className="divide-y divide-slate-100">{categories.map(category => { const Icon = getCategoryIcon(category.iconKey); return <div key={category.id} className="flex items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-sm font-bold text-slate-900">{category.name}</p><p className="mt-1 truncate text-xs text-slate-500">{category.description || "Chưa có mô tả"}</p></div></div><div className="flex items-center gap-2"><Badge className={category.isActive === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}>{category.isActive === false ? "Ẩn" : "Hiện"}</Badge><Button size="sm" variant="outline" onClick={() => { setEditingCategoryId(category.id); setCategoryDraft({ name: category.name, slug: category.slug, description: category.description || "", iconKey: category.iconKey || "Package", isActive: category.isActive !== false }); }}><Pencil className="h-3.5 w-3.5" /></Button></div></div>; })}</div></div>
            <form onSubmit={handleCategorySubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-black uppercase text-slate-900">{editingCategoryId ? "Sửa danh mục" : "Thêm danh mục"}</h2>{editingCategoryId && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingCategoryId(null); setCategoryDraft(emptyCategory); }}>Tạo mới</Button>}</div><Input value={categoryDraft.name} onChange={event => setCategoryDraft(prev => ({ ...prev, name: event.target.value, slug: prev.slug || slugify(event.target.value) }))} placeholder="Tên danh mục" required /><Input value={categoryDraft.slug} onChange={event => setCategoryDraft(prev => ({ ...prev, slug: slugify(event.target.value) }))} placeholder="slug-danh-muc" required /><Textarea value={categoryDraft.description} onChange={event => setCategoryDraft(prev => ({ ...prev, description: event.target.value }))} placeholder="Mô tả ngắn" /><div><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Chọn icon danh mục</p><div className="grid max-h-60 grid-cols-5 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">{CATEGORY_ICON_OPTIONS.map(option => <button type="button" key={option.key} onClick={() => setCategoryDraft(prev => ({ ...prev, iconKey: option.key }))} title={option.label} className={`grid aspect-square place-items-center rounded-lg border transition ${categoryDraft.iconKey === option.key ? "border-amber-500 bg-amber-400 text-slate-950 shadow-sm" : "border-transparent bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700"}`}><option.Icon className="h-4 w-4" /><span className="sr-only">{option.label}</span></button>)}</div><p className="mt-2 text-[11px] text-slate-500">Đã chọn: <strong>{CATEGORY_ICON_OPTIONS.find(option => option.key === categoryDraft.iconKey)?.label || "Gói hàng"}</strong> · có 51 icon để dùng cho danh mục hiện tại hoặc danh mục mới.</p></div><label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><input type="checkbox" checked={categoryDraft.isActive} onChange={event => setCategoryDraft(prev => ({ ...prev, isActive: event.target.checked }))} />Hiển thị danh mục công khai</label><Button type="submit" className="w-full bg-amber-500 font-black text-slate-950 hover:bg-amber-400">{editingCategoryId ? "Lưu danh mục" : "Tạo danh mục"}</Button></form>
          </TabsContent>

          <TabsContent value="media" className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-2xl font-black uppercase text-slate-900">Thư viện tệp</h2><p className="mt-1 text-xs text-slate-500">Ảnh, video, PDF và ZIP đã tải vào kho S3 của website. Mỗi tệp tối đa 20 MB.</p></div><Button onClick={() => selectFile("file")} className="bg-violet-600 font-bold text-white hover:bg-violet-500"><Plus className="mr-2 h-4 w-4" />Tải tệp mới</Button></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{media.map(asset => <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><FileArchive className="h-5 w-5" /></div><Badge variant="outline" className="max-w-[11rem] truncate text-[10px]">{asset.mimeType}</Badge></div><p className="mt-4 truncate text-sm font-bold text-slate-900">{asset.fileName}</p><p className="mt-1 text-xs text-slate-500">{formatBytes(asset.sizeBytes)}</p><div className="mt-4 flex gap-2"><a href={asset.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-bold text-violet-700 hover:text-violet-900"><Link2 className="mr-1 h-3.5 w-3.5" />Mở tệp</a><button type="button" onClick={() => setProductDraft(prev => ({ ...prev, fileUrl: asset.url, fileSize: formatBytes(asset.sizeBytes) }))} className="text-xs font-bold text-amber-700 hover:text-amber-900">Dùng làm file tải</button></div></div>)}{media.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Chưa có tệp. Hãy tải ảnh hoặc tài nguyên đầu tiên.</div>}</div></TabsContent>

          <TabsContent value="orders" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><h2 className="font-display text-2xl font-black uppercase text-slate-900">Đơn hàng</h2><p className="mt-1 text-xs text-slate-500">Đơn hàng vật lý dùng QR Techcombank không cú pháp và cần xác nhận tiền về thủ công. Đơn digital dùng VietinBank SePay để tự đối soát và mở tải ngay.</p></div>
            <div className="m-5 grid gap-5 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 lg:grid-cols-[minmax(0,1fr)_13rem]"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">Rút số dư · Chuyển khoản thủ công</p><h3 className="mt-1 text-lg font-black text-slate-900">Mã QR để khách chuyển tiền nhận lại</h3><p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600">Bạn tự kiểm tra và chuyển khoản cho khách. Tải mã QR tài khoản nhận tiền tại đây; ảnh mới sẽ thay ảnh cũ trên khu vực rút tiền của khách.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" onClick={() => withdrawalQrUploadRef.current?.click()} disabled={uploadWithdrawalQr.isPending} className="bg-rose-600 font-black text-white hover:bg-rose-700"><CloudUpload className="mr-2 h-4 w-4" />{uploadWithdrawalQr.isPending ? "Đang tải lên…" : "Tải/cập nhật mã QR"}</Button>{siteSettingsQuery.data?.withdrawal_qr_url && <a href={siteSettingsQuery.data.withdrawal_qr_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 hover:bg-rose-100">Mở ảnh QR</a>}</div><p className="mt-3 text-[11px] text-slate-500">Định dạng PNG, JPEG hoặc WebP · tối đa 5 MB.</p></div><div className="flex min-h-44 items-center justify-center rounded-xl border border-rose-200 bg-white p-3">{siteSettingsQuery.data?.withdrawal_qr_url ? <img src={siteSettingsQuery.data.withdrawal_qr_url} alt="Mã QR nhận tiền rút số dư" className="max-h-44 w-full object-contain" /> : <div className="text-center text-xs text-slate-400"><Image className="mx-auto mb-2 h-8 w-8" />Chưa tải mã QR</div>}</div></div>
            <div className="divide-y divide-slate-100">{orders.map(order => {
              const savedStage = order.trackingStage || "ordered";
              const trackingStage = orderTrackingStageDrafts[order.id] || savedStage;
              const trackingUrl = orderTrackingDrafts[order.id] ?? order.trackingUrl ?? "";
              const stageIndex = ["ordered", "central_warehouse", "ready_hanoi", "tracking"].indexOf(savedStage);
              const steps = [["ordered", "Đã đặt"], ["central_warehouse", "Về kho trung"], ["ready_hanoi", "Sẵn sàng gửi Hà Nội"], ["tracking", "Link theo dõi"]] as const;
              const shippingWeightGrams = Number(order.shippingWeightGrams || 0);
              const physicalShippingSummary = shippingWeightGrams > 0 || order.shippingMethod === "spx"
                ? ` · SPX · ${shippingWeightGrams.toLocaleString("vi-VN")} g · Phí ${formatCurrency(order.shippingFee || 0)}`
                : ` · Phí giao đã chốt ${formatCurrency(order.shippingFee || 0)} (đơn cũ)`;
              return <div key={order.id} className="space-y-4 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900">#{order.orderCode} · {formatCurrency(order.totalAmount)}</p><Badge className={order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>{order.paymentStatus === "paid" ? "Đã thanh toán" : order.hasPhysicalItems ? "Chờ tiền về Techcombank" : "Chờ SePay đối soát"}</Badge>{order.hasPreorderItems && <Badge className="bg-rose-100 text-rose-700">Order trước · {order.preorderEstimatedDays || "7–10 ngày"} · giảm {formatCurrency(order.preorderDiscountAmount || 0)}</Badge>}</div><p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("vi-VN")} · {order.items?.length || 0} sản phẩm{order.hasPhysicalItems ? physicalShippingSummary : ""}</p></div><div className="flex flex-wrap items-center gap-2">{order.hasPhysicalItems && order.paymentStatus === "pending" && <Button size="sm" onClick={() => confirmManualPayment.mutate({ orderId: order.id })} disabled={confirmManualPayment.isPending} className="bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700"><Check className="mr-1 h-3.5 w-3.5" />Xác nhận tiền về</Button>}<select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs" value={order.status} onChange={event => updateOrderStatus.mutate({ orderId: order.id, status: event.target.value as "pending" | "processing" | "shipping" | "completed" | "cancelled" })}><option value="pending">Chờ xử lý</option><option value="processing">Đang xử lý</option><option value="shipping">Đang giao hàng</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select><Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => { if (window.confirm(`Xóa đơn #${order.orderCode}? Đơn chưa thanh toán sẽ được hoàn tồn kho.`)) deleteOrder.mutate({ orderId: order.id }); }} disabled={deleteOrder.isPending}><Trash2 className="mr-1 h-3.5 w-3.5" />Xóa</Button></div></div>
              {order.hasPhysicalItems && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{(order.hasPreorderItems ? steps : steps.slice(3)).map(([stage, label], index) => { const orderStepIndex = order.hasPreorderItems ? index : 3; return <Badge key={stage} className={stageIndex >= orderStepIndex ? "bg-violet-100 text-violet-800" : "bg-slate-200 text-slate-500"}>{stageIndex >= orderStepIndex && <Check className="mr-1 h-3 w-3" />}{label}</Badge>; })}</div><p className="text-xs text-slate-500">Khách chỉ thấy mốc chủ cửa hàng đã lưu.</p></div><div className="mt-3 grid gap-2 lg:grid-cols-[12rem_minmax(0,1fr)_auto]"><select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs" value={trackingStage} onChange={event => setOrderTrackingStageDrafts(current => ({ ...current, [order.id]: event.target.value as "ordered" | "central_warehouse" | "ready_hanoi" | "tracking" }))}><option value="ordered">Đã đặt</option>{order.hasPreorderItems && <><option value="central_warehouse">Hàng đã về kho trung</option><option value="ready_hanoi">Hàng đã ở Hà Nội</option></>}<option value="tracking">Đã có link theo dõi</option></select><Input value={trackingUrl} onChange={event => setOrderTrackingDrafts(current => ({ ...current, [order.id]: event.target.value }))} placeholder="Dán link theo dõi vận chuyển" /><Button type="button" size="sm" className="bg-violet-600 text-white hover:bg-violet-700" disabled={updateOrderTracking.isPending} onClick={() => updateOrderTracking.mutate({ orderId: order.id, stage: trackingStage, trackingUrl: trackingUrl.trim() || undefined })}>Lưu mốc</Button></div>{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-violet-700 hover:text-violet-900"><Link2 className="mr-1 h-3.5 w-3.5" />Mở link theo dõi hiện tại</a>}</div>}</div>;
            })}{orders.length === 0 && <div className="p-12 text-center text-sm text-slate-500">Chưa có đơn hàng.</div>}</div>
          </TabsContent>

          <TabsContent value="users" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-display text-2xl font-black uppercase text-slate-900">Tài khoản khách hàng</h2><p className="mt-1 text-xs text-slate-500">Sau khi khách tạo tài khoản, bạn có thể cấp quyền quản trị tại đây.</p></div><div className="divide-y divide-slate-100">{users.map(account => <div key={account.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Users className="h-4 w-4" /></div><div><p className="text-sm font-bold text-slate-900">{account.name || account.username || "Chưa đặt tên"}</p><p className="text-xs text-slate-500">{account.username ? `@${account.username} · ` : ""}{account.email || account.openId}</p></div></div><div className="flex flex-wrap items-center gap-2"><Badge className={account.role === "admin" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}>{account.role === "admin" ? "Quản trị" : "Khách hàng"}</Badge><Badge className={account.status === "blocked" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>{account.status === "blocked" ? "Đã khóa" : "Hoạt động"}</Badge>{account.role !== "admin" && <Button size="sm" variant="outline" onClick={() => updateUserStatus.mutate({ userId: account.id, status: account.status === "blocked" ? "active" : "blocked" })}>{account.status === "blocked" ? <Check className="mr-1 h-3.5 w-3.5" /> : <CircleOff className="mr-1 h-3.5 w-3.5" />}{account.status === "blocked" ? "Mở khóa" : "Khóa"}</Button>}{account.id !== user?.id && <Button size="sm" variant="outline" onClick={() => updateUserRole.mutate({ userId: account.id, role: account.role === "admin" ? "user" : "admin" })} disabled={updateUserRole.isPending}>{account.role === "admin" ? "Gỡ quản trị" : "Cấp quản trị"}</Button>}</div></div>)}</div></TabsContent>
        </Tabs>
      </div>
    </StoreLayout>
  );
}
