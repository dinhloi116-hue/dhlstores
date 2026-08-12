import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, Sparkles, ArrowRight, Zap } from "lucide-react";

export default function Home() {
  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const productsQuery = trpc.store.products.useQuery({});
  const allProducts = productsQuery.data || [];

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const logoPath = "/manus-storage/logodhlstores_c8e433ed.png";

  return (
    <StoreLayout>
      {/* Banner / Hero Section (Sáng, nổi bật với banner tainguyenhd style) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 shadow-xl border border-slate-200 p-8 sm:p-12 text-center text-white">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="bg-amber-500 text-slate-950 font-extrabold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
              DHL STORES OFFICIAL
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              {lang === 'vi' ? 'KHO TÀI NGUYÊN ÁO ĐẤU & FILE SỐ' : 'PREMIUM JERSEY & DIGITAL ASSETS HUB'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200">
              {t.heroDesc}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/products">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow">
                  {t.exploreShop}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Category Icons Bar (Giống các icon danh mục trên ảnh tham khảo) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <Link href="/products?type=physical" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-500 transition-all text-center group">
            <Package className="w-8 h-8 mx-auto text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-800">{t.physicalTitle}</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Áo đấu chính hãng</p>
          </Link>

          <Link href="/products?categoryId=2" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-500 transition-all text-center group">
            <Download className="w-8 h-8 mx-auto text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-800">{t.imageTitle}</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Poster & Artwork 4K</p>
          </Link>

          <Link href="/products?categoryId=3" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-500 transition-all text-center group">
            <Sparkles className="w-8 h-8 mx-auto text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-800">{t.fontTitle}</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Font số & chữ OTF</p>
          </Link>

          <Link href="/products" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-500 transition-all text-center group">
            <Zap className="w-8 h-8 mx-auto text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-800">{t.allProducts}</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Tất cả tài nguyên</p>
          </Link>
        </div>
      </div>

      {/* Product Catalog Grid (Lưới sản phẩm mới nhất, siêu gọn và dễ mua) */}
      <section className="py-12 bg-white border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                {lang === 'vi' ? 'Tài nguyên mới nhất / Sản phẩm nổi bật' : 'Latest Resources & Featured Products'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Cập nhật liên tục 24/7 cho khách hàng</p>
            </div>
            <Link href="/products">
              <Button variant="outline" size="sm" className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100">
                {t.viewAll} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {allProducts.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group">
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 group-hover:border-amber-500 group-hover:shadow-md transition-all duration-200 flex flex-col h-full">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge className={p.type === 'physical' ? 'bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5' : 'bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5'}>
                        {p.type === 'physical' ? 'Vật lý' : 'File số'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors line-clamp-2 leading-relaxed">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {p.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-black text-amber-600">
                        {formatCurrency(p.price)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        {t.details}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
