import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { normalizeImageUrl, parseExcelProducts } from "./excelProductImport";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeWorkbook() {
  const rows = [
    { "Đường dẫn/Alias": "ao-do-xanh", "Tên sản phẩm*": "Áo câu lạc bộ", "Thuộc tính 1": "Màu sắc", "Giá trị thuộc tính 1": "Đỏ", "Thuộc tính 2": "Kích thước", "Giá trị thuộc tính 2": "M", "Mã SKU": "AO-DO-M", "Ảnh đại diện": "https://example.com/ao.jpg", "Giá": "69,000", "Mô tả sản phẩm": "<pre>Áo mẫu</pre>" },
    { "Đường dẫn/Alias": "ao-do-xanh", "Tên sản phẩm*": "", "Thuộc tính 1": "Màu sắc", "Giá trị thuộc tính 1": "Xanh", "Thuộc tính 2": "Kích thước", "Giá trị thuộc tính 2": "L", "Mã SKU": "AO-XANH-L", "Ảnh phiên bản": "https://example.com/ao-xanh.jpg", "Giá": "79,000" },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sản phẩm");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function makeCommonWorkbook() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["HỒ SƠ SẢN PHẨM"], ["Trường", "Giá trị / lựa chọn"],
    ["Tên sản phẩm", "Nameset Messi 10"], ["Loại", "B"], ["Đặc tính", "Chống nhiễm màu"], ["Hoàn thiện bề mặt", "Mạ đồng bóng"],
    ["SKU sản phẩm dự kiến", "DHL-MESSI"], ["Giá vốn / sản phẩm (đ)", 14350], ["Giá bán Shopee (đ)", 79000], ["Tồn kho", 10], ["Cân nặng đóng gói (g)", 100],
    ["Link sản phẩm gốc (1688)", "https://1688.example/item"], ["Ảnh bìa / AVT", "https://drive.example/cover"],
    ...Array.from({ length: 16 }, () => [] as string[]),
    ["Mốc số lượng", "Giá / cái"], ["1–9 cái", 49000], ["10–19 cái", 42000], ["20–29 cái", 36000], ["30–49 cái", 32000], ["Từ 50 cái", 27000],
  ]), "01_Ho so san pham");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["PHÂN TÍCH"], ["Ghi chú"], ["Nhóm", "Chi tiết"], ["Bề mặt", "Ánh kim"], ["Nhiệt độ ép", "160 độ"]]), "02_Cau tao thong so");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[], [], [], [], [], [], [], ["KẾT QUẢ", "", "", "", "", "", "Thực thu sau phí", 49142]]), "03_Phan loai va gia");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Kênh", "Mục", "Nội dung"], ["BigSeller", "Mô tả", "Mô tả nameset"], ["Shopee", "Từ khóa chính", "Messi, nameset"]]), "04_Noi dung san pham");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Loại ảnh", "Tên file", "Link Google Drive"], ["Ảnh bìa", "avt.png", "https://drive.example/cover"], ["Ảnh 1", "1.png", "https://drive.example/detail"]]), "09_Link anh");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function adminContext(): TrpcContext {
  return {
    user: { id: 880001, openId: "excel-admin", name: "Excel admin", email: "excel@example.com", loginMethod: "local", role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("excel product import", () => {
  it("normalizes Google Drive file links into browser-loadable image URLs", () => {
    expect(normalizeImageUrl("https://drive.google.com/file/d/1cqOtdBq8uAUttY0navqjB_dPcC2UX4bC/view?usp=drivesdk")).toBe("https://lh3.googleusercontent.com/d/1cqOtdBq8uAUttY0navqjB_dPcC2UX4bC=w1200");
    expect(normalizeImageUrl("https://drive.google.com/open?id=abc123")).toBe("https://lh3.googleusercontent.com/d/abc123=w1200");
    expect(normalizeImageUrl("https://cdn.example.com/product.png")).toBe("https://cdn.example.com/product.png");
  });

  it("groups Bizweb-style rows into one product with variants", () => {
    const parsed = parseExcelProducts(makeWorkbook());
    expect(parsed).toMatchObject({ sheetName: "Sản phẩm", rowCount: 2 });
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0]).toMatchObject({ name: "Áo câu lạc bộ", slug: "ao-do-xanh", price: 69000 });
    expect(parsed.products[0].variants).toEqual(expect.arrayContaining([expect.objectContaining({ sku: "AO-DO-M", attributes: expect.arrayContaining([expect.objectContaining({ name: "Màu sắc", value: "Đỏ" })]) })]));
    expect(parsed.products[0].variants.find(variant => variant.sku === "AO-XANH-L")?.image).toBe("https://example.com/ao-xanh.jpg");
  });

  it("reports the source row when an Excel product starts without a name", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ "Đường dẫn/Alias": "san-pham-loi", "Tên sản phẩm*": "", "Giá": "10,000" }]), "Sản phẩm");
    const parsed = parseExcelProducts(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
    expect(parsed.errors).toEqual(expect.arrayContaining([expect.objectContaining({ row: 2, message: expect.stringContaining("Tên sản phẩm") })]));
  });

  it("reads the shared multi-tab product template with stock, cost, source, specs and tiers", () => {
    const parsed = parseExcelProducts(makeCommonWorkbook());
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0]).toMatchObject({ name: "Nameset Messi 10", price: 49142, stock: 10, costPrice: 14350, supplierUrl: "https://1688.example/item" });
    expect(parsed.products[0].variants[0]).toMatchObject({ sku: "DHL-MESSI", price: 49142, stock: 10, costPrice: 14350, weightGrams: 100 });
    expect(parsed.products[0].wholesaleTiers).toEqual(expect.arrayContaining([{ minQuantity: 1, unitPrice: 49000 }, { minQuantity: 10, unitPrice: 42000 }, { minQuantity: 50, unitPrice: 27000 }]));
    expect(parsed.products[0].specs).toContain("Bề mặt: Ánh kim");
  });

  it("previews and imports the workbook into a physical catalog category", async () => {
    const caller = appRouter.createCaller(adminContext());
    const fileName = "products.xlsx";
    const base64 = makeWorkbook().toString("base64");
    const preview = await caller.catalogAdmin.previewExcelImport({ fileName, base64 });
    expect(preview).toMatchObject({ productCount: 1, variantCount: 2 });
    const physicalCategory = (await caller.catalogAdmin.categories()).find(category => category.slug === "quan-ao-bong-da");
    const result = await caller.catalogAdmin.importExcelProducts({ fileName, base64, categoryId: physicalCategory!.id, skipDuplicates: true });
    expect(result).toMatchObject({ createdProducts: 1, createdVariants: 2 });
  });
});
