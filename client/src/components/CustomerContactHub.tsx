import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircleMore, Send, Sparkles, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

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

export default function CustomerContactHub() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [visitorKey, setVisitorKey] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [feedback, setFeedback] = useState({ displayName: "", contact: "", topic: "suggestion" as "suggestion" | "issue" | "other", message: "" });
  const [chatName, setChatName] = useState("");
  const [chatMessage, setChatMessage] = useState("");

  useEffect(() => setVisitorKey(getVisitorKey()), []);

  const conversationQuery = trpc.support.conversation.useQuery({ visitorKey }, {
    enabled: Boolean(visitorKey),
    refetchInterval: chatOpen ? 12_000 : false,
  });
  const messages = conversationQuery.data?.messages ?? [];
  const customerName = useMemo(() => user?.name || chatName || "Khách DHL Stores", [chatName, user?.name]);

  const submitFeedback = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("DHL Stores đã nhận góp ý của bạn. Cảm ơn bạn!");
      setFeedback({ displayName: "", contact: "", topic: "suggestion", message: "" });
      setFeedbackOpen(false);
    },
    onError: error => toast.error(error.message),
  });
  const sendMessage = trpc.support.send.useMutation({
    onSuccess: async () => {
      setChatMessage("");
      await utils.support.conversation.invalidate({ visitorKey });
    },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.support.markRead.useMutation();

  useEffect(() => {
    if (chatOpen && conversationQuery.data?.conversation?.id) {
      markRead.mutate({ conversationId: conversationQuery.data.conversation.id });
    }
  }, [chatOpen, conversationQuery.data?.conversation?.id]);

  const onFeedbackSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!visitorKey || !feedback.message.trim()) return;
    submitFeedback.mutate({
      visitorKey,
      displayName: feedback.displayName || undefined,
      contact: feedback.contact || undefined,
      topic: feedback.topic,
      message: feedback.message,
    });
  };

  const onChatSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!visitorKey || !chatMessage.trim()) return;
    sendMessage.mutate({ visitorKey, displayName: customerName, body: chatMessage });
  };

  return (
    <>
      <div className="fixed left-3 top-1/2 z-40 -translate-y-1/2 sm:left-4">
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogTrigger asChild>
            <button className="group flex w-11 flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-white px-2 py-3 text-amber-700 shadow-lg transition hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:w-12" aria-label="Gửi góp ý cho DHL Stores">
              <ThumbsUp className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span className="[writing-mode:vertical-rl] text-[10px] font-black uppercase tracking-[0.13em]">Góp ý</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-amber-100 bg-white p-0">
            <div className="bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200 px-6 py-5 text-slate-900">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-black"><ThumbsUp className="h-5 w-5" />Góp ý cho DHL Stores</DialogTitle>
                <DialogDescription className="text-sm text-slate-700">Ý kiến của bạn được gửi thẳng tới chủ cửa hàng để cải thiện sản phẩm và trải nghiệm mua sắm.</DialogDescription>
              </DialogHeader>
            </div>
            <form onSubmit={onFeedbackSubmit} className="space-y-3 p-6">
              <div className="grid grid-cols-2 gap-3">
                <input value={feedback.displayName} onChange={event => setFeedback(current => ({ ...current, displayName: event.target.value }))} maxLength={128} placeholder="Tên của bạn (không bắt buộc)" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
                <input value={feedback.contact} onChange={event => setFeedback(current => ({ ...current, contact: event.target.value }))} maxLength={255} placeholder="Zalo hoặc email (tùy chọn)" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
              </div>
              <select value={feedback.topic} onChange={event => setFeedback(current => ({ ...current, topic: event.target.value as typeof current.topic }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-amber-500">
                <option value="suggestion">Đề xuất cải thiện</option>
                <option value="issue">Báo lỗi / vấn đề</option>
                <option value="other">Nội dung khác</option>
              </select>
              <textarea value={feedback.message} onChange={event => setFeedback(current => ({ ...current, message: event.target.value }))} required maxLength={2000} placeholder="Viết góp ý của bạn tại đây…" className="min-h-32 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
              <Button type="submit" disabled={!visitorKey || submitFeedback.isPending || !feedback.message.trim()} className="w-full bg-slate-900 font-black text-white hover:bg-slate-800">
                {submitFeedback.isPending ? "ĐANG GỬI…" : "GỬI GÓP Ý"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="fixed bottom-4 right-3 z-40 sm:bottom-6 sm:right-5">
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogTrigger asChild>
            <button className="group flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <MessageCircleMore className="h-5 w-5 text-cyan-300 transition-transform group-hover:scale-110" />
              <span>Nhắn tin</span>
            </button>
          </DialogTrigger>
          <DialogContent className="flex h-[min(680px,calc(100vh-2rem))] max-w-md flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0">
            <div className="flex items-start justify-between bg-slate-950 px-5 py-4 text-white">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-black"><MessageCircleMore className="h-5 w-5 text-cyan-300" />Trao đổi trực tiếp</DialogTitle>
                <DialogDescription className="mt-1 text-xs text-slate-300">Chủ DHL Stores sẽ nhận và trả lời trong cổng quản trị.</DialogDescription>
              </div>
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {!messages.length && <div className="rounded-2xl border border-cyan-100 bg-white p-4 text-sm leading-relaxed text-slate-600"><p className="font-black text-slate-900">Chào bạn!</p><p className="mt-1">Bạn cần tư vấn về sản phẩm, SKU, thanh toán hoặc đơn hàng? Hãy để lại tin nhắn tại đây.</p></div>}
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.senderType === "owner" ? "justify-start" : "justify-end"}`}>
                  <p className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${message.senderType === "owner" ? "rounded-tl-sm bg-white text-slate-800 shadow-sm" : "rounded-tr-sm bg-cyan-700 text-white"}`}>{message.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={onChatSubmit} className="border-t border-slate-200 bg-white p-3">
              {!user && !messages.length && <input value={chatName} onChange={event => setChatName(event.target.value)} maxLength={128} placeholder="Tên để xưng hô (tùy chọn)" className="mb-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-cyan-500" />}
              <div className="flex gap-2">
                <textarea value={chatMessage} onChange={event => setChatMessage(event.target.value)} maxLength={2000} placeholder="Nhập tin nhắn…" className="min-h-10 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                <Button type="submit" size="icon" disabled={!visitorKey || sendMessage.isPending || !chatMessage.trim()} className="h-10 w-10 shrink-0 rounded-xl bg-cyan-700 text-white hover:bg-cyan-600"><Send className="h-4 w-4" /></Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
