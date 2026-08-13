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
  const downloadsQuery = trpc.store.downloads.useQuery(undefined, { enabled: isAuthenticated });
  const downloads = downloadsQuery.data || [];
  const downloadWindowMs = 7 * 24 * 60 * 60 * 1_000;

  if (!isAuthenticated) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">
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
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Completed / Unlocked</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-100 text-rose-800 border border-rose-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">Pending</Badge>;
    }
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-sm">
              {user?.name?.[0] || "D"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{user?.name || "Customer"}</h1>
              <p className="text-xs text-slate-500 mt-1">{user?.email || "dhlstore@manus.im"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
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
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" /> {t.orderHistory}
            </h2>
            <Badge variant="outline" className="border-slate-200 text-slate-700">{orders.length} orders</Badge>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Package className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <h3 className="text-base font-bold text-slate-800">{lang === 'vi' ? 'Bạn chưa có đơn hàng nào' : 'No orders found'}</h3>
              <p className="text-xs text-slate-500 mt-1">{t.emptyCartDesc}</p>
              <Link href="/products" className="inline-block mt-5">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                  {t.exploreShop}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900 text-sm">Order #{order.id}</span>
                      <span className="text-slate-500">Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}>{order.paymentStatus === 'paid' ? (lang === 'vi' ? 'Đã thanh toán' : 'Paid') : (lang === 'vi' ? 'Chờ thanh toán' : 'Awaiting payment')}</Badge>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div className="p-6 divide-y divide-slate-100">
                    {order.items?.map(item => {
                      const p = item.product;
                      const download = downloads.find(resource => resource.orderId === order.id && resource.productId === item.productId);
                      const downloadExpired = order.paymentStatus === 'paid' && p?.type === 'digital' && (order.paymentConfirmedAt?.getTime() ?? 0) + downloadWindowMs <= Date.now();
                      return (
                        <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {p && <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded-xl border border-slate-200" />}
                            <div>
                              <p className="text-sm font-bold text-slate-900">{p?.name || "Product"}</p>
                              {item.attributes && <p className="text-xs text-amber-600 font-semibold">{item.attributes}</p>}
                              <p className="text-xs text-slate-500 mt-0.5">Qty: {item.quantity} x {formatCurrency(Number(item.price))}</p>
                            </div>
                          </div>

                          <div>
                            {order.paymentStatus === 'paid' && download?.driveUrl ? (
                              <a
                                href={download.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
                              >
                                <Download className="w-4 h-4" /> {t.downloadFile} ({download.fileSize || '4K'})
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            ) : downloadExpired ? (
                              <Badge variant="outline" className="border-rose-300 text-rose-600">
                                {lang === 'vi' ? 'Liên kết tải đã hết hạn sau 7 ngày' : 'Download link expired after 7 days'}
                              </Badge>
                            ) : order.paymentStatus === 'paid' ? (
                              <Badge variant="outline" className="border-slate-300 text-slate-600">
                                {lang === 'vi' ? 'File đang được chuẩn bị' : 'File is being prepared'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-rose-300 text-rose-600">
                                {lang === 'vi' ? 'Chờ thanh toán để tải file' : 'Payment required to download'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total Amount:</span>
                    <span className="text-lg font-black text-amber-600">{formatCurrency(Number(order.totalAmount))}</span>
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
