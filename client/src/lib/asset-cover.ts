export type AssetCoverConfig = {
  code: string;
  eyebrow: string;
  detail: string;
  gradient: string;
};

const covers: Record<number, AssetCoverConfig> = {
  1: { code: "TYPE 01", eyebrow: "FONT SYSTEM", detail: "OTF · TTF · WOFF", gradient: "from-[#071F3D] via-[#123B70] to-[#3556CB]" },
  2: { code: "SET 02", eyebrow: "NAMESET EDITION", detail: "CLUB · PLAYER · SEASON", gradient: "from-[#151534] via-[#34307C] to-[#7C3AED]" },
  3: { code: "VECT 03", eyebrow: "VECTOR STUDIO", detail: "AI · CDR · SVG", gradient: "from-[#0B2B2D] via-[#125154] to-[#0F766E]" },
  4: { code: "PRINT 04", eyebrow: "DTF / PET READY", detail: "PNG · 300 DPI · CMYK", gradient: "from-[#402006] via-[#964B0D] to-[#F59E0B]" },
  5: { code: "PATCH 05", eyebrow: "BADGE ARCHIVE", detail: "AI · CDR · PDF", gradient: "from-[#3B1025] via-[#831843] to-[#DB2777]" },
  6: { code: "KIT 06", eyebrow: "TEMPLATE SYSTEM", detail: "FULL BODY · 1:1 SCALE", gradient: "from-[#172554] via-[#1D4ED8] to-[#38BDF8]" },
  7: { code: "MOCK 07", eyebrow: "MOCKUP LAB", detail: "PSD · SMART OBJECT", gradient: "from-[#3F1D52] via-[#6B2FA2] to-[#C084FC]" },
  8: { code: "CUT 08", eyebrow: "CLIPART LIBRARY", detail: "PNG · EPS · SVG", gradient: "from-[#0D3340] via-[#0F6978] to-[#14B8A6]" },
  9: { code: "FORM 09", eyebrow: "PATTERN / TEXTURE", detail: "PAT · 4K · SEAMLESS", gradient: "from-[#3A2510] via-[#7C5A16] to-[#D3A733]" },
  10: { code: "ALL 10", eyebrow: "BUNDLE VAULT", detail: "COMPLETE CREATOR KIT", gradient: "from-[#451A03] via-[#C2410C] to-[#F97316]" },
};

const fallbackCover: AssetCoverConfig = {
  code: "DHL 00",
  eyebrow: "DIGITAL RESOURCE",
  detail: "CREATOR LIBRARY",
  gradient: "from-[#0B1220] via-[#172554] to-[#7C3AED]",
};

export function getAssetCoverConfig(categoryId: number): AssetCoverConfig {
  return covers[categoryId] ?? fallbackCover;
}
