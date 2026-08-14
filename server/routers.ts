import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, ownerProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { buildSePayQrUrl, buildStoreVietQrUrl } from "./sepay";
import { catalogAdminRouter } from "./routers/catalogAdmin";
import { sdk } from "./_core/sdk";

const LOCAL_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;
const localUsernameSchema = z.string().trim().min(3, "Tên đăng nhập cần có ít nhất 3 ký tự").max(32, "Tên đăng nhập tối đa 32 ký tự").regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ gồm chữ cái, số và dấu gạch dưới");
const localPasswordSchema = z.string().min(10, "Mật khẩu cần có ít nhất 10 ký tự").max(128, "Mật khẩu quá dài");
const shippingAddressInputSchema = z.object({ recipientName: z.string().trim().min(2, "Vui lòng nhập họ tên người nhận").max(255), phone: z.string().trim().min(8, "Số điện thoại chưa hợp lệ").max(64), address: z.string().trim().min(5, "Vui lòng nhập địa chỉ cụ thể").max(2000), isDefault: z.boolean().optional() });
const visitorKeySchema = z.string().trim().regex(/^[a-zA-Z0-9_-]{16,96}$/, "Phiên truy cập không hợp lệ");
const supportMessageSchema = z.string().trim().min(1, "Vui lòng nhập nội dung").max(2000, "Tin nhắn tối đa 2.000 ký tự");

function publicUser(user: NonNullable<Awaited<ReturnType<typeof db.getUserByOpenId>>>) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

async function createLocalAuthSession(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } }, user: NonNullable<Awaited<ReturnType<typeof db.getUserByOpenId>>>) {
  const token = await sdk.createSessionToken(user.openId, { expiresInMs: LOCAL_SESSION_MAX_AGE_MS, name: user.name || user.username || "DHL Stores" });
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_MS });
  return publicUser(user);
}

