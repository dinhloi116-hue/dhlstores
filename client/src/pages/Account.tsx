import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, ExternalLink, Mail, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Account() {
  const { user, isAuthenticated, refresh } = useAuth();
  const [lang, setLang] = useState<Language>(getClientLanguage());
  const [emailToLink, setEmailToLink] = useState("");
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressDraft, setAddressDraft] = useState({ recipientName: "", phone: "", address: "", isDefault: false });

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const ordersQuery = trpc.store.myOrders.useQuery(undefined, { enabled: isAuthenticated });
  const orders = ordersQuery.data || [];
  const downloadsQuery = trpc.store.downloads.useQuery(undefined, { enabled: isAuthenticated });
  const downloads = downloadsQuery.data || [];
  const addressesQuery = trpc.store.shippingAddresses.useQuery(undefined, { enabled: isAuthenticated });
  const addresses = addressesQuery.data || [];
  const downloadWindowMs = 7 * 24 * 60 * 60 * 1_000;
  const linkEmailMutation = trpc.auth.linkEmail.useMutation({
    onSuccess: async () => {
      await refresh();
      setEmailToLink("");
      toast.success(lang === "vi" ? "Đã liên kết email với tài khoản" : "Email linked to your account");
    },
    onError: error => toast.error(error.message),
  });
  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressDraft({ recipientName: "", phone: "", address: "", isDefault: addresses.length === 0 });
  };
  const addressMutationOptions = {
    onSuccess: async () => {
      await addressesQuery.refetch();
      resetAddressForm();
      toast.success(lang === "vi" ? "Đã lưu địa chỉ giao hàng" : "Shipping address saved");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const createAddressMutation = trpc.store.createShippingAddress.useMutation(addressMutationOptions);
  const updateAddressMutation = trpc.store.updateShippingAddress.useMutation(addressMutationOptions);
  const deleteAddressMutation = trpc.store.deleteShippingAddress.useMutation({
    onSuccess: async () => {
      await addressesQuery.refetch();
      toast.success(lang === "vi" ? "Đã xóa địa chỉ giao hàng" : "Shipping address deleted");
    },
    onError: error => toast.error(error.message),
  });

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
              <p className={`mt-1 text-xs ${user?.email ? "text-slate-500" : "font-semibold text-amber-700"}`}>{user?.email || (lang === "vi" ? "Chưa liên kết email — thêm ở phần bên dưới" : "No email linked — add one below")}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
                  {user?.role === 'owner' ? 'Chủ cửa hàng' : user?.role === 'admin' ? 'Admin' : 'VIP Member'}
                </Badge>
              </div>
            </div>
          </div>
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <Link href="/admin">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                {t.admin} Dashboard
              </Button>
            </Link>
          )}
        </div>

        <section className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-600 text-white"><Mail className="h-5 w-5" /></div>
              <div>
                <h2 className="font-black text-slate-900">{user?.email ? (lang === "vi" ? "Email liên kết" : "Linked email") : (lang === "vi" ? "Bạn chưa liên kết email" : "No email linked yet")}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{user?.email ? (user.emailVerified ? (lang === "vi" ? `Email đã xác minh: ${user.email}` : `Verified email: ${user.email}`) : (lang === "vi" ? `Email đã liên kết: ${user.email}. Chưa xác minh.` : `Linked email: ${user.email}. Not verified.`)) : (lang === "vi" ? "Thêm email để liên kết với tài khoản của bạn. Email phải chưa được dùng ở tài khoản DHL Stores khác." : "Add an email to link it with your account. It must not belong to another DHL Stores account.")}</p>
              </div>
            </div>
            <form onSubmit={event => { event.preventDefault(); linkEmailMutation.mutate({ email: emailToLink || user?.email || "" }); }} className="flex w-full gap-2 sm:w-auto">
              <input value={emailToLink} onChange={event => setEmailToLink(event.target.value)} type="email" required placeholder={user?.email || "email@example.com"} className="h-10 min-w-0 flex-1 rounded-lg border border-purple-200 bg-white px-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:w-64" />
              <Button type="submit" disabled={linkEmailMutation.isPending} className="h-10 bg-purple-600 px-4 text-xs font-black text-white hover:bg-purple-700">{linkEmailMutation.isPending ? "…" : (user?.email ? (lang === "vi" ? "Cập nhật" : "Update") : (lang === "vi" ? "Liên kết email" : "Link email"))}</Button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white"><MapPin className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">Địa chỉ giao hàng</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Lưu sẵn địa chỉ để chọn nhanh khi mua quần áo, patch tay hoặc nameset.</p></div></div><Badge className="w-fit bg-cyan-100 text-cyan-800">{addresses.length} địa chỉ</Badge></div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="space-y-3">{addressesQuery.isLoading ? <p className="py-6 text-center text-sm text-slate-500">Đang tải địa chỉ...</p> : addresses.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><MapPin className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 text-sm font-bold text-slate-700">Chưa có địa chỉ giao hàng</p><p className="mt-1 text-xs text-slate-500">Thêm địa chỉ đầu tiên để dùng cho đơn hàng vật lý.</p></div> : addresses.map(item => <article key={item.id} className={`rounded-xl border p-4 ${item.isDefault ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-slate-900">{item.recipientName}</p>{item.isDefault && <Badge className="bg-cyan-600 text-white">Mặc định</Badge>}</div><p className="mt-1 text-xs font-semibold text-slate-600">{item.phone}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{item.address}</p></div><div className="flex shrink-0 gap-1"><Button type="button" size="icon" variant="ghost" aria-label="Sửa địa chỉ" onClick={() => { setEditingAddressId(item.id); setAddressDraft({ recipientName: item.recipientName, phone: item.phone, address: item.address, isDefault: item.isDefault }); }}><Pencil className="h-4 w-4 text-slate-600" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Xóa địa chỉ" disabled={deleteAddressMutation.isPending} onClick={() => deleteAddressMutation.mutate({ id: item.id })}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></div></article>)}</div>
            <form onSubmit={event => { event.preventDefault(); if (editingAddressId) updateAddressMutation.mutate({ id: editingAddressId, data: addressDraft }); else createAddressMutation.mutate(addressDraft); }} className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">{editingAddressId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3>{editingAddressId && <Button type="button" variant="ghost" size="sm" onClick={resetAddressForm}>Hủy</Button>}</div><div className="mt-3 space-y-3"><input required value={addressDraft.recipientName} onChange={event => setAddressDraft(current => ({ ...current, recipientName: event.target.value }))} placeholder="Họ tên người nhận" className="h-10 w-full rounded-lg border border-cyan-100 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><input required value={addressDraft.phone} onChange={event => setAddressDraft(current => ({ ...current, phone: event.target.value }))} placeholder="Số điện thoại" inputMode="tel" className="h-10 w-full rounded-lg border border-cyan-100 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><textarea required value={addressDraft.address} onChange={event => setAddressDraft(current => ({ ...current, address: event.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" rows={3} className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={addressDraft.isDefault} onChange={event => setAddressDraft(current => ({ ...current, isDefault: event.target.checked }))} />Dùng làm địa chỉ mặc định</label><Button type="submit" disabled={createAddressMutation.isPending || updateAddressMutation.isPending} className="w-full bg-cyan-600 font-black text-white hover:bg-cyan-700"><Plus className="mr-2 h-4 w-4" />{editingAddressId ? "Lưu thay đổi" : "Lưu địa chỉ"}</Button></div></form></div>
        </section>

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
                      {order.hasPreorderItems && <Badge className="bg-rose-100 text-rose-700 border border-rose-200">Order trước · {order.preorderEstimatedDays || "7–10 ngày"}</Badge>}
                      <span className="text-slate-500">Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}>{order.paymentStatus === 'paid' ? (lang === 'vi' ? 'Đã thanh toán' : 'Paid') : (lang === 'vi' ? 'Chờ thanh toán' : 'Awaiting payment')}</Badge>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div className="p-6 divide-y divide-slate-100">
                    {order.hasPhysicalItems && <section className="pb-5"><div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Theo dõi đơn hàng</p><p className="mt-1 text-sm font-black text-slate-900">{order.hasPreorderItems ? "Lộ trình Order trước 7–10 ngày" : "Vận chuyển đơn mua ngay"}</p></div>{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-700"><ExternalLink className="h-3.5 w-3.5" />Mở link theo dõi</a>}</div>{order.hasPreorderItems && <div className="mt-4 grid gap-2 sm:grid-cols-4">{[["ordered", "Đã đặt"], ["central_warehouse", "Hàng về kho trung"], ["ready_hanoi", "Hàng ở Hà Nội"], ["tracking", "Có link theo dõi"]].map(([stage, label], index) => { const completed = ["ordered", "central_warehouse", "ready_hanoi", "tracking"].indexOf(order.trackingStage || "ordered") >= index; return <div key={stage} className={`rounded-lg border px-3 py-2 text-center text-[11px] font-black ${completed ? "border-violet-300 bg-white text-violet-800" : "border-slate-200 bg-slate-100 text-slate-400"}`}>{completed ? "✓ " : ""}{label}</div>; })}</div>}{!order.trackingUrl && <p className="mt-3 text-xs leading-relaxed text-slate-600">{order.hasPreorderItems ? "Chủ cửa hàng sẽ cập nhật lần lượt các mốc thực tế và thêm link vận chuyển khi hàng sẵn sàng gửi." : "Link theo dõi vận chuyển sẽ xuất hiện tại đây sau khi chủ cửa hàng cập nhật."}</p>}</div></section>}
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
                              {item.fulfillmentMode === "preorder" && <p className="mt-1 text-[11px] font-black text-rose-700">Order trước · giảm 10% · dự kiến 7–10 ngày</p>}
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
