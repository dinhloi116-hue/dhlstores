import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const accountPagePath = path.resolve(process.cwd(), "client/src/pages/Account.tsx");
const orderHistoryPagePath = path.resolve(process.cwd(), "client/src/pages/OrderHistory.tsx");
const appPath = path.resolve(process.cwd(), "client/src/App.tsx");

describe("account page layout", () => {
  it("provides a dedicated customer order history route", async () => {
    const source = await readFile(orderHistoryPagePath, "utf8");
    const appSource = await readFile(appPath, "utf8");

    expect(source).toContain("Lịch sử đơn hàng");
    expect(source).toContain("trpc.store.myOrders.useQuery");
    expect(appSource).toContain('path={"/orders"} component={OrderHistory}');
  });
  it("uses a responsive two-column desktop shell without removing key account sections", async () => {
    const source = await readFile(accountPagePath, "utf8");

    expect(source).toContain('grid items-start gap-6 xl:grid-cols-2');
    expect(source).toContain('id="wallet"');
    expect(source).toContain('id="addresses"');
	    expect(source).toContain('id="favorites"');
	    expect(source).toContain('id="orders"');
	    expect(source).toContain('const priorityOrders = orders.filter');
	    expect(source).toContain('Đơn đang xử lý & giao hàng');
	    expect(source).toContain('Lịch sử đơn hàng');
	    expect(source).toContain('px-3 py-2.5');
	    expect(source).toContain('const [orderFilter, setOrderFilter]');
	    expect(source).toContain('filteredHistoryOrders');
	    expect(source).toContain('Lọc lịch sử đơn hàng');
	  });
});

  it("supports detailed order status and reorder controls", async () => {
    const source = await readFile(orderHistoryPagePath, "utf8");
    expect(source).toContain("Mua lại");
    expect(source).toContain("statusSteps");
    expect(source).toContain("trpc.store.addToCart.useMutation");
    expect(source).toContain("trackingStage");
  });

  it("keeps catalog filter reset/count and cart preview hooks present", async () => {
    const productsSource = await readFile(path.resolve(process.cwd(), "client/src/pages/Products.tsx"), "utf8");
    const layoutSource = await readFile(path.resolve(process.cwd(), "client/src/components/StoreLayout.tsx"), "utf8");
    expect(productsSource).toContain("Xóa bộ lọc");
    expect(productsSource).toContain("products.length");
    expect(layoutSource).toContain("header-cart-trigger");
    expect(layoutSource).toContain("group-hover/cart:visible");
    expect(layoutSource).toContain("Xem toàn bộ giỏ hàng");
  });

  it("supports selecting multiple orders for one reorder action", async () => {
    const source = await readFile(orderHistoryPagePath, "utf8");
    expect(source).toContain("selectedOrderIds");
    expect(source).toContain("bulkReorder");
    expect(source).toContain("Mua lại ${selectedOrderIds.length} đơn");
  });

  it("exposes safe quick add and shipping-progress UX", async () => {
    const productsSource = await readFile(path.resolve(process.cwd(), "client/src/pages/Products.tsx"), "utf8");
    const layoutSource = await readFile(path.resolve(process.cwd(), "client/src/components/StoreLayout.tsx"), "utf8");
    expect(productsSource).toContain("Thêm nhanh");
    expect(productsSource).toContain("handleQuickAdd");
    expect(productsSource).toContain("addToCartMutation");
    expect(layoutSource).toContain("freeShippingThreshold");
    expect(layoutSource).toContain("Mua thêm");
    expect(layoutSource).toContain("transition-[width]");
  });