async function requireActiveAccount(userId: number) {
  if (!(await db.isUserActive(userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ DHL Stores để được hỗ trợ.",
    });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? publicUser(opts.ctx.user) : null),
    register: publicProcedure
      .input(z.object({ username: localUsernameSchema, password: localPasswordSchema, name: z.string().trim().min(2).max(120).optional() }))
      .mutation(async ({ ctx, input }) => {
        const username = input.username.toLowerCase();
        try {
          const user = await db.createLocalUser({ username, passwordHash: db.hashLocalPassword(input.password), name: input.name });
          return { user: await createLocalAuthSession(ctx, user) };
        } catch (error) {
          if (error instanceof Error && error.message === "USERNAME_TAKEN") {
            throw new TRPCError({ code: "CONFLICT", message: "Tên đăng nhập này đã được sử dụng" });
          }
          throw error;
        }
      }),
    login: publicProcedure
      .input(z.object({ username: localUsernameSchema, password: localPasswordSchema }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByUsername(input.username.toLowerCase());
        if (!user || !db.verifyLocalPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Tên đăng nhập hoặc mật khẩu không đúng" });
        }
        if (user.status !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ DHL Stores để được hỗ trợ." });
        }
        return { user: await createLocalAuthSession(ctx, user) };
      }),
    linkEmail: protectedProcedure
      .input(z.object({ email: z.string().trim().toLowerCase().email("Email không hợp lệ") }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        try {
          return await db.linkEmailToUser(ctx.user.id, input.email);
        } catch (error) {
          if (error instanceof Error && error.message === "EMAIL_TAKEN") {
            throw new TRPCError({ code: "CONFLICT", message: "Email này đã liên kết với một tài khoản khác" });
          }
          throw error;
        }
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  catalogAdmin: catalogAdminRouter,

  analytics: router({
    recordVisit: publicProcedure.input(z.object({ visitorId: z.string().min(8).max(128), path: z.string().min(1).max(512) })).mutation(({ input }) => db.recordVisitorEvent(input.visitorId, input.path)),
  }),

  feedback: router({
    submit: publicProcedure.input(z.object({ visitorKey: visitorKeySchema, displayName: z.string().trim().max(128).optional(), contact: z.string().trim().max(255).optional(), topic: z.enum(["suggestion", "issue", "other"]), message: supportMessageSchema })).mutation(({ ctx, input }) => db.createCustomerFeedback({ ...input, userId: ctx.user?.id })),
  }),

  support: router({
    conversation: publicProcedure.input(z.object({ visitorKey: visitorKeySchema })).query(({ input }) => db.getCustomerConversation(input.visitorKey)),
    send: publicProcedure.input(z.object({ visitorKey: visitorKeySchema, displayName: z.string().trim().max(128).optional(), body: supportMessageSchema })).mutation(({ ctx, input }) => db.sendCustomerSupportMessage({ ...input, userId: ctx.user?.id })),
    markRead: publicProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ input }) => db.markConversationRead(input.conversationId, "customer")),
  }),

  operations: router({
    overview: ownerProcedure.query(() => db.getOperationsOverview()),
    members: ownerProcedure.query(() => db.getAllUsers()),
    adminActivity: ownerProcedure.input(z.object({ userId: z.number().int().positive().optional() }).optional()).query(({ input }) => db.getAdminActivity(input?.userId)),
    balanceLedger: ownerProcedure.input(z.object({ userId: z.number().int().positive().optional() }).optional()).query(({ input }) => db.getBalanceLedger(input?.userId)),
    adjustBalance: ownerProcedure.input(z.object({ userId: z.number().int().positive(), amount: z.number().finite().min(-9_999_999).max(9_999_999).refine(value => value !== 0), reason: z.string().trim().min(3).max(255) })).mutation(({ ctx, input }) => db.adjustUserBalance({ ...input, performedByUserId: ctx.user.id })),
    discountCodes: ownerProcedure.query(() => db.getDiscountCodes()),
    createDiscountCode: ownerProcedure.input(z.object({ code: z.string().trim().min(3).max(64), type: z.enum(["percent", "fixed"]), value: z.number().finite().positive(), minOrderAmount: z.number().finite().min(0).optional(), maxUses: z.number().int().positive().nullable().optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), isActive: z.boolean().optional() })).mutation(({ ctx, input }) => db.createDiscountCode({ ...input, createdByUserId: ctx.user.id })),
    updateDiscountCode: ownerProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ code: z.string().trim().min(3).max(64), type: z.enum(["percent", "fixed"]), value: z.number().finite().positive(), minOrderAmount: z.number().finite().min(0).optional(), maxUses: z.number().int().positive().nullable().optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), isActive: z.boolean().optional() }) })).mutation(({ input }) => db.updateDiscountCode(input.id, input.data)),
    feedback: ownerProcedure.query(() => db.getAdminFeedback()),
    updateFeedback: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "reviewed", "resolved"]) })).mutation(({ input }) => db.updateFeedbackStatus(input.id, input.status)),
    supportSummary: ownerProcedure.query(() => db.getOwnerSupportSummary()),
    supportConversations: ownerProcedure.query(() => db.getOwnerConversations()),
    supportMessages: ownerProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ input }) => db.getOwnerConversationMessages(input.conversationId)),
    sendSupportMessage: ownerProcedure.input(z.object({ conversationId: z.number().int().positive(), body: supportMessageSchema })).mutation(({ ctx, input }) => db.sendOwnerSupportMessage({ ...input, senderUserId: ctx.user.id })),
    markSupportRead: ownerProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ input }) => db.markConversationRead(input.conversationId, "owner")),
    confirmManualPayment: ownerProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await db.confirmManualPayment(input.orderId, ctx.user.id);
      } catch (error) {
        if (error instanceof Error && error.message === "ORDER_NOT_PENDING") throw new TRPCError({ code: "CONFLICT", message: "Đơn này không còn ở trạng thái chờ thanh toán" });
        throw error;
      }
    }),
    inventory: adminProcedure.query(() => db.getInventoryBoard()),
    inventoryMovements: adminProcedure.query(() => db.getInventoryMovements()),
    bulkSetInventory: adminProcedure.input(z.object({ changes: z.array(z.object({ target: z.enum(["product", "variant"]), id: z.number().int().positive(), stock: z.number().int().min(0).max(999_999) })).min(1).max(100), reason: z.string().trim().min(3).max(255) })).mutation(({ ctx, input }) => db.bulkSetInventory({ ...input, performedByUserId: ctx.user.id })),
    siteSettings: ownerProcedure.query(() => db.getSiteSettings()),
    saveSiteSettings: ownerProcedure.input(z.object({ entries: z.object({ navHome: z.string().trim().min(1).max(64), navProducts: z.string().trim().min(1).max(64), navDigital: z.string().trim().min(1).max(64), homeHeading: z.string().trim().min(1).max(128), physical_qr_bank_code: z.string().trim().max(32).optional(), physical_qr_account_number: z.string().trim().max(64).optional(), physical_qr_account_holder: z.string().trim().max(255).optional() }) })).mutation(({ ctx, input }) => db.saveSiteSettings(input.entries, ctx.user.id)),
  }),

  store: router({
    siteSettings: publicProcedure.query(() => db.getSiteSettings()),
    categories: publicProcedure.query(async () => {
      return await db.getCategories();
    }),

    products: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getProducts(input);
      }),

    productBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const product = await db.getProductBySlug(input.slug);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài nguyên" });
        }
        return product;
      }),

    productVariants: publicProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ input }) => db.getProductVariants(input.productId)),

    productWholesaleTiers: publicProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ input }) => db.getProductWholesaleTiers(input.productId)),

    productWholesaleTiersForProducts: publicProcedure
      .input(z.object({ productIds: z.array(z.number().int().positive()).min(1).max(100) }))
      .query(async ({ input }) => db.getProductWholesaleTiersForProducts(input.productIds)),

    cart: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user.id);
      return await db.getCartItems(ctx.user.id);
    }),

    addToCart: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.number().min(1).default(1),
        variantId: z.number().int().positive().optional(),
        attributes: z.string().optional(),
        fulfillmentMode: z.enum(["in_stock", "preorder"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return await db.addToCart(ctx.user.id, input.productId, input.quantity, input.variantId, input.attributes, input.fulfillmentMode);
      }),

    updateCart: protectedProcedure
      .input(z.object({
        cartItemId: z.number(),
        quantity: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return await db.updateCartItem(ctx.user.id, input.cartItemId, input.quantity);
      }),

    removeFromCart: protectedProcedure
      .input(z.object({ cartItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return await db.removeFromCart(input.cartItemId);
      }),

    shippingAddresses: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user.id);
      return db.getShippingAddresses(ctx.user.id);
    }),

    createShippingAddress: protectedProcedure
      .input(shippingAddressInputSchema)
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return db.createShippingAddress(ctx.user.id, input);
      }),

    updateShippingAddress: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), data: shippingAddressInputSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        try {
          return await db.updateShippingAddress(ctx.user.id, input.id, input.data);
        } catch (error) {
          if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy địa chỉ cần cập nhật" });
          throw error;
        }
      }),

    deleteShippingAddress: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        try {
          return await db.deleteShippingAddress(ctx.user.id, input.id);
        } catch (error) {
          if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy địa chỉ cần xóa" });
          throw error;
        }
      }),

    cancelPendingOrder: protectedProcedure
      .input(z.object({ orderId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return db.cancelPendingOrderForUser(ctx.user.id, input.orderId);
      }),

    checkout: protectedProcedure
      .input(z.object({
        totalAmount: z.number(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          price: z.number(),
          variantId: z.number().int().positive().optional(),
          attributes: z.string().optional(),
          fulfillmentMode: z.enum(["in_stock", "preorder"]).optional(),
        })),
        discountCode: z.string().trim().max(64).optional(),
        shipping: z.object({
          name: z.string().trim().min(2).max(255),
          phone: z.string().trim().min(8).max(64),
          address: z.string().trim().min(5).max(2000),
          note: z.string().trim().max(2000).optional(),
          method: z.enum(["pickup", "standard", "express"]),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        const order = await db.createOrder(ctx.user.id, input);
        const siteSettings = await db.getSiteSettings();
        const qrUrl = order.hasPhysicalItems
          ? buildStoreVietQrUrl({ bankCode: siteSettings?.physical_qr_bank_code || "", accountNumber: siteSettings?.physical_qr_account_number || "", accountHolder: siteSettings?.physical_qr_account_holder || "" }, Number(order.totalAmount))
          : buildSePayQrUrl(order.orderCode, Number(order.totalAmount));
        return { ...order, qrUrl, paymentFlow: order.hasPhysicalItems ? "manual_techcombank" as const : "sepay_vietinbank" as const };
      }),

    quickCheckout: protectedProcedure
      .input(z.object({
        item: z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(99), variantId: z.number().int().positive().optional(), attributes: z.string().max(255).optional(), fulfillmentMode: z.enum(["in_stock", "preorder"]).optional() }),
        shipping: z.object({ name: z.string().trim().min(2).max(255), phone: z.string().trim().min(8).max(64), address: z.string().trim().min(5).max(2000), note: z.string().trim().max(2000).optional(), method: z.enum(["pickup", "standard", "express"]) }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        const order = await db.createOrder(ctx.user.id, { totalAmount: 0, items: [{ ...input.item, price: 0 }], shipping: input.shipping, clearCart: false });
        const siteSettings = await db.getSiteSettings();
        const qrUrl = order.hasPhysicalItems
          ? buildStoreVietQrUrl({ bankCode: siteSettings?.physical_qr_bank_code || "", accountNumber: siteSettings?.physical_qr_account_number || "", accountHolder: siteSettings?.physical_qr_account_holder || "" }, Number(order.totalAmount))
          : buildSePayQrUrl(order.orderCode, Number(order.totalAmount));
        return { ...order, qrUrl, paymentFlow: order.hasPhysicalItems ? "manual_techcombank" as const : "sepay_vietinbank" as const };
      }),

    orders: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user.id);
      const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'owner';
      return await db.getOrders(ctx.user.id, isAdmin);
    }),

    myOrders: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user.id);
      return db.getOrders(ctx.user.id, false);
    }),

    paymentStatus: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        const order = await db.getOrderPaymentForUser(ctx.user.id, input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đơn hàng" });
        return order;
      }),

    downloads: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user.id);
      return db.getPaidDownloadsForUser(ctx.user.id);
    }),

    instantDownloads: protectedProcedure
      .input(z.object({ orderId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return db.getInstantDownloadsForOrder(ctx.user.id, input.orderId);
      }),

    updateOrderStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "processing", "shipping", "completed", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ quản trị viên mới có quyền cập nhật" });
        }
        return await db.updateOrderStatus(input.orderId, input.status);
      }),

    updateOrderTracking: adminProcedure
      .input(z.object({
        orderId: z.number().int().positive(),
        stage: z.enum(["ordered", "central_warehouse", "ready_hanoi", "tracking"]),
        trackingUrl: z.string().trim().url("Link theo dõi chưa hợp lệ").max(4096).optional(),
      }).superRefine((value, context) => {
        if (value.stage === "tracking" && !value.trackingUrl) context.addIssue({ code: z.ZodIssueCode.custom, path: ["trackingUrl"], message: "Vui lòng nhập link theo dõi trước khi hoàn tất đơn" });
      }))
      .mutation(({ input }) => db.updateOrderTracking(input.orderId, input.stage, input.trackingUrl)),

    deleteOrder: adminProcedure
      .input(z.object({ orderId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.deleteOrder(input.orderId, ctx.user.id)),

    usersList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await db.getAllUsers();
    }),

    updateUserStatus: protectedProcedure
      .input(z.object({
        userId: z.number(),
        status: z.enum(["active", "blocked"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return await db.updateUserStatus(input.userId, input.status, ctx.user.id);
      }),

    updateUserRole: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ quản trị viên mới có quyền cập nhật vai trò" });
        }
        if (ctx.user.id === input.userId && input.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Bạn không thể tự gỡ quyền quản trị của chính mình" });
        }
        return await db.updateUserRole(input.userId, input.role, ctx.user.id);
      }),

    productDownloadLinks: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getAdminProductDownloadLinks();
    }),

    saveProductDownloadLink: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        driveUrl: z.string().url().refine(value => {
          const host = new URL(value).hostname;
          return host === "drive.google.com" || host === "docs.google.com";
        }, "Link phải thuộc Google Drive"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return db.saveProductDownloadLink(input.productId, input.driveUrl);
      }),
  }),
});

export type AppRouter = typeof appRouter;
