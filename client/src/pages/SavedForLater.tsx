import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, BellRing, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (value: string | number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);

export default function SavedForLater() {
  const { isAuthenticated } = useAuth();
  const favoritesQuery = trpc.store.favorites.useQuery(undefined, { enabled: isAuthenticated });
  const productsQuery = trpc.store.products.useQuery(undefined, { enabled: isAuthenticated });
  const restockQuery = trpc.store.restockSubscriptions.useQuery(undefined, { enabled: isAuthenticated });
  const toggleFavoriteMutation = trpc.store.toggleFavorite.useMutation({
    onSuccess: () => { void favoritesQuery.refetch(); toast.success("Đã cập nhật danh sách lưu mua sau."); },
    onError: error => toast.error(error.message),
  });
  const cancelRestockMutation = trpc.store.cancelRestock.useMutation({
    onSuccess: () => { void restockQuery.refetch(); toast.success("Đã hủy nhắc khi có hàng."); },
    onError: error => toast.error(error.message),
  });

  if (!isAuthenticated) {
    return <StoreLayout><main className="mx-auto max-w-xl px-4 py-20 text-center"><Heart className="mx-auto h-12 w-12 text-rose-400" /><h1 className="mt-5 text-2xl font-black text-slate-900">Sản phẩm đã lưu</h1><p className="mt-2 text-sm text-slate-600">Đăng nhập để xem danh sách sản phẩm bạn muốn mua sau.</p><Button className="mt-6 bg-[#ee4d2d] font-black text-white" onClick={startLogin}>Đăng nhập để xem</Button></main></StoreLayout>;
  }

  if (favoritesQuery.isLoading || productsQuery.isLoading) {
    return <StoreLayout><main className="grid min-h-[50vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#ee4d2d]" /></main></StoreLayout>;
  }

  const favoriteIds = new Set((favoritesQuery.data || []).map(item => item.productId));
  const products = (productsQuery.data || []).filter(product => favoriteIds.has(product.id));
  const restockItems = (restockQuery.data || []).filter(item => item.status !== "cancelled");

  return <StoreLayout>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ee4d2d]">DHL Stores · Tài khoản</p><h1 className="mt-2 text-3xl font-black text-slate-950">Lưu để mua sau</h1><p className="mt-2 text-sm text-slate-600">Danh sách sản phẩm bạn đã đánh dấu yêu thích để quay lại mua nhanh.</p></div><Link href="/products" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:border-orange-300 hover:text-[#ee4d2d]">Tiếp tục mua sắm <ArrowRight className="h-4 w-4" /></Link></div>
      <section className="mt-7"><div className="mb-3 flex items-center gap-2"><Heart className="h-5 w-5 fill-rose-500 text-rose-500" /><h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Đã lưu · {products.length} sản phẩm</h2></div>{products.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Heart className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Bạn chưa lưu sản phẩm nào.</p><Link href="/products" className="mt-4 inline-flex rounded-lg bg-[#ee4d2d] px-4 py-2 text-xs font-black text-white">Khám phá sản phẩm</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><Link href={`/products/${product.slug}`} className="block"><div className="aspect-[4/3] bg-slate-100"><img src={product.image} alt={product.name} className="h-full w-full object-contain" /></div><div className="p-4"><h3 className="line-clamp-2 text-sm font-black text-slate-900">{product.name}</h3><p className="mt-2 text-base font-black text-[#ee4d2d]">{formatCurrency(product.price)}</p></div></Link><div className="flex gap-2 px-4 pb-4"><Link href={`/products/${product.slug}`} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#ee4d2d] px-3 py-2.5 text-xs font-black text-white"><ShoppingBag className="h-3.5 w-3.5" />Mua ngay</Link><Button type="button" variant="outline" aria-label="Bỏ lưu sản phẩm" className="border-rose-200 text-rose-700" disabled={toggleFavoriteMutation.isPending} onClick={() => toggleFavoriteMutation.mutate({ productId: product.id })}><Heart className="h-4 w-4 fill-current" /></Button></div></article>)}</div>}</section>
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5"><div className="flex items-center gap-2"><BellRing className="h-5 w-5 text-amber-700" /><h2 className="text-sm font-black uppercase tracking-wide text-amber-900">Đang chờ báo khi có hàng</h2></div>{restockItems.length === 0 ? <p className="mt-2 text-xs text-amber-800">Bạn chưa đăng ký nhắc hàng cho sản phẩm nào hết hàng.</p> : <div className="mt-3 space-y-2">{restockItems.map(item => <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"><span className="font-black text-slate-900">Sản phẩm #{item.productId}</span><span className="text-slate-500">{item.status === "ready" ? "Đã có hàng" : "Đang chờ cập nhật"}</span>{item.status === "ready" && <Link href="/products" className="ml-auto font-black text-emerald-700">Mua ngay</Link>}{item.status === "active" && <Button type="button" variant="outline" size="sm" className="ml-auto h-7 text-[10px] font-black" onClick={() => cancelRestockMutation.mutate({ id: item.id })}>Hủy nhắc</Button>}</div>)}</div>}</section>
    </main>
  </StoreLayout>;
}
