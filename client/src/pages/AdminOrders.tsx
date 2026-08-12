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
          <h2 className="text-2xl font-bold text-slate-800">
            {lang === 'vi' ? 'Truy cập bị từ chối' : 'Access Denied'}
          </h2>
          <p className="text-xs text-slate-500">
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

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{t.adminDashboard}</h1>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'vi' ? 'Quản lý toàn bộ đơn hàng tài nguyên số của khách hàng.' : 'Manage all digital resource customer orders.'}
              </p>
            </div>
          </div>
          <Link href="/account">
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              {t.account}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">{t.totalRevenue}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">{t.totalOrders}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{orders.length} orders</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900">
            {lang === 'vi' ? 'Danh Sách Đơn Hàng' : 'Orders Management'}
          </h2>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Package className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">{lang === 'vi' ? 'Chưa có đơn hàng nào.' : 'No orders in system.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900 text-sm">Order #{order.id}</span>
                      <span className="text-slate-500">User ID: {order.userId}</span>
                      <span className="text-slate-500">Date: {new Date(order.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{t.orderStatus}:</span>
                      <Select
                        defaultValue={order.status}
                        onValueChange={(val: any) => updateStatusMutation.mutate({ orderId: order.id, status: val })}
                      >
                        <SelectTrigger className="w-40 bg-white border-slate-200 text-xs text-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs">
                          <SelectItem value="completed">Completed (Paid)</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-6 divide-y divide-slate-100">
                    {order.items?.map(item => {
                      const p = item.product;
                      return (
                        <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {p && <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />}
                            <div>
                              <p className="text-sm font-bold text-slate-900">{p?.name || "Resource"}</p>
                              <p className="text-xs text-slate-500">Qty: {item.quantity} x {formatCurrency(Number(item.price))}</p>
                            </div>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                            Digital Asset
                          </Badge>
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
