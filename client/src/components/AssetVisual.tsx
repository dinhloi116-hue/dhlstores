import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Boxes, FileCode2, Grid2X2, Image, Layers3, Printer, Shirt, Type } from "lucide-react";
import { getAssetCoverConfig } from "@/lib/asset-cover";

type AssetVisualProps = {
  categoryId: number;
  title: string;
  fileSize?: string;
  imageUrl?: string;
  className?: string;
};

const categoryIcons: Record<number, LucideIcon> = {
  1: Type,
  2: Shirt,
  3: FileCode2,
  4: Printer,
  5: BadgeCheck,
  6: Layers3,
  7: Boxes,
  8: Image,
  9: Grid2X2,
  10: Layers3,
};

export default function AssetVisual({ categoryId, title, fileSize, imageUrl, className = "" }: AssetVisualProps) {
  const cover = getAssetCoverConfig(categoryId);
  const Icon = categoryIcons[categoryId] ?? FileCode2;
  const hasImage = imageUrl?.startsWith("/manus-storage/") || /^https?:\/\//.test(imageUrl || "");

  return (
    <div className={`relative isolate h-full w-full overflow-hidden bg-gradient-to-br ${cover.gradient} ${className}`}>
      {hasImage && <><img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-slate-950/20" /></>}
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full border-[18px] border-white/10" />
      <div className="absolute -bottom-16 -left-12 h-48 w-48 rotate-12 border border-white/20" />
      <div className="relative flex h-full flex-col justify-between p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-md border border-white/25 bg-slate-950/25 px-2 py-1 text-[8px] font-black tracking-[0.16em] backdrop-blur-sm">
            {cover.eyebrow}
          </span>
          <Icon className="h-6 w-6 text-[#FFB000]" strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-3xl font-black italic leading-none tracking-tight sm:text-4xl">{cover.code}</p>
          <p className="mt-2 max-w-[19rem] text-[9px] font-bold uppercase tracking-[0.13em] text-white/80 line-clamp-1">{title}</p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/20 pt-2 text-[8px] font-extrabold tracking-[0.12em] text-white/80">
          <span>{cover.detail}</span>
          {fileSize && <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-white">{fileSize}</span>}
        </div>
      </div>
    </div>
  );
}
