import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, User as UserIcon, ShieldCheck, Download, Package, Menu, X, LogOut, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

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
  const beginAccountFlow = () => {
    setAuthDialogOpen(false);
    startLogin();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Banner / Announcement Bar (giống ảnh mẫu màu vàng cam) */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 text-xs py-2 px-4 text-center font-bold tracking-wide shadow-sm flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span>{lang === 'vi' ? 'Tài nguyên thiết kế số · Thanh toán QR · Tải file sau khi xác nhận giao dịch' : 'Digital design resources · QR payment · Files unlock after transaction confirmation'}</span>
        <Sparkles className="w-4 h-4 animate-bounce" />
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto h-16 px-3 sm:h-[4.5rem] sm:px-6 lg:px-8 flex items-center justify-between">
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
          <div className="flex items-center gap-1.5 sm:gap-3">
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

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-purple-950 px-7 py-6 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-amber-300">DHL Stores Account</p>
            <DialogHeader className="mt-2">
              <DialogTitle className="text-xl font-black text-white">{authMode === 'signin' ? (lang === 'vi' ? 'Đăng nhập DHL Stores' : 'Sign in to DHL Stores') : (lang === 'vi' ? 'Tạo tài khoản DHL Stores' : 'Create your DHL Stores account')}</DialogTitle>
              <DialogDescription className="text-sm text-slate-200">{lang === 'vi' ? 'Tài khoản giúp bảo vệ đơn hàng và chỉ mở quyền tải file sau thanh toán.' : 'Your account protects orders and unlocks downloads only after payment.'}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-7 space-y-5">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 gap-1">
              <button type="button" onClick={() => setAuthMode('signin')} className={`rounded-lg px-3 py-2.5 text-xs font-black transition-colors ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lang === 'vi' ? 'ĐĂNG NHẬP' : 'SIGN IN'}</button>
              <button type="button" onClick={() => setAuthMode('signup')} className={`rounded-lg px-3 py-2.5 text-xs font-black transition-colors ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lang === 'vi' ? 'TẠO TÀI KHOẢN' : 'CREATE ACCOUNT'}</button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 leading-relaxed">
              {authMode === 'signin'
                ? (lang === 'vi' ? 'Tiếp tục bằng Google hoặc email bạn đã dùng khi tạo tài khoản. Quên mật khẩu sẽ được xử lý an toàn tại cổng đăng nhập.' : 'Continue with Google or the email used to create your account. Password recovery is handled securely in the sign-in portal.')
                : (lang === 'vi' ? 'Chọn tiếp tục để tạo tài khoản bằng Google hoặc email. Sau đó, mọi đơn hàng và quyền tải file sẽ gắn với tài khoản này.' : 'Continue to create an account with Google or email. Your orders and download access will be linked to this account.')}
            </div>
            <Button onClick={beginAccountFlow} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-5">
              {authMode === 'signin' ? (lang === 'vi' ? 'TIẾP TỤC ĐĂNG NHẬP' : 'CONTINUE TO SIGN IN') : (lang === 'vi' ? 'TIẾP TỤC TẠO TÀI KHOẢN' : 'CONTINUE TO CREATE ACCOUNT')}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-slate-500">{lang === 'vi' ? 'DHL Stores không lưu mật khẩu trực tiếp trên website. Bạn luôn cần đăng nhập trước khi thanh toán hoặc tải tài nguyên.' : 'DHL Stores does not store passwords directly. Sign-in is required before checkout or downloading resources.'}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer (Giống ảnh tham khảo: thông tin công ty / liên hệ rõ ràng ở chân trang nền tối) */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 text-sm border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
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
