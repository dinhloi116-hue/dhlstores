import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function Account() {
  const { user, isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const ordersQuery = trpc.store.orders.useQuery(undefined, { enabled: isAuthenticated });
  const orders = ordersQuery.data || [];

  if (!isAuthenticated) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">
            {lang === 'vi' ? 'Vui lòng đăng nhập để xem thông tin tài khoản' : 'Please sign in to view account'}
          </h2>
          <Button onClick={() => startLogin()} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            {t.login}
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'preparing':
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40">Preparing</Badge>;
      case 'shipping':
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40">Shipping</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40">Cancelled</Badge>;
      default:
        return <Badge className="bg-slate-800 text-slate-300">Pending</Badge>;
    }
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg">
              {user?.name?.[0] || "D"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{user?.name || "Customer"}</h1>
              <p className="text-xs text-slate-400 mt-1">{user?.email || "dhlstore@manus.im"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px]">
                  {user?.role === 'admin' ? 'Admin' : 'VIP Member'}
                </Badge>
              </div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <Link href="/admin">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                {t.admin} Dashboard
              </Button>
            </Link>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" /> {t.orderHistory}
            </h2>
            <Badge variant="outline" className="border-slate-700 text-slate-300">{orders.length} orders</Badge>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
              <Package className="w-16 h-16 mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-white">{lang === 'vi' ? 'Bạn chưa có đơn hàng nào' : 'No orders found'}</h3>
              <p className="text-xs text-slate-400 mt-1">{t.emptyCartDesc}</p>
              <Link href="/products" className="inline-block mt-6">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                  {t.exploreShop}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map(order => (
                <div key={order.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white text-sm">Order #{order.id}</span>
                      <span className="text-slate-400">Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Paid</Badge>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div className="p-6 divide-y divide-slate-800/80">
                    {order.items?.map(item => {
                      const p = item.product;
                      return (
                        <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {p && <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded-xl border border-slate-700" />}
                            <div>
                              <p className="text-sm font-bold text-white">{p?.name || "Product"}</p>
                              {item.attributes && <p className="text-xs text-amber-400 font-medium">{item.attributes}</p>}
                              <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity} x {formatCurrency(Number(item.price))}</p>
                            </div>
                          </div>

                          {p?.type === 'digital' && (
                            <div>
                              {order.paymentStatus === 'paid' ? (
                                <a
                                  href={p.fileUrl || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!p.fileUrl) {
                                      e.preventDefault();
                                      toast.info("Digital file ready soon.");
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
                                >
                                  <Download className="w-4 h-4" /> {t.downloadFile} ({p.fileSize || '4K'})
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              ) : (
                                <Badge variant="outline" className="border-rose-500/40 text-rose-400">
                                  Pending payment for download
                                </Badge>
                              )}
                            </div>
                          )}

                          {p?.type === 'physical' && (
                            <div className="text-xs text-slate-400 font-medium">
                              {order.shippingAddress ? (
                                <div className="space-y-1">
                                  <p className="text-slate-300">Ship to: <strong className="text-white">{order.shippingName}</strong> ({order.shippingPhone})</p>
                                  <p className="max-w-xs truncate">{order.shippingAddress}</p>
                                </div>
                              ) : (
                                <span>Physical Item</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-950/40 px-6 py-4 border-t border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total Amount:</span>
                    <span className="text-lg font-black text-amber-400">{formatCurrency(Number(order.totalAmount))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
