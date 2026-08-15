import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";
import { Copy, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function TestCustomerAccount() {
  const { user, isAuthenticated } = useAuth();
  const isOwner = isAuthenticated && user?.role === "owner";
  const [draft, setDraft] = useState({ name: "Khách kiểm thử", username: "", password: "" });
  const [created, setCreated] = useState<{ name: string; username: string } | null>(null);
  const createCustomer = trpc.operations.createTestCustomer.useMutation({
    onSuccess: account => {
      setCreated({ name: account.name || draft.name || account.username || "Khách kiểm thử", username: account.username || draft.username });
      toast.success("Đã tạo tài khoản khách thử");
      setDraft(current => ({ ...current, username: "", password: "" }));
    },
    onError: error => toast.error(error.message),
  });

  const copyUsername = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.username);
    toast.success("Đã sao chép tên đăng nhập");
  };

  if (!isOwner) return <StoreLayout><div className="mx-auto max-w-xl px-4 py-24 text-center"><ShieldCheck className="mx-auto mb-4 h-14 w-14 text-rose-500" /><h1 className="font-display text-3xl font-black uppercase text-slate-900">Tạo khách thử</h1><p className="mt-2 text-sm text-slate-500">Khu vực này chỉ dành cho chủ cửa hàng.</p><Link href="/admin"><Button className="mt-6 bg-amber-500 text-slate-950 hover:bg-amber-400">Về quản trị</Button></Link></div></StoreLayout>;

  return <StoreLayout><main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">Chủ cửa hàng · kiểm thử</p><h1 className="mt-1 font-display text-3xl font-black uppercase text-slate-900">Tạo tài khoản khách</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Tạo một tài khoản khách riêng để kiểm tra giỏ hàng, địa chỉ, đơn hàng và quyền tải tệp mà không ảnh hưởng đến tài khoản quản trị của bạn.</p></div><Link href="/admin/operations"><Button variant="outline" className="border-slate-300">Trung tâm vận hành</Button></Link></div><form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); createCustomer.mutate({ name: draft.name.trim() || undefined, username: draft.username.trim(), password: draft.password }); }}><label className="text-sm font-bold text-slate-700 sm:col-span-2">Tên hiển thị<Input className="mt-1" value={draft.name} maxLength={120} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Khách test 01" /></label><label className="text-sm font-bold text-slate-700">Tên đăng nhập<Input className="mt-1" value={draft.username} required minLength={3} maxLength={32} pattern="[A-Za-z0-9_]+" onChange={event => setDraft(current => ({ ...current, username: event.target.value.replace(/[^a-zA-Z0-9_]/g, "") }))} placeholder="khach_test_01" /></label><label className="text-sm font-bold text-slate-700">Mật khẩu tạm<Input className="mt-1" type="password" value={draft.password} required minLength={10} maxLength={128} onChange={event => setDraft(current => ({ ...current, password: event.target.value }))} placeholder="Tối thiểu 10 ký tự" /></label><p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs leading-relaxed text-violet-950 sm:col-span-2">Tài khoản mới luôn là <strong>khách hàng</strong>, đang hoạt động và chưa liên kết email. Mở một cửa sổ ẩn danh hoặc trình duyệt khác để đăng nhập kiểm thử, tránh thay đổi phiên chủ cửa hàng hiện tại.</p><Button type="submit" disabled={createCustomer.isPending || !draft.username || draft.password.length < 10} className="bg-violet-600 text-white hover:bg-violet-700 sm:col-span-2"><UserPlus className="mr-2 h-4 w-4" />{createCustomer.isPending ? "Đang tạo…" : "Tạo tài khoản khách thử"}</Button></form>{created && <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm font-black text-emerald-950">Đã tạo: {created.name}</p><p className="mt-1 text-sm text-emerald-900">Tên đăng nhập: <strong>{created.username}</strong></p><p className="mt-2 text-xs leading-relaxed text-emerald-800">Hãy ghi lại mật khẩu tạm bạn vừa đặt. Vì an toàn, website không hiển thị hoặc lưu lại mật khẩu dạng đọc được sau khi biểu mẫu được gửi.</p><Button type="button" variant="outline" className="mt-3 border-emerald-300 bg-white text-emerald-900" onClick={copyUsername}><Copy className="mr-2 h-4 w-4" />Sao chép tên đăng nhập</Button></section>}</div></main></StoreLayout>;
}
