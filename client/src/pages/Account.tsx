import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import vietnamAdminData from "@/data/vietnam-admin-2025.json";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, ExternalLink, Mail, MapPin, Pencil, Plus, Trash2, WalletCards, QrCode, ArrowDownToLine, History, Camera, Heart, BellRing } from "lucide-react";
import { toast } from "sonner";

type AdminProvince = { tentinhmoi: string; phuongxa: Array<{ maphuongxa: number; tenphuongxa: string }> };
const adminProvinces = vietnamAdminData as AdminProvince[];

export default function Account() {
  const { user, isAuthenticated, refresh } = useAuth();
  const [lang, setLang] = useState<Language>(getClientLanguage());
  const [emailToLink, setEmailToLink] = useState("");
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressDraft, setAddressDraft] = useState({ recipientName: "", phone: "", address: "", province: "", ward: "", isDefault: false });
  const [topupAmount, setTopupAmount] = useState("20.000");
  const [withdrawalDraft, setWithdrawalDraft] = useState({ amount: "", bankCode: "", accountNumber: "", accountHolder: "", qrUrl: "", note: "" });
  const [activeTopup, setActiveTopup] = useState<{ topupCode: string; amount: string; qrUrl: string | null } | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "completed" | "cancelled">("all");
  const [trackingViewOrderId, setTrackingViewOrderId] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const ordersQuery = trpc.store.myOrders.useQuery(undefined, { enabled: isAuthenticated });
  const trackingEventsQuery = trpc.store.trackingEvents.useQuery({ orderId: trackingViewOrderId || 0 }, { enabled: isAuthenticated && Boolean(trackingViewOrderId) });
  const orders = ordersQuery.data || [];
  const downloadsQuery = trpc.store.downloads.useQuery(undefined, { enabled: isAuthenticated });
  const downloads = downloadsQuery.data || [];
	  const priorityOrders = orders.filter(order => order.hasPhysicalItems && order.paymentStatus === "paid" && !["completed", "cancelled"].includes(order.status));
	  const historyOrders = orders.filter(order => !priorityOrders.some(priorityOrder => priorityOrder.id === order.id));
	  const filteredHistoryOrders = historyOrders.filter(order => {
	    if (orderFilter === "pending") return order.paymentStatus !== "paid" && order.status !== "cancelled";
	    if (orderFilter === "completed") return order.paymentStatus === "paid" && order.status === "completed";
	    if (orderFilter === "cancelled") return order.status === "cancelled";
	    return true;
	  });
  const addressesQuery = trpc.store.shippingAddresses.useQuery(undefined, { enabled: isAuthenticated });
  const addresses = addressesQuery.data || [];
  const walletQuery = trpc.store.walletSummary.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: activeTopup ? 3500 : false });
  const wallet = walletQuery.data;
  const walletWithdrawalsQuery = trpc.store.walletWithdrawals.useQuery(undefined, { enabled: isAuthenticated });
  const favoritesQuery = trpc.store.favorites.useQuery(undefined, { enabled: isAuthenticated });
  const restockSubscriptionsQuery = trpc.store.restockSubscriptions.useQuery(undefined, { enabled: isAuthenticated });
  const downloadWindowMs = 7 * 24 * 60 * 60 * 1_000;
  const uploadAvatarMutation = trpc.auth.uploadAvatar.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success(lang === "vi" ? "Đã cập nhật ảnh đại diện" : "Profile photo updated");
    },
    onError: error => toast.error(error.message),
  });
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
    setAddressDraft({ recipientName: "", phone: "", address: "", province: "", ward: "", isDefault: addresses.length === 0 });
  };
  const selectedProvince = adminProvinces.find(item => item.tentinhmoi === addressDraft.province);
  const normalizedAddressDraft = { recipientName: addressDraft.recipientName, phone: addressDraft.phone, address: [addressDraft.address.trim(), addressDraft.ward, addressDraft.province].filter(Boolean).join(", "), isDefault: addressDraft.isDefault };
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
  const createWalletWithdrawal = trpc.store.createWalletWithdrawal.useMutation({
    onSuccess: async () => {
      setWithdrawalDraft({ amount: "", bankCode: "", accountNumber: "", accountHolder: "", qrUrl: "", note: "" });
      await Promise.all([walletQuery.refetch(), walletWithdrawalsQuery.refetch()]);
      toast.success("Đã gửi yêu cầu rút tiền. Số dư đã được khóa chờ cửa hàng duyệt.");
    },
    onError: error => toast.error(error.message),
  });
  const uploadWithdrawalQr = trpc.store.uploadWalletWithdrawalQr.useMutation({
    onSuccess: result => { setWithdrawalDraft(current => ({ ...current, qrUrl: result.url })); toast.success("Đã tải mã QR tài khoản nhận tiền"); },
    onError: error => toast.error(error.message),
  });
  const createWalletTopup = trpc.store.createWalletTopup.useMutation({
    onSuccess: topup => {
      setActiveTopup({ topupCode: topup.topupCode, amount: topup.amount, qrUrl: topup.qrUrl });
      walletQuery.refetch();
      toast.success("Đã tạo mã QR nạp số dư. Hãy chuyển đúng số tiền và giữ nguyên nội dung.");
    },
    onError: error => toast.error(error.message),
  });
  const cancelRestockMutation = trpc.store.cancelRestock.useMutation({ onSuccess: () => { void restockSubscriptionsQuery.refetch(); toast.success("Đã hủy đăng ký nhắc hàng"); }, onError: error => toast.error(error.message) });

  const parseMoneyInput = (value: string) => Number(value.replace(/\D/g, ""));
  const formatMoneyInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits ? Number(digits).toLocaleString("vi-VN") : "";
  };

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

  const handleAvatarChange = (file?: File) => {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(lang === "vi" ? "Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF" : "Only JPG, PNG, WEBP or GIF images are supported");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === "vi" ? "Ảnh đại diện tối đa 5 MB" : "Profile photo must be 5 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || "");
      uploadAvatarMutation.mutate({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleWithdrawalQrChange = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Mã QR chỉ hỗ trợ JPG, PNG hoặc WEBP"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Mã QR tối đa 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => uploadWithdrawalQr.mutate({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64: String(reader.result || "") });
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
	      case 'completed':
	        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">{lang === 'vi' ? 'Hoàn tất / Đã mở' : 'Completed / Unlocked'}</Badge>;
	      case 'cancelled':
	        return <Badge className="bg-rose-100 text-rose-800 border border-rose-200">{lang === 'vi' ? 'Đã hủy' : 'Cancelled'}</Badge>;
	      default:
	        return <Badge className="bg-slate-100 text-slate-700">{lang === 'vi' ? 'Đang chờ' : 'Pending'}</Badge>;
    }
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-10 sm:px-6 lg:px-8 2xl:px-10">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <label className="group relative block h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 text-white shadow-sm focus-within:ring-2 focus-within:ring-amber-400">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = "none"; }} /> : <span className="flex h-full w-full items-center justify-center text-2xl font-black">{user?.name?.[0]?.toUpperCase() || "D"}</span>}
              <span className="absolute inset-0 grid place-items-center bg-slate-950/60 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><Camera className="h-5 w-5" /></span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploadAvatarMutation.isPending} onChange={event => { handleAvatarChange(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <div>
	              <h1 className="text-2xl font-black text-slate-900">{user?.name || (lang === 'vi' ? 'Khách hàng' : 'Customer')}</h1>
              <p className={`mt-1 text-xs ${user?.email ? "text-slate-500" : "font-semibold text-amber-700"}`}>{user?.email || (lang === "vi" ? "Chưa liên kết email — thêm ở phần bên dưới" : "No email linked — add one below")}</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">{uploadAvatarMutation.isPending ? (lang === "vi" ? "Đang tải ảnh…" : "Uploading photo…") : (lang === "vi" ? "Chạm vào ảnh để thay đổi" : "Tap photo to change")}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
	                  {user?.role === 'owner' ? 'Chủ cửa hàng' : user?.role === 'admin' ? (lang === 'vi' ? 'Quản trị' : 'Admin') : (lang === 'vi' ? 'Thành viên' : 'VIP Member')}
                </Badge>
              </div>
            </div>
          </div>
	          {(user?.role === 'admin' || user?.role === 'owner') && (
	            <Link href="/admin">
	              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
	                {lang === 'vi' ? 'Quản trị' : `${t.admin} Dashboard`}
	              </Button>
	            </Link>
	          )}
	        </div>

	        <div className="grid items-start gap-6 xl:grid-cols-2">
	          <div className="space-y-6">

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

	        <section id="wallet" className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-sm sm:p-6">
	          <div className="flex flex-col gap-4 border-b border-amber-100 pb-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950"><WalletCards className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Ví số dư</p><h2 className="mt-1 text-xl font-black text-slate-900">{formatCurrency(wallet?.balance || 0)}</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Nạp tiền qua QR chuyển khoản và dùng số dư để thanh toán toàn bộ đơn hàng trong giỏ.</p></div></div><Link href="/cart"><Button variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100">Dùng số dư thanh toán</Button></Link></div>
	          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]"><div className="space-y-4"><form onSubmit={event => { event.preventDefault(); createWalletTopup.mutate({ amount: parseMoneyInput(topupAmount) }); }} className="rounded-xl border border-amber-200 bg-white/80 p-4"><div className="flex items-center gap-2"><ArrowDownToLine className="h-4 w-4 text-amber-700" /><h3 className="text-sm font-black text-slate-900">Nạp số dư qua QR chuyển khoản</h3></div><p className="mt-1 text-xs leading-relaxed text-slate-600">Tối thiểu 1.000đ, tối đa 20.000.000đ mỗi lượt. Hệ thống chỉ cộng tiền khi số tiền và mã nạp khớp hoàn toàn.</p><div className="mt-3 flex gap-2"><input value={topupAmount} onChange={event => setTopupAmount(formatMoneyInput(event.target.value))} inputMode="numeric" className="h-10 min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" placeholder="Ví dụ: 20.000" /><Button type="submit" disabled={createWalletTopup.isPending || parseMoneyInput(topupAmount) < 1000} className="bg-amber-500 text-slate-950 hover:bg-amber-400">{createWalletTopup.isPending ? "Đang tạo…" : "Tạo QR"}</Button></div></form><form onSubmit={event => { event.preventDefault(); createWalletWithdrawal.mutate({ amount: parseMoneyInput(withdrawalDraft.amount), bankCode: withdrawalDraft.bankCode, accountNumber: withdrawalDraft.accountNumber, accountHolder: withdrawalDraft.accountHolder, qrUrl: withdrawalDraft.qrUrl, note: withdrawalDraft.note || undefined }); }} className="rounded-xl border border-rose-200 bg-rose-50/60 p-4"><div className="flex items-center gap-2"><ArrowDownToLine className="h-4 w-4 rotate-180 text-rose-700" /><h3 className="text-sm font-black text-slate-900">Rút số dư thành tiền</h3></div><p className="mt-1 text-xs leading-relaxed text-slate-600">Số dư khả dụng: <strong className="text-rose-700">{formatCurrency(wallet?.balance || 0)}</strong>. Tiền sẽ được khóa khi chờ duyệt; cửa hàng chuyển thủ công sau khi kiểm tra.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><input required value={withdrawalDraft.amount} onChange={event => setWithdrawalDraft(current => ({ ...current, amount: formatMoneyInput(event.target.value) }))} inputMode="numeric" placeholder="Số tiền rút, tối thiểu 10.000" className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" /><input required value={withdrawalDraft.bankCode} onChange={event => setWithdrawalDraft(current => ({ ...current, bankCode: event.target.value.toUpperCase() }))} placeholder="Mã ngân hàng, ví dụ VCB" className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-sm font-bold uppercase outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" /><input required value={withdrawalDraft.accountNumber} onChange={event => setWithdrawalDraft(current => ({ ...current, accountNumber: event.target.value.replace(/\D/g, "") }))} inputMode="numeric" placeholder="Số tài khoản nhận" className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" /><input required value={withdrawalDraft.accountHolder} onChange={event => setWithdrawalDraft(current => ({ ...current, accountHolder: event.target.value.toUpperCase() }))} placeholder="Tên chủ tài khoản" className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-sm font-bold uppercase outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" /></div><input value={withdrawalDraft.note} onChange={event => setWithdrawalDraft(current => ({ ...current, note: event.target.value }))} placeholder="Ghi chú (không bắt buộc)" className="mt-2 h-10 w-full rounded-lg border border-rose-200 bg-white px-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" /><div className="mt-3 rounded-xl border border-dashed border-rose-300 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-slate-900">Mã QR tài khoản nhận tiền của bạn <span className="text-rose-600">*</span></p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Tải QR ngân hàng của chính bạn để cửa hàng đối chiếu và chuyển khoản thủ công.</p></div><label className="inline-flex cursor-pointer items-center rounded-lg bg-rose-100 px-3 py-2 text-xs font-black text-rose-800 hover:bg-rose-200"><Camera className="mr-2 h-4 w-4" />{uploadWithdrawalQr.isPending ? "Đang tải…" : withdrawalDraft.qrUrl ? "Đổi mã QR" : "Tải mã QR"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadWithdrawalQr.isPending} onChange={event => { handleWithdrawalQrChange(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div>{withdrawalDraft.qrUrl && <div className="mt-3 flex items-center gap-3 rounded-lg bg-rose-50 p-2"><img src={withdrawalDraft.qrUrl} alt="QR tài khoản nhận tiền của khách" className="h-20 w-20 rounded-lg border border-rose-100 bg-white object-contain" /><p className="text-[11px] font-semibold text-emerald-700">Đã tải QR. Quản trị viên sẽ xem ảnh này trong yêu cầu rút.</p></div>}</div><Button type="submit" disabled={createWalletWithdrawal.isPending || !withdrawalDraft.qrUrl || parseMoneyInput(withdrawalDraft.amount) < 10000 || parseMoneyInput(withdrawalDraft.amount) > Number(wallet?.balance || 0)} className="mt-3 w-full bg-rose-600 font-black text-white hover:bg-rose-700">{createWalletWithdrawal.isPending ? "Đang gửi yêu cầu…" : "Gửi yêu cầu rút tiền"}</Button></form><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-slate-600" /><h3 className="text-sm font-black text-slate-900">Biến động gần đây</h3></div><div className="mt-3 max-h-48 divide-y divide-slate-100 overflow-y-auto">{walletQuery.isLoading ? <p className="py-4 text-xs text-slate-500">Đang tải lịch sử…</p> : !(wallet?.movements || []).length ? <p className="py-4 text-xs text-slate-500">Chưa có biến động số dư.</p> : (wallet?.movements || []).map(item => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-xs"><div className="min-w-0"><p className="truncate font-bold text-slate-800">{item.reason}</p><p className="mt-0.5 text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</p></div><div className={`shrink-0 text-right font-black ${Number(item.amount) >= 0 ? "text-emerald-700" : "text-rose-700"}`}><p>{Number(item.amount) >= 0 ? "+" : ""}{formatCurrency(item.amount)}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">Còn {formatCurrency(item.balanceAfter)}</p></div></div>)}</div></div><div className="rounded-xl border border-rose-100 bg-white p-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-rose-600" /><h3 className="text-sm font-black text-slate-900">Lịch sử rút tiền</h3></div><div className="mt-3 max-h-40 space-y-2 overflow-y-auto">{walletWithdrawalsQuery.isLoading ? <p className="text-xs text-slate-500">Đang tải…</p> : !(walletWithdrawalsQuery.data || []).length ? <p className="text-xs text-slate-500">Chưa có yêu cầu rút tiền.</p> : (walletWithdrawalsQuery.data || []).map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"><div><p className="font-black text-slate-800">{formatCurrency(item.netAmount)} · {item.bankCode}</p><p className="mt-0.5 text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")} · {item.accountNumber}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${item.status === "paid" ? "bg-emerald-100 text-emerald-800" : item.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{item.status === "paid" ? "Đã chuyển" : item.status === "rejected" ? "Đã từ chối" : item.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}</span></div>)}</div></div></div>{activeTopup && <aside className="rounded-2xl border border-violet-200 bg-white p-3 text-center shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-violet-700">QR nạp số dư</p>{activeTopup.qrUrl ? <img src={activeTopup.qrUrl} alt={`QR nạp ví ${activeTopup.topupCode}`} className="mx-auto mt-2 w-full max-w-[220px] rounded-xl border border-slate-100" /> : <div className="mt-2 grid aspect-square place-items-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500"><QrCode className="h-8 w-8" /></div>}<p className="mt-2 text-sm font-black text-slate-900">{formatCurrency(activeTopup.amount)}</p><p className="mt-1 break-all font-mono text-xs font-black text-violet-700">{activeTopup.topupCode}</p>{wallet?.topups?.find(item => item.topupCode === activeTopup.topupCode)?.status === "paid" ? <p className="mt-2 rounded-lg bg-emerald-100 px-2 py-1.5 text-xs font-black text-emerald-800">Đã cộng vào số dư</p> : <p className="mt-2 text-[11px] leading-relaxed text-slate-600">Quét QR, chuyển đúng số tiền và giữ nguyên nội dung. Hệ thống đang tự đối soát.</p>}</aside>}</div>
        </section>

        <section id="addresses" className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white"><MapPin className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">Địa chỉ giao hàng</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Lưu sẵn địa chỉ để chọn nhanh khi mua quần áo, patch tay hoặc nameset.</p></div></div><Badge className="w-fit bg-cyan-100 text-cyan-800">{addresses.length} địa chỉ</Badge></div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="space-y-3">{addressesQuery.isLoading ? <p className="py-6 text-center text-sm text-slate-500">Đang tải địa chỉ...</p> : addresses.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><MapPin className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 text-sm font-bold text-slate-700">Chưa có địa chỉ giao hàng</p><p className="mt-1 text-xs text-slate-500">Thêm địa chỉ đầu tiên để dùng cho đơn hàng vật lý.</p></div> : addresses.map(item => <article key={item.id} className={`rounded-xl border p-4 ${item.isDefault ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-slate-900">{item.recipientName}</p>{item.isDefault && <Badge className="bg-cyan-600 text-white">Mặc định</Badge>}</div><p className="mt-1 text-xs font-semibold text-slate-600">{item.phone}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{item.address}</p></div><div className="flex shrink-0 gap-1"><Button type="button" size="icon" variant="ghost" aria-label="Sửa địa chỉ" onClick={() => { setEditingAddressId(item.id); setAddressDraft({ recipientName: item.recipientName, phone: item.phone, address: item.address, province: "", ward: "", isDefault: item.isDefault }); }}><Pencil className="h-4 w-4 text-slate-600" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Xóa địa chỉ" disabled={deleteAddressMutation.isPending} onClick={() => deleteAddressMutation.mutate({ id: item.id })}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></div></article>)}</div>
            <form onSubmit={event => { event.preventDefault(); if (!normalizedAddressDraft.address) { toast.error("Vui lòng nhập địa chỉ chi tiết hoặc chọn tỉnh/phường."); return; } if (editingAddressId) updateAddressMutation.mutate({ id: editingAddressId, data: normalizedAddressDraft }); else createAddressMutation.mutate(normalizedAddressDraft); }} className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">{editingAddressId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3>{editingAddressId && <Button type="button" variant="ghost" size="sm" onClick={resetAddressForm}>Hủy</Button>}</div><div className="mt-3 space-y-3"><input required value={addressDraft.recipientName} onChange={event => setAddressDraft(current => ({ ...current, recipientName: event.target.value }))} placeholder="Họ tên người nhận" className="h-10 w-full rounded-lg border border-cyan-100 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><input required value={addressDraft.phone} onChange={event => setAddressDraft(current => ({ ...current, phone: event.target.value }))} placeholder="Số điện thoại" inputMode="tel" className="h-10 w-full rounded-lg border border-cyan-100 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><div className="grid gap-2 sm:grid-cols-2"><select value={addressDraft.province} onChange={event => setAddressDraft(current => ({ ...current, province: event.target.value, ward: "" }))} className="h-10 w-full rounded-lg border border-cyan-100 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"><option value="">Chọn Tỉnh/Thành phố</option>{adminProvinces.map(item => <option key={item.tentinhmoi} value={item.tentinhmoi}>{item.tentinhmoi}</option>)}</select><select value={addressDraft.ward} onChange={event => setAddressDraft(current => ({ ...current, ward: event.target.value }))} disabled={!selectedProvince} className="h-10 w-full rounded-lg border border-cyan-100 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50"><option value="">Chọn Phường/Xã</option>{(selectedProvince?.phuongxa || []).map(item => <option key={item.maphuongxa} value={item.tenphuongxa}>{item.tenphuongxa}</option>)}</select></div><textarea required value={addressDraft.address} onChange={event => setAddressDraft(current => ({ ...current, address: event.target.value }))} placeholder="Số nhà, đường, ngõ, tòa nhà..." rows={3} className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={addressDraft.isDefault} onChange={event => setAddressDraft(current => ({ ...current, isDefault: event.target.checked }))} />Dùng làm địa chỉ mặc định</label><Button type="submit" disabled={createAddressMutation.isPending || updateAddressMutation.isPending} className="w-full bg-cyan-600 font-black text-white hover:bg-cyan-700"><Plus className="mr-2 h-4 w-4" />{editingAddressId ? "Lưu thay đổi" : "Lưu địa chỉ"}</Button></div></form></div>
	        </section>

	          </div>
	          <div className="space-y-6">
	        <section className="grid gap-5 lg:grid-cols-2">
          <div id="favorites" className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3 border-b border-rose-100 pb-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white"><Heart className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">Sản phẩm yêu thích</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Lưu sản phẩm để quay lại mua nhanh hơn khi cần.</p></div></div><Badge className="bg-rose-100 text-rose-800">{(favoritesQuery.data || []).length}</Badge></div><div className="mt-4 space-y-2">{favoritesQuery.isLoading ? <p className="text-xs text-slate-500">Đang tải…</p> : !(favoritesQuery.data || []).length ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center"><Heart className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-xs font-semibold text-slate-600">Chưa có sản phẩm yêu thích.</p><Link href="/products" className="mt-2 inline-flex text-xs font-black text-rose-700 hover:text-rose-900">Khám phá sản phẩm</Link></div> : (favoritesQuery.data || []).map(item => item.product ? <Link key={item.id} href={`/product/${item.product.slug}`} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition hover:border-rose-200 hover:bg-rose-50"><img src={item.product.image} alt="" className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black text-slate-900">{item.product.name}</span><span className="mt-0.5 block text-[10px] font-bold text-rose-700">{formatCurrency(item.product.price)}</span></span><span className="text-[10px] font-black text-slate-500">Xem</span></Link> : null)}</div></div>
          <div id="restock" className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3 border-b border-amber-100 pb-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-slate-950"><BellRing className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">Nhắc lại hàng</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Khi quản trị cập nhật SKU từ hết hàng sang còn hàng, trạng thái sẽ báo tại đây.</p></div></div><Badge className="bg-amber-100 text-amber-800">{(restockSubscriptionsQuery.data || []).filter(item => item.status !== "cancelled").length}</Badge></div><div className="mt-4 space-y-2">{restockSubscriptionsQuery.isLoading ? <p className="text-xs text-slate-500">Đang tải…</p> : !(restockSubscriptionsQuery.data || []).filter(item => item.status !== "cancelled").length ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center"><BellRing className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-xs font-semibold text-slate-600">Chưa có SKU nào cần nhắc hàng.</p></div> : (restockSubscriptionsQuery.data || []).filter(item => item.status !== "cancelled").map(item => <div key={item.id} className={`rounded-xl border p-3 ${item.status === "ready" ? "border-emerald-200 bg-emerald-50" : "border-amber-100 bg-amber-50/50"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-900">{item.product?.name || `Sản phẩm #${item.productId}`}</p><p className="mt-1 text-[10px] text-slate-600">{item.variant?.sku || item.variant?.color || item.variant?.size || "Kho mặc định"} · đăng ký {new Date(item.createdAt).toLocaleDateString("vi-VN")}</p></div><Badge className={item.status === "ready" ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"}>{item.status === "ready" ? "Đã về hàng" : "Đang chờ"}</Badge></div><div className="mt-3 flex flex-wrap gap-2">{item.product && <Link href={`/product/${item.product.slug}`} className="inline-flex rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-700 hover:bg-slate-100">Mở sản phẩm</Link>}<Button type="button" size="sm" variant="ghost" disabled={cancelRestockMutation.isPending} onClick={() => cancelRestockMutation.mutate({ id: item.id })} className="h-7 px-2 text-[10px] text-rose-700 hover:bg-rose-100 hover:text-rose-800">Hủy nhắc hàng</Button></div></div>)}</div></div>
        </section>

	        <div id="orders" className="space-y-5">
	          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Package className="h-5 w-5 text-amber-600" /> {t.orderHistory}</h2><Badge variant="outline" className="border-slate-200 text-slate-700">{orders.length} {lang === "vi" ? "đơn hàng" : "orders"}</Badge></div>
	          {orders.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center"><Package className="mx-auto mb-3 h-12 w-12 text-slate-300" /><h3 className="text-base font-bold text-slate-800">{lang === "vi" ? "Bạn chưa có đơn hàng nào" : "No orders found"}</h3><Link href="/products" className="mt-4 inline-block"><Button className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-600">{t.exploreShop}</Button></Link></div> : <>
	            {priorityOrders.length > 0 && <section className="space-y-2 rounded-2xl border border-violet-200 bg-violet-50/70 p-3 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wide text-violet-800">Đơn đang xử lý & giao hàng</p><Badge className="border border-violet-200 bg-white text-violet-800">{priorityOrders.length} đơn</Badge></div>{priorityOrders.map(order => { const firstItem = order.items?.[0]; const product = firstItem?.product; return <article key={order.id} className="rounded-xl border border-violet-100 bg-white px-3 py-2.5"><div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><span className="font-black text-slate-900">Đơn #{order.id}</span>{order.hasPreorderItems && <Badge className="bg-rose-100 text-rose-700">Order trước</Badge>}{getStatusBadge(order.status)}<span className="ml-auto font-black text-amber-600">{formatCurrency(Number(order.totalAmount))}</span></div><div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-600">{product && <img src={product.image} alt="" className="h-7 w-7 rounded-md border border-slate-200 object-cover" />}<span className="truncate">{product?.name || "Sản phẩm"}{(order.items?.length || 0) > 1 ? ` +${(order.items?.length || 1) - 1}` : ""}</span><span className="text-violet-700">{order.trackingUrl ? "· Có link theo dõi" : order.hasPreorderItems ? "· Đang cập nhật lộ trình" : "· Đang chuẩn bị giao"}</span>{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-bold text-violet-700 hover:underline"><ExternalLink className="h-3 w-3" />Theo dõi</a>}{order.hasPreorderItems && <Button type="button" size="sm" variant="outline" className="ml-auto h-7 border-violet-200 px-2 text-[10px] font-black text-violet-700" onClick={() => setTrackingViewOrderId(current => current === order.id ? null : order.id)}>{trackingViewOrderId === order.id ? "Ẩn hành trình" : "Xem hành trình"}</Button>}</div>{trackingViewOrderId === order.id && order.hasPreorderItems && <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-violet-800">Hành trình đơn Order 1688</p>{trackingEventsQuery.isLoading ? <p className="mt-2 text-xs text-slate-500">Đang tải hành trình…</p> : !(trackingEventsQuery.data || []).length ? <p className="mt-2 text-xs text-slate-500">Cửa hàng chưa cập nhật mã vận chuyển/chặng mới.</p> : <div className="mt-2 space-y-2">{(trackingEventsQuery.data || []).map(event => <div key={event.id} className="flex gap-2 rounded-lg border border-violet-100 bg-white p-2"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-xs font-black text-slate-900">{event.stage}</p>{event.carrier && <Badge className="bg-slate-100 text-slate-700">{event.carrier}</Badge>}</div><p className="mt-0.5 text-[11px] text-slate-600">{[event.trackingNumber, event.location, event.description].filter(Boolean).join(" · ") || "Đang cập nhật"}</p><time className="mt-0.5 block text-[10px] text-slate-400">{new Date(event.eventTime).toLocaleString("vi-VN")}</time></div>{event.trackingUrl && <a href={event.trackingUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] font-bold text-violet-700 hover:underline">Tra cứu</a>}</div>)}</div>}</div>}</article>; })}</section>}
	            <section className="space-y-2"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{priorityOrders.length ? "Lịch sử đơn hàng" : "Tất cả đơn hàng"}</p><div className="flex flex-wrap items-center gap-1.5" aria-label="Lọc lịch sử đơn hàng">{([['all', 'Tất cả'], ['pending', 'Chờ thanh toán'], ['completed', 'Hoàn tất'], ['cancelled', 'Đã hủy']] as const).map(([value, label]) => <Button key={value} type="button" size="sm" variant="outline" onClick={() => setOrderFilter(value)} className={`h-7 rounded-full px-2.5 text-[10px] font-black ${orderFilter === value ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</Button>)}<span className="ml-1 text-xs text-slate-500">{filteredHistoryOrders.length} đơn</span></div></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{filteredHistoryOrders.length === 0 ? <p className="px-4 py-7 text-center text-sm text-slate-500">Không có đơn phù hợp với bộ lọc này.</p> : filteredHistoryOrders.map(order => { const firstItem = order.items?.[0]; const product = firstItem?.product; const orderDownloads = downloads.filter(resource => resource.orderId === order.id && resource.driveUrl); return <article key={order.id} className="border-b border-slate-100 px-3 py-2.5 last:border-b-0"><div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><span className="font-black text-slate-900">#{order.id}</span><span className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>{order.paymentStatus === "paid" ? <Badge className="bg-emerald-100 text-emerald-800">Đã thanh toán</Badge> : <Badge className="bg-amber-100 text-amber-800">Chờ thanh toán</Badge>}{getStatusBadge(order.status)}<span className="ml-auto font-black text-amber-600">{formatCurrency(Number(order.totalAmount))}</span></div><div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-600">{product && <img src={product.image} alt="" className="h-7 w-7 rounded-md border border-slate-200 object-cover" />}<span className="truncate">{product?.name || "Sản phẩm"}{(order.items?.length || 0) > 1 ? ` +${(order.items?.length || 1) - 1}` : ""}</span>{orderDownloads.length > 0 && <span className="ml-auto text-violet-700">{orderDownloads.map(download => <a key={`${download.orderId}-${download.productId}`} href={download.driveUrl || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold hover:underline"><Download className="h-3 w-3" />Tải tệp</a>)}</span>}</div></article>; })}</div></section>
	          </>}
	        </div>
	          </div>
	        </div>
	      </div>
	    </StoreLayout>
  );
}
