import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, User as UserIcon, ShieldCheck, Download, Package, Menu, X, LogOut, Globe, Sparkles } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Banner / Announcement Bar (giống ảnh mẫu màu vàng cam) */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 text-xs py-2 px-4 text-center font-bold tracking-wide shadow-sm flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 animate-bounce" />
        <span>{lang === 'vi' ? 'Tài nguyên thiết kế số · Thanh toán QR · Tải file sau khi xác nhận giao dịch' : 'Digital design resources · QR payment · Files unlock after transaction confirmation'}</span>
        <Sparkles className="w-4 h-4 animate-bounce" />
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
              <img src={logoPath} alt="DHL Stores" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xl font-black tracking-wider text-slate-900 group-hover:text-amber-600 transition-colors">
                DHL <span className="text-amber-600">STORES</span>
              </span>
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">{lang === 'vi' ? 'KHO TÀI NGUYÊN SỐ' : 'DIGITAL RESOURCE HUB'}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <Link href="/" className={`transition-colors hover:text-amber-600 ${location === '/' ? 'text-amber-600' : 'text-slate-700'}`}>
              {t.home}
            </Link>
            <Link href="/products" className={`transition-colors hover:text-amber-600 ${location.startsWith('/products') ? 'text-amber-600' : 'text-slate-700'}`}>
              {t.allProducts}
            </Link>
            <Link href="/products?type=digital" className="transition-colors hover:text-amber-600 text-slate-700 flex items-center gap-1">
              <Download className="w-4 h-4 text-purple-600" /> {lang === 'vi' ? 'Tài nguyên số' : 'Digital resources'}
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-bold gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'vi' ? 'VN / EN' : 'EN / VN'}</span>
            </Button>

            {/* Cart Trigger */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-amber-600 shadow-sm">
                  <ShoppingBag className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{t.cart}</span>
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-slate-900 text-amber-400 font-bold px-1.5 py-0.5 text-xs rounded-full">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-white border-slate-200 text-slate-900 w-full sm:max-w-md flex flex-col">
                <SheetHeader className="border-b border-slate-100 pb-4">
                  <SheetTitle className="text-slate-900 flex items-center justify-between font-bold">
                    <span>{t.cartTitle}</span>
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      {cartItemCount} items
                    </Badge>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {!isAuthenticated ? (
                    <div className="text-center py-12 text-slate-500">
                      <p className="mb-4 text-sm">{lang === 'vi' ? 'Vui lòng đăng nhập để xem giỏ hàng.' : 'Please sign in to view your cart.'}</p>
                      <Button onClick={() => startLogin()} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
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
                            {item.attributes && <p className="text-xs text-amber-600 font-semibold">{item.attributes}</p>}
                            <p className="text-xs text-slate-500 mt-1">{formatCurrency(parseFloat(p.price))} x {item.quantity}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => removeCartMutation.mutate({ cartItemId: item.id })}
                              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                            >
                              {lang === 'vi' ? 'Xóa' : 'Remove'}
                            </button>
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-xs">
                              <button
                                onClick={() => updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity - 1 })}
                                className="text-slate-600 hover:text-black px-1 text-xs font-bold"
                              >-</button>
                              <span className="text-xs font-bold px-1">{item.quantity}</span>
                              <button
                                onClick={() => updateCartMutation.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })}
                                className="text-slate-600 hover:text-black px-1 text-xs font-bold"
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
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-500">{t.subtotal}:</span>
                      <span className="text-lg font-black text-amber-600">{formatCurrency(cartSubtotal)}</span>
                    </div>
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

            {/* Auth / Account */}
            {isAuthenticated && user ? (
              <div className="relative group">
                <Button variant="outline" size="sm" className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800 font-bold gap-1.5">
                  <UserIcon className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">{user.name || "User"}</span>
                </Button>
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 hidden group-hover:block group-focus-within:block z-50">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Signed in as</p>
                    <p className="text-xs font-bold truncate text-slate-800">{user.email || user.name}</p>
                  </div>
                  <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-amber-600">
                    <Package className="w-4 h-4 text-blue-600" /> {t.account}
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-amber-600">
                      <ShieldCheck className="w-4 h-4 text-amber-600" /> {t.admin}
                    </Link>
                  )}
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors mt-1 border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4" /> {t.logout}
                  </button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => startLogin()}
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
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-5 space-y-3 shadow-lg">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-800 hover:text-amber-600 py-1">
              {t.home}
            </Link>
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-800 hover:text-amber-600 py-1">
              {t.allProducts}
            </Link>
            <Link href="/products?type=digital" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-amber-600 py-1">
              <Download className="w-4 h-4 text-purple-600" /> {lang === 'vi' ? 'Tài nguyên số' : 'Digital resources'}
            </Link>
            {isAuthenticated && (
              <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-amber-600 py-1 pt-2 border-t border-slate-100">
                {t.account}
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer (Giống ảnh tham khảo: thông tin công ty / liên hệ rõ ràng ở chân trang nền tối) */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 text-sm border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div>
            <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-wider">ABOUT US</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• {lang === 'vi' ? 'Font, vector, mockup và file in chuyên dụng' : 'Specialised fonts, vectors, mockups and print files'}</li>
              <li>• {lang === 'vi' ? 'Tương thích CorelDraw, Photoshop & Illustrator' : 'Compatible with CorelDraw, Photoshop and Illustrator'}</li>
              <li>• {lang === 'vi' ? 'Thanh toán QR nhanh, tự động xác nhận giao dịch' : 'Fast QR payment with automatic transaction confirmation'}</li>
              <li>• {lang === 'vi' ? 'Tải tài nguyên sau khi đơn hàng đã thanh toán' : 'Download resources after the order is paid'}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-wider">LIÊN HỆ</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>{lang === 'vi' ? 'Kênh hỗ trợ và thông tin liên hệ sẽ được chủ cửa hàng bổ sung trước khi public.' : 'Support channels and contact details will be added by the store owner before launch.'}</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          Copyright 2026 © DHL Stores. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
