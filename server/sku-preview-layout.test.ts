import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public SKU inventory presentation", () => {
  it("shows the lowest wholesale tier price in physical product previews", () => {
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const catalogSource = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain("productWholesaleTiersForProducts");
    expect(homeSource).toContain("lowestWholesalePriceByProduct");
    expect(homeSource).toContain("previewPrice(product)");
    expect(catalogSource).toContain("productWholesaleTiersForProducts");
    expect(catalogSource).toContain("previewPrice(p)");
    expect(catalogSource).toContain("previewPrice(quickViewProduct)");
    expect(homeSource).toContain("Giá sỉ từ");
    expect(catalogSource).toContain("Giá sỉ từ");
    expect(homeSource).toContain("hasWholesalePreviewPrice");
    expect(catalogSource).toContain("hasWholesalePreviewPrice");
    expect(homeSource).toContain("aria-hidden=\"true\"");
    expect(catalogSource).toContain("aria-hidden=\"true\"");
    expect(homeSource).toContain("h-3 w-3 animate-[pulse_1.8s_ease-in-out_infinite]");
    expect(catalogSource).toContain("h-3 w-3 animate-[pulse_1.8s_ease-in-out_infinite]");
  });


  it("keeps SKU and stock in the same compact metadata group", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("SKU + tồn kho");
    expect(source).toContain('hidden justify-self-end max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1');
    expect(source).toContain('sm:inline-flex');
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
    expect(source).toContain('lg:col-span-5 lg:h-full lg:overflow-y-auto lg:pr-3');
  });

  it("shows a synchronized desktop zoom pane and mobile image dialog", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('md:cursor-crosshair');
    expect(source).toContain('setZoomPoint');
    expect(source).toContain('backgroundSize: \'220%\'');
    expect(source).toContain('mobileZoomOpen');
    expect(source).toContain('Chạm để phóng to');
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

  it("keeps quantity controls visible in the compact inventory table", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3 xl:sticky xl:top-4"');
    expect(source).toContain('<span className="text-right">Số lượng</span>');
    expect(source).toContain('aria-label={`Giảm số lượng ${formatVariantOptions(variant)}`}');
    expect(source).toContain('aria-label={`Tăng số lượng ${formatVariantOptions(variant)}`}');
    expect(source).toContain('Kho: {variant.stock}');
    expect(source).toContain('Tồn: {outOfStock ? "Hết" : variant.stock}');
    expect(source).toContain('variant.stock < 10 ? "text-rose-700" : "text-emerald-800"');
    expect(source).toContain('title="Hàng đặt trước, dự kiến giao trong 7–10 ngày"');
    expect(source).toContain('const nextQuantity = Math.min(max, Math.max(0, Math.floor(requestedQuantity)))');
    expect(source).toContain('onClick={event => event.stopPropagation()}');
    expect(source).toContain('clientY - previewHeight - 16');
    expect(source).toContain('grid-cols-[3.5rem_minmax(0,1fr)_7rem]');
    expect(source).toContain('hidden text-right sm:block');
    expect(source).toContain('lg:grid-cols-[4.5rem_minmax(0,1fr)_8rem_9rem_11rem]');
  });

  it("protects zeroing a SKU and gives mobile quantity changes feedback", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("Bạn có chắc muốn đưa toàn bộ số lượng SKU về 0 không?");
    expect(source).toContain("Đưa số lượng “${formatVariantOptions(variant)}” về 0");
    expect(source).toContain("quantityUpdatingVariantId");
    expect(source).toContain("quantityUpdatedVariantId");
    expect(source).toContain("Đang cập nhật");
    expect(source).toContain("Đã cập nhật");
    expect(source).toContain("h-11 w-11");
    expect(source).toContain("sm:h-9 sm:w-9");
    expect(source).toContain("quantityWarnings");
    expect(source).toContain("chỉ còn ${max} sản phẩm trong kho");
    expect(source).toContain("animate-[pulse_0.45s_ease-out]");
    expect(source).toContain("Lưu sản phẩm để mua sau");
    expect(source).toContain("toggleFavoriteMutation.mutate({ productId: product.id })");
  });

  it("uses SKU aggregate stock and keeps physical cards free of long descriptions", () => {
    const catalogSource = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    expect(dbSource).toContain("const stockByProduct = await Promise.all(list.map(async product =>");
    expect(dbSource).toContain("variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)");
    expect(catalogSource).toContain("Number(p.stock) > 0 ? `Còn ${p.stock}` : 'Hết hàng'");
    expect(catalogSource).toContain("{!isPhysicalCatalog && <p className=\"mt-1 line-clamp-2 text-[10px] text-slate-500 sm:text-[11px]\">");
  });

  it("exposes advanced price filters across catalog modes", () => {
    const source = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");

    expect(source).toContain("minPrice: minPrice ? Number(minPrice) : undefined");
    expect(source).toContain("maxPrice: maxPrice ? Number(maxPrice) : undefined");
    expect(source).toContain("Giá từ (đ)");
    expect(source).toContain("Xóa bộ lọc");
  });

  it("makes cart controls explicit and prevents invalid decrement", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("aria-label={`${lang === 'vi' ? 'Xóa' : 'Remove'} ${p.name}`}");
    expect(source).toContain("aria-label={`Giảm số lượng ${p.name}`}");
    expect(source).toContain("item.quantity <= 1");
    expect(source).toContain("aria-label={`Tăng số lượng ${p.name}`}");
  });

  it("provides cart update feedback and busy state", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("Đã cập nhật số lượng trong giỏ hàng");
    expect(source).toContain("aria-busy={updateCartMutation.isPending}");
  });

  it("keeps homepage physical cards honest about stock and actions", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(source).toContain("Popular physical products");
    expect(source).toContain("Hàng vật lý bán chạy");
    expect(source).toContain("Number(product.stock) > 0");
    expect(source).not.toContain('>Đặt hàng</span>');
  });

  it("uses a clear pending-price label across customer product surfaces", () => {
    const detailSource = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    const catalogSource = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(detailSource).toContain("Sản phẩm đang được cập nhật giá");
    expect(catalogSource).toContain("return lang === 'vi' ? 'Đang cập nhật giá'");
    expect(homeSource).toContain("Đang cập nhật");
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
    expect(source).toContain("<div className=\"space-y-2 p-2 sm:p-3\">");
    expect(source).toContain("rounded-xl border px-3 py-3 transition-all duration-200");
    expect(source).toContain("col-span-full flex flex-wrap items-center");
    expect(source).toContain("skuStockFilter");
    expect(source).toContain("setAllVisibleVariantQuantities(1)");
    expect(source).toContain("Chọn tất cả");
    expect(source).toContain("Bỏ chọn");
    expect(source).toContain("animateProductToCart();");
    expect(source).not.toContain("max-h-[42rem]");
  });

  it("prioritizes in-stock SKUs while preserving the existing order within each stock group", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('const [skuSort, setSkuSort] = useState<"stock_priority" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc">("stock_priority");');
    expect(source).toContain('id="sku-sort"');
    expect(source).toContain('value="price_asc">Giá thấp → cao</option>');
    expect(source).toContain('value="stock_desc">Tồn kho nhiều → ít</option>');
  });

  it("summarizes SKU-level inventory and labels low or depleted stock in the marketplace table", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("const inStockSkuCount = variants.filter");
    expect(source).toContain("const totalSkuStock = variants.reduce");
    expect(source).toContain("Kho khả dụng: {totalSkuStock}");
    expect(source).toContain("const lowStock = !outOfStock");
    expect(source).toContain('lowStock ? `Sắp hết · ${variant.stock}`');
    expect(source).toContain('outOfStock ? "Hết hàng"');
    expect(source).toContain('aria-label={variant.image ? `Mở ảnh ${formatVariantOptions(variant)}`');
    expect(source).toContain('Xem ảnh');
    expect(source).toContain('dhlstores-cart-animation-complete');
  });

  it("provides floating cart summary, checkout CTA, and product recommendations", () => {
    const productSource = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    const layoutSource = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(layoutSource).toContain("group/floating-cart");
    expect(layoutSource).toContain("Thanh toán ngay");
    expect(layoutSource).toContain("cartItems.slice(0, 4)");
    expect(productSource).toContain("Sản phẩm thường được mua kèm");
    expect(productSource).toContain("recommendedProducts");
    expect(productSource).toContain("trpc.store.products.useQuery");
    expect(productSource).toContain("Thêm vào giỏ");
    expect(productSource).toContain("productId: recommended.id");
    expect(layoutSource).toContain("goToCheckout");
    expect(layoutSource).toContain("checkoutRedirecting");
    expect(layoutSource).toContain("aria-label=\"Xóa sản phẩm\"");
    expect(layoutSource).toContain('quantity: item.quantity + 1');
    expect(layoutSource).toContain('Tiếp tục mua sắm');
    expect(layoutSource).toContain('freeShippingProgress');
    expect(productSource).toContain('Xem nhanh');
    expect(productSource).toContain('setQuickViewProduct');
    expect(layoutSource).toContain("Tổng tạm tính");
    expect(layoutSource).toContain("Xem chi tiết giỏ hàng");
    expect(productSource).toContain('position: "bottom-right"');
    expect(productSource).toContain("Đã thêm sản phẩm mua kèm vào giỏ");
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


  it("shows product image in the Quick Add success toast", () => {
    const source = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");
    expect(source).toContain("Đã thêm nhanh vào giỏ hàng");
    expect(source).toContain("product.image");
    expect(source).toContain("h-8 w-8 rounded object-cover");
  });

  it("celebrates reaching the reference free-shipping threshold", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");
    expect(source).toContain("freeShippingThreshold = 500000");
    expect(source).toContain("Chúc mừng! Đơn đã đạt mốc freeship dự kiến");
    expect(source).toContain("animate-[pulse_1.8s_ease-in-out_1]");
    expect(source).toContain("transition-[width] duration-500");
  });
