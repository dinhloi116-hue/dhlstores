import React from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, CheckCircle2, Clock, Truck, XCircle, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Account() {
  const { user, isAuthenticated } = useAuth();
  const ordersQuery = trpc.store.orders.useQuery(undefined, { enabled: isAuthenticated });
  const orders = ordersQuery.data || [];

  if (!isAuthenticated) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Vui lòng đăng nhập để xem thông tin tài khoản</h2>
          <Button onClick={() => startLogin()} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            Đăng nhập ngay
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40">Đang xử lý / Hoàn tất</Badge>;
      case 'shipping':
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40">Đang giao hàng</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Đã hoàn thành</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40">Đã hủy</Badge>;
      default:
        return <Badge className="bg-slate-800 text-slate-300">Chờ xác nhận</Badge>;
    }
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* User Profile Header */}
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg">
              {user?.name?.[0] || "D"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{user?.name || "Khách hàng DHL Stores"}</h1>
              <p className="text-xs text-slate-400 mt-1">{user?.email || "dhlstore@manus.im"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px]">
                  {user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên thân thiết'}
                </Badge>
              </div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <Link href="/admin">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                Truy cập Bảng Quản Trị Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Orders & Digital Downloads Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" /> Lịch sử đơn hàng & Tải sản phẩm số
            </h2>
            <Badge variant="outline" className="border-slate-700 text-slate-300">{orders.length} đơn hàng</Badge>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
              <Package className="w-16 h-16 mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-white">Bạn chưa có đơn hàng nào</h3>
              <p className="text-xs text-slate-400 mt-1">Hãy khám phá các sản phẩm áo đấu và file số tuyệt vời của DHL Stores ngay nhé!</p>
              <Link href="/products" className="inline-block mt-6">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                  Mua sắm ngay
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map(order => (
                <div key={order.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  {/* Order Header */}
                  <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white text-sm">Đơn hàng #{order.id}</span>
                      <span className="text-slate-400">Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Đã thanh toán</Badge>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-6 divide-y divide-slate-800/80">
                    {order.items?.map(item => {
                      const p = item.product;
                      return (
                        <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {p && <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded-xl border border-slate-700" />}
                            <div>
                              <p className="text-sm font-bold text-white">{p?.name || "Sản phẩm"}</p>
                              {item.attributes && <p className="text-xs text-amber-400 font-medium">{item.attributes}</p>}
                              <p className="text-xs text-slate-400 mt-0.5">Số lượng: {item.quantity} x {formatCurrency(Number(item.price))}</p>
                            </div>
                          </div>

                          {/* Digital Download Button (Only active when paid) */}
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
                                      toast.info("Tệp số đang được chuẩn bị cập nhật.");
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
                                >
                                  <Download className="w-4 h-4" /> Tải xuống tệp số ({p.fileSize || 'Chuẩn 4K'})
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              ) : (
                                <Badge variant="outline" className="border-rose-500/40 text-rose-400">
                                  Chờ thanh toán để mở khóa tải xuống
                                </Badge>
                              )}
                            </div>
                          )}

                          {p?.type === 'physical' && (
                            <div className="text-xs text-slate-400 font-medium">
                              {order.shippingAddress ? (
                                <div className="space-y-1">
                                  <p className="text-slate-300">Giao đến: <strong className="text-white">{order.shippingName}</strong> ({order.shippingPhone})</p>
                                  <p className="max-w-xs truncate">{order.shippingAddress}</p>
                                </div>
                              ) : (
                                <span>Sản phẩm vật lý</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Footer */}
                  <div className="bg-slate-950/40 px-6 py-4 border-t border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Tổng giá trị đơn hàng:</span>
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
