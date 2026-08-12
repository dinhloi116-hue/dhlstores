import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, User as UserIcon, ShieldCheck, Download, Package, Menu, X, LogOut, Sparkles, Globe } from "lucide-react";
import { toast } from "sonner";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    localStorage.setItem('dhl_lang', lang);
  }, [lang]);

  const t = translations[lang];

  const toggleLanguage = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    toast.success(nextLang === 'vi' ? 'Đã chuyển sang tiếng Việt' : 'Switched to English');
  };

  const utils = trpc.useUtils();
  const cartQuery = trpc.store.cart.useQuery(undefined, { enabled: isAuthenticated });
  const updateCartMutation = trpc.store.updateCart.useMutation({
    onSuccess: () => {
      utils.store.cart.invalidate();
    }
  });
  const removeCartMutation = trpc.store.removeFromCart.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Đã xóa sản phẩm khỏi giỏ hàng" : "Item removed from cart");
      utils.store.cart.invalidate();
    }
  });

  const cartItems = cartQuery.data || [];
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = item.product ? parseFloat(item.product.price) : 0;
    return sum + price * item.quantity;
  }, 0);

  const formatCurrency = (val: number) => {
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const logoPath = "/manus-storage/logodhlstores_c8e433ed.png";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-xs py-2 px-4 text-center font-medium tracking-wide text-slate-200 border-b border-slate-800 flex items-center justify-center gap-3">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>{t.announcement}</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/90 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md group-hover:border-amber-500/60 transition-all">
              <img src={logoPath} alt="DHL Stores" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xl font-black tracking-wider bg-gradient-to-r from-blue-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
                DHL STORES
              </span>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{t.brandSubtitle}</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className={`transition-colors hover:text-amber-400 ${location === '/' ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}>
              {t.home}
            </Link>
            <Link href="/products" className={`transition-colors hover:text-amber-400 ${location.startsWith('/products') ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}>
              {t.allProducts}
            </Link>
            <Link href="/products?type=physical" className="transition-colors hover:text-amber-400 text-slate-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-400" /> {t.physical}
            </Link>
            <Link href="/products?type=digital" className="transition-colors hover:text-amber-400 text-slate-300 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-purple-400" /> {t.digital}
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'vi' ? 'VN / EN' : 'EN / VN'}</span>
            </Button>

            {/* Cart Trigger */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200">
                  <ShoppingBag className="w-4 h-4 mr-1.5 text-amber-400" />
                  <span className="hidden sm:inline">{t.cart}</span>
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 text-xs rounded-full">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-slate-950 border-slate-800 text-slate-100 w-full sm:max-w-md flex flex-col">
                <SheetHeader className="border-b border-slate-800 pb-4">
                  <SheetTitle className="text-slate-100 flex items-center justify-between">
                    <span>{t.cartTitle}</span>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                      {cartItemCount} items
                    </Badge>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {!isAuthenticated ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="mb-4">{lang === 'vi' ? 'Vui lòng đăng nhập để xem giỏ hàng.' : 'Please sign in to view your cart.'}</p>
                      <Button onClick={() => startLogin()} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                        {t.login}
                      </Button>
                    </div>
                  ) : cartItems.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                      <p>{t.emptyCart}</p>
                      <p className="text-xs text-slate-500 mt-1">{t.emptyCartDesc}</p>
                    </div>
                  ) : (
                    cartItems.map(item => {
                      const p = item.product;
                      if (!p) return null;
                      return (
                        <div key={item.id} className="flex gap-3 items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded-lg border border-slate-700" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate text-slate-200">{p.name}</h4>
                            {item.attributes && <p className="text-xs text-amber-400/90 font-medium">{item.attributes}</p>}
                            <p className="text-xs text-slate-400 mt-1">{formatCurrency(parseFloat(p.price))} x {item.quantity}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => removeCartMutation.mutate({ cartItemId: item.id })}
                              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                            >
                              {lang === 'vi' ? 'Xóa' : 'Remove'}
                            </button>
                            <div className="flex items-center gap-1 bg-slate-800 rounded px-1.5 py-0.5">
                              <button
                                onClick={() => updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity - 1 })}
                                className="text-slate-300 hover:text-white px-1 text-xs"
                              >-</button>
                              <span className="text-xs font-semibold px-1">{item.quantity}</span>
                              <button
                                onClick={() => updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })}
                                className="text-slate-300 hover:text-white px-1 text-xs"
                              >+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {isAuthenticated && cartItems.length > 0 && (
                  <div className="border-t border-slate-800 pt-4 space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-400">{t.subtotal}:</span>
                      <span className="text-lg font-bold text-amber-400">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    <Button
                      onClick={() => {
                        setCartOpen(false);
                        window.location.href = "/checkout";
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl shadow-lg"
                    >
                      {t.checkoutBtn}
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* User Account / Auth */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-slate-200">{user.name || "Customer"}</p>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider">{user.role === 'admin' ? 'Admin' : 'Member'}</p>
                </div>
                <div className="relative group">
                  <Button variant="ghost" size="icon" className="rounded-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-amber-400">
                    <UserIcon className="w-5 h-5" />
                  </Button>
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 hidden group-hover:block group-focus-within:block z-50">
                    <div className="px-4 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold truncate text-slate-200">{user.email || user.name}</p>
                    </div>
                    <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-colors">
                      <Package className="w-4 h-4 text-blue-400" /> {t.account}
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-colors">
                        <ShieldCheck className="w-4 h-4 text-amber-400" /> {t.admin}
                      </Link>
                    )}
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-slate-800 transition-colors mt-1 border-t border-slate-800"
                    >
                      <LogOut className="w-4 h-4" /> {t.logout}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => startLogin()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md px-4 text-xs sm:text-sm"
              >
                {t.login}
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-5 space-y-4 shadow-2xl animate-in slide-in-from-top duration-200">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-200 hover:text-amber-400 py-1"
            >
              {t.home}
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-200 hover:text-amber-400 py-1"
            >
              {t.allProducts}
            </Link>
            <Link
              href="/products?type=physical"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-base font-medium text-slate-200 hover:text-amber-400 py-1"
            >
              <Package className="w-4 h-4 text-blue-400" /> {t.physical}
            </Link>
            <Link
              href="/products?type=digital"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-base font-medium text-slate-200 hover:text-amber-400 py-1"
            >
              <Download className="w-4 h-4 text-purple-400" /> {t.digital}
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-base font-medium text-amber-400 py-1 pt-2 border-t border-slate-800"
                >
                  {t.account}
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-base font-medium text-amber-400 py-1"
                  >
                    {t.admin} Dashboard
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 pt-16 pb-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                <img src={logoPath} alt="DHL Stores" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black tracking-wider text-white">DHL STORES</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'vi' ? 'Cửa hàng chuyên cung cấp áo bóng đá thiết kế đỉnh cao cùng các sản phẩm số chất lượng cao phục vụ giới mộ điệu và designer.' : 'Professional hub providing elite football jerseys and high-quality digital assets for fans and creators.'}
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">{lang === 'vi' ? 'Danh mục sản phẩm' : 'Categories'}</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/products?type=physical" className="hover:text-amber-400 transition-colors">{t.physical}</Link></li>
              <li><Link href="/products?type=digital" className="hover:text-amber-400 transition-colors">4K Posters & Artwork</Link></li>
              <li><Link href="/products?type=digital" className="hover:text-amber-400 transition-colors">Sport Typography Fonts</Link></li>
              <li><Link href="/products" className="hover:text-amber-400 transition-colors">{t.allProducts}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">{lang === 'vi' ? 'Hỗ trợ khách hàng' : 'Customer Support'}</h4>
            <ul className="space-y-2.5 text-xs">
              <li><span className="text-slate-300">Hotline / Zalo:</span> 0909 DHL STORE</li>
              <li><span className="text-slate-300">Email:</span> support@dhlstores.vn</li>
              <li><span className="text-slate-300">{lang === 'vi' ? 'Thời gian' : 'Working hours'}:</span> 08:00 - 22:00</li>
              <li><span className="text-slate-300">{lang === 'vi' ? 'Tải file số' : 'Digital downloads'}:</span> 24/7 Automated</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">{lang === 'vi' ? 'Cam kết dịch vụ' : 'Commitment'}</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{lang === 'vi' ? 'Bảo mật thanh toán & giao dịch' : 'Secure transactions'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Download className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>{lang === 'vi' ? 'Tải file tốc độ cao trọn đời' : 'Lifetime high-speed downloads'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 DHL Stores. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">{lang === 'vi' ? 'Thiết kế tối ưu cho mua sắm nhanh và dễ dàng.' : 'Optimized for fast and seamless shopping.'}</p>
        </div>
      </footer>
    </div>
  );
}
