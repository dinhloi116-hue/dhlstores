import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "../db";
import { storagePut } from "../storage";
import { adminProcedure, router } from "../_core/trpc";
import { parseExcelProducts, toOptionGroups } from "../excelProductImport";

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
  attributes: z.string().trim().max(2000).optional(),
  sku: z.string().trim().max(128).optional(),
  image: z.string().trim().max(4096).optional(),
  priceAdjustment: z.coerce.number().min(-999_999_999).max(999_999_999).default(0),
  stock: z.coerce.number().int().min(0).max(999_999).default(0),
  isActive: z.boolean().default(true),
});

const productOptionGroupsInput = z.array(z.object({
  name: z.string().trim().min(1).max(64),
  values: z.array(z.string().trim().min(1).max(64)).min(1).max(30),
})).max(5);

const allowedMime = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|application\/(pdf|zip|x-zip-compressed))$/;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_EXCEL_IMPORT_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180) || "upload";
}

const excelImportInput = z.object({
  fileName: z.string().trim().min(1).max(255),
  base64: z.string().min(1),
});

function readExcelImport(input: z.infer<typeof excelImportInput>) {
  if (!/\.xlsx$/i.test(input.fileName)) throw new Error("Chỉ hỗ trợ file Excel định dạng .xlsx");
  const buffer = Buffer.from(input.base64, "base64");
  if (!buffer.length || buffer.length > MAX_EXCEL_IMPORT_BYTES) throw new Error("File Excel phải có dung lượng từ 1 byte đến 10 MB");
  return parseExcelProducts(buffer);
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
  productOptionGroups: adminProcedure.input(z.object({ productId: z.number().int().positive() })).query(({ input }) =>
    db.getProductOptionGroups(input.productId),
  ),
  saveProductOptionGroups: adminProcedure.input(z.object({ productId: z.number().int().positive(), groups: productOptionGroupsInput })).mutation(({ input }) =>
    db.replaceProductOptionGroups(input),
  ),
  generateProductVariantCombinations: adminProcedure.input(z.object({ productId: z.number().int().positive(), skuPrefix: z.string().trim().max(48).optional(), stock: z.coerce.number().int().min(0).max(999_999), priceAdjustment: z.coerce.number().min(-999_999_999).max(999_999_999).default(0) })).mutation(({ input }) =>
    db.generateProductVariantCombinations({ ...input, priceAdjustment: String(input.priceAdjustment) }),
  ),
  previewExcelImport: adminProcedure.input(excelImportInput).mutation(async ({ input }) => {
    const parsed = readExcelImport(input);
    const existingSlugs = new Set((await db.getAdminProducts()).map(product => product.slug));
    return {
      sheetName: parsed.sheetName,
      rowCount: parsed.rowCount,
      productCount: parsed.products.length,
      variantCount: parsed.products.reduce((count, product) => count + product.variants.length, 0),
      errors: parsed.errors,
      duplicates: parsed.products.filter(product => existingSlugs.has(product.slug)).map(product => product.name),
      products: parsed.products.slice(0, 20).map(product => ({ name: product.name, slug: product.slug, price: product.price, image: product.image, tags: product.tags, variants: product.variants.length, options: toOptionGroups(product) })),
    };
  }),
  importExcelProducts: adminProcedure.input(excelImportInput.extend({ categoryId: z.number().int().positive(), skipDuplicates: z.boolean().default(true) })).mutation(async ({ input }) => {
    const parsed = readExcelImport(input);
    const category = (await db.getAdminCategories()).find(item => item.id === input.categoryId);
    if (!category) throw new Error("Danh mục được chọn không tồn tại");
    const existingSlugs = new Set((await db.getAdminProducts()).map(product => product.slug));
    let createdProducts = 0;
    let createdVariants = 0;
    const skipped: string[] = [];
    for (const imported of parsed.products) {
      if (existingSlugs.has(imported.slug)) {
        if (input.skipDuplicates) { skipped.push(imported.name); continue; }
        throw new Error(`Slug ${imported.slug} đã tồn tại`);
      }
      const basePrice = imported.variants.length ? Math.min(...imported.variants.map(variant => variant.price || imported.price)) : imported.price;
      const product = await db.createProduct({ name: imported.name, slug: imported.slug, description: imported.description.slice(0, 5000), price: String(basePrice), categoryId: category.id, image: imported.image, specs: imported.tags ? `Tags: ${imported.tags}` : undefined, stock: 0, featured: false, isActive: true });
      if (!product) throw new Error(`Không thể tạo sản phẩm ${imported.name}`);
      createdProducts += 1;
      existingSlugs.add(imported.slug);
      if (category.type === "physical" && imported.variants.length) {
        const groups = toOptionGroups(imported);
        if (groups.length) await db.replaceProductOptionGroups({ productId: product.id, groups });
        for (const variant of imported.variants) {
          const attributes = variant.attributes.map(attribute => `${attribute.name}: ${attribute.value}`).join("\n");
          const color = variant.attributes.find(attribute => /màu|color/i.test(attribute.name))?.value;
          const size = variant.attributes.find(attribute => /size|kích thước/i.test(attribute.name))?.value;
          const created = await db.createProductVariant({ productId: product.id, size, color, attributes: attributes || undefined, sku: variant.sku || undefined, image: variant.image || undefined, priceAdjustment: String(Math.max(0, variant.price - basePrice)), stock: 0, isActive: true });
          if (created) createdVariants += 1;
        }
      }
    }
    return { createdProducts, createdVariants, skipped, totalRows: parsed.rowCount };
  }),

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
