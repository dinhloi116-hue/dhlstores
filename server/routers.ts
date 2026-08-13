import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { buildSePayQrUrl } from "./sepay";
import { catalogAdminRouter } from "./routers/catalogAdmin";

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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  catalogAdmin: catalogAdminRouter,

  store: router({
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
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return await db.addToCart(ctx.user.id, input.productId, input.quantity, input.variantId, input.attributes);
      }),

    updateCart: protectedProcedure
      .input(z.object({
        cartItemId: z.number(),
        quantity: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return await db.updateCartItem(input.cartItemId, input.quantity);
      }),

    removeFromCart: protectedProcedure
      .input(z.object({ cartItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireActiveAccount(ctx.user.id);
        return await db.removeFromCart(input.cartItemId);
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
        })),
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
        return { ...order, qrUrl: buildSePayQrUrl(order.orderCode, order.totalAmount) };
      }),

    orders: protectedProcedure.query(async ({ ctx }) => {
      await requireActiveAccount(ctx.user.id);
      const isAdmin = ctx.user.role === 'admin';
      return await db.getOrders(ctx.user.id, isAdmin);
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

    updateOrderStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "processing", "shipping", "completed", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ quản trị viên mới có quyền cập nhật" });
        }
        return await db.updateOrderStatus(input.orderId, input.status);
      }),

    usersList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
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
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return await db.updateUserStatus(input.userId, input.status);
      }),

    productDownloadLinks: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
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
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return db.saveProductDownloadLink(input.productId, input.driveUrl);
      }),
  }),
});

export type AppRouter = typeof appRouter;
