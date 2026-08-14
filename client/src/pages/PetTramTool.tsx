import { useEffect } from "react";

const TOOL_URL = "/manus-storage/pet-tram-pro-x_89dce948.html";

export default function PetTramTool() {
  useEffect(() => {
    window.location.replace(TOOL_URL);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white">
      <p className="text-sm font-semibold">Đang mở PET TRAM PRO X…</p>
    </main>
  );
}
