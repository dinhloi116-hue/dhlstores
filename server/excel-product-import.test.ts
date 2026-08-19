import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseExcelProducts } from "./excelProductImport";
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

function adminContext(): TrpcContext {
  return {
    user: { id: 880001, openId: "excel-admin", name: "Excel admin", email: "excel@example.com", loginMethod: "local", role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("excel product import", () => {
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
