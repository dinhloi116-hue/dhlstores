import * as XLSX from "xlsx";

export type ImportedVariant = {
  sku: string;
  price: number;
  image: string;
  stock: number;
  costPrice: number;
  weightGrams?: number;
  attributes: Array<{ name: string; value: string }>;
};
export type ImportedWholesaleTier = { minQuantity: number; unitPrice: number };
export type ImportedProduct = {
  sourceKey: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  tags: string;
  specs: string;
  supplierUrl?: string;
  price: number;
  stock: number;
  costPrice: number;
  weightGrams?: number;
  variants: ImportedVariant[];
  wholesaleTiers: ImportedWholesaleTier[];
};

const headers = { alias: "Đường dẫn/Alias", name: "Tên sản phẩm*", sku: "Mã SKU", image: "Ảnh đại diện", variantImage: "Ảnh phiên bản", description: "Mô tả sản phẩm", tags: "Tags", price: "Giá" };
function text(value: unknown) { return String(value ?? "").trim(); }
function amount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const parsed = Number(text(value).replace(/[^\d,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 220) || `san-pham-${Date.now()}`; }
function cleanDescription(value: unknown) { return text(value).replace(/<\/?pre>/gi, "").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").trim(); }
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
function sheetRows(workbook: XLSX.WorkBook, name: string) { const sheet = workbook.Sheets[name]; return sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true }) : []; }
function labelledValues(workbook: XLSX.WorkBook, sheetName: string) {
  const values = new Map<string, string>();
  for (const row of sheetRows(workbook, sheetName)) { const label = text(row[0]); if (label && row.length > 1) values.set(label, text(row[1])); }
  return values;
}
function findCellByLabel(workbook: XLSX.WorkBook, sheetName: string, label: string) {
  for (const row of sheetRows(workbook, sheetName)) {
    for (let index = 0; index < row.length - 1; index += 1) if (text(row[index]) === label) return text(row[index + 1]);
  }
  return "";
}

function parseCommonWorkbook(workbook: XLSX.WorkBook) {
  const profileSheet = workbook.SheetNames.find(name => /^01[_ ]/i.test(name) || name.toLowerCase().includes("ho so san pham"));
  if (!profileSheet) return undefined;
  const profile = labelledValues(workbook, profileSheet);
  const name = profile.get("Tên sản phẩm") || "";
  if (!name) return { sheetName: profileSheet, rowCount: 0, products: [], errors: [{ row: 1, message: "Mẫu chung thiếu Tên sản phẩm ở tab 01_Ho so san pham" }] };
  const contentSheet = workbook.SheetNames.find(item => /^04[_ ]/i.test(item) || item.toLowerCase().includes("noi dung san pham")) || "";
  const specSheet = workbook.SheetNames.find(item => /^02[_ ]/i.test(item) || item.toLowerCase().includes("cau tao thong so")) || "";
  const pricingSheet = workbook.SheetNames.find(item => /^03[_ ]/i.test(item) || item.toLowerCase().includes("phan loai va gia")) || "";
  const linksSheet = workbook.SheetNames.find(item => /^09[_ ]/i.test(item) || item.toLowerCase().includes("link anh")) || "";
  const description = cleanDescription(findCellByLabel(workbook, contentSheet, "Mô tả"));
  const tags = findCellByLabel(workbook, contentSheet, "Từ khóa chính");
  const price = amount(findCellByLabel(workbook, pricingSheet, "Thực thu sau phí")) || amount(profile.get("Giá bán Shopee (đ)"));
  const stock = amount(profile.get("Tồn kho"));
  const costPrice = amount(profile.get("Giá vốn / sản phẩm (đ)"));
  const weightGrams = amount(profile.get("Cân nặng đóng gói (g)"));
  const cover = profile.get("Ảnh bìa / AVT") || "";
  const supplierUrl = profile.get("Link sản phẩm gốc (1688)") || findCellByLabel(workbook, contentSheet, "Link sản phẩm 1688");
  const specs = (specSheet ? sheetRows(workbook, specSheet).slice(3, 30) : []).filter(row => text(row[0]) && text(row[1]) && !text(row[0]).includes("THÔNG SỐ KỸ THUẬT")).map(row => `${text(row[0])}: ${text(row[1])}`).join("\n");
  const attributes = [["Loại", profile.get("Loại")], ["Hoàn thiện", profile.get("Hoàn thiện bề mặt")], ["Đặc tính", profile.get("Đặc tính")]].filter(([, value]) => value).map(([name, value]) => ({ name: name as string, value: value as string }));
  const profileRows = sheetRows(workbook, profileSheet);
  const wholesaleTiers = [31, 32, 33, 34, 35].map(rowNumber => { const row = profileRows[rowNumber - 1] || []; const match = text(row[0]).match(/(\d+)/); return { minQuantity: match ? Number(match[1]) : 0, unitPrice: amount(row[1]) }; }).filter(tier => tier.minQuantity > 0 && tier.unitPrice > 0);
  const imageLinks = linksSheet ? sheetRows(workbook, linksSheet).slice(2).map(row => text(row[2])).filter(Boolean) : [];
  const image = cover || imageLinks[0] || "generated:catalog-cover";
  const slug = slugify(name);
  const sku = profile.get("SKU sản phẩm dự kiến") || "";
  const variant: ImportedVariant = { sku, price, image, stock, costPrice, weightGrams, attributes };
  return { sheetName: profileSheet, rowCount: Math.max(...workbook.SheetNames.map(sheet => sheetRows(workbook, sheet).length)), products: [{ sourceKey: slug, slug, name, description, image, tags, specs, supplierUrl: supplierUrl || undefined, price, stock, costPrice, weightGrams, variants: [variant], wholesaleTiers }], errors: [] };
}

