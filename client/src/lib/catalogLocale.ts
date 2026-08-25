import type { Language } from "@/lib/i18n";

type LocalizedCatalogText = {
  name: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
};

export function catalogName(item: LocalizedCatalogText, lang: Language) {
  return lang === "en" && item.nameEn?.trim() ? item.nameEn : item.name;
}

export function catalogDescription(item: LocalizedCatalogText, lang: Language) {
  if (lang === "en" && item.descriptionEn?.trim()) return item.descriptionEn;
  return item.description ?? "";
}
