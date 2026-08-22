import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public SKU inventory presentation", () => {
  it("keeps SKU and stock in the same compact metadata group", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("SKU + tồn kho");
    expect(source).toContain('inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100');
  });

  it("opens a hover preview from the whole SKU row when that SKU has an image", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('data-sku-preview-variant={variant.image ? variant.id : undefined}');
    expect(source).toContain('querySelectorAll<HTMLButtonElement>("[data-sku-preview-variant]")');
    expect(source).toContain('const variantId = Number(row.dataset.skuPreviewVariant)');
    expect(source).toContain('h-11 w-11 overflow-hidden');
    expect(source).toContain('id="sku-inventory-panel"');
    expect(source).toContain('bất kỳ vùng nào của SKU có ảnh');
    expect(source).toContain('SKU hết hàng vẫn xem được ảnh');
  });

  it("keeps SKU inventory in the purchase flow without narrowing either panel", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('className="space-y-4">{optionGroups.map');
    expect(source).toContain('{skuInventoryPanel}');
    expect(source).toContain('id="product-purchase-actions"');
    expect(source).not.toContain('purchaseModes.after(purchaseActions)');
    expect(source).not.toContain('purchaseActions.after(panel)');
    expect(source).toContain('panel.before(purchaseActions)');
    expect(source).toContain('max-h-72 overflow-y-auto');
    expect(source).toContain('lg:col-span-7 lg:h-full lg:overflow-y-auto lg:pr-3');
  });

  it("zooms the main product image on desktop hover without changing mobile behavior", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('md:cursor-zoom-in');
    expect(source).toContain('md:group-hover:scale-[1.65]');
    expect(source).toContain('Rê chuột để phóng to');
  });

  it("offers wallet or QR payment and accessible quantity entry for each SKU", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('paymentMethod === "wallet_balance"');
    expect(source).toContain('paymentMethod === "qr"');
    expect(source).toContain('Thanh toán bằng số dư ví');
    expect(source).toContain('aria-label={`Số lượng ${formatVariantOptions(variant)}`}');
    expect(source).toContain('const [variantQuantities, setVariantQuantities]');
    expect(source).toContain('updateVariantQuantity(variant.id');
    expect(source).toContain('paymentMethod: paymentMethod === "wallet_balance" ? "wallet_balance" : undefined');
  });

  it("uses SKU aggregate stock and keeps physical cards free of long descriptions", () => {
    const catalogSource = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    expect(dbSource).toContain("const stockByProduct = await Promise.all(list.map(async product =>");
    expect(dbSource).toContain("variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)");
    expect(catalogSource).toContain("Number(p.stock) > 0 ? `Còn ${p.stock}` : 'Hết hàng'");
    expect(catalogSource).toContain("{!isPhysicalCatalog && <p className=\"mt-1 line-clamp-2 text-[11px] text-slate-500\">");
  });

  it("makes cart controls explicit and prevents invalid decrement", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("aria-label={`${lang === 'vi' ? 'Xóa' : 'Remove'} ${p.name}`}");
    expect(source).toContain("aria-label={`Giảm số lượng ${p.name}`}");
    expect(source).toContain("item.quantity <= 1");
    expect(source).toContain("aria-label={`Tăng số lượng ${p.name}`}");
  });

  it("keeps homepage physical cards honest about stock and actions", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(source).toContain("Number(product.stock) > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'");
    expect(source).toContain("Number(product.stock) > 0 ? 'Xem chi tiết' : 'Xem sản phẩm'");
    expect(source).not.toContain('>Đặt hàng</span>');
  });

  it("uses a clear pending-price label across customer product surfaces", () => {
    const detailSource = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    const catalogSource = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(detailSource).toContain("Sản phẩm đang được cập nhật giá");
    expect(catalogSource).toContain("return lang === 'vi' ? 'Đang cập nhật giá'");
    expect(homeSource).toContain("return lang === 'vi' ? 'Đang cập nhật giá'");
  });

  it("blocks purchase actions and explains missing price", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("const hasSellablePrice = Number(product?.price ?? 0) > 0");
    expect(source).toContain("Sản phẩm đang được cập nhật giá");
    expect(source).toContain("disabled={adding || !hasSellablePrice");
  });

  it("uses post-merger province and ward selectors for physical shipping", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    const dataSource = readFileSync(new URL("../client/src/data/vietnam-admin-2025.json", import.meta.url), "utf8");

    expect(source).toContain("Chọn tỉnh/thành phố mới");
    expect(source).toContain("Chọn xã/phường mới");
    expect(source).toContain("inlineDetailAddress");
    expect(source).toContain("updateInlineAddress");
    expect(dataSource).toContain("tentinhmoi");
    expect(dataSource).toContain("phuongxa");
  });

  it("shows a compact SKU thumbnail beside the variant name", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('className="h-7 w-7 shrink-0 rounded border border-slate-200 bg-white object-contain"');
    expect(source).toContain("formatVariantOptions(variant)");
  });

  it("shows calculated SPX shipping and does not offer obsolete shipping methods", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("const estimatedSpxFee");
    expect(source).toContain("Giao hàng SPX khi mua ngay");
    expect(source).toContain("Ước tính đơn trong giỏ:");
    expect(source).toContain("Giao hàng SPX tự tính");
    expect(source).not.toContain("Nhận tại cửa hàng — 0 đ");
    expect(source).not.toContain("Giao nhanh — 50.000 đ");
  });
});

  it("uses an inline quantity control for one-SKU physical products and preserves the multi-SKU branch", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("const singleVariant = variants.length === 1 ? variants[0] : null");
    expect(source).toContain("SKU duy nhất · chọn số lượng");
    expect(source).toContain("product.type === \"physical\" && variants.length > 1");
    expect(source).toContain("{variants.length > 1 ? <><div className=\"mt-4\">{skuBatchSelector}</div>");
    expect(source).toContain("<div className=\"divide-y divide-slate-100\">");
    expect(source).not.toContain("max-h-[42rem]");
  });

  it("prioritizes in-stock SKUs while preserving the existing order within each stock group", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("const sortedVariants = [...variants].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));");
  });

  it("summarizes SKU-level inventory and labels low or depleted stock in the marketplace table", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("const inStockSkuCount = variants.filter");
    expect(source).toContain("const totalSkuStock = variants.reduce");
    expect(source).toContain("Kho khả dụng: {totalSkuStock}");
    expect(source).toContain("const lowStock = !outOfStock");
    expect(source).toContain('lowStock ? `Sắp hết · ${variant.stock}`');
    expect(source).toContain('outOfStock ? "Hết hàng"');
  });

  it("makes inventory editing safer with labeled bulk fields and unsaved-SKU indicators", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain("const changedSkuCount = variants.filter");
    expect(source).toContain("dòng chưa lưu");
    expect(source).toContain("Tồn kho mới");
    expect(source).toContain("Giá bán mới");
    expect(source).toContain("Giá vốn mới");
    expect(source).toContain("Lưu thay đổi");
    expect(source).toContain("object-contain");
  });