export function parseExcelProducts(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const common = parseCommonWorkbook(workbook);
  if (common) return common;
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("File Excel không có sheet dữ liệu");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], { defval: "" });
  if (!rows.length) throw new Error("File Excel không có dòng sản phẩm");
  if (rows.length > 1_000) throw new Error("Mỗi lần chỉ được nhập tối đa 1.000 dòng Excel");
  if (!Object.prototype.hasOwnProperty.call(rows[0], headers.name)) throw new Error("Không tìm thấy cột Tên sản phẩm* trong file Excel");
  const bySourceKey = new Map<string, ImportedProduct>(); const optionNamesByProduct = new Map<string, Map<number, string>>(); const errors: Array<{ row: number; message: string }> = []; let activeKey = "";
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]; const name = text(row[headers.name]); const alias = text(row[headers.alias]); const sourceKey = alias || (name ? slugify(name) : activeKey);
    if (!sourceKey) { errors.push({ row: index + 2, message: "Thiếu Đường dẫn/Alias hoặc Tên sản phẩm" }); continue; }
    activeKey = sourceKey; const price = amount(row[headers.price]); let product = bySourceKey.get(sourceKey);
    if (!product) {
      if (!name) { errors.push({ row: index + 2, message: "Dòng mở đầu một sản phẩm cần có Tên sản phẩm*" }); continue; }
      product = { sourceKey, slug: slugify(alias || name), name, description: cleanDescription(row[headers.description]), image: text(row[headers.image]) || text(row[headers.variantImage]) || "generated:catalog-cover", tags: text(row[headers.tags]), specs: "", price, stock: 0, costPrice: 0, variants: [], wholesaleTiers: [] };
      bySourceKey.set(sourceKey, product); optionNamesByProduct.set(sourceKey, new Map());
    }
    const attributes = optionPairs(row, optionNamesByProduct.get(sourceKey) || new Map()); const sku = text(row[headers.sku]);
    if (attributes.length || sku) product.variants.push({ sku, price, image: text(row[headers.variantImage]) || product.image, stock: 0, costPrice: 0, attributes });
  }
  const products = Array.from(bySourceKey.values());
  if (!products.length && !errors.length) throw new Error("Không tìm thấy sản phẩm hợp lệ trong file Excel");
  if (products.length > 100) throw new Error("Mỗi lần chỉ được nhập tối đa 100 sản phẩm");
  return { sheetName: firstSheetName, rowCount: rows.length, products, errors };
}

export function toOptionGroups(product: ImportedProduct) {
  const groups = new Map<string, string[]>();
  for (const variant of product.variants) for (const attribute of variant.attributes) groups.set(attribute.name, Array.from(new Set([...(groups.get(attribute.name) || []), attribute.value])));
  return Array.from(groups.entries()).map(([name, values]) => ({ name, values }));
}
