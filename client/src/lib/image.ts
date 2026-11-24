export function isRenderableImageUrl(value?: string | null) {
  const url = String(value || '').trim();
  if (!url || /^generated:/i.test(url)) return false;
  return /^https?:\/\//i.test(url) || /^\/(?:manus-storage|storage)\//i.test(url) || /^data:image\//i.test(url);
}

/** Retry private storage through the deployed CDN when the sandbox proxy lacks R2 config. */
export function getStoragePreviewFallback(value?: string | null) {
  const url = String(value || '').trim();
  if (!/^\/(?:manus-storage|storage)\//i.test(url) || typeof window === 'undefined') return null;
  if (!window.location.hostname.endsWith('.manus.computer')) return null;
  return `https://cuahangtoit-9a4r8wsz.manus.space${url}`;
}
