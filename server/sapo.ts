export type SapoConnectionStatus = {
  configured: boolean;
  connected: boolean;
  catalogAuthority: "dhlstores";
  inventoryDirection: "dhlstores_to_sapo";
  inventorySyncEnabled: false;
  host?: string;
  status?: number;
  productCount?: number;
  message: string;
};

export const SAPO_SYNC_POLICY = {
  catalogAuthority: "dhlstores" as const,
  inventoryDirection: "dhlstores_to_sapo" as const,
  inventorySyncEnabled: false as const,
  summary: "DHL Stores quản lý sản phẩm, SKU, giá và tồn kho. Sapo chỉ nhận đồng bộ tồn kho theo SKU khi quyền API ghi được xác minh.",
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
      message: "Kết nối Sapo đã sẵn sàng để đối chiếu SKU; DHL Stores vẫn là kho chính và chưa bật ghi tồn sang Sapo.",
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
