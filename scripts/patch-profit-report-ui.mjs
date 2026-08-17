import fs from "node:fs";
const path = "client/src/pages/AdminOrders.tsx";
let s = fs.readFileSync(path, "utf8");
const needle = '<p className="text-[10px] font-semibold text-emerald-700">Đang xem: {revenueRangeLabels[revenueRange]}</p></div>';
const replacement = '<p className="text-[10px] font-semibold text-emerald-700">Đang xem: {revenueRangeLabels[revenueRange]}</p><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"><p className="text-[9px] font-black uppercase text-slate-500">Giá vốn</p><p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(totalCost)}</p></div><div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2"><p className="text-[9px] font-black uppercase text-emerald-700">Lợi nhuận gộp</p><p className="mt-1 text-sm font-black text-emerald-900">{formatCurrency(totalGrossProfit)}</p><p className="mt-0.5 text-[10px] font-bold text-emerald-700">Biên {grossMargin.toFixed(1)}%</p></div></div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><p className="rounded-lg bg-violet-50 px-2.5 py-2 font-black text-violet-800">Lãi số: {formatCurrency(profitByType.digital)}</p><p className="rounded-lg bg-cyan-50 px-2.5 py-2 font-black text-cyan-800">Lãi vật lý: {formatCurrency(profitByType.physical)}</p></div></div>';
if (!s.includes(needle)) throw new Error("Không tìm thấy điểm chèn báo cáo");
s = s.replace(needle, replacement);
fs.writeFileSync(path, s);
