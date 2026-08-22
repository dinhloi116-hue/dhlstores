import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ImagePlus, MessageCircleMore, Send, Sparkles, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

function getVisitorKey() {
  const storageKey = "dhl_support_visitor_key";
  const existing = localStorage.getItem(storageKey);
  if (existing && /^[a-zA-Z0-9_-]{16,96}$/.test(existing)) return existing;
  const next = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `dhl_${crypto.randomUUID().replace(/-/g, "_")}`
    : `dhl_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
  localStorage.setItem(storageKey, next);
  return next;
}

type PendingImage = { fileName: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string };

export default function CustomerContactHub() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [visitorKey, setVisitorKey] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [supportMenuOpen, setSupportMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState({ displayName: "", contact: "", topic: "suggestion" as "suggestion" | "issue" | "other", message: "" });
  const [chatName, setChatName] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [feedbackImage, setFeedbackImage] = useState<PendingImage | null>(null);
  const [chatImage, setChatImage] = useState<PendingImage | null>(null);

  const selectImage = (file: File | undefined, setImage: (image: PendingImage | null) => void) => {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp", "image/gif"] as const).includes(file.type as PendingImage["mimeType"])) return toast.error("Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh đính kèm tối đa 5 MB");
    const reader = new FileReader();
    reader.onload = () => setImage({ fileName: file.name, mimeType: file.type as PendingImage["mimeType"], base64: String(reader.result) });
    reader.onerror = () => toast.error("Không thể đọc ảnh đã chọn");
    reader.readAsDataURL(file);
  };

  useEffect(() => setVisitorKey(getVisitorKey()), []);

  useEffect(() => {
    const openInternalChat = () => setChatOpen(true);
    window.addEventListener("dhlstores-open-chat", openInternalChat);
    return () => window.removeEventListener("dhlstores-open-chat", openInternalChat);
  }, []);

  const conversationQuery = trpc.support.conversation.useQuery({ visitorKey }, {
    enabled: Boolean(visitorKey && user),
    refetchInterval: chatOpen ? 12_000 : false,
  });
  const messages = conversationQuery.data?.messages ?? [];
  const customerName = useMemo(() => user?.name || chatName || "Khách DHL Stores", [chatName, user?.name]);

  const submitFeedback = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("DHL Stores đã nhận góp ý của bạn. Cảm ơn bạn!");
      setFeedback({ displayName: "", contact: "", topic: "suggestion", message: "" });
      setFeedbackImage(null);
      setFeedbackOpen(false);
    },
    onError: error => toast.error(error.message),
  });
  const sendMessage = trpc.support.send.useMutation({
    onSuccess: async () => {
      setChatMessage("");
      setChatImage(null);
      await utils.support.conversation.invalidate({ visitorKey });
    },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.support.markRead.useMutation();

  useEffect(() => {
    if (user && chatOpen && conversationQuery.data?.conversation?.id) {
      markRead.mutate({ conversationId: conversationQuery.data.conversation.id });
    }
  }, [chatOpen, conversationQuery.data?.conversation?.id]);

  const onFeedbackSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để gửi góp ý");
      startLogin();
      return;
    }
    if (!visitorKey || (!feedback.message.trim() && !feedbackImage)) return;
    submitFeedback.mutate({
      visitorKey,
      displayName: feedback.displayName || undefined,
      contact: feedback.contact || undefined,
      topic: feedback.topic,
      submission: { message: feedback.message, ...(feedbackImage ? { image: feedbackImage } : {}) },
    });
  };

  const onChatSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để nhắn tin với cửa hàng");
      startLogin();
      return;
    }
    if (!visitorKey || (!chatMessage.trim() && !chatImage)) return;
    sendMessage.mutate({ visitorKey, displayName: customerName, submission: { message: chatMessage, ...(chatImage ? { image: chatImage } : {}) } });
  };

  return (
    <>
      <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 sm:block sm:right-4">
        <Sheet open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <SheetTrigger asChild>
            <button className="group flex w-11 flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-white px-2 py-3 text-amber-700 shadow-lg transition hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:w-12" aria-label="Gửi góp ý cho DHL Stores">
              <ThumbsUp className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span className="[writing-mode:vertical-rl] text-[10px] font-black uppercase tracking-[0.13em]">Góp ý</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full gap-0 border-amber-100 bg-white p-0 sm:max-w-2xl">
            <div className="bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200 px-6 py-5 text-slate-900">
              <SheetHeader className="p-0">
                <SheetTitle className="flex items-center gap-2 text-xl font-black"><ThumbsUp className="h-5 w-5" />Góp ý cho DHL Stores</SheetTitle>
                <SheetDescription className="text-sm text-slate-700">Ý kiến của bạn được gửi thẳng tới chủ cửa hàng để cải thiện sản phẩm và trải nghiệm mua sắm.</SheetDescription>
              </SheetHeader>
            </div>
            <form onSubmit={onFeedbackSubmit} className="flex flex-1 flex-col space-y-4 overflow-y-auto p-6 sm:p-8">
              {!user && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><p className="font-black">Đăng nhập để gửi góp ý</p><p className="mt-1">Tài khoản giúp DHL Stores phản hồi đúng hội thoại và bảo vệ ảnh bạn đính kèm.</p><button type="button" onClick={() => startLogin()} className="mt-2 font-black underline underline-offset-4">Đăng nhập ngay</button></div>}
              <div className="grid grid-cols-2 gap-3">
                <input value={feedback.displayName} onChange={event => setFeedback(current => ({ ...current, displayName: event.target.value }))} maxLength={128} placeholder="Tên của bạn (không bắt buộc)" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
                <input value={feedback.contact} onChange={event => setFeedback(current => ({ ...current, contact: event.target.value }))} maxLength={255} placeholder="Zalo hoặc email (tùy chọn)" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
              </div>
              <select value={feedback.topic} onChange={event => setFeedback(current => ({ ...current, topic: event.target.value as typeof current.topic }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-amber-500">
                <option value="suggestion">Đề xuất cải thiện</option>
                <option value="issue">Báo lỗi / vấn đề</option>
                <option value="other">Nội dung khác</option>
              </select>
              <textarea value={feedback.message} onChange={event => setFeedback(current => ({ ...current, message: event.target.value }))} maxLength={2000} placeholder="Viết góp ý của bạn tại đây…" className="min-h-52 w-full flex-1 resize-none rounded-xl border border-slate-200 p-4 text-sm leading-relaxed outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3"><label className="inline-flex cursor-pointer items-center gap-2 text-xs font-black text-amber-900"><ImagePlus className="h-4 w-4" />Đính kèm ảnh<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => selectImage(event.target.files?.[0], setFeedbackImage)} /></label>{feedbackImage && <div className="flex items-center gap-2"><img src={feedbackImage.base64} alt="Ảnh góp ý chuẩn bị gửi" className="h-10 w-10 rounded-lg border border-amber-200 object-cover" /><button type="button" aria-label="Bỏ ảnh đính kèm" onClick={() => setFeedbackImage(null)} className="text-amber-800 hover:text-rose-600"><X className="h-4 w-4" /></button></div>}</div>
              <Button type="submit" disabled={!user || !visitorKey || submitFeedback.isPending || (!feedback.message.trim() && !feedbackImage)} className="w-full bg-slate-900 font-black text-white hover:bg-slate-800">
                {submitFeedback.isPending ? "ĐANG GỬI…" : "GỬI GÓP Ý"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="fixed right-3 top-[calc(50%+4.25rem)] z-40 hidden sm:block sm:right-4">
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetTrigger asChild>
            <button className="group flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <MessageCircleMore className="h-5 w-5 text-cyan-300 transition-transform group-hover:scale-110" />
              <span>Nhắn tin</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex h-full w-full max-w-none flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 sm:max-w-2xl">
            <div className="flex items-start justify-between bg-slate-950 px-5 py-4 text-white">
              <div>
                <SheetTitle className="flex items-center gap-2 text-base font-black text-white"><MessageCircleMore className="h-5 w-5 text-cyan-300" />Trao đổi trực tiếp</SheetTitle>
                <SheetDescription className="mt-1 text-xs text-slate-300">Chủ DHL Stores sẽ nhận và trả lời trong cổng quản trị.</SheetDescription>
              </div>
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {!user && <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-relaxed text-cyan-950"><p className="font-black">Đăng nhập để trao đổi với cửa hàng</p><p className="mt-1 text-xs">Lịch sử trò chuyện và ảnh đính kèm sẽ được liên kết an toàn với tài khoản của bạn.</p><button type="button" onClick={() => startLogin()} className="mt-3 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-black text-white">Đăng nhập</button></div>}
              {!messages.length && <div className="rounded-2xl border border-cyan-100 bg-white p-4 text-sm leading-relaxed text-slate-600"><p className="font-black text-slate-900">Chào bạn!</p><p className="mt-1">Bạn cần tư vấn về sản phẩm, SKU, thanh toán hoặc đơn hàng? Hãy để lại tin nhắn tại đây.</p></div>}
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.senderType === "owner" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[86%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${message.senderType === "owner" ? "rounded-tl-sm bg-white text-slate-800 shadow-sm" : "rounded-tr-sm bg-cyan-700 text-white"}`}>{message.body && <p className="whitespace-pre-wrap">{message.body}</p>}{message.imageUrl && <a href={message.imageUrl} target="_blank" rel="noreferrer"><img src={message.imageUrl} alt="Ảnh đính kèm trong hội thoại" className="mt-2 max-h-56 rounded-xl border border-white/30 object-contain" /></a>}</div>
                </div>
              ))}
            </div>
            <form onSubmit={onChatSubmit} className="border-t border-slate-200 bg-white p-3">
              {chatImage && <div className="mb-2 flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50 p-2"><div className="flex items-center gap-2"><img src={chatImage.base64} alt="Ảnh tin nhắn chuẩn bị gửi" className="h-10 w-10 rounded-md object-cover" /><span className="max-w-48 truncate text-xs font-semibold text-cyan-900">{chatImage.fileName}</span></div><button type="button" aria-label="Bỏ ảnh đính kèm" onClick={() => setChatImage(null)} className="text-cyan-800 hover:text-rose-600"><X className="h-4 w-4" /></button></div>}
              <div className="flex gap-2">
                <textarea value={chatMessage} onChange={event => setChatMessage(event.target.value)} maxLength={2000} placeholder="Nhập tin nhắn…" className="min-h-10 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => selectImage(event.target.files?.[0], setChatImage)} /></label>
                <Button type="submit" size="icon" disabled={!user || !visitorKey || sendMessage.isPending || (!chatMessage.trim() && !chatImage)} className="h-10 w-10 shrink-0 rounded-xl bg-cyan-700 text-white hover:bg-cyan-600"><Send className="h-4 w-4" /></Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="fixed bottom-5 right-3 z-40 flex flex-col items-end gap-2 sm:hidden">
        {supportMenuOpen && <div className="flex flex-col items-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
          <button type="button" onClick={() => { setChatOpen(true); setSupportMenuOpen(false); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white"><MessageCircleMore className="h-4 w-4 text-cyan-300" />Nhắn cửa hàng</button>
          <button type="button" onClick={() => { setFeedbackOpen(true); setSupportMenuOpen(false); }} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-800"><ThumbsUp className="h-4 w-4" />Gửi góp ý</button>
        </div>}
        <button type="button" onClick={() => setSupportMenuOpen(current => !current)} aria-label={supportMenuOpen ? "Đóng hỗ trợ" : "Mở hỗ trợ"} aria-expanded={supportMenuOpen} className="inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-black text-white shadow-xl transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"><span>{supportMenuOpen ? "Đóng" : "Hỗ trợ"}</span>{supportMenuOpen ? <X className="h-4 w-4" /> : <MessageCircleMore className="h-5 w-5 text-cyan-300" />}</button>
      </div>
    </>
  );
}
