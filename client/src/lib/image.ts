export function isRenderableImageUrl(value?: string | null) {
  const url = String(value || '').trim();
  if (!url || /^generated:/i.test(url)) return false;
  return /^https?:\/\//i.test(url) || /^\/(?:manus-storage|storage)\//i.test(url) || /^data:image\//i.test(url);
}
