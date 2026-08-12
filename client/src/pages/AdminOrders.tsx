import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Package, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function AdminOrders() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const ordersQuery = trpc.store.orders.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const orders = ordersQuery.data || [];

  const updateStatusMutation = trpc.store.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success(lang === 'vi' ? "Đã cập nhật trạng thái đơn hàng thành công" : "Order status updated successfully");
      utils.store.orders.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Không thể cập nhật trạng thái");
    }
  });

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
          <ShieldCheck className="w-16 h-16 mx-auto text-rose-500" />
          <h2 className="text-2xl font-bold text-white">
            {lang === 'vi' ? 'Truy cập bị từ chối' : 'Access Denied'}
          </h2>
          <p className="text-slate-400 text-xs">
            {lang === 'vi' ? 'Bạn cần có quyền quản trị viên (Admin) để truy cập trang này.' : 'Admin privileges required.'}
          </p>
          <Link href="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              {t.home}
            </Button>
          </Link>
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

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const physicalOrdersCount = orders.filter(o => o.hasPhysicalItems).length;
  const digitalOrdersCount = orders.filter(o => !o.hasPhysicalItems).length;

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{t.adminDashboard}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'vi' ? 'Quản lý toàn bộ đơn hàng vật lý và sản phẩm số của khách hàng.' : 'Manage all physical and digital customer orders.'}
              </p>
            </div>
          </div>
          <Link href="/account">
            <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200">
              {t.account}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">{t.totalRevenue}</p>
              <p className="text-xl font-black text-white mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">{t.totalOrders}</p>
              <p className="text-xl font-black text-white mt-1">{orders.length} orders</p>
            </div>
          </div>

          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Breakdown</p>
              <p className="text-xs font-semibold text-slate-300 mt-1">Jerseys: {physicalOrdersCount} | Digital: {digitalOrdersCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-white">
            {lang === 'vi' ? 'Danh Sách Đơn Hàng Cần Xử Lý' : 'Orders Management'}
          </h2>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
              <Package className="w-16 h-16 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">{lang === 'vi' ? 'Chưa có đơn hàng nào.' : 'No orders in system.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map(order => (
                <div key={order.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white text-sm">Order #{order.id}</span>
                      <span className="text-slate-400">User ID: {order.userId}</span>
                      <span className="text-slate-400">Date: {new Date(order.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{t.orderStatus}:</span>
                      <Select
                        defaultValue={order.status}
                        onValueChange={(val: any) => updateStatusMutation.mutate({ orderId: order.id, status: val })}
                      >
                        <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                          <SelectItem value="preparing">Preparing</SelectItem>
                          <SelectItem value="shipping">Shipping</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-6 divide-y divide-slate-800/80">
                    {order.items?.map(item => {
                      const p = item.product;
                      return (
                        <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {p && <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-slate-700" />}
                            <div>
                              <p className="text-sm font-semibold text-white">{p?.name || "Product"}</p>
                              {item.attributes && <p className="text-xs text-amber-400">{item.attributes}</p>}
                              <p className="text-xs text-slate-400">Qty: {item.quantity} x {formatCurrency(Number(item.price))}</p>
                            </div>
                          </div>
                          <Badge className={p?.type === 'physical' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}>
                            {p?.type === 'physical' ? 'Jersey' : 'Digital'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {order.shippingAddress && (
                    <div className="bg-blue-950/20 px-6 py-3 border-t border-slate-800 text-xs flex flex-col sm:flex-row justify-between gap-2 text-slate-300">
                      <div>
                        <strong className="text-white">Shipping Address:</strong> {order.shippingName} ({order.shippingPhone}) - {order.shippingAddress}
                      </div>
                      {order.shippingNote && (
                        <div><strong className="text-white">Note:</strong> {order.shippingNote}</div>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-950/40 px-6 py-4 border-t border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total Revenue:</span>
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
