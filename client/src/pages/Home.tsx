import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Sparkles, ArrowRight, Zap, FileText, Layers, FolderGit2 } from "lucide-react";

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
      {/* Banner / Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 shadow-xl border border-slate-200 p-8 sm:p-12 text-center text-white">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="bg-amber-500 text-slate-950 font-extrabold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
              DHL STORES DIGITAL HUB
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              {lang === 'vi' ? 'KHO TÀI NGUYÊN THIẾT KẾ & ĐỒ HỌA SỐ' : 'DIGITAL DESIGN & SPORTS ASSET HUB'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200">
              {lang === 'vi'
                ? 'Font thể thao, name set, vector, file in DTF, patch, mockup và template sẵn sàng cho thiết kế – in ấn.'
                : 'Sports fonts, name sets, vectors, DTF print files, patches, mockups and templates ready for design and printing.'}
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

        {/* Quick Category Icons Bar (10 danh mục chuyên sâu) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {[
            { id: 1, name: lang === 'vi' ? 'Font Chữ Thể Thao' : 'Sports Fonts', catId: 1 },
            { id: 2, name: lang === 'vi' ? 'Tên Số Áo Đấu' : 'Name Sets', catId: 2 },
            { id: 3, name: lang === 'vi' ? 'Vector & SVG' : 'Vector & SVG', catId: 3 },
            { id: 4, name: lang === 'vi' ? 'File In Áo DTF' : 'DTF Print Files', catId: 4 },
            { id: 5, name: lang === 'vi' ? 'Patch & Badge' : 'Patch & Badge', catId: 5 },
            { id: 6, name: lang === 'vi' ? 'Template Thiết Kế' : 'Design Templates', catId: 6 },
            { id: 7, name: lang === 'vi' ? 'Mockup Sản Phẩm' : 'Product Mockups', catId: 7 },
            { id: 8, name: lang === 'vi' ? 'Clipart & PNG' : 'Clipart & PNG', catId: 8 },
            { id: 9, name: lang === 'vi' ? 'Pattern & BG' : 'Pattern & BG', catId: 9 },
            { id: 10, name: lang === 'vi' ? 'Combo Bundle' : 'Design Bundles', catId: 10 },
          ].map(c => (
            <Link key={c.catId} href={`/products?categoryId=${c.catId}`} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-amber-500 transition-all text-center group">
              <FolderGit2 className="w-5 h-5 mx-auto text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1">{c.name}</h4>
            </Link>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <section className="py-10 bg-white border-t border-slate-200 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                {lang === 'vi' ? 'Tài Nguyên Số Mới Nhất & Nổi Bật' : 'Latest & Featured Digital Assets'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{lang === 'vi' ? 'Tải xuống sau khi giao dịch QR được hệ thống xác nhận' : 'Downloads unlock after QR payment is confirmed'}</p>
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
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5">
                        Digital Asset
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
