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

function ownerContext(): TrpcContext {
  return createContext({
    id: 900_001,
    openId: "support-owner-test",
    username: "support_owner",
    passwordHash: null,
    name: "Chủ cửa hàng",
    email: "owner@example.com",
    emailVerified: true,
    loginMethod: "local",
    role: "owner",
    status: "active",
    balance: "0.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });
}

describe("customer feedback and support", () => {
  it("lưu góp ý, tạo hội thoại, cho chủ cửa hàng phản hồi và báo số chưa đọc", async () => {
    const visitorKey = `support_${Date.now()}_visitor`;
    const publicCaller = appRouter.createCaller(createContext());
    await expect(publicCaller.feedback.submit({ visitorKey, displayName: "Khách thử", contact: "0900000000", topic: "suggestion", submission: { message: "Hãy thêm nhiều icon danh mục hơn." } })).resolves.toMatchObject({ success: true });
    const sent = await publicCaller.support.send({ visitorKey, displayName: "Khách thử", submission: { message: "Tôi cần tư vấn nhanh về nameset." } });

    const owner = appRouter.createCaller(ownerContext());
    await expect(owner.operations.supportSummary()).resolves.toMatchObject({ newFeedback: expect.any(Number), unreadConversations: expect.any(Number) });
    const conversations = await owner.operations.supportConversations();
    const conversation = conversations.find(item => item.id === sent.conversationId);
    expect(conversation).toMatchObject({ displayName: "Khách thử", lastMessagePreview: "Tôi cần tư vấn nhanh về nameset." });

    const messages = await owner.operations.supportMessages({ conversationId: sent.conversationId });
    expect(messages).toEqual(expect.arrayContaining([expect.objectContaining({ senderType: "customer", body: "Tôi cần tư vấn nhanh về nameset." })]));
    await owner.operations.sendSupportMessage({ conversationId: sent.conversationId, body: "DHL Stores đã nhận tin. Tôi sẽ hỗ trợ bạn ngay." });

    const customerView = await publicCaller.support.conversation({ visitorKey });
    expect(customerView.messages).toEqual(expect.arrayContaining([expect.objectContaining({ senderType: "owner", body: "DHL Stores đã nhận tin. Tôi sẽ hỗ trợ bạn ngay." })]));
  });

  it("chặn khách thường truy cập hộp thư quản trị", async () => {
    const user = await appRouter.createCaller(createContext()).auth.register({ username: `support_user_${Date.now()}`, password: "CustomerSupport#2026", name: "Khách thường" });
    const caller = appRouter.createCaller(createContext(user.user as TrpcContext["user"]));
    await expect(caller.operations.supportConversations()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
