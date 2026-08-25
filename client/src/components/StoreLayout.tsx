import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { translations, getClientLanguage, Language, setDetectedLanguage, setSelectedLanguage } from "@/lib/i18n";
import { catalogName } from "@/lib/catalogLocale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, User as UserIcon, ShieldCheck, Download, Package, Menu, X, LogOut, Globe, Sparkles, WandSparkles, BookOpen, Trophy, Shirt, ChevronDown, WalletCards, MapPin, History, Bell, LoaderCircle, ArrowUp, Scale, Camera, Upload, Search, Film } from "lucide-react";
import { toast } from "sonner";
import CustomerContactHub from "@/components/CustomerContactHub";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { getComparedProductIds } from "@/lib/customer-tools";

const toolCatalog = [
  { key: "notebook-labels", name: "Tạo Nhãn Vở Online", description: "Nhập Excel, dàn nhãn A4 và xuất PDF/PNG.", href: "/tools/notebook-labels", group: "In ấn", icon: BookOpen, tone: "amber" },
  { key: "video-cutter", name: "Cắt & Nối Video", description: "Cắt, nối và nén video ngay trên trình duyệt.", href: "/tools/video-cutter", group: "Media", icon: Film, tone: "cyan" },
  { key: "pet-tram", name: "PET TRAM PRO X", description: "Xử lý ảnh, vector hóa và chuẩn bị file in.", href: "/manus-storage/pet-tram-pro-x_89dce948.html", group: "Thiết kế", icon: WandSparkles, tone: "slate" },
] as const;

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authForm, setAuthForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [accountNavPending, setAccountNavPending] = useState(false);
  const [comparedCount, setComparedCount] = useState(() => getComparedProductIds().length);
  const [pageProgress, setPageProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [toolQuery, setToolQuery] = useState("");
  const [imageSearchPreview, setImageSearchPreview] = useState<string | null>(null);
  const [imageSearchResults, setImageSearchResults] = useState<Array<{ productId: number; confidence: number; reason: string; product?: { id: number; name: string; slug: string; image?: string | null; price: string | number; type: string } }>>([]);
  const imageSearchMutation = trpc.store.imageSearch.useMutation({ onSuccess: result => { setImageSearchResults(result.matches as typeof imageSearchResults); if (!result.matches.length) toast.info(result.message); }, onError: error => toast.error(error.message) });
  const recordVisit = trpc.analytics.recordVisit.useMutation();
  const siteSettingsQuery = trpc.store.siteSettings.useQuery();
  const categoriesQuery = trpc.store.categories.useQuery();
  const localeQuery = trpc.store.locale.useQuery(undefined, { staleTime: 24 * 60 * 60 * 1_000, retry: false });
  const notificationOrdersQuery = trpc.store.myOrders.useQuery(undefined, { enabled: isAuthenticated, staleTime: 20_000, refetchInterval: isAuthenticated ? 30_000 : false });
  const attentionOrderCount = (notificationOrdersQuery.data || []).filter(order => order.paymentStatus === "pending" || order.status === "processing" || order.status === "shipping").length;

	  const [lang, setLang] = useState<Language>(getClientLanguage());

	  useEffect(() => {
	    const syncLanguage = () => setLang(getClientLanguage());
	    window.addEventListener('dhlstores-language-detected', syncLanguage);
	    return () => window.removeEventListener('dhlstores-language-detected', syncLanguage);
	  }, []);
	  useEffect(() => {
	    if (localeQuery.data?.locale && setDetectedLanguage(localeQuery.data.locale)) {
	      setLang(localeQuery.data.locale);
	    }
	  }, [localeQuery.data?.locale]);
  useEffect(() => {
    setAccountNavPending(false);
  }, [location]);

  useEffect(() => {
    const openImageSearch = () => setImageSearchOpen(true);
    window.addEventListener("dhlstores-open-image-search", openImageSearch);
    return () => window.removeEventListener("dhlstores-open-image-search", openImageSearch);
  }, []);

  useEffect(() => {
    setPageProgress(12);
    const midpoint = window.setTimeout(() => setPageProgress(72), 40);
    const finish = window.setTimeout(() => setPageProgress(100), 180);
    const reset = window.setTimeout(() => setPageProgress(0), 420);
    return () => { window.clearTimeout(midpoint); window.clearTimeout(finish); window.clearTimeout(reset); };
  }, [location]);

  useEffect(() => {
    const refreshCompared = () => setComparedCount(getComparedProductIds().length);
    window.addEventListener("dhlstores-customer-tools", refreshCompared);
    return () => window.removeEventListener("dhlstores-customer-tools", refreshCompared);
  }, []);

  useEffect(() => {
    const updateScroll = () => {
      const limit = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(limit > 0 ? Math.min(100, Math.round(window.scrollY / limit * 100)) : 0);
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => { window.removeEventListener("scroll", updateScroll); window.removeEventListener("resize", updateScroll); };
  }, [location]);

  useEffect(() => {
    const key = 'dhl_visitor_id';
    let visitorId = localStorage.getItem(key);
    if (!visitorId) {
      visitorId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, visitorId);
    }
    recordVisit.mutate({ visitorId, path: location });
  }, [location]);

  const t = translations[lang];
  const navHome = siteSettingsQuery.data?.navHome || t.home;
  const navProducts = siteSettingsQuery.data?.navProducts || t.allProducts;
  const navDigital = siteSettingsQuery.data?.navDigital || (lang === 'vi' ? 'Tài nguyên số' : 'Digital resources');
  const catalogCategories = categoriesQuery.data || [];
  const filteredTools = toolCatalog.filter(tool => `${tool.name} ${tool.description} ${tool.group}`.toLowerCase().includes(toolQuery.trim().toLowerCase()));
  const toolGroups = Array.from(new Set(filteredTools.map(tool => tool.group)));
  const categoryBySlug = (slug: string, fallback: { id: number; name: string; type: 'physical' | 'digital' }) => {
    const category = catalogCategories.find(item => item.slug === slug);
    return { id: category?.id ?? fallback.id, name: category ? catalogName(category, lang) : fallback.name, type: category?.type ?? fallback.type };
  };
  const footballCategories = [
    categoryBySlug('quan-ao-bong-da', { id: 11, name: lang === 'vi' ? 'Quần Áo Bóng Đá' : 'Football jerseys', type: 'physical' }),
    categoryBySlug('patch-tay', { id: 12, name: lang === 'vi' ? 'Patch Tay' : 'Sleeve patches', type: 'physical' }),
    categoryBySlug('nameset-chong-nhiem', { id: 13, name: lang === 'vi' ? 'Nameset Chống Nhiễm' : 'Anti-dye namesets', type: 'physical' }),
  ];
  const printCategories = [categoryBySlug('shop-ao-in', { id: 11070079, name: lang === 'vi' ? 'Shop Áo Thun In Hình' : 'Printed T-shirt shop', type: 'physical' })];
  const digitalCategories = catalogCategories.filter(category => category.type === 'digital').slice(0, 6);
  const navGroups = [
    { key: 'football', label: lang === 'vi' ? 'Quần Áo Bóng Đá' : 'Football apparel', href: '/products?type=physical', icon: Trophy, accent: 'text-emerald-600', children: footballCategories.map(category => ({ ...category, href: `/products?type=physical&categoryId=${category.id}` })) },
    { key: 'print', label: lang === 'vi' ? 'Shop Áo Thun In Hình' : 'Printed T-shirt shop', href: '/products?type=physical&categoryId=11070079', icon: Shirt, accent: 'text-[#ee4d2d]', children: printCategories.map(category => ({ ...category, href: `/products?type=physical&categoryId=${category.id}` })) },
    { key: 'digital', label: navDigital, href: '/products?type=digital', icon: Download, accent: 'text-purple-600', children: digitalCategories.map(category => ({ ...category, href: `/products?type=digital&categoryId=${category.id}` })) },
  ];

  const handleImageSearchFile = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error(lang === "vi" ? "Vui lòng chọn ảnh JPG, PNG hoặc WebP" : "Choose a JPG, PNG or WebP image"); return; }
    if (file.size > 6 * 1024 * 1024) { toast.error(lang === "vi" ? "Ảnh tìm kiếm tối đa 6 MB" : "Image search supports up to 6 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = String(reader.result || ""); setImageSearchPreview(dataUrl); setImageSearchResults([]); imageSearchMutation.mutate({ mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64: dataUrl }); };
    reader.readAsDataURL(file);
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setSelectedLanguage(nextLang);
    setLang(nextLang);
    toast.success(nextLang === 'vi' ? 'Đã chuyển sang tiếng Việt' : 'Switched to English');
  };

  const utils = trpc.useUtils();
  const handleLocalAuthSuccess = async (result: { user: NonNullable<typeof user> }) => {
    utils.auth.me.setData(undefined, result.user);
    await utils.auth.me.invalidate();
    setAuthDialogOpen(false);
    setAuthForm({ name: '', username: '', email: '', password: '', confirmPassword: '' });
    toast.success(lang === 'vi' ? 'Đăng nhập thành công' : 'Signed in successfully');
  };
  const localLoginMutation = trpc.auth.login.useMutation({
    onSuccess: handleLocalAuthSuccess,
    onError: error => toast.error(error.message),
  });
  const localRegisterMutation = trpc.auth.register.useMutation({
    onSuccess: handleLocalAuthSuccess,
    onError: error => toast.error(error.message),
  });
  const cartQuery = trpc.store.cart.useQuery(undefined, { enabled: isAuthenticated });
  const updateCartMutation = trpc.store.updateCart.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? 'Đã cập nhật số lượng trong giỏ hàng' : 'Cart quantity updated');
      utils.store.cart.invalidate();
    },
    onError: error => {
      toast.error(error.message || (lang === 'vi' ? "Không thể cập nhật số lượng do tồn kho thay đổi" : "Unable to update quantity because stock changed"));
      utils.store.cart.invalidate();
    }
  });
  const removeCartMutation = trpc.store.removeFromCart.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Đã xóa sản phẩm khỏi giỏ hàng" : "Item removed from cart");
      utils.store.cart.invalidate();
    }
  });
  const clearCartMutation = trpc.store.clearCart.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Đã xóa toàn bộ giỏ hàng" : "Cart cleared");
      utils.store.cart.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const cartItems = cartQuery.data || [];
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = item.product ? parseFloat(item.product.price) + Number(item.variant?.priceAdjustment || 0) : 0;
    return sum + price * item.quantity;
  }, 0);
  const freeShippingThreshold = 500000;
  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - cartSubtotal);

  const formatCurrency = (val: number) => {
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const logoPath = "/manus-storage/logodhlstores_c8e433ed.png";
  const submitLocalAuth = (event: React.FormEvent) => {
    event.preventDefault();
    if (authMode === 'signup') {
      if (authForm.password !== authForm.confirmPassword) {
        toast.error(lang === 'vi' ? 'Xác nhận mật khẩu chưa khớp' : 'Password confirmation does not match');
        return;
      }
      localRegisterMutation.mutate({ username: authForm.username, password: authForm.password, email: authForm.email, name: authForm.name || undefined });
      return;
    }
    localLoginMutation.mutate({ username: authForm.username, password: authForm.password });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-amber-400 selection:text-slate-950">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 origin-left bg-amber-500 transition-transform duration-200" style={{ transform: `scaleX(${pageProgress / 100})` }} />
      <div aria-hidden="true" className="pointer-events-none fixed bottom-0 left-0 z-[60] h-1 bg-indigo-500/80 transition-[width] duration-150" style={{ width: `${scrollProgress}%` }} />
      <PwaInstallPrompt />
      {/* Top Banner / Announcement Bar (giống ảnh mẫu màu vàng cam) */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 text-xs py-2 px-4 text-center font-bold tracking-wide shadow-sm flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span>{lang === 'vi' ? 'Tài nguyên thiết kế số · Thanh toán QR · Tải file sau khi xác nhận giao dịch' : 'Digital design resources · QR payment · Files unlock after transaction confirmation'}</span>
        <Sparkles className="w-4 h-4 animate-bounce" />
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-3 sm:h-[4.5rem] sm:px-6 lg:px-8 2xl:px-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm sm:h-10 sm:w-10">
              <img src={logoPath} alt="DHL Stores" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-display block text-2xl font-black leading-none tracking-wider text-slate-900 transition-colors group-hover:text-amber-600 sm:text-[1.65rem]">
                DHL <span className="text-amber-600">STORES</span>
              </span>
              <p className="hidden text-[9px] font-semibold uppercase tracking-widest text-slate-500 sm:block">{lang === 'vi' ? 'KHO TÀI NGUYÊN SỐ' : 'DIGITAL RESOURCE HUB'}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-3 text-sm font-semibold">
            <Link href="/" className={`px-2 transition-colors hover:text-amber-600 ${location === '/' ? 'text-amber-600' : 'text-slate-700'}`}>{navHome}</Link>
            {navGroups.map(group => { const Icon = group.icon; return <div key={group.key} className="group relative">
              <div className="flex items-center gap-0.5 whitespace-nowrap rounded-lg px-1 py-1 font-black transition-colors hover:bg-slate-50">
                <Link href={group.href} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm ${location.includes(group.key === 'print' ? 'categoryId=11070079' : group.key === 'digital' ? 'type=digital' : 'type=physical') ? group.accent : 'text-slate-700'}`}>
                  <Icon className={`h-4 w-4 ${group.accent}`} /> <span>{group.label}</span>
                </Link>
                <button type="button" aria-label={`Mở danh mục ${group.label}`} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"><ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" /></button>
              </div>
              <div className="pointer-events-none invisible absolute left-0 top-full z-[70] w-80 pt-3 opacity-0 transition-[opacity,visibility] duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
	                  <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">DHL Stores · {lang === 'vi' ? 'Xem nhanh' : 'Preview'}</p><p className="mt-1 text-sm font-black text-slate-900">{group.label}</p></div>
                  <div className="space-y-1">{group.children.map(child => <Link key={child.id} href={child.href} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-amber-50 hover:text-amber-700"><span>{child.name}</span><span className="text-[10px] text-slate-400">Xem →</span></Link>)}</div>
                  <Link href={group.href} className="mt-2 block rounded-xl bg-slate-900 px-3 py-2.5 text-center text-xs font-black text-white transition-colors hover:bg-amber-500 hover:text-slate-950">Mở toàn bộ khu vực</Link>
                </div>
              </div>
            </div>; })}
            <div className="group relative">
              <Link href="/tools" className={`flex items-center gap-1 px-2 transition-colors hover:text-amber-600 ${location.startsWith('/tools') ? 'text-amber-600' : 'text-slate-700'}`}><WandSparkles className="h-4 w-4 text-cyan-600" /> Công cụ</Link>
              <div className="pointer-events-none invisible absolute left-1/2 top-full z-[70] w-[min(26rem,calc(100vw-1rem))] -translate-x-1/2 pt-3 opacity-0 transition-[opacity,visibility] duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"><div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="mb-3 flex items-start justify-between gap-3 px-1"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">DHL Stores · Công cụ</p><p className="mt-1 text-sm font-black text-slate-900">Chọn tiện ích nhanh</p></div><Link href="/tools" className="shrink-0 text-[11px] font-black text-violet-700 hover:text-violet-900">Xem tất cả →</Link></div><label className="relative mb-3 block"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={toolQuery} onChange={(event) => setToolQuery(event.target.value)} placeholder="Tìm tiện ích…" className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-cyan-400 focus:bg-white" /></label><div className="max-h-[min(24rem,60vh)] space-y-3 overflow-y-auto pr-1">{toolGroups.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-xs font-semibold text-slate-500">Không tìm thấy tiện ích phù hợp.</p> : toolGroups.map(group => <div key={group}><p className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{group}</p><div className="space-y-1">{filteredTools.filter(tool => tool.group === group).map(tool => { const Icon = tool.icon; const cardClass = tool.tone === "slate" ? "border-slate-800 bg-slate-950 text-white hover:border-cyan-400" : tool.tone === "amber" ? "border-amber-200 bg-amber-50/80 hover:border-amber-400" : "border-cyan-200 bg-cyan-50/80 hover:border-cyan-400"; return <Link key={tool.key} href={tool.href} className={`group/tool flex items-center gap-3 rounded-xl border p-2.5 transition hover:-translate-y-0.5 ${cardClass}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tool.tone === "slate" ? "bg-cyan-400 text-slate-950" : tool.tone === "amber" ? "bg-amber-400 text-slate-950" : "bg-cyan-500 text-white"}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-black">{tool.name}</strong><span className={`mt-0.5 block truncate text-[10px] leading-relaxed ${tool.tone === "slate" ? "text-slate-300" : "text-slate-500"}`}>{tool.description}</span></span><ArrowUp className="h-4 w-4 shrink-0 rotate-45 opacity-60 transition group-hover/tool:translate-x-0.5" /></Link>; })}</div></div>)}</div><Link href="/tools" className="mt-3 block rounded-xl bg-slate-900 px-3 py-2.5 text-center text-xs font-black text-white transition-colors hover:bg-amber-500 hover:text-slate-950">Mở thư viện công cụ đầy đủ</Link></div></div>
            </div>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="outline" size="sm" onClick={() => setImageSearchOpen(true)} className="border-cyan-200 bg-cyan-50 text-xs font-bold text-cyan-800 hover:bg-cyan-100" aria-label={lang === "vi" ? "Tìm kiếm bằng hình ảnh" : "Search by image"}>
              <Camera className="h-4 w-4 sm:mr-1" /><span className="hidden lg:inline">{lang === "vi" ? "Tìm bằng ảnh" : "Search by image"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              aria-label={lang === 'vi' ? 'Chuyển từ tiếng Việt sang tiếng Anh' : 'Switch from English to Vietnamese'}
              title={lang === 'vi' ? 'Tiếng Việt / English' : 'English / Tiếng Việt'}
              className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-bold gap-1.5"
            >
              <span aria-hidden="true" className="text-sm leading-none">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
              <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
              <span aria-hidden="true" className="text-slate-400">/</span>
              <span aria-hidden="true" className="text-sm leading-none">{lang === 'vi' ? '🇬🇧' : '🇻🇳'}</span>
            </Button>

            {/* Cart Trigger */}
            <div className="group/cart relative">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button id="header-cart-trigger" aria-label={`${lang === 'vi' ? 'Mở giỏ hàng, ' : 'Open cart, '}${cartItemCount} ${lang === 'vi' ? 'sản phẩm' : 'items'}`} variant="outline" size="sm" className="relative bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-amber-600 shadow-sm">
                  <ShoppingBag className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{t.cart}</span>
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-slate-900 text-amber-400 font-bold px-1.5 py-0.5 text-xs rounded-full">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-[min(100vw,26rem)] flex-col border-slate-200 bg-white text-slate-900 sm:max-w-md">
                <SheetHeader className="border-b border-slate-100 pb-4">
                  <SheetTitle className="text-slate-900 flex items-center justify-between font-bold">
                    <span>{t.cartTitle}</span>
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      {cartItemCount} items
                    </Badge>
                  </SheetTitle>
                  {isAuthenticated && <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs"><span className="font-bold text-slate-600">Xem nhanh trên điện thoại</span><span className="font-black text-amber-700">{formatCurrency(cartSubtotal)}</span></div>}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {!isAuthenticated ? (
                    <div className="text-center py-12 text-slate-500">
                      <p className="mb-4 text-sm">{lang === 'vi' ? 'Vui lòng đăng nhập để xem giỏ hàng.' : 'Please sign in to view your cart.'}</p>
                      <Button onClick={() => setAuthDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                        {t.login}
                      </Button>
                    </div>
                  ) : cartItems.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold">{t.emptyCart}</p>
                      <p className="text-xs text-slate-400 mt-1">{t.emptyCartDesc}</p>
                    </div>
                  ) : (
                    cartItems.map(item => {
                      const p = item.product;
                      if (!p) return null;
                      return (
                        <div key={item.id} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate text-slate-900">{p.name}</h4>
                            {(item.attributes || item.variant) && <p className="text-xs text-amber-600 font-semibold">{item.attributes || [item.variant?.size && `Size: ${item.variant.size}`, item.variant?.color && `Màu: ${item.variant.color}`, ...(item.variant?.attributes || "").split(/\n|;/).map(value => value.trim()).filter(Boolean)].filter(Boolean).join(" · ")}</p>}
                            <p className="text-xs text-slate-500 mt-1">{formatCurrency(parseFloat(p.price) + Number(item.variant?.priceAdjustment || 0))} x {item.quantity}</p>
                            {p.type === 'physical' && <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Hình thức mua</p><div className="mt-1 grid grid-cols-2 gap-1"><button type="button" disabled={updateCartMutation.isPending} onClick={() => updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity, fulfillmentMode: 'in_stock' })} className={`rounded-md px-2 py-1 text-[10px] font-black transition ${item.fulfillmentMode === 'in_stock' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'}`}>Mua ngay</button><button type="button" disabled={updateCartMutation.isPending} onClick={() => updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity, fulfillmentMode: 'preorder' })} className={`rounded-md px-2 py-1 text-[10px] font-black transition ${item.fulfillmentMode === 'preorder' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-rose-50'}`}>Order -10%</button></div><p className="mt-1 text-[10px] font-semibold text-slate-500">Dự kiến: {item.fulfillmentMode === 'preorder' ? '7–10 ngày' : '2–5 ngày'}</p></div>}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              aria-label={`${lang === 'vi' ? 'Xóa' : 'Remove'} ${p.name}`}
                              onClick={() => removeCartMutation.mutate({ cartItemId: item.id })}
                              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                            >
                              {lang === 'vi' ? 'Xóa' : 'Remove'}
                            </button>
                            <div aria-busy={updateCartMutation.isPending} className={`flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 shadow-xs transition-opacity ${updateCartMutation.isPending ? 'animate-pulse opacity-70' : 'opacity-100'}`}>
                              <button
                                type="button"
                                aria-label={`Giảm số lượng ${p.name}`}
                                disabled={updateCartMutation.isPending || item.quantity <= 1}
                                onClick={() => {
                                  if (updateCartMutation.isPending || item.quantity <= 1) return;
                                  updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity - 1 });
                                }}
                                className="text-slate-600 hover:text-black px-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                              >-</button>
                              <span className="text-xs font-bold px-1">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label={`Tăng số lượng ${p.name}`}
                                disabled={updateCartMutation.isPending}
                                onClick={() => {
                                  if (updateCartMutation.isPending) return;
                                  updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity + 1 });
                                }}
                                className="text-slate-600 hover:text-black px-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                              >+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {isAuthenticated && cartItems.length > 0 && (
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                      <span className="text-slate-500">{t.subtotal}:</span>
                      <span className="text-lg font-black text-amber-600">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    <button type="button" disabled={clearCartMutation.isPending} onClick={() => { if (window.confirm(lang === 'vi' ? 'Xóa toàn bộ sản phẩm khỏi giỏ hàng?' : 'Remove all items from cart?')) clearCartMutation.mutate(); }} className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">{clearCartMutation.isPending ? (lang === 'vi' ? 'Đang xóa…' : 'Clearing…') : (lang === 'vi' ? 'Xóa toàn bộ giỏ hàng' : 'Clear cart')}</button>
                    <Button
                      onClick={() => {
                        setCartOpen(false);
                        window.location.href = "/checkout";
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl shadow-md text-base"
                    >
                      {t.checkoutBtn}
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
            {isAuthenticated && cartItems.length > 0 && <div className="pointer-events-none invisible absolute right-0 top-full z-[70] hidden w-80 pt-3 opacity-0 transition-[opacity,visibility] duration-150 md:block group-hover/cart:pointer-events-auto group-hover/cart:visible group-hover/cart:opacity-100 group-focus-within/cart:pointer-events-auto group-focus-within/cart:visible group-focus-within/cart:opacity-100"><div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"><p className="text-xs font-black text-slate-900">Giỏ hàng đã chọn</p><span className="text-[10px] font-black text-amber-700">{cartItemCount} sản phẩm</span></div><div className="mt-2 space-y-1">{cartItems.slice(0, 3).map(item => item.product ? <div key={item.id} className="flex items-center gap-2 rounded-lg p-1.5"><img src={item.product.image} alt="" className="h-9 w-9 rounded-md border border-slate-200 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-slate-800">{item.product.name}</p><p className="text-[10px] text-slate-500">× {item.quantity}</p></div></div> : null)}</div><div className={`mt-3 rounded-xl border p-2.5 transition-colors duration-300 ${freeShippingRemaining > 0 ? 'border-emerald-100 bg-emerald-50' : 'border-amber-300 bg-amber-50 animate-[pulse_1.8s_ease-in-out_1]'}`}><div className={`flex items-center justify-between gap-2 text-[10px] font-black ${freeShippingRemaining > 0 ? 'text-emerald-900' : 'text-amber-950'}`}><span>{freeShippingRemaining > 0 ? `Mua thêm ${formatCurrency(freeShippingRemaining)} để đạt mốc freeship` : 'Chúc mừng! Đơn đã đạt mốc freeship dự kiến'}</span><span>{freeShippingProgress}%</span></div><div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${freeShippingRemaining > 0 ? 'bg-emerald-100' : 'bg-amber-200'}`}><div className={`h-full rounded-full transition-[width] duration-500 ${freeShippingRemaining > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${freeShippingProgress}%` }} /></div><p className={`mt-1 text-[9px] font-semibold ${freeShippingRemaining > 0 ? 'text-emerald-700' : 'text-amber-800'}`}>Mốc tham khảo: {formatCurrency(freeShippingThreshold)} · áp dụng theo chính sách vận chuyển hiện hành</p></div>{cartItems.length > 3 && <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">và {cartItems.length - 3} sản phẩm khác</p>}<Link href="/cart" className="mt-3 block rounded-xl bg-slate-900 px-3 py-2.5 text-center text-xs font-black text-white transition-colors hover:bg-amber-500 hover:text-slate-950">Xem toàn bộ giỏ hàng</Link></div></div>}
            </div>

            {isAuthenticated && user && <Link href="/account#orders" aria-label={lang === 'vi' ? 'Thông báo đơn hàng' : 'Order notifications'} className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"><Bell className="h-4 w-4" />{attentionOrderCount > 0 && <Badge className="absolute -right-2 -top-2 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white">{attentionOrderCount > 99 ? '99+' : attentionOrderCount}</Badge>}</Link>}

            {/* Auth / Account */}
            {isAuthenticated && user ? (
              <div className="group relative" onKeyDown={event => { if (event.key === "Escape") (event.currentTarget.querySelector("button") as HTMLButtonElement | null)?.focus(); }}>
                <Button variant="outline" size="sm" aria-haspopup="menu" className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800 font-bold gap-1.5">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" /> : <UserIcon className="w-4 h-4 text-amber-600" />}
	                  <span className="hidden sm:inline">{user.name || (lang === 'vi' ? 'Khách hàng' : 'User')}</span>
                </Button>
                <div className="pointer-events-none invisible absolute right-0 top-full z-50 w-72 pt-2 opacity-0 translate-y-1 transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0">
                  <div role="menu" className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl ring-1 ring-slate-950/5">
                    {accountNavPending && <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-800"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />{lang === 'vi' ? 'Đang mở mục…' : 'Opening section…'}</div>}
                    <div className="border-b border-slate-100 px-4 pb-3 pt-2"><p className="text-[10px] uppercase font-black tracking-wide text-slate-400">{lang === 'vi' ? 'Đang đăng nhập' : 'Signed in as'}</p><p className="mt-1 truncate text-xs font-black text-slate-800">{user.email || user.name}</p><p className="mt-1 text-[10px] font-semibold text-emerald-700">{lang === 'vi' ? `Số dư ví: ${formatCurrency(Number(user.balance || 0))}` : `Wallet: ${formatCurrency(Number(user.balance || 0))}`}</p></div>
                    <div className="grid grid-cols-2 gap-1 p-2">
                      <Link onClick={() => setAccountNavPending(true)} role="menuitem" href="/account#wallet" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700"><WalletCards className="h-4 w-4 text-amber-600" />{lang === 'vi' ? 'Ví & số dư' : 'Wallet'}</Link>
                      <Link onClick={() => setAccountNavPending(true)} role="menuitem" href="/orders" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"><History className="h-4 w-4 text-blue-600" />{lang === 'vi' ? 'Đơn hàng' : 'Orders'}</Link>
                      <Link onClick={() => setAccountNavPending(true)} role="menuitem" href="/account#addresses" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"><MapPin className="h-4 w-4 text-cyan-600" />{lang === 'vi' ? 'Địa chỉ' : 'Addresses'}</Link>
                      <Link onClick={() => setAccountNavPending(true)} role="menuitem" href="/account#downloads" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><Download className="h-4 w-4 text-violet-600" />{lang === 'vi' ? 'Tải xuống' : 'Downloads'}</Link>
                      <Link onClick={() => setAccountNavPending(true)} role="menuitem" href="/account" className="col-span-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-950"><Package className="h-4 w-4 text-slate-600" />{lang === 'vi' ? 'Tài khoản & Email' : 'Account & Email'}</Link>
                    </div>
                    {user.role === 'owner' && <Link onClick={() => setAccountNavPending(true)} role="menuitem" href="/admin" className="mx-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700"><ShieldCheck className="h-4 w-4 text-amber-600" />{t.admin}</Link>}
                    <button onClick={() => logout()} className="mt-1 w-full border-t border-slate-100 px-4 pt-3 text-left flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-800"><LogOut className="w-4 h-4" />{t.logout}</button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setAuthDialogOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm px-4 text-xs sm:text-sm"
              >
                {t.login}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden max-h-[calc(100vh-5rem)] overflow-y-auto bg-white border-b border-slate-200 px-4 py-5 shadow-lg">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="mb-3 block text-sm font-semibold text-slate-800 hover:text-amber-600">{navHome}</Link>
            <div className="space-y-3">{navGroups.map(group => { const Icon = group.icon; return <section key={group.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><Link href={group.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-sm font-black text-slate-900 shadow-sm"><span className="flex items-center gap-2"><Icon className={`h-4 w-4 ${group.accent}`} />{group.label}</span><span className="text-xs text-slate-400">Mở →</span></Link><div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">{group.children.map(child => <Link key={child.id} href={child.href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-amber-700">{child.name}</Link>)}</div></section>; })}</div>
            <Link href="/tools" onClick={() => setMobileMenuOpen(false)} className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-800 hover:text-amber-600"><WandSparkles className="w-4 h-4 text-cyan-600" /> Thư viện công cụ</Link>
            {isAuthenticated && <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="mt-3 block border-t border-slate-100 pt-3 text-sm font-semibold text-amber-600">{t.account}</Link>}
          </div>
        )}
      </header>

      <Dialog open={imageSearchOpen} onOpenChange={open => { setImageSearchOpen(open); if (!open) { setImageSearchPreview(null); setImageSearchResults([]); imageSearchMutation.reset(); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900"><Camera className="h-5 w-5 text-cyan-600" />{lang === "vi" ? "Tìm sản phẩm bằng hình ảnh" : "Search products by image"}</DialogTitle>
            <DialogDescription>{lang === "vi" ? "Tải ảnh áo, patch, nameset hoặc tài nguyên tham khảo. Ảnh chỉ được dùng trong lần tìm kiếm này và không lưu vào tài khoản." : "Upload a jersey, patch, nameset or design reference. The query image is used for this search only and is not saved to your account."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/60 px-5 py-8 text-center transition hover:border-cyan-500 hover:bg-cyan-50">
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={event => handleImageSearchFile(event.target.files?.[0])} />
              {imageSearchPreview ? <img src={imageSearchPreview} alt="Ảnh truy vấn" className="max-h-48 rounded-xl object-contain shadow-sm" /> : <><Upload className="h-8 w-8 text-cyan-600" /><span className="mt-2 text-sm font-black text-slate-900">{lang === "vi" ? "Chọn ảnh hoặc chụp ảnh" : "Choose or capture an image"}</span><span className="mt-1 text-xs text-slate-500">JPG, PNG, WebP · tối đa 6 MB</span></>}
            </label>
            {imageSearchMutation.isPending && <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"><Search className="h-4 w-4 animate-pulse text-cyan-600" />{lang === "vi" ? "Đang đối chiếu với catalog…" : "Comparing with the catalog…"}</div>}
            {!imageSearchMutation.isPending && imageSearchPreview && !imageSearchResults.length && !imageSearchMutation.error && <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">{lang === "vi" ? "Chưa có kết quả phù hợp. Hãy thử ảnh rõ hơn hoặc chụp gần sản phẩm." : "No close matches yet. Try a clearer or closer image."}</p>}
            {imageSearchResults.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{imageSearchResults.map(match => match.product ? <Link key={match.productId} href={`/product/${match.product.slug}`} onClick={() => setImageSearchOpen(false)} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-cyan-400 hover:bg-cyan-50/40"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">{match.product.image ? <img src={match.product.image} alt={match.product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-bold text-slate-400">DHL</div>}</div><div className="min-w-0"><p className="line-clamp-2 text-sm font-black text-slate-900">{match.product.name}</p><p className="mt-1 text-[11px] font-semibold text-cyan-700">{Math.round(match.confidence * 100)}% · {match.reason}</p></div></Link> : null)}</div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-purple-950 px-7 py-6 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-amber-300">DHL Stores Account</p>
            <DialogHeader className="mt-2">
              <DialogTitle className="text-xl font-black text-white">{authMode === 'signin' ? (lang === 'vi' ? 'Đăng nhập DHL Stores' : 'Sign in to DHL Stores') : (lang === 'vi' ? 'Tạo tài khoản DHL Stores' : 'Create your DHL Stores account')}</DialogTitle>
              <DialogDescription className="text-sm text-slate-200">{lang === 'vi' ? 'Tài khoản giúp bảo vệ đơn hàng và chỉ mở quyền tải file sau thanh toán.' : 'Your account protects orders and unlocks downloads only after payment.'}</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={submitLocalAuth} className="p-7 space-y-5">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 gap-1">
              <button type="button" onClick={() => setAuthMode('signin')} className={`rounded-lg px-3 py-2.5 text-xs font-black transition-colors ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lang === 'vi' ? 'ĐĂNG NHẬP' : 'SIGN IN'}</button>
              <button type="button" onClick={() => setAuthMode('signup')} className={`rounded-lg px-3 py-2.5 text-xs font-black transition-colors ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lang === 'vi' ? 'TẠO TÀI KHOẢN' : 'CREATE ACCOUNT'}</button>
            </div>
            <div className="space-y-3">
              {authMode === 'signup' && <input value={authForm.name} onChange={event => setAuthForm(value => ({ ...value, name: event.target.value }))} placeholder={lang === 'vi' ? 'Tên hiển thị (tùy chọn)' : 'Display name (optional)'} autoComplete="name" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />}
              {authMode === 'signup' && <input value={authForm.email} onChange={event => setAuthForm(value => ({ ...value, email: event.target.value }))} type="email" placeholder={lang === 'vi' ? 'Email để xác minh tài khoản' : 'Email for account verification'} autoComplete="email" required maxLength={320} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />}
              <input value={authForm.username} onChange={event => setAuthForm(value => ({ ...value, username: event.target.value }))} placeholder={lang === 'vi' ? 'Tên đăng nhập' : 'Username'} autoComplete="username" required minLength={3} maxLength={32} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
              <input value={authForm.password} onChange={event => setAuthForm(value => ({ ...value, password: event.target.value }))} type="password" placeholder={lang === 'vi' ? 'Mật khẩu tối thiểu 10 ký tự' : 'Password, at least 10 characters'} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} required minLength={10} maxLength={128} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
              {authMode === 'signup' && <input value={authForm.confirmPassword} onChange={event => setAuthForm(value => ({ ...value, confirmPassword: event.target.value }))} type="password" placeholder={lang === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm password'} autoComplete="new-password" required minLength={10} maxLength={128} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />}
            </div>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{lang === 'vi' ? 'Tên đăng nhập chỉ dùng chữ cái, số và dấu gạch dưới. Mật khẩu được băm an toàn; sau khi tạo tài khoản, bạn có thể liên kết email trong mục Tài khoản.' : 'Usernames use letters, numbers and underscores. Passwords are stored only as secure hashes; you can link an email later from Account.'}</p>
            <Button type="submit" disabled={localLoginMutation.isPending || localRegisterMutation.isPending} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-5">
              {localLoginMutation.isPending || localRegisterMutation.isPending ? (lang === 'vi' ? 'ĐANG XỬ LÝ...' : 'PLEASE WAIT...') : authMode === 'signin' ? (lang === 'vi' ? 'ĐĂNG NHẬP' : 'SIGN IN') : (lang === 'vi' ? 'TẠO TÀI KHOẢN' : 'CREATE ACCOUNT')}
            </Button>
            <button type="button" onClick={() => startLogin()} className="w-full text-center text-xs font-bold text-slate-500 underline-offset-4 hover:text-purple-700 hover:underline">{lang === 'vi' ? 'Hoặc tiếp tục với tài khoản Manus' : 'Or continue with your Manus account'}</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main key={location} className="dhl-page-enter flex-1">
        {children}
      </main>
      {comparedCount > 0 && <Link href="/compare" className="fixed bottom-5 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-indigo-300 bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-indigo-700 sm:left-6"><Scale className="h-4 w-4 text-indigo-200" />So sánh <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] text-slate-950">{comparedCount}</span></Link>}
      {scrollProgress > 18 && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={lang === "vi" ? "Quay lên đầu trang" : "Back to top"} className="fixed bottom-24 right-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:right-6"><ArrowUp className="h-5 w-5" /></button>}
      <CustomerContactHub />

      {/* Footer (Giống ảnh tham khảo: thông tin công ty / liên hệ rõ ràng ở chân trang nền tối) */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 text-sm border-t border-slate-800">
        <div className="mx-auto mb-12 grid max-w-[1600px] grid-cols-1 gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8 2xl:px-10">
          <div>
            <h4 className="font-display mb-4 text-xl font-black uppercase tracking-wider text-white">DHL STORES</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• {lang === 'vi' ? 'Font, vector, mockup và file in chuyên dụng' : 'Specialised fonts, vectors, mockups and print files'}</li>
              <li>• {lang === 'vi' ? 'Tương thích CorelDraw, Photoshop & Illustrator' : 'Compatible with CorelDraw, Photoshop and Illustrator'}</li>
              <li>• {lang === 'vi' ? 'Thanh toán QR nhanh, tự động xác nhận giao dịch' : 'Fast QR payment with automatic transaction confirmation'}</li>
              <li>• {lang === 'vi' ? 'Tải tài nguyên sau khi đơn hàng đã thanh toán' : 'Download resources after the order is paid'}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display mb-4 text-xl font-black uppercase tracking-wider text-white">LIÊN HỆ</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="https://zalo.me/0963898871" target="_blank" rel="noreferrer" className="font-semibold text-amber-300 hover:text-amber-200 hover:underline">{lang === 'vi' ? 'Nhắn Zalo hỗ trợ: 0963.898.871' : 'Message Zalo support: 0963.898.871'}</a></li>
              <li>{lang === 'vi' ? 'Liên hệ để được hỗ trợ về tài nguyên, đơn hàng và quyền tải tệp.' : 'Contact us for help with resources, orders and download access.'}</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-[1600px] border-t border-slate-800 px-4 pt-6 text-center text-xs text-slate-500 sm:px-6 lg:px-8 2xl:px-10">
          Copyright 2026 © DHL Stores. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
