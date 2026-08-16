import { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Filter } from "lucide-react";

export default function Products() {
  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined;
  const initialType = searchParams.get("type");
  const isPhysicalCatalog = initialType === "physical";

  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");

  const categoriesQuery = trpc.store.categories.useQuery();
  const productsQuery = trpc.store.products.useQuery({
    categoryId: selectedCategory,
    search: searchQuery || undefined,
    type: isPhysicalCatalog ? "physical" : undefined,
  });

  const categories = (categoriesQuery.data || []).filter(category => !isPhysicalCatalog || category.type === "physical");
  let products = (productsQuery.data || []).filter(product => !isPhysicalCatalog || product.type === "physical");
  const isCatalogLoading = categoriesQuery.isLoading || productsQuery.isLoading;

  if (sortBy === "price-asc") {
    products = [...products].sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortBy === "price-desc") {
    products = [...products].sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortBy === "name") {
    products = [...products].sort((a, b) => a.name.localeCompare(b.name));
  }

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:px-8 2xl:px-10">
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">DHL Stores · {isPhysicalCatalog ? 'Shop hàng thể thao' : 'Resource Library'}</p><h1 className="mt-1 font-display text-3xl font-black uppercase leading-none text-slate-900 sm:text-4xl">{isPhysicalCatalog ? (lang === 'vi' ? 'Hàng thể thao' : 'Sports shop') : (lang === 'vi' ? 'Kho tài nguyên số' : 'Digital resource library')}</h1></div>
        <p className="hidden max-w-sm text-right text-xs leading-relaxed text-slate-500 md:block">{isPhysicalCatalog ? (lang === 'vi' ? 'Chọn nhanh áo bóng đá, patch tay và nameset. Kiểm tra SKU, tồn kho và phí SPX trước khi mua.' : 'Shop jerseys, patches and namesets with live SKU stock and SPX estimates.') : (lang === 'vi' ? 'Lọc font, vector, file in và mẫu thiết kế sẵn sàng sản xuất.' : 'Filter production-ready fonts, vectors, print files and templates.')}</p>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
        {/* Toolbar */}
        {isPhysicalCatalog && <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 sm:hidden"><span className="font-bold">Mua hàng vật lý dễ hơn</span><span className="text-right text-[11px]">SPX · QR Techcombank</span></div>}
        <div className={`bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl mb-8 space-y-4 shadow-sm ${isPhysicalCatalog ? 'sm:rounded-2xl' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl"
              />
            </div>

            <div className="md:col-span-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl">
                  <SelectValue placeholder={t.sortBy} />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="default">{t.defaultSort}</SelectItem>
                  <SelectItem value="price-asc">{t.priceAsc}</SelectItem>
                  <SelectItem value="price-desc">{t.priceDesc}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-bold mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> {t.allCategories}:
            </span>
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5 ${selectedCategory === undefined ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'}`}
            >
              {t.allCategories}
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5 ${selectedCategory === c.id ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {isCatalogLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="overflow-hidden border border-slate-200 bg-white"><div className="aspect-[4/3] animate-pulse bg-slate-200" /><div className="space-y-3 p-4"><div className="h-3 w-4/5 animate-pulse bg-slate-200" /><div className="h-3 w-full animate-pulse bg-slate-100" /><div className="h-4 w-1/3 animate-pulse bg-slate-200" /></div></div>)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Download className="w-16 h-16 mx-auto mb-3 text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">
              {lang === 'vi' ? 'Không tìm thấy tài nguyên phù hợp' : 'No resources found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'vi' ? 'Vui lòng thử lại với từ khóa hoặc danh mục khác.' : 'Please try another search or category.'}
            </p>
            <Button
              onClick={() => { setSelectedCategory(undefined); setSearchQuery(""); }}
              className="mt-5 bg-slate-900 text-white font-bold"
            >
              {lang === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
            </Button>
          </div>
        ) : (
          <div className={`grid gap-3 sm:gap-6 ${isPhysicalCatalog ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {products.map(p => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group">
                  <div className={`dhl-hover-card flex h-full flex-col overflow-hidden border border-slate-200 bg-white ${isPhysicalCatalog ? 'rounded-xl sm:rounded-none' : ''}`}>
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img src={p.image} alt={p.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    {isPhysicalCatalog && <span className="absolute bottom-2 left-2 rounded bg-white/95 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 shadow-sm">{Number(p.stock) > 0 ? `Còn ${p.stock}` : 'Hết hàng'}</span>}
                  </div>
                  <div className={`flex flex-1 flex-col justify-between space-y-2 ${isPhysicalCatalog ? 'p-2.5 sm:p-4' : 'p-4 space-y-3'}`}>
                    <div>
                      <Badge className={`${p.type === 'physical' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'} mb-2 text-[10px] font-bold px-2 py-0.5`}>{p.type === 'physical' ? (lang === 'vi' ? 'Hàng vật lý' : 'Physical item') : (lang === 'vi' ? 'Tài liệu số' : 'Digital asset')}</Badge>
                      <h3 className={`${isPhysicalCatalog ? 'text-[12px] sm:text-xs' : 'text-xs'} font-bold text-slate-800 group-hover:text-amber-600 transition-colors line-clamp-2 leading-relaxed`}> 
                        {p.name}
                      </h3>
                      <p className={`${isPhysicalCatalog ? 'hidden sm:block' : ''} text-[11px] text-slate-500 mt-1 line-clamp-2`}> 
                        {p.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className={`${isPhysicalCatalog ? 'text-[15px]' : 'text-sm'} font-black text-amber-600`}> 
                        {formatCurrency(p.price)}
                      </span>
                      <span className={`${isPhysicalCatalog ? 'hidden sm:inline-flex' : 'inline-flex'} text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors`}> 
                        {t.details}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
