import { ChangeEvent, FormEvent, useRef, useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Check, ChevronLeft, CircleOff, CloudUpload, DollarSign, FileArchive, Image, Link2, Package, Pencil, Plus, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

type CategoryDraft = { name: string; slug: string; description: string; isActive: boolean };
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
  featured: boolean;
  isActive: boolean;
};

const emptyCategory: CategoryDraft = { name: "", slug: "", description: "", isActive: true };
const emptyProduct: ProductDraft = {
  name: "", slug: "", description: "", price: "", categoryId: 0, image: "generated:catalog-cover", fileUrl: "", fileSize: "", specs: "", featured: false, isActive: true,
};

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
  const utils = trpc.useUtils();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategory);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<"image" | "file" | null>(null);

  const isAdmin = isAuthenticated && user?.role === "admin";
  const categoriesQuery = trpc.catalogAdmin.categories.useQuery(undefined, { enabled: isAdmin });
  const productsQuery = trpc.catalogAdmin.products.useQuery(undefined, { enabled: isAdmin });
  const mediaQuery = trpc.catalogAdmin.media.useQuery(undefined, { enabled: isAdmin });
  const ordersQuery = trpc.store.orders.useQuery(undefined, { enabled: isAdmin });
  const usersQuery = trpc.store.usersList.useQuery(undefined, { enabled: isAdmin });
  const categories = categoriesQuery.data || [];
  const products = productsQuery.data || [];
  const media = mediaQuery.data || [];
  const orders = ordersQuery.data || [];
  const users = usersQuery.data || [];

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
  const updateUserStatus = trpc.store.updateUserStatus.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật tài khoản");
      utils.store.usersList.invalidate();
    },
    onError: error => toast.error(error.message),
  });

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
    };
    if (!data.slug) return toast.error("Hãy nhập tên sản phẩm hợp lệ");
    if (editingProductId) updateProduct.mutate({ productId: editingProductId, data });
    else createProduct.mutate(data);
  };

  if (!isAdmin) {
    return <StoreLayout><div className="mx-auto max-w-3xl px-4 py-24 text-center"><ShieldCheck className="mx-auto mb-4 h-14 w-14 text-rose-500" /><h1 className="font-display text-4xl font-black uppercase text-slate-900">Khu vực quản trị</h1><p className="mt-2 text-sm text-slate-500">Bạn cần đăng nhập bằng tài khoản quản trị để tiếp tục.</p><Link href="/"><Button className="mt-6 bg-amber-500 font-bold text-slate-950">Về trang chủ</Button></Link></div></StoreLayout>;
  }

  const totalRevenue = orders.filter(order => order.paymentStatus === "paid").reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const selectedCategoryName = (categoryId: number) => categories.find(category => category.id === categoryId)?.name || "Chưa phân loại";

  return (
    <StoreLayout>
      <input ref={uploadRef} type="file" className="hidden" accept={uploadTarget === "image" ? "image/png,image/jpeg,image/webp,image/gif" : "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,application/pdf,application/zip,.zip"} onChange={handleFileChange} />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-[#0b1220] p-6 text-white shadow-xl sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">DHL Stores · Control Room</p>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="font-display text-4xl font-black uppercase sm:text-5xl">Quản trị cửa hàng</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Tạo danh mục, thêm sản phẩm, tải ảnh hoặc tệp, cập nhật giá và bật/tắt hiển thị mà không cần sửa mã nguồn.</p></div><Link href="/products"><Button variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15">Xem cửa hàng <ChevronLeft className="ml-1 h-4 w-4 rotate-180" /></Button></Link></div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[{ label: "Doanh thu đã thanh toán", value: formatCurrency(totalRevenue), icon: DollarSign, tone: "text-emerald-600 bg-emerald-100" }, { label: "Sản phẩm", value: products.length, icon: Package, tone: "text-blue-600 bg-blue-100" }, { label: "Danh mục", value: categories.length, icon: Archive, tone: "text-violet-600 bg-violet-100" }, { label: "Tệp đã tải", value: media.length, icon: FileArchive, tone: "text-amber-600 bg-amber-100" }].map(card => <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="h-5 w-5" /></div><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{card.label}</p><p className="mt-1 text-xl font-black text-slate-900">{card.value}</p></div></div>)}
        </section>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="products" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Sản phẩm</TabsTrigger>
            <TabsTrigger value="categories" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Danh mục</TabsTrigger>
            <TabsTrigger value="media" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Thư viện tệp</TabsTrigger>
            <TabsTrigger value="orders" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Đơn hàng</TabsTrigger>
            <TabsTrigger value="users" className="shrink-0 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">Tài khoản</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-display text-2xl font-black uppercase text-slate-900">Danh sách sản phẩm</h2><p className="mt-1 text-xs text-slate-500">Chọn sửa để chỉnh giá, ảnh, file hoặc trạng thái hiển thị.</p></div><Badge variant="outline">{products.length} mục</Badge></div><div className="divide-y divide-slate-100">{products.map(product => <div key={product.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-violet-600 text-xs font-black text-white">{product.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{product.name}</p><p className="mt-0.5 text-xs text-slate-500">{selectedCategoryName(product.categoryId)} · {formatCurrency(product.price)}</p></div></div><div className="flex items-center justify-between gap-2 sm:justify-end"><Badge className={product.isActive === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}>{product.isActive === false ? "Đang ẩn" : "Đang hiển thị"}</Badge><Button size="sm" variant="outline" onClick={() => { setEditingProductId(product.id); setProductDraft({ name: product.name, slug: product.slug, description: product.description || "", price: product.price, categoryId: product.categoryId, image: product.image, fileUrl: product.fileUrl || "", fileSize: product.fileSize || "", specs: product.specs || "", featured: product.featured, isActive: product.isActive !== false }); }}><Pencil className="mr-1 h-3.5 w-3.5" />Sửa</Button></div></div>)}{products.length === 0 && <div className="p-12 text-center text-sm text-slate-500">Chưa có sản phẩm. Hãy tạo sản phẩm đầu tiên ở biểu mẫu bên phải.</div>}</div></div>
              <form onSubmit={handleProductSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-display text-2xl font-black uppercase text-slate-900">{editingProductId ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2><p className="mt-1 text-xs text-slate-500">Ảnh và file được lưu trong kho của website.</p></div>{editingProductId && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingProductId(null); setProductDraft({ ...emptyProduct, categoryId: categories[0]?.id || 0 }); }}>Tạo mới</Button>}</div>
                <Input value={productDraft.name} onChange={event => setProductDraft(prev => ({ ...prev, name: event.target.value, slug: prev.slug || slugify(event.target.value) }))} placeholder="Tên sản phẩm" required />
                <Input value={productDraft.slug} onChange={event => setProductDraft(prev => ({ ...prev, slug: slugify(event.target.value) }))} placeholder="slug-san-pham" required />
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={productDraft.categoryId} onChange={event => setProductDraft(prev => ({ ...prev, categoryId: Number(event.target.value) }))} required><option value={0}>Chọn danh mục</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                <Input type="number" min="0" value={productDraft.price} onChange={event => setProductDraft(prev => ({ ...prev, price: event.target.value }))} placeholder="Giá bán (VND)" required />
                <Textarea value={productDraft.description} onChange={event => setProductDraft(prev => ({ ...prev, description: event.target.value }))} placeholder="Mô tả sản phẩm" />
                <Textarea value={productDraft.specs} onChange={event => setProductDraft(prev => ({ ...prev, specs: event.target.value }))} placeholder="Thông số / định dạng tệp" />
                <div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={() => selectFile("image")} disabled={uploadMedia.isPending}><Image className="mr-2 h-4 w-4" />{productDraft.image.startsWith("/manus-storage/") ? "Đổi ảnh" : "Tải ảnh"}</Button><Button type="button" variant="outline" onClick={() => selectFile("file")} disabled={uploadMedia.isPending}><CloudUpload className="mr-2 h-4 w-4" />{productDraft.fileUrl ? "Đổi file" : "Tải file"}</Button></div>
                <div className="space-y-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-3"><div><p className="text-xs font-black uppercase tracking-wide text-violet-800">Liên kết tải xuống</p><p className="mt-1 text-[11px] leading-relaxed text-slate-600">Bạn có thể thay link mới bất cứ lúc nào. Khách đã thanh toán sẽ nhận liên kết mới sau khi bạn bấm lưu.</p></div><Input value={productDraft.image} onChange={event => setProductDraft(prev => ({ ...prev, image: event.target.value }))} placeholder="URL ảnh đại diện" /><Input value={productDraft.fileUrl} onChange={event => setProductDraft(prev => ({ ...prev, fileUrl: event.target.value }))} placeholder="Dán hoặc thay URL tệp tải xuống tại đây" aria-label="Liên kết tải xuống của sản phẩm" /></div>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs"><label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={productDraft.featured} onChange={event => setProductDraft(prev => ({ ...prev, featured: event.target.checked }))} />Nổi bật</label><label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={productDraft.isActive} onChange={event => setProductDraft(prev => ({ ...prev, isActive: event.target.checked }))} />Hiển thị công khai</label></div>
                <Button type="submit" className="w-full bg-amber-500 font-black text-slate-950 hover:bg-amber-400" disabled={createProduct.isPending || updateProduct.isPending}><Check className="mr-2 h-4 w-4" />{editingProductId ? "Lưu thay đổi & cập nhật link tải" : "Tạo sản phẩm"}</Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-display text-2xl font-black uppercase text-slate-900">Danh mục hiện có</h2></div><div className="divide-y divide-slate-100">{categories.map(category => <div key={category.id} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-bold text-slate-900">{category.name}</p><p className="mt-1 text-xs text-slate-500">{category.description || "Chưa có mô tả"}</p></div><div className="flex items-center gap-2"><Badge className={category.isActive === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}>{category.isActive === false ? "Ẩn" : "Hiện"}</Badge><Button size="sm" variant="outline" onClick={() => { setEditingCategoryId(category.id); setCategoryDraft({ name: category.name, slug: category.slug, description: category.description || "", isActive: category.isActive !== false }); }}><Pencil className="h-3.5 w-3.5" /></Button></div></div>)}</div></div><form onSubmit={handleCategorySubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-black uppercase text-slate-900">{editingCategoryId ? "Sửa danh mục" : "Thêm danh mục"}</h2>{editingCategoryId && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingCategoryId(null); setCategoryDraft(emptyCategory); }}>Tạo mới</Button>}</div><Input value={categoryDraft.name} onChange={event => setCategoryDraft(prev => ({ ...prev, name: event.target.value, slug: prev.slug || slugify(event.target.value) }))} placeholder="Tên danh mục" required /><Input value={categoryDraft.slug} onChange={event => setCategoryDraft(prev => ({ ...prev, slug: slugify(event.target.value) }))} placeholder="slug-danh-muc" required /><Textarea value={categoryDraft.description} onChange={event => setCategoryDraft(prev => ({ ...prev, description: event.target.value }))} placeholder="Mô tả ngắn" /><label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><input type="checkbox" checked={categoryDraft.isActive} onChange={event => setCategoryDraft(prev => ({ ...prev, isActive: event.target.checked }))} />Hiển thị danh mục công khai</label><Button type="submit" className="w-full bg-amber-500 font-black text-slate-950 hover:bg-amber-400">{editingCategoryId ? "Lưu danh mục" : "Tạo danh mục"}</Button></form></TabsContent>

          <TabsContent value="media" className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-2xl font-black uppercase text-slate-900">Thư viện tệp</h2><p className="mt-1 text-xs text-slate-500">Ảnh, video, PDF và ZIP đã tải vào kho S3 của website. Mỗi tệp tối đa 20 MB.</p></div><Button onClick={() => selectFile("file")} className="bg-violet-600 font-bold text-white hover:bg-violet-500"><Plus className="mr-2 h-4 w-4" />Tải tệp mới</Button></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{media.map(asset => <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><FileArchive className="h-5 w-5" /></div><Badge variant="outline" className="max-w-[11rem] truncate text-[10px]">{asset.mimeType}</Badge></div><p className="mt-4 truncate text-sm font-bold text-slate-900">{asset.fileName}</p><p className="mt-1 text-xs text-slate-500">{formatBytes(asset.sizeBytes)}</p><div className="mt-4 flex gap-2"><a href={asset.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-bold text-violet-700 hover:text-violet-900"><Link2 className="mr-1 h-3.5 w-3.5" />Mở tệp</a><button type="button" onClick={() => setProductDraft(prev => ({ ...prev, fileUrl: asset.url, fileSize: formatBytes(asset.sizeBytes) }))} className="text-xs font-bold text-amber-700 hover:text-amber-900">Dùng làm file tải</button></div></div>)}{media.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Chưa có tệp. Hãy tải ảnh hoặc tài nguyên đầu tiên.</div>}</div></TabsContent>

          <TabsContent value="orders" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-display text-2xl font-black uppercase text-slate-900">Đơn hàng</h2></div><div className="divide-y divide-slate-100">{orders.map(order => <div key={order.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">#{order.orderCode} · {formatCurrency(order.totalAmount)}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("vi-VN")} · {order.items?.length || 0} sản phẩm</p></div><select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs" value={order.status} onChange={event => updateOrderStatus.mutate({ orderId: order.id, status: event.target.value as "pending" | "processing" | "shipping" | "completed" | "cancelled" })}><option value="pending">Chờ xử lý</option><option value="processing">Đang xử lý</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select></div>)}{orders.length === 0 && <div className="p-12 text-center text-sm text-slate-500">Chưa có đơn hàng.</div>}</div></TabsContent>

          <TabsContent value="users" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-display text-2xl font-black uppercase text-slate-900">Tài khoản khách hàng</h2></div><div className="divide-y divide-slate-100">{users.map(account => <div key={account.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Users className="h-4 w-4" /></div><div><p className="text-sm font-bold text-slate-900">{account.name || "Chưa đặt tên"}</p><p className="text-xs text-slate-500">{account.email || account.openId}</p></div></div><div className="flex items-center gap-2"><Badge className={account.status === "blocked" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>{account.status === "blocked" ? "Đã khóa" : "Hoạt động"}</Badge>{account.role !== "admin" && <Button size="sm" variant="outline" onClick={() => updateUserStatus.mutate({ userId: account.id, status: account.status === "blocked" ? "active" : "blocked" })}>{account.status === "blocked" ? <Check className="mr-1 h-3.5 w-3.5" /> : <CircleOff className="mr-1 h-3.5 w-3.5" />}{account.status === "blocked" ? "Mở khóa" : "Khóa"}</Button>}</div></div>)}</div></TabsContent>
        </Tabs>
      </div>
    </StoreLayout>
  );
}
