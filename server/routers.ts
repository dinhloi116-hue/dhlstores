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
import { storagePut } from "./storage";
import { checkSapoProductReadConnection, pullSapoInventoryBySku, syncSapoInventoryBySku } from "./sapo";
import { invokeLLM } from "./_core/llm";

const LOCAL_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;
const localUsernameSchema = z.string().trim().min(3, "Tên đăng nhập cần có ít nhất 3 ký tự").max(32, "Tên đăng nhập tối đa 32 ký tự").regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ gồm chữ cái, số và dấu gạch dưới");
const localPasswordSchema = z.string().min(10, "Mật khẩu cần có ít nhất 10 ký tự").max(128, "Mật khẩu quá dài");
const localEmailSchema = z.string().trim().toLowerCase().email("Email không hợp lệ").max(320, "Email quá dài");
const shippingAddressInputSchema = z.object({ recipientName: z.string().trim().min(2, "Vui lòng nhập họ tên người nhận").max(255), phone: z.string().trim().min(8, "Số điện thoại chưa hợp lệ").max(64), address: z.string().trim().min(5, "Vui lòng nhập địa chỉ cụ thể").max(2000), isDefault: z.boolean().optional() });
const visitorKeySchema = z.string().trim().regex(/^[a-zA-Z0-9_-]{16,96}$/, "Phiên truy cập không hợp lệ");
const supportMessageSchema = z.string().trim().min(1, "Vui lòng nhập nội dung").max(2000, "Tin nhắn tối đa 2.000 ký tự");
const supportImageSchema = z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), base64: z.string().min(1) });
const supportSubmissionSchema = z.object({ message: z.string().trim().max(2000, "Nội dung tối đa 2.000 ký tự"), image: supportImageSchema.optional() }).refine(value => Boolean(value.message || value.image), "Vui lòng nhập nội dung hoặc chọn một ảnh");

