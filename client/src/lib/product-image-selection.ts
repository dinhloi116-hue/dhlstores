export type ProductImageVariant = { image?: string | null };

export function buildProductImageUrls(
  representativeImage: string | null | undefined,
  gallery: string,
  variants: ProductImageVariant[],
  limit = 20,
) {
  return Array.from(
    new Set([
      representativeImage ?? "",
      ...gallery.split(/\n|,/).map(value => value.trim()),
      ...variants.map(variant => variant.image || ""),
    ].filter(url => url && !url.startsWith("generated:"))),
  ).slice(0, limit);
}

export function selectRepresentativeImage<T extends { image: string }>(draft: T, imageUrl: string): T {
  return { ...draft, image: imageUrl };
}
