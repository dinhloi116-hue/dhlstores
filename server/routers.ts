import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

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

  store: router({
    categories: publicProcedure.query(async () => {
      return await db.getCategories();
    }),

    products: publicProcedure
      .input(z.object({
        type: z.string().optional(),
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy sản phẩm" });
        }
        return product;
      }),

    cart: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCartItems(ctx.user.id);
    }),

    addToCart: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.number().min(1).default(1),
        attributes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.addToCart(ctx.user.id, input.productId, input.quantity, input.attributes);
      }),

    updateCart: protectedProcedure
      .input(z.object({
        cartItemId: z.number(),
        quantity: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateCartItem(input.cartItemId, input.quantity);
      }),

    removeFromCart: protectedProcedure
      .input(z.object({ cartItemId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.removeFromCart(input.cartItemId);
      }),

    checkout: protectedProcedure
      .input(z.object({
        shippingName: z.string().optional(),
        shippingPhone: z.string().optional(),
        shippingAddress: z.string().optional(),
        shippingNote: z.string().optional(),
        totalAmount: z.number(),
        hasPhysicalItems: z.boolean(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          price: z.number(),
          attributes: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.hasPhysicalItems) {
          if (!input.shippingName || !input.shippingPhone || !input.shippingAddress) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Vui lòng cung cấp đầy đủ thông tin họ tên, số điện thoại và địa chỉ giao hàng cho sản phẩm vật lý.",
            });
          }
        }
        return await db.createOrder(ctx.user.id, input);
      }),

    orders: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === 'admin';
      return await db.getOrders(ctx.user.id, isAdmin);
    }),

    updateOrderStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "preparing", "shipping", "completed", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ quản trị viên mới có quyền cập nhật trạng thái đơn hàng" });
        }
        return await db.updateOrderStatus(input.orderId, input.status);
      }),
  }),
});

export type AppRouter = typeof appRouter;
