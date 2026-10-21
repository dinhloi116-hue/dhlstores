export type SapoConnectionStatus = {
  configured: boolean;
  connected: boolean;
  catalogAuthority: "dhlstores";
  inventoryDirection: "sapo_to_dhlstores";
  inventorySyncEnabled: true;
  host?: string;
  status?: number;
  productCount?: number;
  message: string;
};

export const SAPO_SYNC_POLICY = {
  catalogAuthority: "dhlstores" as const,
  inventoryDirection: "sapo_to_dhlstores" as const,
  inventorySyncEnabled: true as const,
  summary: "Sapo là nguồn tồn kho. DHL Stores chỉ đọc tồn từ Sapo và cập nhật tồn website; website không ghi ngược tồn về Sapo.",
};

type SapoEnvironment = {
  SAPO_STORE_DOMAIN?: string;
  SAPO_API_KEY?: string;
  SAPO_API_SECRET?: string;
};
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type SapoConfiguration =
  | { configured: true; host: string; apiKey: string; apiSecret: string }
  | { configured: false; message: string };

function readSapoEnvironment(): SapoEnvironment {
  return {
    SAPO_STORE_DOMAIN: process.env.SAPO_STORE_DOMAIN,
    SAPO_API_KEY: process.env.SAPO_API_KEY,
    SAPO_API_SECRET: process.env.SAPO_API_SECRET,
  };
}

export function getSapoConfiguration(env: SapoEnvironment = readSapoEnvironment()): SapoConfiguration {
  const apiKey = env.SAPO_API_KEY?.trim();
  const apiSecret = env.SAPO_API_SECRET?.trim();
  const host = env.SAPO_STORE_DOMAIN?.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

  if (!host || !apiKey || !apiSecret) {
    return { configured: false, message: "Chưa đủ thông tin kết nối Sapo." };
  }

  if (!/^[a-z0-9.-]+$/i.test(host)) {
    return { configured: false, message: "Tên miền Sapo không hợp lệ." };
  }

  return { configured: true, host, apiKey, apiSecret };
}

