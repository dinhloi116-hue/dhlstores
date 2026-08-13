import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "../db";
import { storagePut } from "../storage";
import { adminProcedure, router } from "../_core/trpc";

const categoryInput = z.object({
  name: z.string().trim().min(2).max(128),
  slug: z.string().trim().min(2).max(128).regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  description: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});

const productInput = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().min(2).max(255).regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().min(0).max(999_999_999),
  categoryId: z.number().int().positive(),
  image: z.string().trim().min(1).max(4096),
  fileUrl: z.string().trim().max(4096).optional(),
  fileSize: z.string().trim().max(64).optional(),
  specs: z.string().trim().max(5000).optional(),
  stock: z.coerce.number().int().min(0).max(999_999).default(0),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const productVariantInput = z.object({
  productId: z.number().int().positive(),
  size: z.string().trim().max(64).optional(),
  color: z.string().trim().max(64).optional(),
  sku: z.string().trim().max(128).optional(),
  priceAdjustment: z.coerce.number().min(-999_999_999).max(999_999_999).default(0),
  stock: z.coerce.number().int().min(0).max(999_999).default(0),
  isActive: z.boolean().default(true),
});

const allowedMime = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|application\/(pdf|zip|x-zip-compressed))$/;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180) || "upload";
}

export const catalogAdminRouter = router({
  categories: adminProcedure.query(() => db.getAdminCategories()),
  createCategory: adminProcedure.input(categoryInput).mutation(({ input }) => db.createCategory(input)),
  updateCategory: adminProcedure.input(z.object({ categoryId: z.number().int().positive(), data: categoryInput })).mutation(({ input }) =>
    db.updateCategory(input.categoryId, input.data),
  ),

  products: adminProcedure.query(() => db.getAdminProducts()),
  createProduct: adminProcedure.input(productInput).mutation(({ input }) =>
    db.createProduct({ ...input, price: String(input.price), fileUrl: input.fileUrl || undefined, fileSize: input.fileSize || undefined, specs: input.specs || undefined }),
  ),
  updateProduct: adminProcedure.input(z.object({ productId: z.number().int().positive(), data: productInput })).mutation(({ input }) =>
    db.updateProduct(input.productId, {
      ...input.data,
      price: String(input.data.price),
      fileUrl: input.data.fileUrl || undefined,
      fileSize: input.data.fileSize || undefined,
      specs: input.data.specs || undefined,
    }),
  ),

  productVariants: adminProcedure.input(z.object({ productId: z.number().int().positive().optional() }).optional()).query(({ input }) =>
    db.getAdminProductVariants(input?.productId),
  ),
  createProductVariant: adminProcedure.input(productVariantInput).mutation(({ input }) =>
    db.createProductVariant({ ...input, priceAdjustment: String(input.priceAdjustment) }),
  ),
  updateProductVariant: adminProcedure.input(z.object({
    variantId: z.number().int().positive(),
    data: productVariantInput.omit({ productId: true }),
  })).mutation(({ input }) =>
    db.updateProductVariant(input.variantId, { ...input.data, priceAdjustment: String(input.data.priceAdjustment) }),
  ),

  media: adminProcedure.query(() => db.getMediaAssets()),
  uploadMedia: adminProcedure.input(z.object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(3).max(128),
    base64: z.string().min(1),
  })).mutation(async ({ input }) => {
    if (!allowedMime.test(input.mimeType)) {
      throw new Error("Chỉ chấp nhận ảnh PNG/JPEG/WebP/GIF, video MP4/WebM, PDF hoặc ZIP");
    }

    const buffer = Buffer.from(input.base64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      throw new Error("Tệp phải có dung lượng từ 1 byte đến 20 MB");
    }

    const fileName = sanitizeFileName(input.fileName);
    const stored = await storagePut(`catalog/${Date.now()}-${nanoid(8)}-${fileName}`, buffer, input.mimeType);
    return db.createMediaAsset({
      fileName,
      storageKey: stored.key,
      url: stored.url,
      mimeType: input.mimeType,
      sizeBytes: buffer.length,
    });
  }),
});