async function storeSupportImage(visitorKey: string, image?: z.infer<typeof supportImageSchema>) {
  if (!image) return {};
  const buffer = Buffer.from(image.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Ảnh đính kèm phải có dung lượng từ 1 byte đến 5 MB" });
  const safeName = image.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "attachment";
  const stored = await storagePut(`support/${visitorKey}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`, buffer, image.mimeType);
  return { imageUrl: stored.url, imageKey: stored.key };
}

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
      .input(z.object({ username: localUsernameSchema, password: localPasswordSchema, email: localEmailSchema, name: z.string().trim().min(2).max(120).optional() }))
      .mutation(async ({ ctx, input }) => {
        const username = input.username.toLowerCase();
        try {
          const user = await db.createLocalUser({ username, passwordHash: db.hashLocalPassword(input.password), email: input.email, name: input.name });
          return { user: await createLocalAuthSession(ctx, user) };
        } catch (error) {
          if (error instanceof Error && error.message === "USERNAME_TAKEN") {
            throw new TRPCError({ code: "CONFLICT", message: "Tên đăng nhập này đã được sử dụng" });
          }
          if (error instanceof Error && error.message === "EMAIL_TAKEN") {
            throw new TRPCError({ code: "CONFLICT", message: "Email này đã được sử dụng cho một tài khoản khác" });
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
    uploadAvatar: protectedProcedure
      .input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), base64: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        const buffer = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Ảnh đại diện phải có dung lượng tối đa 5 MB" });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "avatar";
        const stored = await storagePut(`avatars/${ctx.user!.id}/${Date.now()}-${safeName}`, buffer, input.mimeType);
        await db.updateUserAvatar(ctx.user!.id, stored.url);
        return { avatarUrl: stored.url };
      }),
    linkEmail: protectedProcedure
      .input(z.object({ email: z.string().trim().toLowerCase().email("Email không hợp lệ") }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        try {
          return await db.linkEmailToUser(ctx.user!.id, input.email);
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
    submit: protectedProcedure.input(z.object({ visitorKey: visitorKeySchema, displayName: z.string().trim().max(128).optional(), contact: z.string().trim().max(255).optional(), topic: z.enum(["suggestion", "issue", "other"]), submission: supportSubmissionSchema })).mutation(async ({ ctx, input }) => {
      await requireActiveAccount(ctx.user!.id);
      const image = await storeSupportImage(input.visitorKey, input.submission.image);
      return db.createCustomerFeedback({ visitorKey: input.visitorKey, displayName: input.displayName || ctx.user.name || ctx.user.username || undefined, contact: input.contact || ctx.user.email || undefined, topic: input.topic, message: input.submission.message, ...image, userId: ctx.user!.id });
    }),
  }),

  support: router({
    conversation: protectedProcedure.input(z.object({ visitorKey: visitorKeySchema })).query(async ({ ctx, input }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getCustomerConversationForUser(input.visitorKey, ctx.user!.id);
    }),
    send: protectedProcedure.input(z.object({ visitorKey: visitorKeySchema, displayName: z.string().trim().max(128).optional(), submission: supportSubmissionSchema })).mutation(async ({ ctx, input }) => {
      await requireActiveAccount(ctx.user!.id);
      const image = await storeSupportImage(input.visitorKey, input.submission.image);
      try {
        return await db.sendCustomerSupportMessage({ visitorKey: input.visitorKey, displayName: input.displayName || ctx.user.name || ctx.user.username || undefined, body: input.submission.message, ...image, userId: ctx.user!.id });
      } catch (error) {
        if (error instanceof Error && error.message === "CONVERSATION_FORBIDDEN") throw new TRPCError({ code: "FORBIDDEN", message: "Bạn không có quyền truy cập hội thoại này" });
        throw error;
      }
    }),
    markRead: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await requireActiveAccount(ctx.user!.id);
      try {
        return await db.markCustomerConversationRead(input.conversationId, ctx.user!.id);
      } catch (error) {
        if (error instanceof Error && error.message === "CONVERSATION_FORBIDDEN") throw new TRPCError({ code: "FORBIDDEN", message: "Bạn không có quyền truy cập hội thoại này" });
        throw error;
      }
    }),
  }),

  operations: router({
    overview: ownerProcedure.query(() => db.getOperationsOverview()),
    storageSummary: ownerProcedure.query(() => db.getCatalogStorageSummary()),
    sapoConnection: ownerProcedure.query(() => checkSapoProductReadConnection()),
    sapoSyncHistory: ownerProcedure.input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional()).query(({ input }) => db.getSapoSyncHistory(input?.limit || 60)),
    sapoLatestSync: publicProcedure.input(z.object({ variantIds: z.array(z.number().int().positive()).max(100) })).query(({ input }) => db.getLatestSapoSyncAtByVariantIds(input.variantIds)),
    sapoSyncPreview: ownerProcedure.input(z.object({ locationId: z.string().trim().min(1).max(64), rows: z.array(z.object({ sku: z.string().trim().max(128), available: z.number().int().min(0).max(999_999) })).min(1).max(20) })).mutation(({ input }) => syncSapoInventoryBySku(input.rows, input.locationId, { dryRun: true, maxRows: 20 })),
    sapoSyncRun: ownerProcedure.input(z.object({ locationId: z.string().trim().min(1).max(64), rows: z.array(z.object({ sku: z.string().trim().max(128), available: z.number().int().min(0).max(999_999) })).min(1).max(20) })).mutation(async ({ input }) => { const result = await syncSapoInventoryBySku(input.rows, input.locationId, { dryRun: false, maxRows: 20 }); const inventory = await db.getInventoryBoard(); const idsBySku = new Map(inventory.filter(row => row.target === "variant" && row.sku).map(row => [row.sku, row.id])); await db.recordSapoOutboundEvents(result.results.map(row => ({ ...row, localVariantId: idsBySku.get(row.sku) }))); return result; }),
    sapoInboundPull: ownerProcedure.input(z.object({ locationId: z.string().trim().min(1).max(64), rows: z.array(z.object({ localVariantId: z.number().int().positive(), sku: z.string().trim().max(128), available: z.number().int().min(0).max(999_999) })).min(1).max(50) })).mutation(({ input }) => pullSapoInventoryBySku(input.rows, input.locationId)),
    sapoInboundApply: ownerProcedure.input(z.object({ changes: z.array(z.object({ localVariantId: z.number().int().positive(), sku: z.string().trim().max(128), stock: z.number().int().min(0).max(999_999), sapoVariantId: z.string().optional(), inventoryItemId: z.string().optional() })).min(1).max(50), reason: z.string().trim().min(3).max(255).optional() })).mutation(({ ctx, input }) => db.applySapoInboundInventory({ ...input, performedByUserId: ctx.user!.id })),
    members: ownerProcedure.query(() => db.getAllUsers()),
    createTestCustomer: ownerProcedure
      .input(z.object({ username: localUsernameSchema, password: localPasswordSchema, name: z.string().trim().min(2).max(120).optional() }))
      .mutation(async ({ input }) => {
        const username = input.username.toLowerCase();
        try {
          const user = await db.createLocalUser({ username, passwordHash: db.hashLocalPassword(input.password), name: input.name });
          return publicUser(user);
        } catch (error) {
          if (error instanceof Error && error.message === "USERNAME_TAKEN") {
            throw new TRPCError({ code: "CONFLICT", message: "Tên đăng nhập này đã được sử dụng" });
          }
          throw error;
        }
      }),
    adminActivity: ownerProcedure.input(z.object({ userId: z.number().int().positive().optional() }).optional()).query(({ input }) => db.getAdminActivity(input?.userId)),
    balanceLedger: ownerProcedure.input(z.object({ userId: z.number().int().positive().optional() }).optional()).query(({ input }) => db.getBalanceLedger(input?.userId)),
    walletWithdrawals: ownerProcedure.query(() => db.getWalletWithdrawals()),
    reviewWalletWithdrawal: ownerProcedure.input(z.object({ withdrawalId: z.number().int().positive(), action: z.enum(["approved", "rejected", "paid"]), note: z.string().trim().max(500).optional() })).mutation(({ ctx, input }) => db.reviewWalletWithdrawal({ ...input, performedByUserId: ctx.user!.id })),
    adjustBalance: ownerProcedure.input(z.object({ userId: z.number().int().positive(), amount: z.number().finite().min(-9_999_999).max(9_999_999).refine(value => value !== 0), reason: z.string().trim().min(3).max(255) })).mutation(({ ctx, input }) => db.adjustUserBalance({ ...input, performedByUserId: ctx.user!.id })),
    discountCodes: ownerProcedure.query(() => db.getDiscountCodes()),
    createDiscountCode: ownerProcedure.input(z.object({ code: z.string().trim().min(3).max(64), type: z.enum(["percent", "fixed"]), value: z.number().finite().positive(), minOrderAmount: z.number().finite().min(0).optional(), maxUses: z.number().int().positive().nullable().optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), isActive: z.boolean().optional() })).mutation(({ ctx, input }) => db.createDiscountCode({ ...input, createdByUserId: ctx.user!.id })),
    updateDiscountCode: ownerProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ code: z.string().trim().min(3).max(64), type: z.enum(["percent", "fixed"]), value: z.number().finite().positive(), minOrderAmount: z.number().finite().min(0).optional(), maxUses: z.number().int().positive().nullable().optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), isActive: z.boolean().optional() }) })).mutation(({ input }) => db.updateDiscountCode(input.id, input.data)),
    feedback: ownerProcedure.query(() => db.getAdminFeedback()),
    updateFeedback: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "reviewed", "resolved"]) })).mutation(({ input }) => db.updateFeedbackStatus(input.id, input.status)),
    supportSummary: ownerProcedure.query(() => db.getOwnerSupportSummary()),
    supportConversations: ownerProcedure.query(() => db.getOwnerConversations()),
    supportMessages: ownerProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ input }) => db.getOwnerConversationMessages(input.conversationId)),
    sendSupportMessage: ownerProcedure.input(z.object({ conversationId: z.number().int().positive(), body: supportMessageSchema })).mutation(({ ctx, input }) => db.sendOwnerSupportMessage({ ...input, senderUserId: ctx.user!.id })),
    markSupportRead: ownerProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ input }) => db.markConversationRead(input.conversationId, "owner")),
    confirmManualPayment: ownerProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        return await db.confirmManualPayment(input.orderId, ctx.user!.id);
      } catch (error) {
        if (error instanceof Error && error.message === "ORDER_NOT_PENDING") throw new TRPCError({ code: "CONFLICT", message: "Đơn này không còn ở trạng thái chờ thanh toán" });
        throw error;
      }
    }),
    inventory: adminProcedure.query(() => db.getInventoryBoard()),
    inventoryMovements: adminProcedure.query(() => db.getInventoryMovements()),
    bulkSetInventory: adminProcedure.input(z.object({ changes: z.array(z.object({ target: z.enum(["product", "variant"]), id: z.number().int().positive(), stock: z.number().int().min(0).max(999_999) })).min(1).max(100), reason: z.string().trim().min(3).max(255) })).mutation(({ ctx, input }) => db.bulkSetInventory({ ...input, performedByUserId: ctx.user!.id })),
    siteSettings: ownerProcedure.query(() => db.getSiteSettings()),
    uploadWithdrawalQr: ownerProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã QR phải là ảnh tối đa 5 MB" });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160) || "withdrawal-qr";
      const stored = await storagePut(`settings/withdrawal-qr-${Date.now()}-${safeName}`, buffer, input.mimeType);
      await db.saveSiteSettings({ withdrawal_qr_url: stored.url }, ctx.user!.id);
      return { url: stored.url };
    }),
    saveSiteSettings: ownerProcedure.input(z.object({ entries: z.object({ navHome: z.string().trim().min(1).max(64), navProducts: z.string().trim().min(1).max(64), navDigital: z.string().trim().min(1).max(64), homeHeading: z.string().trim().min(1).max(128), physical_qr_bank_code: z.string().trim().max(32).optional(), physical_qr_account_number: z.string().trim().max(64).optional(), physical_qr_account_holder: z.string().trim().max(255).optional(), withdrawal_qr_bank_code: z.string().trim().max(32).optional(), withdrawal_qr_account_number: z.string().trim().max(64).optional(), withdrawal_qr_account_holder: z.string().trim().max(255).optional() }) })).mutation(({ ctx, input }) => db.saveSiteSettings(input.entries, ctx.user!.id)),
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
        type: z.enum(["digital", "physical"]).optional(),
        featured: z.boolean().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        size: z.string().trim().max(64).optional(),
        color: z.string().trim().max(64).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getProducts(input);
      }),

    imageSearch: publicProcedure
      .input(z.object({ mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(1).max(8_000_000) }))
      .mutation(async ({ input }) => {
        const bytes = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Ảnh tìm kiếm phải có dung lượng tối đa 6 MB" });
        // Keep the vision payload bounded: use the first 24 active catalog entries rather than sending the whole catalog and its images.
        const catalog = (await db.getProducts()).filter(product => product.isActive).slice(0, 24);
        if (!catalog.length) return { matches: [], message: "Chưa có sản phẩm để đối chiếu" };
        const candidates = catalog.map(product => ({ id: product.id, name: product.name, slug: product.slug, type: product.type, image: product.image || null, categoryId: product.categoryId }));
        const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" } }> = [
          { type: "text", text: "Ảnh truy vấn của khách nằm ngay sau đây. Hãy đối chiếu với các ảnh sản phẩm trong danh mục bên dưới. Chỉ chọn sản phẩm thực sự phù hợp về kiểu dáng, màu sắc, chủ đề hoặc loại hàng; không tự bịa sản phẩm. Trả về tối đa 8 kết quả theo thứ tự phù hợp giảm dần." },
          { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.base64.replace(/^data:[^;]+;base64,/, "")}`, detail: "high" } },
          { type: "text", text: candidates.map(candidate => `PRODUCT_ID=${candidate.id}; NAME=${candidate.name}; TYPE=${candidate.type}; CATEGORY_ID=${candidate.categoryId}; SLUG=${candidate.slug}`).join("\n") },
          ...candidates.filter(candidate => candidate.image && /^https?:\/\//.test(candidate.image)).flatMap(candidate => [{ type: "text" as const, text: `Ảnh tham chiếu PRODUCT_ID=${candidate.id}` }, { type: "image_url" as const, image_url: { url: candidate.image as string, detail: "low" as const } }]),
        ];
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Bạn là bộ máy tìm kiếm hình ảnh cho cửa hàng DHL Stores. Chỉ trả JSON hợp lệ theo schema." },
            { role: "user", content },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "image_search_matches",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        productId: { type: "integer" },
                        confidence: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["productId", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = response.choices?.[0]?.message?.content;
        const parsed = typeof raw === "string" ? JSON.parse(raw) as { matches?: Array<{ productId: number; confidence: number; reason: string }> } : { matches: [] };
        const allowed = new Map(catalog.map(product => [product.id, product]));
        const matches = (parsed.matches || []).filter(match => allowed.has(match.productId) && match.confidence >= 0.35).slice(0, 8).map(match => ({ ...match, product: allowed.get(match.productId) }));
        return { matches, message: matches.length ? "Đã tìm thấy sản phẩm tương đồng" : "Chưa tìm thấy sản phẩm đủ giống" };
      }),

    productVariantFacets: publicProcedure
      .input(z.object({ categoryId: z.number().int().positive().optional() }).optional())
      .query(({ input }) => db.getProductVariantFacets(input?.categoryId)),

    productBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const product = await db.getProductBySlug(input.slug);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài nguyên" });
        }
        return product;
      }),

    productReviews: publicProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(({ input }) => db.getProductReviews(input.productId)),

	    submitProductReview: protectedProcedure
	      .input(z.object({ productId: z.number().int().positive(), rating: z.number().int().min(1).max(5), body: z.string().trim().min(10, 'Nội dung đánh giá cần ít nhất 10 ký tự').max(2000) }))
	      .mutation(async ({ ctx, input }) => {
	        await requireActiveAccount(ctx.user!.id);
	        return db.createProductReview({ productId: input.productId, userId: ctx.user!.id, displayName: ctx.user.name || ctx.user.username || 'Khách hàng', rating: input.rating, body: input.body });
	      }),

    favorites: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getCustomerFavorites(ctx.user!.id);
    }),

    toggleFavorite: protectedProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return db.toggleCustomerFavorite({ userId: ctx.user!.id, productId: input.productId });
      }),

    restockSubscriptions: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getRestockSubscriptions(ctx.user!.id);
    }),

    requestRestock: protectedProcedure
      .input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return db.requestRestockSubscription({ userId: ctx.user!.id, productId: input.productId, variantId: input.variantId });
      }),

    cancelRestock: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return db.cancelRestockSubscription({ userId: ctx.user!.id, id: input.id });
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
      await requireActiveAccount(ctx.user!.id);
      return await db.getCartItems(ctx.user!.id);
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
        await requireActiveAccount(ctx.user!.id);
        return await db.addToCart(ctx.user!.id, input.productId, input.quantity, input.variantId, input.attributes, input.fulfillmentMode);
      }),

    addManyToCart: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        items: z.array(z.object({
          variantId: z.number().int().positive().optional(),
          quantity: z.number().int().min(1).max(99),
          attributes: z.string().optional(),
        })).min(1).max(50),
        fulfillmentMode: z.enum(["in_stock", "preorder"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return await db.addManyToCart(ctx.user!.id, input.productId, input.items, input.fulfillmentMode);
      }),

    updateCart: protectedProcedure
      .input(z.object({
        cartItemId: z.number(),
        quantity: z.number(),
        fulfillmentMode: z.enum(["in_stock", "preorder"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return await db.updateCartItem(ctx.user!.id, input.cartItemId, input.quantity, input.fulfillmentMode);
      }),

    removeFromCart: protectedProcedure
      .input(z.object({ cartItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return await db.removeFromCart(ctx.user!.id, input.cartItemId);
      }),

    clearCart: protectedProcedure
      .mutation(async ({ ctx }) => {
        await requireActiveAccount(ctx.user!.id);
        return await db.clearCart(ctx.user!.id);
      }),

    shippingAddresses: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getShippingAddresses(ctx.user!.id);
    }),

    createShippingAddress: protectedProcedure
      .input(shippingAddressInputSchema)
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return db.createShippingAddress(ctx.user!.id, input);
      }),

    updateShippingAddress: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), data: shippingAddressInputSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        try {
          return await db.updateShippingAddress(ctx.user!.id, input.id, input.data);
        } catch (error) {
          if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy địa chỉ cần cập nhật" });
          throw error;
        }
      }),

    deleteShippingAddress: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        try {
          return await db.deleteShippingAddress(ctx.user!.id, input.id);
        } catch (error) {
          if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy địa chỉ cần xóa" });
          throw error;
        }
      }),

    customerShippingAddresses: adminProcedure
      .input(z.object({ customerId: z.number().int().positive() }))
      .query(async ({ input }) => db.getShippingAddresses(input.customerId)),

    createCustomerShippingAddress: adminProcedure
      .input(z.object({ customerId: z.number().int().positive(), data: shippingAddressInputSchema }))
      .mutation(async ({ input }) => db.createShippingAddress(input.customerId, input.data)),

    cancelPendingOrder: protectedProcedure
      .input(z.object({ orderId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return db.cancelPendingOrderForUser(ctx.user!.id, input.orderId);
      }),

        walletSummary: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getWalletSummary(ctx.user!.id);
    }),
    walletWithdrawals: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getWalletWithdrawals(ctx.user!.id);
    }),
    uploadWalletWithdrawalQr: protectedProcedure
      .input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        const buffer = Buffer.from(input.base64, "base64");
        if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã QR phải là ảnh tối đa 5 MB" });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160) || "wallet-withdrawal-qr";
        const stored = await storagePut(`users/${ctx.user!.id}/withdrawal-qr-${Date.now()}-${safeName}`, buffer, input.mimeType);
        return { url: stored.url };
      }),
    createWalletWithdrawal: protectedProcedure
      .input(z.object({ amount: z.number().int().min(10_000).max(20_000_000), bankCode: z.string().trim().min(2).max(32), accountNumber: z.string().trim().regex(/^[0-9]{4,32}$/), accountHolder: z.string().trim().min(3).max(255), qrUrl: z.string().url().startsWith("https://"), note: z.string().trim().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return db.createWalletWithdrawal(ctx.user!.id, input);
      }),
    createWalletTopup: protectedProcedure
      .input(z.object({ amount: z.number().int().min(1_000).max(20_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        const topup = await db.createWalletTopup(ctx.user!.id, input.amount);
        return { ...topup, qrUrl: buildSePayQrUrl(topup.topupCode, Number(topup.amount)) };
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
        paymentMethod: z.enum(["sepay_vietqr", "wallet_balance"]).optional(),
        shipping: z.object({
          name: z.string().trim().min(2).max(255),
          phone: z.string().trim().min(8).max(64),
          address: z.string().trim().min(5).max(2000),
          note: z.string().trim().max(2000).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        const order = await db.createOrder(ctx.user!.id, input);
        if (input.paymentMethod === "wallet_balance") {
          const payment = await db.payOrderWithWalletBalance(ctx.user!.id, order.orderId);
          return { ...order, ...payment, qrUrl: null, paymentFlow: "wallet_balance" as const };
        }
        const siteSettings = await db.getSiteSettings();
        const qrUrl = order.hasPhysicalItems
          ? buildStoreVietQrUrl({ bankCode: siteSettings?.physical_qr_bank_code || "", accountNumber: siteSettings?.physical_qr_account_number || "", accountHolder: siteSettings?.physical_qr_account_holder || "" }, Number(order.totalAmount))
          : buildSePayQrUrl(order.orderCode, Number(order.totalAmount));
        return { ...order, qrUrl, paymentFlow: order.hasPhysicalItems ? "manual_techcombank" as const : "sepay_vietinbank" as const };
      }),

    quickCheckout: protectedProcedure
      .input(z.object({
        item: z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(99), variantId: z.number().int().positive().optional(), attributes: z.string().max(255).optional(), fulfillmentMode: z.enum(["in_stock", "preorder"]).optional() }),
        shipping: z.object({ name: z.string().trim().min(2).max(255), phone: z.string().trim().min(8).max(64), address: z.string().trim().min(5).max(2000), note: z.string().trim().max(2000).optional() }).optional(),
        paymentMethod: z.enum(["sepay_vietqr", "wallet_balance"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        const order = await db.createOrder(ctx.user!.id, { totalAmount: 0, items: [{ ...input.item, price: 0 }], shipping: input.shipping, clearCart: false });
        if (input.paymentMethod === "wallet_balance") {
          const payment = await db.payOrderWithWalletBalance(ctx.user!.id, order.orderId);
          return { ...order, ...payment, qrUrl: null, paymentFlow: "wallet_balance" as const };
        }
        const siteSettings = await db.getSiteSettings();
        const qrUrl = order.hasPhysicalItems
          ? buildStoreVietQrUrl({ bankCode: siteSettings?.physical_qr_bank_code || "", accountNumber: siteSettings?.physical_qr_account_number || "", accountHolder: siteSettings?.physical_qr_account_holder || "" }, Number(order.totalAmount))
          : buildSePayQrUrl(order.orderCode, Number(order.totalAmount));
        return { ...order, qrUrl, paymentFlow: order.hasPhysicalItems ? "manual_techcombank" as const : "sepay_vietinbank" as const };
      }),

    createAdminOrder: adminProcedure
      .input(z.object({
        customerId: z.number().int().positive(),
        items: z.array(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), quantity: z.number().int().positive().max(999) })).min(1).max(50),
        shipping: z.object({ name: z.string().trim().min(2).max(255), phone: z.string().trim().min(8).max(64), address: z.string().trim().min(5).max(2000), note: z.string().trim().max(2000).optional() }),
      }))
      .mutation(async ({ ctx, input }) => {
        const customer = (await db.getAllUsers()).find(user => user.id === input.customerId);
        if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài khoản khách hàng để tạo đơn" });
        return db.createOrder(input.customerId, {
          totalAmount: 0,
          items: input.items.map(item => ({ ...item, price: 0, fulfillmentMode: "in_stock" as const })),
          shipping: input.shipping,
          clearCart: false,
          inventoryPerformedByUserId: ctx.user!.id,
          inventoryReason: `Tạo đơn quản trị cho ${customer.username || customer.name || `khách #${customer.id}`}`,
        });
      }),

    orders: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      const isOwner = ctx.user.role === 'owner';
      return await db.getOrders(ctx.user!.id, isOwner);
    }),

    myOrders: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getOrders(ctx.user!.id, false);
    }),

    trackingEvents: protectedProcedure
      .input(z.object({ orderId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        const isOwner = ctx.user.role === "owner";
        return db.getOrderTrackingEvents(input.orderId, ctx.user!.id, isOwner);
      }),

    addTrackingEvent: adminProcedure
      .input(z.object({
        orderId: z.number().int().positive(),
        stage: z.string().trim().min(2).max(64),
        carrier: z.string().trim().max(64).optional(),
        trackingNumber: z.string().trim().max(128).optional(),
        trackingUrl: z.preprocess(value => typeof value === "string" && !value.trim() ? undefined : value, z.string().trim().url("Link tra cứu chưa hợp lệ").max(4096).optional()),
        status: z.enum(["pending", "in_transit", "delivered", "exception", "updated"]),
        location: z.string().trim().max(255).optional(),
        description: z.string().trim().max(2000).optional(),
        eventTime: z.coerce.date().optional(),
        orderStage: z.enum(["ordered", "central_warehouse", "ready_hanoi", "tracking"]).optional(),
      }))
      .mutation(({ input }) => db.addOrderTrackingEvent(input)),

    paymentStatus: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        const order = await db.getOrderPaymentForUser(ctx.user!.id, input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đơn hàng" });
        return order;
      }),

    downloads: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user!.id);
      return db.getPaidDownloadsForUser(ctx.user!.id);
    }),

    instantDownloads: protectedProcedure
      .input(z.object({ orderId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user!.id);
        return db.getInstantDownloadsForOrder(ctx.user!.id, input.orderId);
      }),

    updateOrderStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "processing", "shipping", "completed", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'owner') {
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
      .mutation(({ ctx, input }) => db.deleteOrder(input.orderId, ctx.user!.id)),

    usersList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'owner') {
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
        if (ctx.user.role !== 'owner') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return await db.updateUserStatus(input.userId, input.status, ctx.user!.id);
      }),

    updateUserRole: ownerProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        role: z.literal("user"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user!.id === input.userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tài khoản chủ cửa hàng không thể hạ quyền" });
        }
        return await db.updateUserRole(input.userId, input.role, ctx.user!.id);
      }),

    productDownloadLinks: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "owner") {
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
        if (ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return db.saveProductDownloadLink(input.productId, input.driveUrl);
      }),
  }),
});

export type AppRouter = typeof appRouter;