export async function checkSapoProductReadConnection(
  env: SapoEnvironment = readSapoEnvironment(),
  fetchImpl: FetchLike = fetch,
): Promise<SapoConnectionStatus> {
  const configuration = getSapoConfiguration(env);
  if (!configuration.configured) {
    return { configured: false, connected: false, ...SAPO_SYNC_POLICY, message: configuration.message };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const authorization = Buffer.from(`${configuration.apiKey}:${configuration.apiSecret}`).toString("base64");
    const response = await fetchImpl(`https://${configuration.host}/admin/products.json?limit=1`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authorization}`,
        "User-Agent": "DHL-Stores-Sapo-Sync/1.0",
      },
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? "Sapo từ chối xác thực hoặc quyền đọc sản phẩm."
        : `Sapo trả về trạng thái ${response.status} khi kiểm tra quyền đọc.`;
      return { configured: true, connected: false, ...SAPO_SYNC_POLICY, host: configuration.host, status: response.status, message };
    }

    let productCount: number | undefined;
    try {
      const parsed = JSON.parse(body) as { products?: unknown[] };
      if (Array.isArray(parsed.products)) productCount = parsed.products.length;
    } catch {
      return { configured: true, connected: false, ...SAPO_SYNC_POLICY, host: configuration.host, status: response.status, message: "Sapo phản hồi dữ liệu sản phẩm không đúng định dạng JSON." };
    }

    return {
      configured: true,
      connected: true,
      ...SAPO_SYNC_POLICY,
      host: configuration.host,
      status: response.status,
      productCount,
      message: "Kết nối Sapo đã sẵn sàng để đọc tồn theo SKU; tồn kho chỉ đồng bộ một chiều Sapo → DHL Stores.",
    };
  } catch {
    return {
      configured: true,
      connected: false,
      ...SAPO_SYNC_POLICY,
      host: configuration.host,
      message: "Không thể thiết lập kết nối HTTPS đến Admin API Sapo từ máy chủ hiện tại.",
    };
  } finally {
    clearTimeout(timeout);
  }
}


export type SapoInventorySetInput = {
  locationId: string;
  inventoryItemId: string;
  available: number;
};

export type SapoInventorySetResult = {
  ok: boolean;
  status?: number;
  inventoryLevelId?: string;
  available?: number;
  message: string;
};

export async function setSapoInventoryLevel(
  input: SapoInventorySetInput,
  env: SapoEnvironment = readSapoEnvironment(),
  fetchImpl: FetchLike = fetch,
): Promise<SapoInventorySetResult> {
  void input;
  void env;
  void fetchImpl;
  return { ok: false, message: "Đã khóa chiều ghi tồn về Sapo: chỉ cho phép Sapo → DHL Stores." };
}


export type SapoInventorySyncRow = { sku: string; available: number };
export type SapoInventorySyncRowResult = SapoInventorySyncRow & { status: "preview" | "synced" | "skipped" | "failed"; message: string; sapoVariantId?: string; inventoryItemId?: string };

export type SapoInboundInventoryRow = SapoInventorySyncRow & { localVariantId: number; status: "pulled" | "failed" | "missing"; message: string; sapoVariantId?: string; inventoryItemId?: string; sapoAvailable?: number };

export async function pullSapoInventoryBySku(
  rows: Array<SapoInventorySyncRow & { localVariantId: number }>,
  locationId: string,
  env: SapoEnvironment = readSapoEnvironment(),
  fetchImpl: FetchLike = fetch,
): Promise<SapoInboundInventoryRow[]> {
  const configuration = getSapoConfiguration(env);
  if (!configuration.configured) return rows.map(row => ({ ...row, status: "failed", message: configuration.message }));
  const authorization = Buffer.from(`${configuration.apiKey}:${configuration.apiSecret}`).toString("base64");
  const headers = { Accept: "application/json", Authorization: `Basic ${authorization}`, "User-Agent": "DHL-Stores-Sapo-Sync/1.0" };
  const results: SapoInboundInventoryRow[] = [];
  for (const row of rows.slice(0, 50)) {
    const sku = row.sku.trim();
    if (!sku) { results.push({ ...row, status: "missing", message: "Biến thể DHL Stores chưa có SKU." }); continue; }
    try {
      const variantResponse = await fetchImpl(`https://${configuration.host}/admin/variants.json?sku=${encodeURIComponent(sku)}&limit=1`, { headers });
      const variantBody = await variantResponse.text();
      if (!variantResponse.ok) { results.push({ ...row, status: "failed", message: `Không đọc được SKU trên Sapo (HTTP ${variantResponse.status}).` }); continue; }
      const parsed = JSON.parse(variantBody) as { variants?: Array<{ id?: number; inventory_item_id?: number }> };
      const variant = parsed.variants?.[0];
      if (!variant?.id || !variant.inventory_item_id) { results.push({ ...row, status: "missing", message: "Không tìm thấy SKU tương ứng trên Sapo." }); continue; }
      const levelResponse = await fetchImpl(`https://${configuration.host}/admin/inventory_levels.json?inventory_item_id=${encodeURIComponent(String(variant.inventory_item_id))}&location_id=${encodeURIComponent(locationId)}`, { headers });
      const levelBody = await levelResponse.text();
      if (!levelResponse.ok) { results.push({ ...row, status: "failed", message: `Không đọc được tồn SKU trên Sapo (HTTP ${levelResponse.status}).`, sapoVariantId: String(variant.id), inventoryItemId: String(variant.inventory_item_id) }); continue; }
      const levels = JSON.parse(levelBody) as { inventory_levels?: Array<{ id?: number; inventory_item_id?: number; location_id?: number | string; available?: number }> };
      const level = levels.inventory_levels?.find(item => String(item.inventory_item_id) === String(variant.inventory_item_id) && String(item.location_id) === String(locationId));
      if (!level || !Number.isFinite(Number(level.available))) { results.push({ ...row, status: "missing", message: "Sapo chưa có inventory level tại location đã chọn.", sapoVariantId: String(variant.id), inventoryItemId: String(variant.inventory_item_id) }); continue; }
      results.push({ ...row, available: Math.max(0, Math.round(Number(level.available))), status: "pulled", message: "Đã đọc tồn từ Sapo; sẵn sàng cập nhật DHL Stores.", sapoVariantId: String(variant.id), inventoryItemId: String(variant.inventory_item_id), sapoAvailable: Math.max(0, Math.round(Number(level.available))) });
    } catch { results.push({ ...row, status: "failed", message: "Không thể đọc tồn SKU từ Sapo." }); }
  }
  return results;
}

export async function syncSapoInventoryBySku(
  rows: SapoInventorySyncRow[],
  locationId: string,
  options: { dryRun?: boolean; maxRows?: number } = {},
  env: SapoEnvironment = readSapoEnvironment(),
  fetchImpl: FetchLike = fetch,
): Promise<{ dryRun: boolean; results: SapoInventorySyncRowResult[] }> {
  void locationId;
  void env;
  void fetchImpl;
  const dryRun = options.dryRun !== false;
  const maxRows = Math.min(Math.max(options.maxRows ?? 20, 1), 20);
  return { dryRun, results: rows.slice(0, maxRows).map(row => ({ ...row, status: "skipped", message: "Đã khóa chiều DHL Stores → Sapo; hãy dùng Kéo tồn Sapo → web." })) };
}
