import * as XLSX from "xlsx";

export type ImportedVariant = {
  sku: string;
  price: number;
  image: string;
  attributes: Array<{ name: string; value: string }>;
};

export type ImportedProduct = {
  sourceKey: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  tags: string;
  price: number;
  variants: ImportedVariant[];
};

const headers = {
  alias: "Đường dẫn/Alias",
  name: "Tên sản phẩm*",
  sku: "Mã SKU",
  image: "Ảnh đại diện",
  variantImage: "Ảnh phiên bản",
  description: "Mô tả sản phẩm",
  tags: "Tags",
  price: "Giá",
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function amount(value: unknown) {
  const normalized = text(value).replace(/[^\d,-]/g, "").replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 220) || `san-pham-${Date.now()}`;
}

function cleanDescription(value: unknown) {
  return text(value).replace(/<\/?pre>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

function optionPairs(row: Record<string, unknown>, inheritedNames: Map<number, string>) {
  const options: Array<{ name: string; value: string }> = [];
  for (const index of [1, 2, 3]) {
    const declaredName = text(row[`Thuộc tính ${index}`]);
    if (declaredName) inheritedNames.set(index, declaredName);
    const name = declaredName || inheritedNames.get(index) || "";
    const value = text(row[`Giá trị thuộc tính ${index}`]);
    if (name && value) options.push({ name, value });
  }
  return options;
}

export function parseExcelProducts(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("File Excel không có sheet dữ liệu");
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!rows.length) throw new Error("File Excel không có dòng sản phẩm");
  if (rows.length > 1_000) throw new Error("Mỗi lần chỉ được nhập tối đa 1.000 dòng Excel");
  if (!Object.prototype.hasOwnProperty.call(rows[0], headers.name)) throw new Error("Không tìm thấy cột Tên sản phẩm* trong file Excel");

  const bySourceKey = new Map<string, ImportedProduct>();
  const optionNamesByProduct = new Map<string, Map<number, string>>();
  const errors: Array<{ row: number; message: string }> = [];
  let activeKey = "";
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const name = text(row[headers.name]);
    const alias = text(row[headers.alias]);
    const sourceKey = alias || (name ? slugify(name) : activeKey);
    if (!sourceKey) {
      errors.push({ row: index + 2, message: "Thiếu Đường dẫn/Alias hoặc Tên sản phẩm" });
      continue;
    }
    activeKey = sourceKey;
    const price = amount(row[headers.price]);
    let product = bySourceKey.get(sourceKey);
    if (!product) {
      if (!name) {
        errors.push({ row: index + 2, message: "Dòng mở đầu một sản phẩm cần có Tên sản phẩm*" });
        continue;
      }
      product = {
        sourceKey,
        slug: slugify(alias || name),
        name,
        description: cleanDescription(row[headers.description]),
        image: text(row[headers.image]) || text(row[headers.variantImage]) || "generated:catalog-cover",
        tags: text(row[headers.tags]),
        price,
        variants: [],
      };
      bySourceKey.set(sourceKey, product);
      optionNamesByProduct.set(sourceKey, new Map());
    }
    const attributes = optionPairs(row, optionNamesByProduct.get(sourceKey) || new Map());
    const sku = text(row[headers.sku]);
    if (attributes.length || sku) {
      product.variants.push({ sku, price, image: text(row[headers.variantImage]) || product.image, attributes });
    }
  }

  const products = Array.from(bySourceKey.values());
  if (!products.length && !errors.length) throw new Error("Không tìm thấy sản phẩm hợp lệ trong file Excel");
  if (products.length > 100) throw new Error("Mỗi lần chỉ được nhập tối đa 100 sản phẩm");
  return { sheetName: firstSheetName, rowCount: rows.length, products, errors };
}

export function toOptionGroups(product: ImportedProduct) {
  const groups = new Map<string, string[]>();
  for (const variant of product.variants) {
    for (const attribute of variant.attributes) groups.set(attribute.name, Array.from(new Set([...(groups.get(attribute.name) || []), attribute.value])));
  }
  return Array.from(groups.entries()).map(([name, values]) => ({ name, values }));
}
