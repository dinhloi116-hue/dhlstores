import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package, Download, Sparkles, ShieldCheck, Zap, Award } from "lucide-react";

export default function Home() {
  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    const handleStorage = () => {
      const current = getClientLanguage();
      setLang(current);
    };
    window.addEventListener('storage', handleStorage);
    // Poll to sync lang changes
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const productsQuery = trpc.store.products.useQuery({ featured: true });
  const featuredProducts = productsQuery.data || [];

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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 lg:py-28 border-b border-slate-800/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-amber-500/20 to-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400 text-xs font-semibold tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{lang === 'vi' ? 'Cửa hàng chính hãng DHL Stores' : 'Official DHL Stores'}</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
                {t.heroTitle1} <br />
                <span className="bg-gradient-to-r from-blue-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
                  {t.heroTitle2}
                </span>
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                {t.heroDesc}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link href="/products">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-8 py-4 rounded-xl shadow-lg text-base group">
                    {t.exploreShop}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/products?type=digital">
                  <Button variant="outline" className="w-full sm:w-auto border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 px-8 py-4 rounded-xl text-base">
                    {t.downloadDigital}
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800/80 text-left">
                <div>
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-xs text-slate-400 mt-0.5">{lang === 'vi' ? 'Chính hãng & Độc quyền' : 'Authentic & Exclusive'}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">24/7</p>
                  <p className="text-xs text-slate-400 mt-0.5">{lang === 'vi' ? 'Tải tệp tự động' : 'Instant Downloads'}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">5.0 ★</p>
                  <p className="text-xs text-slate-400 mt-0.5">{lang === 'vi' ? 'Khách hàng đánh giá' : 'Customer Rating'}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md aspect-square rounded-3xl p-3 bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-slate-700/80 shadow-2xl group">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-amber-500/10 rounded-3xl" />
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-36 h-36 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 mb-6 group-hover:scale-105 transition-transform duration-500">
                    <img src={logoPath} alt="DHL Stores Logo" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-wide">DHL STORES</h3>
                  <p className="text-xs text-amber-400 font-medium uppercase tracking-widest mt-1">Physical & Digital Hub</p>
                  <p className="text-xs text-slate-400 mt-3 px-4">
                    {lang === 'vi' ? 'Áo đấu bóng đá cao cấp kết hợp kho tàng file đồ họa kỹ thuật số hàng đầu.' : 'Elite football jerseys paired with premier digital design files.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold">{t.categoriesTitle}</h2>
            <p className="text-3xl font-black text-white">{t.categoriesSub}</p>
            <p className="text-slate-400 text-sm">{t.categoriesDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href="/products?type=physical" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-8 hover:border-blue-500/50 transition-all duration-300 h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-6 text-blue-500/20 group-hover:text-blue-500/40 transition-colors">
                  <Package className="w-20 h-20" />
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{t.physicalTitle}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t.physicalDesc}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 pt-6">
                  <span>{t.physicalBtn}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <Link href="/products?categoryId=2" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-8 hover:border-purple-500/50 transition-all duration-300 h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-6 text-purple-500/20 group-hover:text-purple-500/40 transition-colors">
                  <Download className="w-20 h-20" />
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
                    <Download className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{t.imageTitle}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t.imageDesc}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 pt-6">
                  <span>{t.imageBtn}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <Link href="/products?categoryId=3" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-8 hover:border-amber-500/50 transition-all duration-300 h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-6 text-amber-500/20 group-hover:text-amber-500/40 transition-colors">
                  <Sparkles className="w-20 h-20" />
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">{t.fontTitle}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t.fontDesc}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 pt-6">
                  <span>{t.fontBtn}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold">{t.featuredTitle}</h2>
              <p className="text-3xl font-black text-white mt-1">{t.featuredSub}</p>
            </div>
            <Link href="/products">
              <Button variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200">
                {t.viewAll}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group">
                <div className="bg-slate-900/80 rounded-2xl overflow-hidden border border-slate-800 group-hover:border-amber-500/50 transition-all duration-300 flex flex-col h-full shadow-lg">
                  <div className="relative aspect-square overflow-hidden bg-slate-950">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={p.type === 'physical' ? 'bg-blue-600 text-white font-semibold' : 'bg-purple-600 text-white font-semibold'}>
                        {p.type === 'physical' ? (lang === 'vi' ? 'Vật lý' : 'Physical') : (lang === 'vi' ? 'Sản phẩm số' : 'Digital')}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-base font-black text-amber-400">
                        {formatCurrency(p.price)}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
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

      {/* Why Choose Us */}
      <section className="py-20 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold">{t.buyingGuide}</h2>
          <p className="text-3xl font-black text-white mt-1 mb-16">{t.whyChoose}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{t.instantDownload}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.instantDownloadDesc}</p>
            </div>
            <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{t.sportJersey}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.sportJerseyDesc}</p>
            </div>
            <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{t.secureSupport}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.secureSupportDesc}</p>
            </div>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
