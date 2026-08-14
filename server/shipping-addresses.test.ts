import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null) {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  } as TrpcContext;
}

describe("shipping addresses", () => {
  it("lưu địa chỉ mặc định, chuyển mặc định an toàn và chỉ cho chủ sở hữu chỉnh sửa", async () => {
    const username = `address_${Date.now()}`;
    const registration = await appRouter.createCaller(createContext()).auth.register({ username, password: "ShippingAddress#2026", name: "Khách giao hàng" });
    const caller = appRouter.createCaller(createContext(registration.user as TrpcContext["user"]));

    const first = await caller.store.createShippingAddress({ recipientName: "Nguyễn Minh", phone: "0901234567", address: "12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh" });
    const second = await caller.store.createShippingAddress({ recipientName: "Nguyễn Minh", phone: "0901234567", address: "88 Lê Lợi, Quận 1, TP. Hồ Chí Minh", isDefault: true });
    const afterSecond = await caller.store.shippingAddresses();

    expect(afterSecond).toEqual(expect.arrayContaining([expect.objectContaining({ id: first.id, isDefault: false }), expect.objectContaining({ id: second.id, isDefault: true })]));
    const otherRegistration = await appRouter.createCaller(createContext()).auth.register({ username: `other_${Date.now()}`, password: "OtherShipping#2026", name: "Khách khác" });
    await expect(appRouter.createCaller(createContext(otherRegistration.user as TrpcContext["user"])).store.updateShippingAddress({ id: second.id, data: { recipientName: "Không được sửa", phone: "0912345678", address: "Địa chỉ không thuộc sở hữu" } })).rejects.toMatchObject({ code: "NOT_FOUND" });

    await caller.store.deleteShippingAddress({ id: second.id });
    await expect(caller.store.shippingAddresses()).resolves.toEqual([expect.objectContaining({ id: first.id, isDefault: true })]);
  });
});
