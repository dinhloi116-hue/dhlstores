import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "dhlstores-pwa-install-dismissed";
const PROMPT_DELAY_MS = 12_000;
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    if (standalone || (Number.isFinite(dismissedAt) && dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_WINDOW_MS)) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);
    let promptTimer: number | undefined;
    const revealAfterDelay = () => {
      window.clearTimeout(promptTimer);
      promptTimer = window.setTimeout(() => setVisible(true), PROMPT_DELAY_MS);
    };
    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      revealAfterDelay();
    };

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    if (ios) revealAfterDelay();
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.clearTimeout(promptTimer);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setVisible(false);
  };

  return (
    <aside className="fixed inset-x-3 bottom-4 z-[80] mx-auto max-w-md rounded-2xl border border-amber-200 bg-white p-3 shadow-2xl shadow-slate-900/20 sm:inset-x-auto sm:right-5 sm:bottom-5" aria-label="Cài DHL Stores như ứng dụng">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Download className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">Cài DHL Stores như ứng dụng</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{isIos && !installEvent ? "Nhấn Chia sẻ trên Safari, rồi chọn Thêm vào Màn hình chính." : "Mở nhanh hơn từ màn hình chính, vẫn dùng chung tài khoản và giỏ hàng."}</p>
          {installEvent && <Button type="button" onClick={install} size="sm" className="mt-2 h-8 bg-amber-500 px-3 text-xs font-black text-slate-950 hover:bg-amber-400">Cài ứng dụng</Button>}
        </div>
        <button type="button" aria-label="Đóng lời mời cài ứng dụng" onClick={dismiss} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
      </div>
    </aside>
  );
}
