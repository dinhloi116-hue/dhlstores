const COMPARE_KEY = "dhlstores.compare.productIds";
const RECENT_KEY = "dhlstores.recent.productIds";

function readIds(key: string, limit: number) {
  if (typeof window === "undefined") return [] as number[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter(id => Number.isInteger(id) && id > 0).slice(0, limit) : [];
  } catch {
    return [] as number[];
  }
}

function writeIds(key: string, ids: number[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("dhlstores-customer-tools"));
}

export function getComparedProductIds() {
  return readIds(COMPARE_KEY, 4);
}

export function toggleComparedProduct(id: number) {
  const current = getComparedProductIds();
  if (current.includes(id)) {
    writeIds(COMPARE_KEY, current.filter(item => item !== id));
    return { added: false, limitReached: false };
  }
  if (current.length >= 4) return { added: false, limitReached: true };
  writeIds(COMPARE_KEY, [...current, id]);
  return { added: true, limitReached: false };
}

export function getRecentProductIds() {
  return readIds(RECENT_KEY, 6);
}

export function addRecentProduct(id: number) {
  const current = getRecentProductIds().filter(item => item !== id);
  writeIds(RECENT_KEY, [id, ...current].slice(0, 6));
}

export function clearRecentProducts() {
  writeIds(RECENT_KEY, []);
}
