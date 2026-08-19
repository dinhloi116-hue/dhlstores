import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

describe("AdminOrders owner controls", () => {
  it("provides search and status filters for customer orders", () => {
    expect(source).toContain("const [orderSearch, setOrderSearch] = useState(\"\")");
    expect(source).toContain("const [orderStatusFilter");
    expect(source).toContain("Tên khách, username, email, mã đơn");
    expect(source).toContain("filteredAdminOrders.map(order =>");
    expect(source).toContain("order.paymentStatus === \"pending\"");
  });

  it("shows explicit owner identity and operational summary cards", () => {
    expect(source).toContain("Quyền hiện tại");
    expect(source).toContain(">OWNER<");
    expect(source).toContain("Tổng đơn hàng");
    expect(source).toContain("Đơn cần xử lý");
    expect(source).toContain("Khách hoạt động 7 ngày");
  });

  it("keeps the customer identity visible on each filtered order", () => {
    expect(source).toContain("const customer = users.find(member => member.id === order.userId)");
    expect(source).toContain("Khách: {customer?.name");
  });
});
