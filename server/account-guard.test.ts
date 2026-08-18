import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { updateUserStatus } from "./db";
import type { TrpcContext } from "./_core/context";

function blockedUserContext(): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 2,
      openId: "sample-user-2",
      name: "Blocked User",
      email: "blocked@example.com",
      loginMethod: "manus",
      role: "user",
      status: "blocked",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("account access guard", () => {
  it("blocks cart and checkout actions for a blocked account", async () => {
    await updateUserStatus(2, "blocked");
    const caller = appRouter.createCaller(blockedUserContext());

    await expect(caller.store.addToCart({ productId: 1, quantity: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
	    await expect(caller.store.checkout({
	      totalAmount: 250000,
	      items: [{ productId: 1, quantity: 1, price: 250000 }],
	    })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.store.submitProductReview({
	      productId: 1,
	      rating: 5,
	      body: "Đánh giá này phải bị chặn khi tài khoản đã khóa.",
	    })).rejects.toMatchObject({ code: "FORBIDDEN" });

	    await updateUserStatus(2, "active");
  });
});
