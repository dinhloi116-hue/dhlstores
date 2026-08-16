import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, adminActivity, balanceLedger, cartItems, categories, customerFeedback, discountCodes, inventoryMovements, mediaAssets, orderItems as orderItemsTable, orders as ordersTable, paymentTransactions, productDownloadLinks, productOptionGroups, productVariants, productWholesaleTiers, products, shippingAddresses, siteSettings, supportConversations, supportMessages, users, visitorEvents, walletTopups } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let lastDatabaseFailureAt = 0;
const DATABASE_RETRY_DELAY_MS = 30_000;

export async function getDb() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;
  if (_db) return _db;
  if (!process.env.DATABASE_URL || Date.now() - lastDatabaseFailureAt < DATABASE_RETRY_DELAY_MS) return null;
  try {
    const candidate = drizzle(process.env.DATABASE_URL);
    await candidate.execute(sql`SELECT 1`);
    _db = candidate;
    return _db;
  } catch {
    lastDatabaseFailureAt = Date.now();
    return null;
  }
}

export interface ProductType {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  type: 'digital' | 'physical';
  categoryId: number;
  image: string;
  fileUrl?: string;
  fileSize?: string;
  stock: number;
  weightGrams?: number;
  specs?: string;
  featured: boolean;
  isActive?: boolean;
  createdAt: Date;
}

export interface ProductVariantType {
  id: number;
  productId: number;
  size?: string;
  color?: string;
  attributes?: string;
  sku?: string;
  image?: string;
  priceAdjustment: string;
  stock: number;
  weightGrams?: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductOptionGroupType {
  id: number;
  productId: number;
  name: string;
  values: string[];
  sortOrder: number;
}

export interface ProductWholesaleTierType {
  id: number;
  productId: number;
  minQuantity: number;
  unitPrice: string;
  sortOrder: number;
}

export interface CategoryType {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: 'digital' | 'physical' | 'all';
  iconKey?: string;
  isActive?: boolean;
}

export interface CartItemType {
  id: number;
  userId: number;
  productId: number;
  variantId?: number | null;
  quantity: number;
  fulfillmentMode: 'in_stock' | 'preorder';
  attributes?: string;
  weightGrams?: number;
  product?: ProductType;
  variant?: ProductVariantType;
}

export interface OrderItemType {
  id: number;
  orderId: number;
  productId: number;
  variantId?: number | null;
  variantLabel?: string | null;
  quantity: number;
  price: string;
  fulfillmentMode: 'in_stock' | 'preorder';
  attributes?: string;
  weightGrams?: number;
  product?: ProductType;
}

export type OrderStatusType = 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled';

export interface OrderType {
  id: number;
  userId: number;
  orderCode: string;
  totalAmount: string;
  status: OrderStatusType;
  paymentStatus: 'pending' | 'paid';
  paymentMethod: string;
  paymentReference?: string | null;
  discountCode?: string | null;
  discountAmount?: string;
  paymentConfirmedAt?: Date | null;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  shippingNote?: string | null;
  shippingMethod?: string | null;
  shippingFee?: string;
  shippingWeightGrams?: number;
  hasPhysicalItems?: boolean;
  hasPreorderItems?: boolean;
  preorderDiscountAmount?: string;
  preorderEstimatedDays?: string | null;
  trackingStage?: 'ordered' | 'central_warehouse' | 'ready_hanoi' | 'tracking';
  trackingUrl?: string | null;
  isDeleted?: boolean;
  createdAt: Date;
  items?: OrderItemType[];
}

export interface ExtendedUserType {
  id: number;
  openId: string;
  username: string | null;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  loginMethod: string | null;
  role: 'user' | 'admin' | 'owner';
  status: 'active' | 'blocked';
  balance: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

type LocalUserRecordType = ExtendedUserType & {
  passwordHash: string | null;
};

export type ShippingMethodCode = "pickup" | "standard" | "express";

export interface ShippingAddressType {
  id: number;
  userId: number;
  recipientName: string;
  phone: string;
  address: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ShippingAddressInput = Pick<ShippingAddressType, "recipientName" | "phone" | "address"> & { isDefault?: boolean };

export const shippingOptions: Array<{ code: ShippingMethodCode; label: string; fee: number }> = [
  { code: "pickup", label: "Nhận tại cửa hàng", fee: 0 },
  { code: "standard", label: "Giao tiêu chuẩn", fee: 30000 },
  { code: "express", label: "Giao nhanh", fee: 50000 },
];

export function getShippingOption(code: ShippingMethodCode) {
  return shippingOptions.find(option => option.code === code) ?? shippingOptions[0];
}

const logoUrl = "/manus-storage/logodhlstores_c8e433ed.png";

const memoryCategories: CategoryType[] = [
  { id: 1, name: "Font Chữ & Font Thể Thao", slug: "font-chu-the-thao", description: "Font CLB, font áo bóng đá, font số, font retro, font Việt hóa...", type: "digital", iconKey: "Type" },
  { id: 2, name: "Tên Số Áo Bóng Đá", slug: "ten-so-ao-bong-da", description: "Bộ name set theo CLB, đội tuyển, mùa giải, cầu thủ chuẩn in ấn.", type: "digital", iconKey: "Hash" },
  { id: 3, name: "Vector & SVG", slug: "vector-svg", description: "Logo, biểu tượng, icon, họa tiết, hình vector dùng Corel/Illustrator.", type: "digital", iconKey: "Shapes" },
  { id: 4, name: "File In Áo / DTF / PET", slug: "file-in-ao-dtf", description: "Mẫu in ngực, lưng, tay áo, artwork đã xử lý sẵn để in PET/DTF.", type: "digital", iconKey: "Printer" },
  { id: 5, name: "Patch & Badge", slug: "patch-badge", description: "Patch giải đấu, logo tài trợ, huy hiệu, badge áo bóng đá, patch giả thêu.", type: "digital", iconKey: "BadgeCheck" },
  { id: 6, name: "Template Thiết Kế", slug: "template-thiet-ke", description: "Template áo đấu, mockup, banner, poster, social media, bảng giá...", type: "digital", iconKey: "PenTool" },
  { id: 7, name: "Mockup Sản Phẩm", slug: "mockup-san-pham", description: "Mockup áo bóng đá, áo thun, hoodie, túi, cốc, phụ kiện trưng bày.", type: "digital", iconKey: "Camera" },
  { id: 8, name: "Clipart & PNG Không Nền", slug: "clipart-png", description: "Nhân vật, hình trang trí, sticker, đồ họa 2D, PNG chất lượng cao.", type: "digital", iconKey: "Sticker" },
  { id: 9, name: "Pattern & Background", slug: "pattern-background", description: "Họa tiết áo, texture, pattern thể thao, background thiết kế.", type: "digital", iconKey: "Palette" },
  { id: 10, name: "Combo / Design Bundle", slug: "combo-design-bundle", description: "Bộ font + vector + patch + mockup hoặc các gói tài nguyên theo chủ đề.", type: "digital", iconKey: "FolderArchive" },
  { id: 11, name: "Quần Áo Bóng Đá", slug: "quan-ao-bong-da", description: "Áo bóng đá, quần thi đấu và trang phục thể thao đặt theo mẫu.", type: "physical", iconKey: "Shirt" },
  { id: 12, name: "Patch Tay", slug: "patch-tay", description: "Patch tay áo, badge giải đấu và phụ kiện ép nhiệt cho áo bóng đá.", type: "physical", iconKey: "BadgeCheck" },
  { id: 13, name: "Nameset Chống Nhiễm", slug: "nameset-chong-nhiem", description: "Nameset, số áo và chữ in chống nhiễm dành cho trang phục thể thao.", type: "physical", iconKey: "Tags" },
];

const memoryProducts: ProductType[] = [
  {
    id: 1,
    name: "Bộ Font Số Áo Đấu Premier League 2026/27 (OTF/TTF)",
    slug: "bo-font-so-ao-dau-premier-league-2026",
    description: "Trọn bộ font chữ và số áo đấu chuẩn Ngoại Hạng Anh mùa giải mới nhất. Đã Việt hóa đầy đủ dấu, tương thích hoàn hảo Illustrator & CorelDraw.",
    price: "250000",
    type: "digital",
    categoryId: 1,
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "14.2 MB (.OTF, .TTF, .WOFF2)",
    stock: 9999,
    specs: "Định dạng: OTF, TTF. Tương thích: Mọi phần mềm đồ họa.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "Name Set Huyền Thoại CLB Hoàng Gia (Vector Corel/AI)",
    slug: "name-set-huyen-thoai-clb-hoang-gia",
    description: "Bộ file vector tên và số áo đấu trọn bộ các ngôi sao lịch sử CLB Hoàng Gia Tây Ban Nha. Sẵn sàng in ấn trực tiếp không cần chỉnh sửa.",
    price: "180000",
    type: "digital",
    categoryId: 2,
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "45 MB (.CDR, .AI, .EPS)",
    stock: 9999,
    specs: "Định dạng: CorelDraw X7+, Illustrator CC. Độ phân giải vector chuẩn.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 3,
    name: "Kho Họa Tiết Vector Thể Thao & Đồ Họa Abstract",
    slug: "kho-hoa-tiet-vector-the-thao-abstract",
    description: "Hơn 200+ mẫu họa tiết geometric, đường nét tốc độ speed lines và các shape đồ họa chuyên dụng thiết kế áo đấu thể thao.",
    price: "320000",
    type: "digital",
    categoryId: 3,
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "210 MB (.ZIP - AI, CDR, SVG)",
    stock: 9999,
    specs: "Định dạng: SVG, AI, CDR. Đầy đủ bản quyền thương mại.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 4,
    name: "File In Áo DTF / PET Sẵn In - Mẫu Ngực & Lưng 4K",
    slug: "file-in-ao-dtf-pet-mau-nguc-lung-4k",
    description: "Tuyển tập các mẫu artwork tách nền độ phân giải cực cao 300 DPI chuyên dùng in PET chuyển nhiệt, in DTF áo thun và áo đấu.",
    price: "200000",
    type: "digital",
    categoryId: 4,
    image: "https://images.unsplash.com/photo-1518063319789-7217e6706704?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "350 MB (.PNG 300DPI Transparent)",
    stock: 9999,
    specs: "Định dạng: PNG không nền kích thước lớn, sẵn sàng đưa vào máy in.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 5,
    name: "Bộ Patch & Huy Hiệu Giải Đấu Châu Âu 2026",
    slug: "bo-patch-huy-hieu-giai-dấu-châu-âu-2026",
    description: "Trọn bộ vector huy hiệu các giải đấu vô địch quốc gia hàng đầu châu Âu và cúp C1 chuẩn tỷ lệ thực tế để in ấn.",
    price: "150000",
    type: "digital",
    categoryId: 5,
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "68 MB (.CDR, .AI, .PDF)",
    stock: 9999,
    specs: "Định dạng: Vector AI/CDR chuẩn màu CMYK cho in ấn.",
    featured: false,
    createdAt: new Date(),
  },
  {
    id: 6,
    name: "Template Mẫu Thiết Kế Áo Đấu Sublimation Pro",
    slug: "template-mau-thiet-ke-ao-dau-sublimation-pro",
    description: "Bộ template áo đấu full body (thân trước, thân sau, tay áo, cổ áo) chuẩn tỷ lệ cho nhà xưởng in chuyển nhiệt.",
    price: "390000",
    type: "digital",
    categoryId: 6,
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "520 MB (.CDR, .AI)",
    stock: 9999,
    specs: "Định dạng: CorelDraw & Illustrator tỉ lệ 1:1 chuyên nghiệp.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 7,
    name: "Mockup 3D Áo Bóng Đá & Áo Thun PSD Smart Object",
    slug: "mockup-3d-ao-bong-da-ao-thun-psd",
    description: "File Photoshop mockup áo đấu siêu thực với tính năng Smart Object thay đổi thiết kế và màu sắc chỉ với 1 click.",
    price: "220000",
    type: "digital",
    categoryId: 7,
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "480 MB (.PSD High-Res Layers)",
    stock: 9999,
    specs: "Định dạng: Adobe Photoshop .PSD tách lớp chuyên sâu.",
    featured: false,
    createdAt: new Date(),
  },
  {
    id: 8,
    name: "Kho Clipart Cầu Thủ Bóng Đá & Huy Hiệu Vector 2D",
    slug: "kho-clipart-cau-thu-bong-da-huy-hieu-2d",
    description: "Hàng trăm hình minh họa cầu thủ dạng vector hoạt hình, silhouette và chibi phục vụ thiết kế banner sự kiện bóng đá.",
    price: "170000",
    type: "digital",
    categoryId: 8,
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "140 MB (.EPS, .SVG, .PNG)",
    stock: 9999,
    specs: "Định dạng: EPS, SVG, PNG trong suốt.",
    featured: false,
    createdAt: new Date(),
  },
  {
    id: 9,
    name: "Texture Vải Thể Thao & Họa Tiết Carbon / Mè Seamless",
    slug: "texture-vai-the-thao-hoa-tiet-carbon-seamless",
    description: "Bộ texture vải thun mè, vải caro thể thao và hoa tiết carbon pattern liền mạch (seamless) cực kỳ chân thực khi áp lên áo.",
    price: "190000",
    type: "digital",
    categoryId: 9,
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "290 MB (.PAT, .JPG High-Res Seamless)",
    stock: 9999,
    specs: "Định dạng: PAT (Photoshop Pattern) và JPG 4K Seamless lặp vô hạn.",
    featured: false,
    createdAt: new Date(),
  },
  {
    id: 10,
    name: "Mega Bundle Ultimate 2026 - Trọn Bộ Mọi Tài Nguyên Áo Đấu",
    slug: "mega-bundle-ultimate-2026-tron-bo-tai-nguyen",
    description: "Gói siêu tiết kiệm bao gồm toàn bộ font chữ, vector, name set, patch, mockup và template của DHL Stores. Dành riêng cho xưởng in lớn.",
    price: "990000",
    type: "digital",
    categoryId: 10,
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "3.5 GB (All-in-One Cloud Download)",
    stock: 9999,
    specs: "Toàn bộ thư viện DHL Stores v2026 trọn đời bản quyền thương mại.",
    featured: true,
    createdAt: new Date(),
  }
];

let memoryUsers: LocalUserRecordType[] = [
  {
    id: 1,
    openId: ENV.ownerOpenId || "owner-admin",
    username: null,
    passwordHash: null,
    name: "Admin DHL Stores",
    email: "admin@dhlstores.vn",
    emailVerified: false,
    loginMethod: "manus",
    role: "admin",
    status: "active",
    balance: "0",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  {
    id: 2,
    openId: "sample-user-2",
    username: null,
    passwordHash: null,
    name: "Nguyễn Văn Khách",
    email: "khachhang@gmail.com",
    emailVerified: false,
    loginMethod: "manus",
    role: "user",
    status: "active",
    balance: "0",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  }
];

let memoryCart: CartItemType[] = [];
let memoryOrders: OrderType[] = [];
let memoryOrderItems: OrderItemType[] = [];
let memoryProductVariants: ProductVariantType[] = [];
let memoryProductOptionGroups: ProductOptionGroupType[] = [];
let memoryProductWholesaleTiers: ProductWholesaleTierType[] = [];
let memoryShippingAddresses: ShippingAddressType[] = [];
const memoryProcessedTransactions = new Set<string>();
const memoryDownloadLinks = new Map<number, string>();
const memoryMediaAssets: Array<{ id: number; fileName: string; storageKey: string; url: string; mimeType: string; sizeBytes: number; createdAt: Date }> = [];
let nextCartId = 1;
let nextOrderId = 1;
let nextOrderItemId = 1;
let nextMediaAssetId = 1;
let nextProductVariantId = 1;
let nextProductOptionGroupId = 1;
let nextProductWholesaleTierId = 1;
let nextShippingAddressId = 1;

async function ensureDefaultCatalog(connection: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  await connection.insert(categories).values(memoryCategories.map(category => ({
    name: category.name,
    slug: category.slug,
    description: category.description,
    type: category.type,
    iconKey: category.iconKey,
    isActive: true,
  }))).onDuplicateKeyUpdate({ set: {
    name: sql`VALUES(name)`,
    iconKey: sql`IF(iconKey IS NULL OR iconKey = '' OR iconKey = 'Package', VALUES(iconKey), iconKey)`,
  } });

  const persistedCategories = await connection.select().from(categories);
  const idBySlug = new Map(persistedCategories.map(category => [category.slug, category.id]));
  const categorySlugByLegacyId = new Map(memoryCategories.map(category => [category.id, category.slug]));
  const existingProduct = await connection.select({ id: products.id }).from(products).limit(1);
  if (existingProduct.length > 0) return;

  await connection.insert(products).values(memoryProducts.map(product => ({
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    type: product.type,
    categoryId: idBySlug.get(categorySlugByLegacyId.get(product.categoryId) ?? "") ?? 1,
    image: product.image,
    fileUrl: product.fileUrl ?? null,
    fileSize: product.fileSize ?? null,
    stock: product.stock,
    specs: product.specs ?? null,
    featured: product.featured,
    isActive: true,
  }))).onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } });
}

function toCategoryType(category: typeof categories.$inferSelect): CategoryType {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    type: category.type,
    iconKey: category.iconKey,
    isActive: category.isActive,
  };
}

function toProductType(product: typeof products.$inferSelect): ProductType {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: String(product.price),
    type: product.type,
    categoryId: product.categoryId,
    image: product.image,
    fileUrl: product.fileUrl ?? undefined,
    fileSize: product.fileSize ?? undefined,
    stock: product.stock,
    weightGrams: product.weightGrams,
    specs: product.specs ?? undefined,
    featured: product.featured,
    isActive: product.isActive,
    createdAt: product.createdAt,
  };
}

function toProductVariantType(variant: typeof productVariants.$inferSelect): ProductVariantType {
  return {
    id: variant.id,
    productId: variant.productId,
    size: variant.size ?? undefined,
    color: variant.color ?? undefined,
    attributes: variant.attributes ?? undefined,
    sku: variant.sku ?? undefined,
    image: variant.image ?? undefined,
    priceAdjustment: String(variant.priceAdjustment),
    stock: variant.stock,
    weightGrams: variant.weightGrams ?? undefined,
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    createdAt: variant.createdAt,
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const connection = await getDb();
  if (connection) {
    const current = await connection.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    if (current[0]) {
      await connection.update(users).set({
        name: user.name ?? current[0].name,
        email: user.email ?? current[0].email,
        loginMethod: user.loginMethod ?? current[0].loginMethod,
        lastSignedIn: user.lastSignedIn ?? new Date(),
      }).where(eq(users.openId, user.openId));
      return;
    }
    await connection.insert(users).values({
      openId: user.openId,
      username: user.username ?? null,
      passwordHash: user.passwordHash ?? null,
      name: user.name ?? null,
      email: user.email ?? null,
      emailVerified: user.emailVerified ?? false,
      loginMethod: user.loginMethod ?? null,
      role: user.openId === ENV.ownerOpenId ? "admin" : "user",
      status: "active",
      lastSignedIn: user.lastSignedIn ?? new Date(),
    });
    return;
  }
  const existing = memoryUsers.find(u => u.openId === user.openId);
  if (existing) {
    if (user.name) existing.name = user.name;
    if (user.email) existing.email = user.email;
    existing.lastSignedIn = new Date();
  } else {
    memoryUsers.push({
      id: memoryUsers.length + 1,
      openId: user.openId,
      username: user.username ?? null,
      passwordHash: user.passwordHash ?? null,
      name: user.name || "Khách hàng DHL",
      email: user.email || "user@dhlstores.vn",
      emailVerified: user.emailVerified ?? false,
      loginMethod: user.loginMethod || "manus",
      role: user.openId === ENV.ownerOpenId ? "admin" : "user",
      status: "active",
      balance: "0",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
  }
}

export async function getUserByOpenId(openId: string) {
  const connection = await getDb();
  if (connection) {
    const result = await connection.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  }
  const found = memoryUsers.find(u => u.openId === openId);
  return found;
}

export async function getAllUsers() {
  const connection = await getDb();
  if (connection) return (await connection.select().from(users).orderBy(desc(users.createdAt))).map(toExtendedUserType);
  return memoryUsers.map(toExtendedUserType);
}

function toExtendedUserType(user: LocalUserRecordType | typeof users.$inferSelect): ExtendedUserType {
  return {
    id: user.id,
    openId: user.openId,
    username: user.username ?? null,
    name: user.name ?? null,
    email: user.email ?? null,
    emailVerified: user.emailVerified ?? false,
    loginMethod: user.loginMethod ?? null,
    role: user.role,
    status: user.status,
    balance: String(user.balance ?? "0"),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignedIn: user.lastSignedIn,
  };
}

export function hashLocalPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyLocalPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false;
  const [algorithm, salt, encodedKey] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !encodedKey) return false;
  const expected = Buffer.from(encodedKey, "base64url");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getUserByUsername(username: string) {
  const connection = await getDb();
  if (connection) {
    const result = await connection.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  return memoryUsers.find(user => user.username === username);
}

export async function createLocalUser(input: { username: string; passwordHash: string; name?: string }) {
  const connection = await getDb();
  if (connection) {
    const existing = await connection.select({ id: users.id }).from(users).where(eq(users.username, input.username)).limit(1);
    if (existing[0]) throw new Error("USERNAME_TAKEN");
    const inserted = await connection.insert(users).values({
      openId: `local:${input.username}`,
      username: input.username,
      passwordHash: input.passwordHash,
      name: input.name?.trim() || input.username,
      email: null,
      emailVerified: false,
      loginMethod: "local",
      role: "user",
      status: "active",
      balance: "0",
      lastSignedIn: new Date(),
    });
    const result = await connection.select().from(users).where(eq(users.id, Number(inserted[0].insertId))).limit(1);
    return result[0];
  }

  if (memoryUsers.some(user => user.username === input.username)) throw new Error("USERNAME_TAKEN");
  const now = new Date();
  const user: LocalUserRecordType = {
    id: Math.max(0, ...memoryUsers.map(item => item.id)) + 1,
    openId: `local:${input.username}`,
    username: input.username,
    passwordHash: input.passwordHash,
    name: input.name?.trim() || input.username,
    email: null,
    emailVerified: false,
    loginMethod: "local",
    role: "user",
    status: "active",
    balance: "0",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
  memoryUsers.push(user);
  return user;
}

export async function linkEmailToUser(userId: number, email: string) {
  const connection = await getDb();
  if (connection) {
    const owned = await connection.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (owned[0] && owned[0].id !== userId) throw new Error("EMAIL_TAKEN");
    await connection.update(users).set({ email, emailVerified: false }).where(eq(users.id, userId));
    return { success: true };
  }
  const owned = memoryUsers.find(user => user.email === email);
  if (owned && owned.id !== userId) throw new Error("EMAIL_TAKEN");
  const user = memoryUsers.find(item => item.id === userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  user.email = email;
  user.emailVerified = false;
  user.updatedAt = new Date();
  return { success: true };
}

export async function getShippingAddresses(userId: number): Promise<ShippingAddressType[]> {
  const connection = await getDb();
  if (connection) return await connection.select().from(shippingAddresses).where(eq(shippingAddresses.userId, userId)).orderBy(desc(shippingAddresses.isDefault), desc(shippingAddresses.updatedAt));
  return memoryShippingAddresses.filter(address => address.userId === userId).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function createShippingAddress(userId: number, input: ShippingAddressInput): Promise<ShippingAddressType> {
  const connection = await getDb();
  if (connection) return connection.transaction(async transaction => {
    const existing = await transaction.select({ id: shippingAddresses.id }).from(shippingAddresses).where(eq(shippingAddresses.userId, userId)).limit(1);
    const isDefault = input.isDefault === true || existing.length === 0;
    if (isDefault) await transaction.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    const inserted = await transaction.insert(shippingAddresses).values({ userId, recipientName: input.recipientName, phone: input.phone, address: input.address, isDefault });
    const created = (await transaction.select().from(shippingAddresses).where(eq(shippingAddresses.id, Number(inserted[0].insertId))).limit(1))[0];
    if (!created) throw new Error("ADDRESS_NOT_FOUND");
    return created;
  });
  const hasAddress = memoryShippingAddresses.some(address => address.userId === userId);
  const isDefault = input.isDefault === true || !hasAddress;
  if (isDefault) memoryShippingAddresses.forEach(address => { if (address.userId === userId) address.isDefault = false; });
  const now = new Date();
  const created: ShippingAddressType = { id: nextShippingAddressId++, userId, recipientName: input.recipientName, phone: input.phone, address: input.address, isDefault, createdAt: now, updatedAt: now };
  memoryShippingAddresses.unshift(created);
  return created;
}

export async function updateShippingAddress(userId: number, addressId: number, input: ShippingAddressInput): Promise<ShippingAddressType> {
  const connection = await getDb();
  if (connection) return connection.transaction(async transaction => {
    const current = (await transaction.select().from(shippingAddresses).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId))).limit(1))[0];
    if (!current) throw new Error("ADDRESS_NOT_FOUND");
    const isDefault = input.isDefault ?? current.isDefault;
    if (isDefault) await transaction.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    await transaction.update(shippingAddresses).set({ recipientName: input.recipientName, phone: input.phone, address: input.address, isDefault }).where(eq(shippingAddresses.id, addressId));
    const updated = (await transaction.select().from(shippingAddresses).where(eq(shippingAddresses.id, addressId)).limit(1))[0];
    if (!updated) throw new Error("ADDRESS_NOT_FOUND");
    return updated;
  });
  const current = memoryShippingAddresses.find(address => address.id === addressId && address.userId === userId);
  if (!current) throw new Error("ADDRESS_NOT_FOUND");
  const isDefault = input.isDefault ?? current.isDefault;
  if (isDefault) memoryShippingAddresses.forEach(address => { if (address.userId === userId) address.isDefault = false; });
  Object.assign(current, { recipientName: input.recipientName, phone: input.phone, address: input.address, isDefault, updatedAt: new Date() });
  return current;
}

export async function deleteShippingAddress(userId: number, addressId: number) {
  const connection = await getDb();
  if (connection) return connection.transaction(async transaction => {
    const current = (await transaction.select().from(shippingAddresses).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId))).limit(1))[0];
    if (!current) throw new Error("ADDRESS_NOT_FOUND");
    await transaction.delete(shippingAddresses).where(eq(shippingAddresses.id, addressId));
    if (current.isDefault) {
      const replacement = (await transaction.select({ id: shippingAddresses.id }).from(shippingAddresses).where(eq(shippingAddresses.userId, userId)).orderBy(desc(shippingAddresses.updatedAt)).limit(1))[0];
      if (replacement) await transaction.update(shippingAddresses).set({ isDefault: true }).where(eq(shippingAddresses.id, replacement.id));
    }
    return { success: true };
  });
  const index = memoryShippingAddresses.findIndex(address => address.id === addressId && address.userId === userId);
  if (index < 0) throw new Error("ADDRESS_NOT_FOUND");
  const [removed] = memoryShippingAddresses.splice(index, 1);
  if (removed?.isDefault) {
    const replacement = memoryShippingAddresses.filter(address => address.userId === userId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    if (replacement) replacement.isDefault = true;
  }
  return { success: true };
}

export async function updateUserStatus(userId: number, status: 'active' | 'blocked', performedByUserId?: number) {
  const connection = await getDb();
  if (connection) {
    const before = (await connection.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!before) throw new Error("USER_NOT_FOUND");
    await connection.update(users).set({ status }).where(eq(users.id, userId));
    if (performedByUserId) await connection.insert(adminActivity).values({ action: status === "blocked" ? "member_blocked" : "member_unblocked", targetType: "user", targetId: userId, details: JSON.stringify({ before: before.status, after: status }), performedByUserId });
    return { success: true };
  }
  const u = memoryUsers.find(item => item.id === userId);
  if (!u) throw new Error("USER_NOT_FOUND");
  const before = u.status;
  u.status = status;
  if (performedByUserId) memoryAdminActivity.unshift({ id: nextAdminActivityId++, action: status === "blocked" ? "member_blocked" : "member_unblocked", targetType: "user", targetId: userId, details: JSON.stringify({ before, after: status }), performedByUserId, createdAt: new Date() });
  return { success: true };
}

export async function updateUserRole(userId: number, role: 'user' | 'admin', performedByUserId?: number) {
  const connection = await getDb();
  if (connection) {
    const before = (await connection.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!before) throw new Error("USER_NOT_FOUND");
    await connection.update(users).set({ role }).where(eq(users.id, userId));
    if (performedByUserId) await connection.insert(adminActivity).values({ action: "role_changed", targetType: "user", targetId: userId, details: JSON.stringify({ before: before.role, after: role }), performedByUserId });
    return { success: true };
  }
  const user = memoryUsers.find(item => item.id === userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  const before = user.role;
  user.role = role;
  user.updatedAt = new Date();
  if (performedByUserId) memoryAdminActivity.unshift({ id: nextAdminActivityId++, action: "role_changed", targetType: "user", targetId: userId, details: JSON.stringify({ before, after: role }), performedByUserId, createdAt: new Date() });
  return { success: true };
}

export async function getAdminActivity(userId?: number) {
  const connection = await getDb();
  if (connection) return userId ? await connection.select().from(adminActivity).where(eq(adminActivity.targetId, userId)).orderBy(desc(adminActivity.createdAt)).limit(80) : await connection.select().from(adminActivity).orderBy(desc(adminActivity.createdAt)).limit(80);
  return memoryAdminActivity.filter(row => !userId || row.targetId === userId).slice(0, 80);
}

export async function isUserActive(userId: number) {
  const connection = await getDb();
  if (connection) {
    const result = await connection.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    return result[0]?.status === "active";
  }
  return memoryUsers.find(user => user.id === userId)?.status === "active";
}

export type DiscountCodeInput = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrderAmount?: number;
  maxUses?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean;
};

type MemoryDiscountCode = DiscountCodeInput & { id: number; usedCount: number; createdByUserId: number; createdAt: Date };
type MemoryBalanceMovement = { id: number; userId: number; amount: string; balanceAfter: string; reason: string; performedByUserId: number; createdAt: Date };
type MemoryWalletTopup = { id: number; userId: number; topupCode: string; amount: string; status: "pending" | "paid" | "expired" | "cancelled"; provider: string; providerTransactionId: string | null; transferContent: string | null; gateway: string | null; paidAt: Date | null; createdAt: Date; updatedAt: Date };
type MemoryInventoryMovement = { id: number; productId: number; variantId: number | null; quantityBefore: number; quantityAfter: number; reason: string; performedByUserId: number; createdAt: Date };
type MemoryFeedback = { id: number; userId: number | null; visitorKey: string; displayName: string | null; contact: string | null; topic: "suggestion" | "issue" | "other"; message: string; imageUrl: string | null; imageKey: string | null; status: "new" | "reviewed" | "resolved"; readAt: Date | null; createdAt: Date; updatedAt: Date };
type MemoryConversation = { id: number; userId: number | null; visitorKey: string; displayName: string | null; lastMessagePreview: string | null; lastMessageAt: Date; customerReadAt: Date | null; ownerReadAt: Date | null; createdAt: Date; updatedAt: Date };
type MemorySupportMessage = { id: number; conversationId: number; senderType: "customer" | "owner"; senderUserId: number | null; body: string; imageUrl: string | null; imageKey: string | null; readAt: Date | null; createdAt: Date };

const memoryDiscountCodes: MemoryDiscountCode[] = [];
const memoryBalanceMovements: MemoryBalanceMovement[] = [];
const memoryWalletTopups: MemoryWalletTopup[] = [];
const memoryInventoryMovements: MemoryInventoryMovement[] = [];
const memoryAdminActivity: Array<{ id: number; action: string; targetType: string; targetId: number; details: string | null; performedByUserId: number; createdAt: Date }> = [];
const memorySiteSettings = new Map<string, string>();
const memoryVisitorEvents: Array<{ visitorId: string; path: string; createdAt: Date }> = [];
const memoryFeedback: MemoryFeedback[] = [];
const memoryConversations: MemoryConversation[] = [];
const memorySupportMessages: MemorySupportMessage[] = [];
let nextDiscountCodeId = 1;
let nextBalanceMovementId = 1;
let nextWalletTopupId = 1;
let nextInventoryMovementId = 1;
let nextAdminActivityId = 1;
let nextFeedbackId = 1;
let nextConversationId = 1;
let nextSupportMessageId = 1;

export type FeedbackInput = {
  visitorKey: string;
  userId?: number;
  displayName?: string;
  contact?: string;
  topic: "suggestion" | "issue" | "other";
  message: string;
  imageUrl?: string;
  imageKey?: string;
};

export type CustomerMessageInput = {
  visitorKey: string;
  userId?: number;
  displayName?: string;
  body: string;
  imageUrl?: string;
  imageKey?: string;
};

function normalizeVisitorKey(visitorKey: string) {
  const value = visitorKey.trim();
  if (!/^[a-zA-Z0-9_-]{16,96}$/.test(value)) throw new Error("VISITOR_KEY_INVALID");
  return value;
}

function previewMessage(body: string) {
  return body.trim().replace(/\s+/g, " ").slice(0, 255);
}

export async function createCustomerFeedback(input: FeedbackInput) {
  const visitorKey = normalizeVisitorKey(input.visitorKey);
  const connection = await getDb();
  const values = {
    userId: input.userId ?? null,
    visitorKey,
    displayName: input.displayName?.trim().slice(0, 128) || null,
    contact: input.contact?.trim().slice(0, 255) || null,
    topic: input.topic,
    message: input.message.trim(),
    imageUrl: input.imageUrl ?? null,
    imageKey: input.imageKey ?? null,
  } as const;
  if (connection) {
    const inserted = await connection.insert(customerFeedback).values(values);
    return { success: true, id: Number(inserted[0].insertId) };
  }
  memoryFeedback.unshift({ id: nextFeedbackId++, ...values, status: "new", readAt: null, createdAt: new Date(), updatedAt: new Date() });
  return { success: true };
}

export async function getAdminFeedback() {
  const connection = await getDb();
  const rows = connection ? await connection.select().from(customerFeedback).orderBy(desc(customerFeedback.createdAt)).limit(200) : [...memoryFeedback].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows.map(item => ({ ...item, message: item.imageUrl ? `${item.message}${item.message ? "\n" : ""}Ảnh đính kèm: ${item.imageUrl}` : item.message }));
}

export async function updateFeedbackStatus(id: number, status: "new" | "reviewed" | "resolved") {
  const connection = await getDb();
  if (connection) {
    await connection.update(customerFeedback).set({ status, readAt: status === "new" ? null : new Date() }).where(eq(customerFeedback.id, id));
    return { success: true };
  }
  const feedback = memoryFeedback.find(item => item.id === id);
  if (!feedback) throw new Error("FEEDBACK_NOT_FOUND");
  feedback.status = status;
  feedback.readAt = status === "new" ? null : new Date();
  feedback.updatedAt = new Date();
  return { success: true };
}

export async function getCustomerConversation(visitorKeyInput: string) {
  const visitorKey = normalizeVisitorKey(visitorKeyInput);
  const connection = await getDb();
  if (connection) {
    const conversation = (await connection.select().from(supportConversations).where(eq(supportConversations.visitorKey, visitorKey)).limit(1))[0];
    if (!conversation) return { conversation: null, messages: [] };
    const messages = await connection.select().from(supportMessages).where(eq(supportMessages.conversationId, conversation.id)).orderBy(supportMessages.createdAt);
    return { conversation, messages };
  }
  const conversation = memoryConversations.find(item => item.visitorKey === visitorKey) ?? null;
  return { conversation, messages: conversation ? memorySupportMessages.filter(message => message.conversationId === conversation.id).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) : [] };
}

export async function sendCustomerSupportMessage(input: CustomerMessageInput) {
  const visitorKey = normalizeVisitorKey(input.visitorKey);
  const body = input.body.trim();
  const connection = await getDb();
  if (connection) {
    let conversation = (await connection.select().from(supportConversations).where(eq(supportConversations.visitorKey, visitorKey)).limit(1))[0];
    if (!conversation) {
      const inserted = await connection.insert(supportConversations).values({ visitorKey, userId: input.userId ?? null, displayName: input.displayName?.trim().slice(0, 128) || null, lastMessagePreview: previewMessage(body), lastMessageAt: new Date() });
      conversation = (await connection.select().from(supportConversations).where(eq(supportConversations.id, Number(inserted[0].insertId))).limit(1))[0]!;
    } else {
      await connection.update(supportConversations).set({ userId: input.userId ?? conversation.userId, displayName: input.displayName?.trim().slice(0, 128) || conversation.displayName, lastMessagePreview: previewMessage(body), lastMessageAt: new Date(), customerReadAt: new Date() }).where(eq(supportConversations.id, conversation.id));
    }
    await connection.insert(supportMessages).values({ conversationId: conversation.id, senderType: "customer", senderUserId: input.userId ?? null, body, imageUrl: input.imageUrl ?? null, imageKey: input.imageKey ?? null });
    return { success: true, conversationId: conversation.id };
  }
  let conversation = memoryConversations.find(item => item.visitorKey === visitorKey);
  if (!conversation) {
    conversation = { id: nextConversationId++, visitorKey, userId: input.userId ?? null, displayName: input.displayName?.trim().slice(0, 128) || null, lastMessagePreview: null, lastMessageAt: new Date(), customerReadAt: null, ownerReadAt: null, createdAt: new Date(), updatedAt: new Date() };
    memoryConversations.unshift(conversation);
  }
  conversation.userId = input.userId ?? conversation.userId;
  conversation.displayName = input.displayName?.trim().slice(0, 128) || conversation.displayName;
  conversation.lastMessagePreview = previewMessage(body);
  conversation.lastMessageAt = new Date();
  conversation.customerReadAt = new Date();
  conversation.updatedAt = new Date();
  memorySupportMessages.push({ id: nextSupportMessageId++, conversationId: conversation.id, senderType: "customer", senderUserId: input.userId ?? null, body, imageUrl: input.imageUrl ?? null, imageKey: input.imageKey ?? null, readAt: null, createdAt: new Date() });
  return { success: true, conversationId: conversation.id };
}

export async function getOwnerConversations() {
  const connection = await getDb();
  if (connection) return await connection.select().from(supportConversations).orderBy(desc(supportConversations.lastMessageAt)).limit(200);
  return [...memoryConversations].sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

export async function getOwnerConversationMessages(conversationId: number) {
  const connection = await getDb();
  const rows = connection ? await connection.select().from(supportMessages).where(eq(supportMessages.conversationId, conversationId)).orderBy(supportMessages.createdAt) : memorySupportMessages.filter(message => message.conversationId === conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return rows.map(item => ({ ...item, body: item.imageUrl ? `${item.body}${item.body ? "\n" : ""}Ảnh đính kèm: ${item.imageUrl}` : item.body }));
}

export async function sendOwnerSupportMessage(input: { conversationId: number; senderUserId: number; body: string }) {
  const body = input.body.trim();
  const connection = await getDb();
  if (connection) {
    const conversation = (await connection.select().from(supportConversations).where(eq(supportConversations.id, input.conversationId)).limit(1))[0];
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    await connection.insert(supportMessages).values({ conversationId: conversation.id, senderType: "owner", senderUserId: input.senderUserId, body });
    await connection.update(supportConversations).set({ lastMessagePreview: previewMessage(body), lastMessageAt: new Date(), ownerReadAt: new Date() }).where(eq(supportConversations.id, conversation.id));
    return { success: true };
  }
  const conversation = memoryConversations.find(item => item.id === input.conversationId);
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  conversation.lastMessagePreview = previewMessage(body);
  conversation.lastMessageAt = new Date();
  conversation.ownerReadAt = new Date();
  conversation.updatedAt = new Date();
  memorySupportMessages.push({ id: nextSupportMessageId++, conversationId: conversation.id, senderType: "owner", senderUserId: input.senderUserId, body, imageUrl: null, imageKey: null, readAt: null, createdAt: new Date() });
  return { success: true };
}

export async function markConversationRead(conversationId: number, reader: "customer" | "owner") {
  const field = reader === "owner" ? "ownerReadAt" : "customerReadAt";
  const connection = await getDb();
  if (connection) {
    await connection.update(supportConversations).set({ [field]: new Date() }).where(eq(supportConversations.id, conversationId));
    return { success: true };
  }
  const conversation = memoryConversations.find(item => item.id === conversationId);
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  conversation[field] = new Date();
  conversation.updatedAt = new Date();
  return { success: true };
}

export async function getOwnerSupportSummary() {
  const [feedback, conversations] = await Promise.all([getAdminFeedback(), getOwnerConversations()]);
  const unreadConversations = conversations.filter(conversation => !conversation.ownerReadAt || conversation.lastMessageAt.getTime() > conversation.ownerReadAt.getTime()).length;
  return { newFeedback: feedback.filter(item => item.status === "new").length, unreadConversations };
}

export async function adjustUserBalance(input: { userId: number; amount: number; reason: string; performedByUserId: number }) {
  if (!Number.isFinite(input.amount) || input.amount === 0) throw new Error("Số dư điều chỉnh phải khác 0");
  if (!input.reason.trim()) throw new Error("Hãy nhập lý do điều chỉnh số dư");
  const connection = await getDb();
  if (connection) {
    return connection.transaction(async transaction => {
      const result = await transaction.select().from(users).where(eq(users.id, input.userId)).limit(1);
      const member = result[0];
      if (!member) throw new Error("USER_NOT_FOUND");
      const balanceAfter = Number(member.balance) + input.amount;
      if (balanceAfter < 0) throw new Error("Số dư không thể âm");
      await transaction.update(users).set({ balance: balanceAfter.toFixed(2) }).where(eq(users.id, input.userId));
      await transaction.insert(balanceLedger).values({ userId: input.userId, amount: input.amount.toFixed(2), balanceAfter: balanceAfter.toFixed(2), reason: input.reason.trim(), performedByUserId: input.performedByUserId });
      await transaction.insert(adminActivity).values({ action: "balance_adjusted", targetType: "user", targetId: input.userId, details: JSON.stringify({ amount: input.amount, balanceAfter, reason: input.reason.trim() }), performedByUserId: input.performedByUserId });
      return { success: true, balance: balanceAfter.toFixed(2) };
    });
  }
  const member = memoryUsers.find(user => user.id === input.userId);
  if (!member) throw new Error("USER_NOT_FOUND");
  const balanceAfter = Number(member.balance) + input.amount;
  if (balanceAfter < 0) throw new Error("Số dư không thể âm");
  member.balance = balanceAfter.toFixed(2);
  memoryBalanceMovements.unshift({ id: nextBalanceMovementId++, userId: input.userId, amount: input.amount.toFixed(2), balanceAfter: member.balance, reason: input.reason.trim(), performedByUserId: input.performedByUserId, createdAt: new Date() });
  memoryAdminActivity.unshift({ id: nextAdminActivityId++, action: "balance_adjusted", targetType: "user", targetId: input.userId, details: JSON.stringify({ amount: input.amount, balanceAfter, reason: input.reason.trim() }), performedByUserId: input.performedByUserId, createdAt: new Date() });
  return { success: true, balance: member.balance };
}

export async function getBalanceLedger(userId?: number) {
  const connection = await getDb();
  if (connection) {
    const rows = userId ? await connection.select().from(balanceLedger).where(eq(balanceLedger.userId, userId)).orderBy(desc(balanceLedger.createdAt)) : await connection.select().from(balanceLedger).orderBy(desc(balanceLedger.createdAt));
    return rows.map(row => ({ ...row, amount: String(row.amount), balanceAfter: String(row.balanceAfter) }));
  }
  return memoryBalanceMovements.filter(row => !userId || row.userId === userId);
}

const WALLET_TOPUP_MIN_AMOUNT = 1_000;
const WALLET_TOPUP_MAX_AMOUNT = 20_000_000;

function normalizeWalletAmount(amount: number) {
  const rounded = Math.round(amount);
  if (!Number.isSafeInteger(rounded) || rounded < WALLET_TOPUP_MIN_AMOUNT || rounded > WALLET_TOPUP_MAX_AMOUNT) {
    throw new Error(`Số tiền nạp phải từ ${WALLET_TOPUP_MIN_AMOUNT.toLocaleString("vi-VN")}đ đến ${WALLET_TOPUP_MAX_AMOUNT.toLocaleString("vi-VN")}đ`);
  }
  return rounded;
}

function createWalletTopupCode() {
  return `DHLW${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createWalletTopup(userId: number, amount: number) {
  const normalizedAmount = normalizeWalletAmount(amount);
  const topupCode = createWalletTopupCode();
  const connection = await getDb();
  if (connection) {
    const inserted = await connection.insert(walletTopups).values({ userId, topupCode, amount: normalizedAmount.toFixed(2), status: "pending", provider: "sepay" });
    const result = await connection.select().from(walletTopups).where(eq(walletTopups.id, Number(inserted[0].insertId))).limit(1);
    return { ...result[0], amount: String(result[0].amount) };
  }
  const now = new Date();
  const topup: MemoryWalletTopup = { id: nextWalletTopupId++, userId, topupCode, amount: normalizedAmount.toFixed(2), status: "pending", provider: "sepay", providerTransactionId: null, transferContent: null, gateway: null, paidAt: null, createdAt: now, updatedAt: now };
  memoryWalletTopups.unshift(topup);
  return topup;
}

export async function getWalletTopups(userId: number) {
  const connection = await getDb();
  if (connection) {
    const rows = await connection.select().from(walletTopups).where(eq(walletTopups.userId, userId)).orderBy(desc(walletTopups.createdAt)).limit(50);
    return rows.map(row => ({ ...row, amount: String(row.amount) }));
  }
  return memoryWalletTopups.filter(topup => topup.userId === userId).slice(0, 50);
}

export async function getWalletSummary(userId: number) {
  const connection = await getDb();
  if (connection) {
    const user = (await connection.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) throw new Error("USER_NOT_FOUND");
    return { balance: String(user.balance), movements: await getBalanceLedger(userId), topups: await getWalletTopups(userId) };
  }
  const user = memoryUsers.find(candidate => candidate.id === userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return { balance: user.balance, movements: await getBalanceLedger(userId), topups: await getWalletTopups(userId) };
}

export async function payOrderWithWalletBalance(userId: number, orderId: number) {
  const connection = await getDb();
  if (connection) {
    return connection.transaction(async transaction => {
      const order = (await transaction.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId), eq(ordersTable.paymentStatus, "pending"), eq(ordersTable.status, "pending"), eq(ordersTable.isDeleted, false))).limit(1))[0];
      if (!order) throw new Error("ORDER_NOT_PENDING");
      const amount = Number(order.totalAmount);
      const debited = await transaction.update(users).set({ balance: sql`${users.balance} - ${amount.toFixed(2)}` }).where(and(eq(users.id, userId), gte(users.balance, amount.toFixed(2))));
      if (Number(debited[0]?.affectedRows ?? 0) !== 1) throw new Error("INSUFFICIENT_BALANCE");
      const user = (await transaction.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1))[0];
      const paidAt = new Date();
      const paid = await transaction.update(ordersTable).set({ status: order.hasPhysicalItems ? "processing" : "completed", paymentStatus: "paid", paymentMethod: "wallet_balance", paymentReference: `WALLET-${order.orderCode}`, paymentConfirmedAt: paidAt }).where(and(eq(ordersTable.id, order.id), eq(ordersTable.paymentStatus, "pending"), eq(ordersTable.status, "pending")));
      if (Number(paid[0]?.affectedRows ?? 0) !== 1) throw new Error("ORDER_NOT_PENDING");
      await transaction.insert(balanceLedger).values({ userId, amount: (-amount).toFixed(2), balanceAfter: String(user.balance), reason: `Thanh toán đơn ${order.orderCode}`, performedByUserId: userId });
      if (order.discountCode) await transaction.update(discountCodes).set({ usedCount: sql`${discountCodes.usedCount} + 1` }).where(eq(discountCodes.code, order.discountCode));
      return { paymentStatus: "paid" as const, paymentMethod: "wallet_balance" as const, paymentReference: `WALLET-${order.orderCode}`, paymentConfirmedAt: paidAt, status: order.hasPhysicalItems ? "processing" as const : "completed" as const, balance: String(user.balance) };
    });
  }
  const order = memoryOrders.find(candidate => candidate.id === orderId && candidate.userId === userId && candidate.paymentStatus === "pending" && candidate.status === "pending" && !candidate.isDeleted);
  const user = memoryUsers.find(candidate => candidate.id === userId);
  if (!order) throw new Error("ORDER_NOT_PENDING");
  if (!user || Number(user.balance) < Number(order.totalAmount)) throw new Error("INSUFFICIENT_BALANCE");
  user.balance = (Number(user.balance) - Number(order.totalAmount)).toFixed(2);
  const paidAt = new Date();
  order.status = order.hasPhysicalItems ? "processing" : "completed";
  order.paymentStatus = "paid";
  order.paymentMethod = "wallet_balance";
  order.paymentReference = `WALLET-${order.orderCode}`;
  order.paymentConfirmedAt = paidAt;
  memoryBalanceMovements.unshift({ id: nextBalanceMovementId++, userId, amount: (-Number(order.totalAmount)).toFixed(2), balanceAfter: user.balance, reason: `Thanh toán đơn ${order.orderCode}`, performedByUserId: userId, createdAt: paidAt });
  if (order.discountCode) {
    const discount = memoryDiscountCodes.find(candidate => candidate.code === order.discountCode);
    if (discount) discount.usedCount += 1;
  }
  return { paymentStatus: "paid" as const, paymentMethod: "wallet_balance" as const, paymentReference: order.paymentReference, paymentConfirmedAt: paidAt, status: order.status, balance: user.balance };
}

export async function getDiscountCodes() {
  const connection = await getDb();
  if (connection) return (await connection.select().from(discountCodes).orderBy(desc(discountCodes.createdAt))).map(row => ({ ...row, value: String(row.value), minOrderAmount: String(row.minOrderAmount) }));
  return [...memoryDiscountCodes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(row => ({ ...row, value: String(row.value), minOrderAmount: String(row.minOrderAmount) }));
}

export async function createDiscountCode(input: DiscountCodeInput & { createdByUserId: number }) {
  const normalized = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,64}$/.test(normalized)) throw new Error("Mã giảm giá chỉ gồm chữ cái, số, gạch dưới hoặc gạch ngang");
  if (!Number.isFinite(input.value) || input.value <= 0 || (input.type === "percent" && input.value > 100)) throw new Error("Giá trị giảm giá không hợp lệ");
  const connection = await getDb();
  if (connection) {
    const existing = await connection.select({ id: discountCodes.id }).from(discountCodes).where(eq(discountCodes.code, normalized)).limit(1);
    if (existing[0]) throw new Error("DISCOUNT_CODE_TAKEN");
    const inserted = await connection.insert(discountCodes).values({ code: normalized, type: input.type, value: input.value.toFixed(2), minOrderAmount: (input.minOrderAmount ?? 0).toFixed(2), maxUses: input.maxUses ?? null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, isActive: input.isActive ?? true, createdByUserId: input.createdByUserId });
    return { success: true, id: Number(inserted[0].insertId) };
  }
  if (memoryDiscountCodes.some(row => row.code === normalized)) throw new Error("DISCOUNT_CODE_TAKEN");
  memoryDiscountCodes.unshift({ id: nextDiscountCodeId++, ...input, code: normalized, minOrderAmount: input.minOrderAmount ?? 0, maxUses: input.maxUses ?? null, isActive: input.isActive ?? true, usedCount: 0, createdAt: new Date() });
  return { success: true };
}

export async function updateDiscountCode(id: number, input: DiscountCodeInput) {
  const normalized = input.code.trim().toUpperCase();
  const connection = await getDb();
  if (connection) {
    await connection.update(discountCodes).set({ code: normalized, type: input.type, value: input.value.toFixed(2), minOrderAmount: (input.minOrderAmount ?? 0).toFixed(2), maxUses: input.maxUses ?? null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, isActive: input.isActive ?? true }).where(eq(discountCodes.id, id));
    return { success: true };
  }
  const code = memoryDiscountCodes.find(row => row.id === id);
  if (!code) throw new Error("DISCOUNT_NOT_FOUND");
  Object.assign(code, { ...input, code: normalized, minOrderAmount: input.minOrderAmount ?? 0, maxUses: input.maxUses ?? null, isActive: input.isActive ?? true });
  return { success: true };
}

export async function validateDiscountCode(code: string, subtotal: number, now = new Date()) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { code: null, amount: 0 };
  const connection = await getDb();
  const discount = connection ? (await connection.select().from(discountCodes).where(eq(discountCodes.code, normalized)).limit(1))[0] : memoryDiscountCodes.find(row => row.code === normalized);
  if (!discount || !discount.isActive) throw new Error("Mã giảm giá không khả dụng");
  if (discount.startsAt && discount.startsAt.getTime() > now.getTime()) throw new Error("Mã giảm giá chưa có hiệu lực");
  if (discount.endsAt && discount.endsAt.getTime() < now.getTime()) throw new Error("Mã giảm giá đã hết hạn");
  if (discount.maxUses !== null && discount.maxUses !== undefined && discount.usedCount >= discount.maxUses) throw new Error("Mã giảm giá đã hết lượt sử dụng");
  const minimum = Number(discount.minOrderAmount);
  if (subtotal < minimum) throw new Error(`Đơn hàng cần tối thiểu ${minimum.toLocaleString("vi-VN")}đ để dùng mã này`);
  const rawAmount = discount.type === "percent" ? subtotal * Number(discount.value) / 100 : Number(discount.value);
  return { code: normalized, amount: Math.min(rawAmount, subtotal), discountId: discount.id };
}

export async function getInventoryBoard() {
  const [allProducts, allVariants, orders] = await Promise.all([getAdminProducts(), getAdminProductVariants(), getOrders(undefined, true)]);
  const reserved = new Map<string, number>();
  for (const order of orders.filter(order => order.status === "pending" && order.paymentStatus === "pending")) {
    for (const item of order.items || []) {
      const key = item.variantId ? `variant:${item.variantId}` : `product:${item.productId}`;
      reserved.set(key, (reserved.get(key) || 0) + item.quantity);
    }
  }
  const rows = [] as Array<{ target: "product" | "variant"; id: number; productId: number; variantId: number | null; productName: string; variantLabel: string; sku: string; image: string; stock: number; reserved: number; available: number; sortOrder: number; isActive: boolean }>;
  for (const product of allProducts.filter(product => product.type === "physical")) {
    const variants = allVariants.filter(variant => variant.productId === product.id && variant.isActive);
    if (variants.length === 0) {
      const held = reserved.get(`product:${product.id}`) || 0;
      rows.push({ target: "product", id: product.id, productId: product.id, variantId: null, productName: product.name, variantLabel: "Mặc định", sku: "", image: product.image, stock: product.stock, reserved: held, available: product.stock, sortOrder: 0, isActive: product.isActive !== false });
      continue;
    }
    for (const variant of variants) {
      const held = reserved.get(`variant:${variant.id}`) || 0;
      rows.push({ target: "variant", id: variant.id, productId: product.id, variantId: variant.id, productName: product.name, variantLabel: [variant.size && `Size: ${variant.size}`, variant.color && `Màu: ${variant.color}`, ...(variant.attributes || "").split(/\n|;/).map(item => item.trim()).filter(Boolean)].filter(Boolean).join(" · ") || "Biến thể", sku: variant.sku || "", image: variant.image || product.image, stock: variant.stock, reserved: held, available: variant.stock, sortOrder: variant.sortOrder, isActive: variant.isActive });
    }
  }
  return rows.sort((a, b) => a.productName.localeCompare(b.productName) || a.sortOrder - b.sortOrder || a.variantLabel.localeCompare(b.variantLabel));
}

export async function bulkSetInventory(input: { changes: Array<{ target: "product" | "variant"; id: number; stock: number }>; reason: string; performedByUserId: number }) {
  if (!input.reason.trim()) throw new Error("Hãy nhập lý do điều chỉnh tồn kho");
  const connection = await getDb();
  const applyChange = async (executor: NonNullable<Awaited<ReturnType<typeof getDb>>>, change: { target: "product" | "variant"; id: number; stock: number }) => {
    if (!Number.isInteger(change.stock) || change.stock < 0) throw new Error("Tồn kho phải là số nguyên không âm");
    if (change.target === "variant") {
      const row = (await executor.select().from(productVariants).where(eq(productVariants.id, change.id)).limit(1))[0];
      if (!row) throw new Error("Không tìm thấy biến thể");
      await executor.update(productVariants).set({ stock: change.stock }).where(eq(productVariants.id, change.id));
      await executor.insert(inventoryMovements).values({ productId: row.productId, variantId: row.id, quantityBefore: row.stock, quantityAfter: change.stock, reason: input.reason.trim(), performedByUserId: input.performedByUserId });
      return;
    }
    const row = (await executor.select().from(products).where(eq(products.id, change.id)).limit(1))[0];
    if (!row) throw new Error("Không tìm thấy sản phẩm");
    await executor.update(products).set({ stock: change.stock }).where(eq(products.id, change.id));
    await executor.insert(inventoryMovements).values({ productId: row.id, variantId: null, quantityBefore: row.stock, quantityAfter: change.stock, reason: input.reason.trim(), performedByUserId: input.performedByUserId });
  };
  if (connection) {
    await connection.transaction(async transaction => { for (const change of input.changes) await applyChange(transaction as never, change); });
    return { success: true, updated: input.changes.length };
  }
  for (const change of input.changes) {
    const row = change.target === "variant" ? memoryProductVariants.find(item => item.id === change.id) : memoryProducts.find(item => item.id === change.id);
    if (!row || !Number.isInteger(change.stock) || change.stock < 0) throw new Error("Dòng tồn kho không hợp lệ");
    const before = row.stock;
    row.stock = change.stock;
    memoryInventoryMovements.unshift({ id: nextInventoryMovementId++, productId: change.target === "variant" ? (row as ProductVariantType).productId : row.id, variantId: change.target === "variant" ? row.id : null, quantityBefore: before, quantityAfter: change.stock, reason: input.reason.trim(), performedByUserId: input.performedByUserId, createdAt: new Date() });
  }
  return { success: true, updated: input.changes.length };
}

export async function getInventoryMovements() {
  const connection = await getDb();
  if (connection) return await connection.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(80);
  return memoryInventoryMovements.slice(0, 80);
}

export async function getSiteSettings() {
  const connection = await getDb();
  const rows = connection ? await connection.select().from(siteSettings) : Array.from(memorySiteSettings.entries()).map(([settingKey, settingValue]) => ({ settingKey, settingValue }));
  return Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue]));
}

export async function saveSiteSettings(entries: Record<string, string>, updatedByUserId: number) {
  const connection = await getDb();
  if (connection) {
    for (const [settingKey, settingValue] of Object.entries(entries)) {
      const existing = (await connection.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.settingKey, settingKey)).limit(1))[0];
      if (existing) await connection.update(siteSettings).set({ settingValue, updatedByUserId }).where(eq(siteSettings.id, existing.id));
      else await connection.insert(siteSettings).values({ settingKey, settingValue, updatedByUserId });
    }
  } else Object.entries(entries).forEach(([key, value]) => memorySiteSettings.set(key, value));
  return { success: true };
}

export async function recordVisitorEvent(visitorId: string, path: string) {
  if (!visitorId || visitorId.length > 128 || !path.startsWith("/")) return { success: false };
  const connection = await getDb();
  if (connection) await connection.insert(visitorEvents).values({ visitorId, path: path.slice(0, 512) });
  else memoryVisitorEvents.push({ visitorId, path, createdAt: new Date() });
  return { success: true };
}

export async function getOperationsOverview() {
  const connection = await getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (connection) {
    const [memberRows, orderRows, visitorRows] = await Promise.all([
      connection.select().from(users),
      connection.select().from(ordersTable),
      connection.select().from(visitorEvents).where(gte(visitorEvents.createdAt, since)),
    ]);
    const paidOrders = orderRows.filter(order => order.paymentStatus === "paid");
    return { members: memberRows.length, blockedMembers: memberRows.filter(member => member.status === "blocked").length, activeMembers: memberRows.filter(member => member.status === "active").length, paidOrders: paidOrders.length, revenue: paidOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0), visitors30d: new Set(visitorRows.map(row => row.visitorId)).size, pageViews30d: visitorRows.length };
  }
  const paidOrders = memoryOrders.filter(order => order.paymentStatus === "paid");
  const visits = memoryVisitorEvents.filter(event => event.createdAt >= since);
  return { members: memoryUsers.length, blockedMembers: memoryUsers.filter(member => member.status === "blocked").length, activeMembers: memoryUsers.filter(member => member.status === "active").length, paidOrders: paidOrders.length, revenue: paidOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0), visitors30d: new Set(visits.map(row => row.visitorId)).size, pageViews30d: visits.length };
}

export async function getCategories(includeInactive = false) {
  const connection = await getDb();
  if (connection) {
    await ensureDefaultCatalog(connection);
    const rows = await connection.select().from(categories);
    return rows
      .filter(category => includeInactive || category.isActive)
      .map(toCategoryType);
  }
  return memoryCategories.filter(category => includeInactive || category.isActive !== false);
}

export type CatalogCategoryInput = {
  name: string;
  slug: string;
  description?: string;
  iconKey?: string;
  isActive: boolean;
};

export type CatalogProductInput = {
  name: string;
  slug: string;
  description?: string;
  price: string;
  categoryId: number;
  image: string;
  fileUrl?: string;
  fileSize?: string;
  specs?: string;
  stock: number;
  weightGrams?: number;
  featured: boolean;
  isActive: boolean;
};

export async function getAdminCategories() {
  return getCategories(true);
}

export async function createCategory(input: CatalogCategoryInput) {
  const connection = await getDb();
  if (connection) {
    await ensureDefaultCatalog(connection);
    const inserted = await connection.insert(categories).values({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      iconKey: input.iconKey ?? "Package",
      type: "digital",
      isActive: input.isActive,
    });
    const row = await connection.select().from(categories).where(eq(categories.id, Number(inserted[0].insertId))).limit(1);
    return row[0] ? toCategoryType(row[0]) : undefined;
  }
  const category: CategoryType = {
    id: Math.max(0, ...memoryCategories.map(item => item.id)) + 1,
    name: input.name,
    slug: input.slug,
    description: input.description ?? "",
    iconKey: input.iconKey ?? "Package",
    type: "digital",
    isActive: input.isActive,
  };
  memoryCategories.push(category);
  return category;
}

export async function updateCategory(categoryId: number, input: CatalogCategoryInput) {
  const connection = await getDb();
  if (connection) {
    await connection.update(categories).set({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      iconKey: input.iconKey ?? "Package",
      isActive: input.isActive,
    }).where(eq(categories.id, categoryId));
    return { success: true };
  }
  const category = memoryCategories.find(item => item.id === categoryId);
  if (!category) throw new Error("Category not found");
  Object.assign(category, input);
  return { success: true };
}

export async function getAdminProducts() {
  const connection = await getDb();
  if (connection) {
    await ensureDefaultCatalog(connection);
    return (await connection.select().from(products)).map(toProductType);
  }
  return [...memoryProducts];
}

export async function createProduct(input: CatalogProductInput) {
  const connection = await getDb();
  if (connection) {
    await ensureDefaultCatalog(connection);
    const category = await connection.select({ type: categories.type }).from(categories).where(eq(categories.id, input.categoryId)).limit(1);
    if (!category[0]) throw new Error("Không tìm thấy danh mục sản phẩm");
    const productType = category[0].type === "physical" ? "physical" : "digital";
    const inserted = await connection.insert(products).values({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      price: input.price,
      type: productType,
      categoryId: input.categoryId,
      image: input.image,
      fileUrl: input.fileUrl ?? null,
      fileSize: input.fileSize ?? null,
      stock: productType === "physical" ? input.stock : 9999,
      weightGrams: productType === "physical" ? Math.max(0, input.weightGrams ?? 0) : 0,
      specs: input.specs ?? null,
      featured: input.featured,
      isActive: input.isActive,
    });
    const row = await connection.select().from(products).where(eq(products.id, Number(inserted[0].insertId))).limit(1);
    return row[0] ? toProductType(row[0]) : undefined;
  }
  const category = memoryCategories.find(item => item.id === input.categoryId);
  if (!category) throw new Error("Không tìm thấy danh mục sản phẩm");
  const productType = category.type === "physical" ? "physical" : "digital";
  const product: ProductType = {
    id: Math.max(0, ...memoryProducts.map(item => item.id)) + 1,
    name: input.name,
    slug: input.slug,
    description: input.description ?? "",
    price: input.price,
    type: productType,
    categoryId: input.categoryId,
    image: input.image,
    fileUrl: input.fileUrl,
    fileSize: input.fileSize,
    stock: productType === "physical" ? input.stock : 9999,
    weightGrams: productType === "physical" ? Math.max(0, input.weightGrams ?? 0) : 0,
    specs: input.specs,
    featured: input.featured,
    isActive: input.isActive,
    createdAt: new Date(),
  };
  memoryProducts.push(product);
  return product;
}

export async function updateProduct(productId: number, input: CatalogProductInput) {
  const connection = await getDb();
  if (connection) {
    const category = await connection.select({ type: categories.type }).from(categories).where(eq(categories.id, input.categoryId)).limit(1);
    if (!category[0]) throw new Error("Không tìm thấy danh mục sản phẩm");
    const productType = category[0].type === "physical" ? "physical" : "digital";
    await connection.update(products).set({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      price: input.price,
      type: productType,
      categoryId: input.categoryId,
      image: input.image,
      fileUrl: input.fileUrl ?? null,
      fileSize: input.fileSize ?? null,
      stock: productType === "physical" ? input.stock : 9999,
      weightGrams: productType === "physical" ? Math.max(0, input.weightGrams ?? 0) : 0,
      specs: input.specs ?? null,
      featured: input.featured,
      isActive: input.isActive,
    }).where(eq(products.id, productId));
    return { success: true };
  }
  const product = memoryProducts.find(item => item.id === productId);
  if (!product) throw new Error("Product not found");
  const category = memoryCategories.find(item => item.id === input.categoryId);
  if (!category) throw new Error("Không tìm thấy danh mục sản phẩm");
  Object.assign(product, input, {
    type: category.type === "physical" ? "physical" : "digital",
    stock: category.type === "physical" ? input.stock : 9999,
    weightGrams: category.type === "physical" ? Math.max(0, input.weightGrams ?? 0) : 0,
  });
  return { success: true };
}

export type CatalogVariantInput = {
  productId: number;
  size?: string;
  color?: string;
  attributes?: string;
  sku?: string;
  image?: string;
  priceAdjustment: string;
  stock: number;
  weightGrams?: number;
  sortOrder?: number;
  isActive: boolean;
};

export async function getProductVariants(productId: number, includeInactive = false) {
  const connection = await getDb();
  if (connection) {
    const rows = await connection.select().from(productVariants).where(eq(productVariants.productId, productId));
    return rows.filter(variant => includeInactive || variant.isActive).map(toProductVariantType).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }
  return memoryProductVariants.filter(variant => variant.productId === productId && (includeInactive || variant.isActive)).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

export async function getAdminProductVariants(productId?: number) {
  if (productId) return getProductVariants(productId, true);
  const connection = await getDb();
  if (connection) return (await connection.select().from(productVariants)).map(toProductVariantType).sort((a, b) => a.productId - b.productId || a.sortOrder - b.sortOrder || a.id - b.id);
  return [...memoryProductVariants].sort((a, b) => a.productId - b.productId || a.sortOrder - b.sortOrder || a.id - b.id);
}

export function selectWholesaleTier(tiers: ProductWholesaleTierType[], quantity: number) {
  return [...tiers].filter(tier => quantity >= tier.minQuantity).sort((a, b) => b.minQuantity - a.minQuantity || a.sortOrder - b.sortOrder)[0];
}

export async function getProductWholesaleTiers(productId: number) {
  const connection = await getDb();
  if (connection) {
    const rows = await connection.select().from(productWholesaleTiers).where(eq(productWholesaleTiers.productId, productId));
    return rows.map(row => ({ id: row.id, productId: row.productId, minQuantity: row.minQuantity, unitPrice: String(row.unitPrice), sortOrder: row.sortOrder })).sort((a, b) => a.minQuantity - b.minQuantity || a.sortOrder - b.sortOrder || a.id - b.id);
  }
  return memoryProductWholesaleTiers.filter(tier => tier.productId === productId).sort((a, b) => a.minQuantity - b.minQuantity || a.sortOrder - b.sortOrder || a.id - b.id);
}

export async function getProductWholesaleTiersForProducts(productIds: number[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(id => Number.isInteger(id) && id > 0)));
  return Promise.all(uniqueIds.map(async productId => ({ productId, tiers: await getProductWholesaleTiers(productId) })));
}

export async function replaceProductWholesaleTiers(input: { productId: number; tiers: Array<{ minQuantity: number; unitPrice: string }> }) {
  const product = await getProductById(input.productId);
  if (!product || product.type !== "physical") throw new Error("Giá sỉ chỉ áp dụng cho hàng vật lý");
  const tiers = input.tiers
    .map(tier => ({ minQuantity: Math.floor(tier.minQuantity), unitPrice: Number(tier.unitPrice) }))
    .filter(tier => Number.isFinite(tier.minQuantity) && tier.minQuantity >= 2 && Number.isFinite(tier.unitPrice) && tier.unitPrice >= 0)
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .filter((tier, index, rows) => index === 0 || tier.minQuantity !== rows[index - 1].minQuantity);
  if (tiers.length > 12) throw new Error("Tối đa 12 mốc giá sỉ cho một sản phẩm");
  const connection = await getDb();
  if (connection) {
    await connection.transaction(async transaction => {
      await transaction.delete(productWholesaleTiers).where(eq(productWholesaleTiers.productId, input.productId));
      if (tiers.length) await transaction.insert(productWholesaleTiers).values(tiers.map((tier, sortOrder) => ({ productId: input.productId, minQuantity: tier.minQuantity, unitPrice: tier.unitPrice.toFixed(2), sortOrder })));
    });
  } else {
    memoryProductWholesaleTiers = memoryProductWholesaleTiers.filter(tier => tier.productId !== input.productId);
    memoryProductWholesaleTiers.push(...tiers.map((tier, sortOrder) => ({ id: nextProductWholesaleTierId++, productId: input.productId, minQuantity: tier.minQuantity, unitPrice: tier.unitPrice.toFixed(2), sortOrder })));
  }
  return getProductWholesaleTiers(input.productId);
}

export async function createProductVariant(input: CatalogVariantInput) {
  const product = await getProductById(input.productId);
  if (!product || product.type !== "physical") throw new Error("Chỉ hàng vật lý mới có biến thể");
  const connection = await getDb();
  const nextSortOrder = input.sortOrder ?? (await getProductVariants(input.productId, true)).reduce((maximum, variant) => Math.max(maximum, variant.sortOrder), -1) + 1;
  if (connection) {
    const inserted = await connection.insert(productVariants).values({
      productId: input.productId,
      size: input.size || null,
      color: input.color || null,
      attributes: input.attributes?.trim() || null,
      sku: input.sku || null,
      image: input.image?.trim() || null,
      priceAdjustment: input.priceAdjustment,
      stock: input.stock,
      weightGrams: input.weightGrams ?? null,
      sortOrder: nextSortOrder,
      isActive: input.isActive,
    });
    const row = await connection.select().from(productVariants).where(eq(productVariants.id, Number(inserted[0].insertId))).limit(1);
    return row[0] ? toProductVariantType(row[0]) : undefined;
  }
  const variant: ProductVariantType = {
    id: nextProductVariantId++,
    productId: input.productId,
    size: input.size,
    color: input.color,
    attributes: input.attributes?.trim() || undefined,
    sku: input.sku,
    image: input.image?.trim() || undefined,
    priceAdjustment: input.priceAdjustment,
    stock: input.stock,
    weightGrams: input.weightGrams,
    sortOrder: nextSortOrder,
    isActive: input.isActive,
    createdAt: new Date(),
  };
  memoryProductVariants.push(variant);
  return variant;
}

export async function updateProductVariant(variantId: number, input: Omit<CatalogVariantInput, "productId">) {
  const connection = await getDb();
  if (connection) {
    await connection.update(productVariants).set({
      size: input.size || null,
      color: input.color || null,
      attributes: input.attributes?.trim() || null,
      sku: input.sku || null,
      image: input.image?.trim() || null,
      priceAdjustment: input.priceAdjustment,
      stock: input.stock,
      weightGrams: input.weightGrams ?? null,
      isActive: input.isActive,
    }).where(eq(productVariants.id, variantId));
    return { success: true };
  }
  const variant = memoryProductVariants.find(item => item.id === variantId);
  if (!variant) throw new Error("Không tìm thấy biến thể");
  Object.assign(variant, input);
  return { success: true };
}

export async function bulkUpdateProductVariants(input: { productId: number; changes: Array<{ variantId: number; stock?: number; priceAdjustment?: string; isActive?: boolean }> }) {
  const variants = await getProductVariants(input.productId, true);
  if (!input.changes.length || input.changes.length > 1_000 || input.changes.some(change => !variants.some(variant => variant.id === change.variantId))) throw new Error("Danh sách SKU cần cập nhật không hợp lệ");
  const connection = await getDb();
  if (connection) {
    await connection.transaction(async transaction => {
      for (const change of input.changes) {
        const values: Partial<typeof productVariants.$inferInsert> = {};
        if (change.stock !== undefined) values.stock = change.stock;
        if (change.priceAdjustment !== undefined) values.priceAdjustment = change.priceAdjustment;
        if (change.isActive !== undefined) values.isActive = change.isActive;
        await transaction.update(productVariants).set(values).where(and(eq(productVariants.id, change.variantId), eq(productVariants.productId, input.productId)));
      }
    });
  } else {
    input.changes.forEach(change => {
      const variant = memoryProductVariants.find(item => item.id === change.variantId && item.productId === input.productId);
      if (variant) {
        if (change.stock !== undefined) variant.stock = change.stock;
        if (change.priceAdjustment !== undefined) variant.priceAdjustment = change.priceAdjustment;
        if (change.isActive !== undefined) variant.isActive = change.isActive;
      }
    });
  }
  return { success: true, updated: input.changes.length };
}

export async function reorderProductVariants(productId: number, variantIds: number[]) {
  const variants = await getProductVariants(productId, true);
  if (!variantIds.length || variantIds.length !== variants.length || new Set(variantIds).size !== variantIds.length || variants.some(variant => !variantIds.includes(variant.id))) throw new Error("Danh sách thứ tự SKU không hợp lệ");
  const connection = await getDb();
  if (connection) {
    await connection.transaction(async transaction => {
      for (let sortOrder = 0; sortOrder < variantIds.length; sortOrder += 1) {
        const variantId = variantIds[sortOrder];
        await transaction.update(productVariants).set({ sortOrder }).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));
      }
    });
  } else {
    variantIds.forEach((variantId, sortOrder) => {
      const variant = memoryProductVariants.find(item => item.id === variantId && item.productId === productId);
      if (variant) variant.sortOrder = sortOrder;
    });
  }
  return { success: true };
}

export async function getProductOptionGroups(productId: number) {
  const connection = await getDb();
  if (connection) {
    const rows = await connection.select().from(productOptionGroups).where(eq(productOptionGroups.productId, productId));
    return rows.map(row => ({ id: row.id, productId: row.productId, name: row.name, values: JSON.parse(row.values) as string[], sortOrder: row.sortOrder })).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return memoryProductOptionGroups.filter(group => group.productId === productId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function replaceProductOptionGroups(input: { productId: number; groups: Array<{ name: string; values: string[] }> }) {
  const product = await getProductById(input.productId);
  if (!product || product.type !== "physical") throw new Error("Chỉ hàng vật lý mới dùng nhóm lựa chọn");
  const groups = input.groups.map(group => ({ name: group.name.trim(), values: Array.from(new Set(group.values.map(value => value.trim()).filter(Boolean))) })).filter(group => group.name && group.values.length);
  const connection = await getDb();
  if (connection) {
    await connection.delete(productOptionGroups).where(eq(productOptionGroups.productId, input.productId));
    if (groups.length) await connection.insert(productOptionGroups).values(groups.map((group, index) => ({ productId: input.productId, name: group.name, values: JSON.stringify(group.values), sortOrder: index })));
  } else {
    memoryProductOptionGroups = memoryProductOptionGroups.filter(group => group.productId !== input.productId);
    memoryProductOptionGroups.push(...groups.map((group, index) => ({ id: nextProductOptionGroupId++, productId: input.productId, name: group.name, values: group.values, sortOrder: index })));
  }
  return getProductOptionGroups(input.productId);
}

function skuSegment(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 20);
}

export async function generateProductVariantCombinations(input: { productId: number; skuPrefix?: string; stock: number; priceAdjustment: string }) {
  const groups = await getProductOptionGroups(input.productId);
  if (!groups.length) throw new Error("Hãy lưu ít nhất một nhóm lựa chọn trước khi tạo tổ hợp");
  const combinations = groups.reduce<string[][]>((result, group) => result.flatMap(items => group.values.map(value => [...items, value])), [[]]);
  if (combinations.length > 100) throw new Error("Tối đa 100 tổ hợp mỗi lần");
  const existing = await getProductVariants(input.productId, true);
  const created: ProductVariantType[] = [];
  for (const values of combinations) {
    const attributes = groups.map((group, index) => `${group.name}: ${values[index]}`).join("\n");
    if (existing.some(variant => variant.attributes === attributes)) continue;
    const colorIndex = groups.findIndex(group => /màu|color/i.test(group.name));
    const sizeIndex = groups.findIndex(group => /size|kích thước/i.test(group.name));
    const sku = [input.skuPrefix?.trim() || "SKU", ...values.map(skuSegment)].filter(Boolean).join("-").slice(0, 128);
    const variant = await createProductVariant({ productId: input.productId, color: colorIndex >= 0 ? values[colorIndex] : undefined, size: sizeIndex >= 0 ? values[sizeIndex] : undefined, attributes, sku, stock: input.stock, priceAdjustment: input.priceAdjustment, isActive: true });
    if (variant) created.push(variant);
  }
  return { created: created.length, skipped: combinations.length - created.length, variants: created };
}

export type MediaAssetInput = {
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export async function createMediaAsset(input: MediaAssetInput) {
  const connection = await getDb();
  if (connection) {
    const inserted = await connection.insert(mediaAssets).values(input);
    const row = await connection.select().from(mediaAssets).where(eq(mediaAssets.id, Number(inserted[0].insertId))).limit(1);
    return row[0];
  }
  const asset = { id: nextMediaAssetId++, ...input, createdAt: new Date() };
  memoryMediaAssets.unshift(asset);
  return asset;
}

export async function getMediaAssets() {
  const connection = await getDb();
  if (connection) return connection.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  return memoryMediaAssets;
}

export async function getCatalogStorageSummary() {
  const assets = await getMediaAssets();
  const totalBytes = assets.reduce((sum, asset) => sum + Math.max(0, Number(asset.sizeBytes) || 0), 0);
  const imageCount = assets.filter(asset => asset.mimeType.startsWith("image/")).length;
  const videoCount = assets.filter(asset => asset.mimeType.startsWith("video/")).length;
  const otherCount = assets.length - imageCount - videoCount;
  return { fileCount: assets.length, totalBytes, imageCount, videoCount, otherCount };
}

async function listDownloadLinks() {
  const connection = await getDb();
  if (connection) return connection.select().from(productDownloadLinks);
  return Array.from(memoryDownloadLinks, ([productId, driveUrl]) => ({ productId, driveUrl }));
}

export async function getAdminProductDownloadLinks() {
  const catalog = await getAdminProducts();
  const links = await listDownloadLinks();
  const linkMap = new Map(links.map(link => [link.productId, link.driveUrl]));
  return catalog.map(product => ({
    productId: product.id,
    productName: product.name,
    currentUrl: product.fileUrl ?? linkMap.get(product.id) ?? null,
  }));
}

export async function saveProductDownloadLink(productId: number, driveUrl: string) {
  const connection = await getDb();
  if (connection) {
    await ensureDefaultCatalog(connection);
    const product = await connection.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    if (!product[0]) throw new Error("Product not found");
    const current = await connection.select().from(productDownloadLinks).where(eq(productDownloadLinks.productId, productId)).limit(1);
    if (current[0]) {
      await connection.update(productDownloadLinks).set({ driveUrl }).where(eq(productDownloadLinks.productId, productId));
    } else {
      await connection.insert(productDownloadLinks).values({ productId, driveUrl });
    }
    await connection.update(products).set({ fileUrl: driveUrl }).where(eq(products.id, productId));
    return { success: true };
  }
  if (!memoryProducts.some(product => product.id === productId)) throw new Error("Product not found");
  memoryDownloadLinks.set(productId, driveUrl);
  return { success: true };
}

export async function getProducts(filter?: {
  categoryId?: number;
  search?: string;
  type?: "digital" | "physical";
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}) {
  const connection = await getDb();
  let list: ProductType[];
  if (connection) {
    await ensureDefaultCatalog(connection);
    list = (await connection.select().from(products)).map(toProductType).filter(product => product.isActive !== false);
  } else {
    list = [...memoryProducts];
  }
  if (filter?.categoryId) {
    list = list.filter(p => p.categoryId === filter.categoryId);
  }
  if (filter?.type) {
    list = list.filter(p => p.type === filter.type);
  }
  if (filter?.featured !== undefined) {
    list = list.filter(p => p.featured === filter.featured);
  }
  if (filter?.minPrice !== undefined && filter.minPrice !== null) {
    const min = filter.minPrice;
    list = list.filter(p => Number(p.price) >= min);
  }
  if (filter?.maxPrice !== undefined && filter.maxPrice !== null) {
    const max = filter.maxPrice;
    list = list.filter(p => Number(p.price) <= max);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  return list;
}

export async function getProductBySlug(slug: string) {
  const connection = await getDb();
  if (connection) {
    await ensureDefaultCatalog(connection);
    const product = await connection.select().from(products).where(eq(products.slug, slug)).limit(1);
    return product[0] && product[0].isActive ? toProductType(product[0]) : undefined;
  }
  return memoryProducts.find(p => p.slug === slug);
}

export async function getProductById(id: number) {
  const connection = await getDb();
  if (connection) {
    await ensureDefaultCatalog(connection);
    const product = await connection.select().from(products).where(eq(products.id, id)).limit(1);
    return product[0] ? toProductType(product[0]) : undefined;
  }
  return memoryProducts.find(p => p.id === id);
}

export async function getCartItems(userId: number) {
  const connection = await getDb();
  const items = connection
    ? await connection.select().from(cartItems).where(eq(cartItems.userId, userId))
    : memoryCart.filter(item => item.userId === userId);
  return Promise.all(items.map(async item => ({
    ...item,
    product: await getProductById(item.productId),
    variant: item.variantId ? (await getProductVariants(item.productId, true)).find(variant => variant.id === item.variantId) : undefined,
  })));
}

export async function addToCart(userId: number, productId: number, quantity: number, variantId?: number, attributes?: string, fulfillmentMode: 'in_stock' | 'preorder' = 'in_stock') {
  const product = await getProductById(productId);
  if (!product || product.isActive === false) throw new Error("Sản phẩm hiện không khả dụng");
  if (fulfillmentMode === 'preorder' && product.type !== 'physical') throw new Error("Order trước chỉ áp dụng cho hàng vật lý");
  let variant: ProductVariantType | undefined;
  if (product.type === "physical") {
    const variants = await getProductVariants(productId);
    variant = variantId ? variants.find(item => item.id === variantId) : undefined;
    if (variants.length > 0 && !variant) throw new Error("Hãy chọn kích thước hoặc màu sắc trước khi thêm vào giỏ");
    if (fulfillmentMode === 'in_stock' && variant && variant.stock < quantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
    if (fulfillmentMode === 'in_stock' && !variant && product.stock < quantity) throw new Error("Sản phẩm không đủ tồn kho");
  }
  const connection = await getDb();
  if (connection) {
    const current = await connection.select().from(cartItems).where(eq(cartItems.userId, userId));
    const existing = current.find(item => item.productId === productId && (item.variantId ?? null) === (variantId ?? null) && (item.attributes ?? undefined) === attributes && item.fulfillmentMode === fulfillmentMode);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (fulfillmentMode === 'in_stock' && variant && variant.stock < nextQuantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
    if (fulfillmentMode === 'in_stock' && product.type === "physical" && !variant && product.stock < nextQuantity) throw new Error("Sản phẩm không đủ tồn kho");
    if (existing) await connection.update(cartItems).set({ quantity: nextQuantity }).where(eq(cartItems.id, existing.id));
    else await connection.insert(cartItems).values({ userId, productId, variantId: variantId ?? null, quantity, fulfillmentMode, attributes: attributes ?? null });
    return { success: true };
  }
  const existing = memoryCart.find(i => i.userId === userId && i.productId === productId && (i.variantId ?? null) === (variantId ?? null) && i.attributes === attributes && i.fulfillmentMode === fulfillmentMode);
  if (existing) {
    if (fulfillmentMode === 'in_stock' && variant && variant.stock < existing.quantity + quantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
    existing.quantity += quantity;
  } else {
    memoryCart.push({
      id: nextCartId++,
      userId,
      productId,
      variantId: variantId ?? null,
      quantity,
      fulfillmentMode,
      attributes
    });
  }
  return { success: true };
}

export async function updateCartItem(userId: number, cartItemId: number, quantity: number) {
  const connection = await getDb();
  if (connection) {
    const current = await connection.select().from(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId))).limit(1);
    const item = current[0];
    if (!item) return { success: true };
    if (quantity <= 0) {
      await connection.delete(cartItems).where(eq(cartItems.id, cartItemId));
      return { success: true };
    }
    const product = await getProductById(item.productId);
    if (!product || product.isActive === false) throw new Error("Sản phẩm hiện không khả dụng");
    const variant = item.variantId ? (await getProductVariants(item.productId)).find(candidate => candidate.id === item.variantId) : undefined;
    if (product.type === "physical" && item.variantId && !variant) throw new Error("Biến thể sản phẩm hiện không khả dụng");
    if (item.fulfillmentMode === 'in_stock' && variant && variant.stock < quantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
    if (item.fulfillmentMode === 'in_stock' && product.type === "physical" && !variant && product.stock < quantity) throw new Error("Sản phẩm không đủ tồn kho");
    await connection.update(cartItems).set({ quantity }).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)));
    return { success: true };
  }
  const item = memoryCart.find(i => i.id === cartItemId && i.userId === userId);
  if (item) {
    if (quantity <= 0) {
      memoryCart = memoryCart.filter(i => i.id !== cartItemId || i.userId !== userId);
    } else {
      const product = await getProductById(item.productId);
      const variant = item.variantId ? (await getProductVariants(item.productId)).find(candidate => candidate.id === item.variantId) : undefined;
      if (!product || product.isActive === false) throw new Error("Sản phẩm hiện không khả dụng");
      if (product.type === "physical" && item.variantId && !variant) throw new Error("Biến thể sản phẩm hiện không khả dụng");
      if (item.fulfillmentMode === 'in_stock' && variant && variant.stock < quantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
      if (item.fulfillmentMode === 'in_stock' && product.type === "physical" && !variant && product.stock < quantity) throw new Error("Sản phẩm không đủ tồn kho");
      item.quantity = quantity;
    }
  }
  return { success: true };
}

export async function removeFromCart(cartItemId: number) {
  const connection = await getDb();
  if (connection) {
    await connection.delete(cartItems).where(eq(cartItems.id, cartItemId));
    return { success: true };
  }
  memoryCart = memoryCart.filter(i => i.id !== cartItemId);
  return { success: true };
}

export async function clearCart(userId: number) {
  const connection = await getDb();
  if (connection) {
    await connection.delete(cartItems).where(eq(cartItems.userId, userId));
    return { success: true };
  }
  memoryCart = memoryCart.filter(i => i.userId !== userId);
  return { success: true };
}

export async function createOrder(userId: number, data: {
  totalAmount: number;
  items: Array<{ productId: number; quantity: number; price: number; variantId?: number; attributes?: string; fulfillmentMode?: 'in_stock' | 'preorder' }>;
  discountCode?: string;
  shipping?: { name: string; phone: string; address: string; note?: string };
  clearCart?: boolean;
}) {
  const orderCode = `DHL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const quantityByProduct = new Map<number, number>();
  data.items.forEach(item => quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) ?? 0) + item.quantity));
  const verifiedItems = await Promise.all(data.items.map(async item => {
    const product = await getProductById(item.productId);
    if (!product || product.isActive === false) throw new Error("Một sản phẩm trong giỏ hiện không khả dụng");
    const variants = product.type === "physical" ? await getProductVariants(product.id) : [];
    const variant = item.variantId ? variants.find(candidate => candidate.id === item.variantId) : undefined;
    if (product.type === "physical" && variants.length > 0 && !variant) throw new Error("Hãy chọn biến thể hợp lệ cho hàng vật lý");
    const fulfillmentMode = item.fulfillmentMode ?? 'in_stock';
    if (fulfillmentMode === 'preorder' && product.type !== 'physical') throw new Error("Order trước chỉ áp dụng cho hàng vật lý");
    const wholesaleTier = product.type === "physical" ? selectWholesaleTier(await getProductWholesaleTiers(product.id), quantityByProduct.get(product.id) ?? item.quantity) : undefined;
    const immediatePrice = Number(wholesaleTier?.unitPrice ?? product.price) + Number(variant?.priceAdjustment ?? 0);
    const finalPrice = fulfillmentMode === 'preorder' ? immediatePrice * 0.9 : immediatePrice;
    return {
      productId: product.id,
      quantity: item.quantity,
      price: finalPrice,
      preorderDiscount: immediatePrice - finalPrice,
      fulfillmentMode,
      variantId: variant?.id ?? null,
      variantLabel: variant ? [variant.size, variant.color].filter(Boolean).join(" · ") || null : null,
      isPhysical: product.type === "physical",
      weightGrams: product.type === "physical" ? Math.max(0, variant?.weightGrams ?? product.weightGrams ?? 0) : 0,
      availableStock: variant?.stock ?? product.stock,
      attributes: item.attributes,
    };
  }));
  const inventoryClaims = new Map<string, { productId: number; variantId: number | null; quantity: number; availableStock: number }>();
  for (const item of verifiedItems.filter(item => item.isPhysical && item.fulfillmentMode === 'in_stock')) {
    const key = item.variantId ? `variant:${item.variantId}` : `product:${item.productId}`;
    const current = inventoryClaims.get(key);
    inventoryClaims.set(key, current ? { ...current, quantity: current.quantity + item.quantity } : { productId: item.productId, variantId: item.variantId, quantity: item.quantity, availableStock: item.availableStock });
  }
  for (const claim of Array.from(inventoryClaims.values())) {
    if (claim.availableStock < claim.quantity) throw new Error("Sản phẩm hoặc biến thể đã chọn không đủ tồn kho");
  }
  const hasPhysicalItems = verifiedItems.some(item => item.isPhysical);
  const hasPreorderItems = verifiedItems.some(item => item.fulfillmentMode === 'preorder');
  if (hasPhysicalItems && (!data.shipping?.name || !data.shipping.phone || !data.shipping.address)) throw new Error("Vui lòng điền đủ thông tin nhận hàng");
  const shippingWeightGrams = verifiedItems.reduce((sum, item) => sum + (item.isPhysical ? item.weightGrams * item.quantity : 0), 0);
  const shipping = hasPhysicalItems ? { code: "spx", fee: getSpxShippingFee(shippingWeightGrams) } : { code: "digital", fee: 0 };
  const productSubtotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const preorderDiscountAmount = verifiedItems.reduce((sum, item) => sum + item.preorderDiscount * item.quantity, 0);
  const discount = await validateDiscountCode(data.discountCode || "", productSubtotal);
  const verifiedTotal = Math.max(0, productSubtotal - discount.amount) + shipping.fee;
  const connection = await getDb();
  if (connection) {
    return connection.transaction(async transaction => {
      for (const claim of Array.from(inventoryClaims.values())) {
        const updated = claim.variantId
          ? await transaction.update(productVariants).set({ stock: sql`${productVariants.stock} - ${claim.quantity}` }).where(and(eq(productVariants.id, claim.variantId), gte(productVariants.stock, claim.quantity)))
          : await transaction.update(products).set({ stock: sql`${products.stock} - ${claim.quantity}` }).where(and(eq(products.id, claim.productId), gte(products.stock, claim.quantity)));
        if (Number(updated[0]?.affectedRows ?? 0) !== 1) throw new Error("Sản phẩm hoặc biến thể vừa hết tồn kho. Vui lòng cập nhật giỏ hàng.");
      }
      const inserted = await transaction.insert(ordersTable).values({
        userId, orderCode, totalAmount: verifiedTotal.toFixed(2), status: "pending", paymentStatus: "pending", paymentMethod: hasPhysicalItems ? "techcombank_manual" : "sepay_vietqr",
        discountCode: discount.code, discountAmount: discount.amount.toFixed(2),
        shippingName: data.shipping?.name ?? null, shippingPhone: data.shipping?.phone ?? null, shippingAddress: data.shipping?.address ?? null, shippingNote: data.shipping?.note ?? null,
        shippingMethod: hasPhysicalItems ? shipping.code : null, shippingFee: shipping.fee.toFixed(2), shippingWeightGrams, hasPhysicalItems, hasPreorderItems, preorderDiscountAmount: preorderDiscountAmount.toFixed(2), preorderEstimatedDays: hasPreorderItems ? "7–10 ngày" : null,
      });
      const orderId = Number(inserted[0].insertId);
      await transaction.insert(orderItemsTable).values(verifiedItems.map(item => ({ orderId, productId: item.productId, variantId: item.variantId, variantLabel: item.variantLabel, quantity: item.quantity, price: item.price.toFixed(2), fulfillmentMode: item.fulfillmentMode, attributes: item.attributes ?? null, weightGrams: item.weightGrams })));
      if (data.clearCart !== false) await transaction.delete(cartItems).where(eq(cartItems.userId, userId));
      return { success: true, orderId, orderCode, totalAmount: verifiedTotal, shippingFee: shipping.fee, shippingWeightGrams, hasPhysicalItems, hasPreorderItems, preorderDiscountAmount, preorderEstimatedDays: hasPreorderItems ? "7–10 ngày" : null };
    });
  }
  for (const claim of Array.from(inventoryClaims.values())) {
    if (claim.variantId) {
      const variant = memoryProductVariants.find(item => item.id === claim.variantId);
      if (!variant || variant.stock < claim.quantity) throw new Error("Sản phẩm hoặc biến thể vừa hết tồn kho. Vui lòng cập nhật giỏ hàng.");
      variant.stock -= claim.quantity;
    } else {
      const product = memoryProducts.find(item => item.id === claim.productId);
      if (!product || product.stock < claim.quantity) throw new Error("Sản phẩm hoặc biến thể vừa hết tồn kho. Vui lòng cập nhật giỏ hàng.");
      product.stock -= claim.quantity;
    }
  }
  const orderId = nextOrderId++;
  memoryOrders.unshift({
    id: orderId, userId, orderCode, totalAmount: verifiedTotal.toString(), status: "pending", paymentStatus: "pending", paymentMethod: hasPhysicalItems ? "techcombank_manual" : "sepay_vietqr", discountCode: discount.code, discountAmount: discount.amount.toFixed(2),
    shippingName: data.shipping?.name ?? null, shippingPhone: data.shipping?.phone ?? null, shippingAddress: data.shipping?.address ?? null, shippingNote: data.shipping?.note ?? null,
    shippingMethod: hasPhysicalItems ? shipping.code : null, shippingFee: shipping.fee.toFixed(2), shippingWeightGrams, hasPhysicalItems, hasPreorderItems, preorderDiscountAmount: preorderDiscountAmount.toFixed(2), preorderEstimatedDays: hasPreorderItems ? "7–10 ngày" : null, trackingStage: "ordered", trackingUrl: null, isDeleted: false, createdAt: new Date(),
  });
  for (const item of verifiedItems) memoryOrderItems.push({ id: nextOrderItemId++, orderId, productId: item.productId, variantId: item.variantId, variantLabel: item.variantLabel, quantity: item.quantity, price: item.price.toString(), fulfillmentMode: item.fulfillmentMode, attributes: item.attributes, weightGrams: item.weightGrams });
  if (data.clearCart !== false) await clearCart(userId);
  return { success: true, orderId, orderCode, totalAmount: verifiedTotal, shippingFee: shipping.fee, shippingWeightGrams, hasPhysicalItems, hasPreorderItems, preorderDiscountAmount, preorderEstimatedDays: hasPreorderItems ? "7–10 ngày" : null };
}

/** SPX: đến 1 kg là 20.000đ; mỗi kg hoặc phần kg tiếp theo thêm 10.000đ. */
export function getSpxShippingFee(totalWeightGrams: number) {
  const billableKg = Math.max(1, Math.ceil(Math.max(0, totalWeightGrams) / 1000));
  return 10_000 + billableKg * 10_000;
}

/** Xác nhận đơn hàng vật lý bằng tay khi khách chuyển vào QR Techcombank không kèm nội dung đối soát. */
export async function confirmManualPayment(orderId: number, confirmedByUserId: number) {
  const confirmationReference = `MANUAL-${orderId}-${Date.now()}`;
  const connection = await getDb();
  if (connection) {
    return connection.transaction(async transaction => {
      const rows = await transaction.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "pending"), eq(ordersTable.paymentStatus, "pending"), eq(ordersTable.hasPhysicalItems, true), eq(ordersTable.isDeleted, false))).limit(1);
      const order = rows[0];
      if (!order) throw new Error("ORDER_NOT_PENDING");
      await transaction.insert(paymentTransactions).values({
        provider: "manual",
        providerTransactionId: confirmationReference,
        orderId: order.id,
        transferAmount: String(order.totalAmount),
        transferContent: `Xác nhận thủ công bởi chủ cửa hàng #${confirmedByUserId}`,
        gateway: "Techcombank",
      });
      const updated = await transaction.update(ordersTable).set({
        status: order.hasPhysicalItems ? "processing" : "completed",
        paymentStatus: "paid",
        paymentReference: confirmationReference,
        paymentConfirmedAt: new Date(),
      }).where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "pending"), eq(ordersTable.paymentStatus, "pending"), eq(ordersTable.isDeleted, false)));
      if (Number(updated[0]?.affectedRows ?? 0) !== 1) throw new Error("ORDER_NOT_PENDING");
      if (order.discountCode) await transaction.update(discountCodes).set({ usedCount: sql`${discountCodes.usedCount} + 1` }).where(eq(discountCodes.code, order.discountCode));
      return { success: true, orderId: order.id, paymentStatus: "paid" as const };
    });
  }
  const order = memoryOrders.find(item => item.id === orderId && !item.isDeleted && item.hasPhysicalItems && item.status === "pending" && item.paymentStatus === "pending");
  if (!order) throw new Error("ORDER_NOT_PENDING");
  order.status = order.hasPhysicalItems ? "processing" : "completed";
  order.paymentStatus = "paid";
  order.paymentReference = confirmationReference;
  order.paymentConfirmedAt = new Date();
  if (order.discountCode) {
    const code = memoryDiscountCodes.find(item => item.code === order.discountCode);
    if (code) code.usedCount += 1;
  }
  return { success: true, orderId: order.id, paymentStatus: "paid" as const };
}

export async function getOrders(userId?: number, isAdmin?: boolean) {
  const connection = await getDb();
  if (connection) {
    const orderRows = isAdmin
      ? await connection.select().from(ordersTable).orderBy(desc(ordersTable.createdAt))
      : await connection.select().from(ordersTable).where(eq(ordersTable.userId, userId!)).orderBy(desc(ordersTable.createdAt));
    return Promise.all(orderRows.filter(order => !order.isDeleted).map(async order => {
      const itemRows = await connection.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      return {
        ...order,
        totalAmount: String(order.totalAmount),
        status: order.status as OrderStatusType,
        paymentStatus: order.paymentStatus as "pending" | "paid",
        items: await Promise.all(itemRows.map(async item => ({
          ...item,
          price: String(item.price),
          product: await getProductById(item.productId),
        }))),
      };
    }));
  }
  let list = memoryOrders.filter(order => !order.isDeleted);
  if (!isAdmin && userId) {
    list = list.filter(o => o.userId === userId);
  }
  return list.map(order => ({
    ...order,
    items: memoryOrderItems
      .filter(oi => oi.orderId === order.id)
      .map(oi => ({
        ...oi,
        product: memoryProducts.find(p => p.id === oi.productId)
      }))
  }));
}

export async function updateOrderStatus(orderId: number, status: OrderStatusType) {
  const connection = await getDb();
  if (connection) {
    await connection.update(ordersTable).set({ status }).where(and(eq(ordersTable.id, orderId), eq(ordersTable.isDeleted, false)));
    return { success: true };
  }
  const order = memoryOrders.find(o => o.id === orderId && !o.isDeleted);
  if (order) {
    order.status = status;
  }
  return { success: true };
}

export async function updateOrderTracking(orderId: number, stage: NonNullable<OrderType["trackingStage"]>, trackingUrl?: string) {
  const normalizedTrackingUrl = trackingUrl?.trim() || null;
  const connection = await getDb();
  if (connection) {
    const updated = await connection.update(ordersTable).set({ trackingStage: stage, trackingUrl: normalizedTrackingUrl }).where(and(eq(ordersTable.id, orderId), eq(ordersTable.isDeleted, false)));
    if (Number(updated[0]?.affectedRows ?? 0) !== 1) throw new Error("Không tìm thấy đơn hàng");
    return { success: true };
  }
  const order = memoryOrders.find(item => item.id === orderId && !item.isDeleted);
  if (!order) throw new Error("Không tìm thấy đơn hàng");
  order.trackingStage = stage;
  order.trackingUrl = normalizedTrackingUrl;
  return { success: true };
}

export async function deleteOrder(orderId: number, performedByUserId: number) {
  const restoreStock = async (items: Array<{ productId: number; variantId?: number | null; quantity: number; fulfillmentMode?: string | null }>, transaction?: Pick<NonNullable<Awaited<ReturnType<typeof getDb>>>, "update">) => {
    for (const item of items) {
      if (item.fulfillmentMode === "preorder") continue;
      if (transaction) {
        if (item.variantId) await transaction.update(productVariants).set({ stock: sql`${productVariants.stock} + ${item.quantity}` }).where(eq(productVariants.id, item.variantId));
        else await transaction.update(products).set({ stock: sql`${products.stock} + ${item.quantity}` }).where(and(eq(products.id, item.productId), eq(products.type, "physical")));
      } else if (item.variantId) {
        const variant = memoryProductVariants.find(candidate => candidate.id === item.variantId);
        if (variant) variant.stock += item.quantity;
      } else {
        const product = memoryProducts.find(candidate => candidate.id === item.productId);
        if (product?.type === "physical") product.stock += item.quantity;
      }
    }
  };
  const connection = await getDb();
  if (connection) {
    return connection.transaction(async transaction => {
      const records = await transaction.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
      const order = records[0];
      if (!order || order.isDeleted) throw new Error("Không tìm thấy đơn hàng");
      if (order.paymentStatus === "pending" && order.hasPhysicalItems) await restoreStock(await transaction.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId)), transaction);
      await transaction.update(ordersTable).set({ isDeleted: true }).where(eq(ordersTable.id, orderId));
      await transaction.insert(adminActivity).values({ action: "order_deleted", targetType: "order", targetId: orderId, details: JSON.stringify({ paymentStatus: order.paymentStatus, stockRestored: order.paymentStatus === "pending" && order.hasPhysicalItems }), performedByUserId });
      return { success: true };
    });
  }
  const order = memoryOrders.find(item => item.id === orderId && !item.isDeleted);
  if (!order) throw new Error("Không tìm thấy đơn hàng");
  if (order.paymentStatus === "pending" && order.hasPhysicalItems) await restoreStock(memoryOrderItems.filter(item => item.orderId === orderId));
  order.isDeleted = true;
  memoryAdminActivity.unshift({ id: nextAdminActivityId++, action: "order_deleted", targetType: "order", targetId: orderId, details: JSON.stringify({ paymentStatus: order.paymentStatus, stockRestored: order.paymentStatus === "pending" && order.hasPhysicalItems }), performedByUserId, createdAt: new Date() });
  return { success: true };
}

export async function cancelPendingOrderForUser(userId: number, orderId: number) {
  const connection = await getDb();
  if (connection) {
    const order = await connection.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId), eq(ordersTable.status, "pending"), eq(ordersTable.paymentStatus, "pending"))).limit(1);
    if (!order[0]) return { success: true, cancelled: false };
    const updated = await connection.update(ordersTable).set({ status: "cancelled" }).where(and(
      eq(ordersTable.id, orderId),
      eq(ordersTable.userId, userId),
      eq(ordersTable.status, "pending"),
      eq(ordersTable.paymentStatus, "pending"),
    ));
    const cancelled = Number(updated[0]?.affectedRows ?? 0) > 0;
    if (cancelled && order[0].hasPhysicalItems) {
      const lineItems = await connection.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
      for (const item of lineItems) {
        if (item.fulfillmentMode === "preorder") continue;
        if (item.variantId) await connection.update(productVariants).set({ stock: sql`${productVariants.stock} + ${item.quantity}` }).where(eq(productVariants.id, item.variantId));
        else {
          const product = await getProductById(item.productId);
          if (product?.type === "physical") await connection.update(products).set({ stock: sql`${products.stock} + ${item.quantity}` }).where(eq(products.id, item.productId));
        }
      }
    }
    return { success: true, cancelled };
  }
  const order = memoryOrders.find(item => item.id === orderId && item.userId === userId && item.status === "pending" && item.paymentStatus === "pending");
  if (order) {
    order.status = "cancelled";
    if (order.hasPhysicalItems) for (const item of memoryOrderItems.filter(item => item.orderId === orderId)) {
      if (item.fulfillmentMode === "preorder") continue;
      if (item.variantId) {
        const variant = memoryProductVariants.find(candidate => candidate.id === item.variantId);
        if (variant) variant.stock += item.quantity;
      } else {
        const product = memoryProducts.find(candidate => candidate.id === item.productId);
        if (product?.type === "physical") product.stock += item.quantity;
      }
    }
  }
  return { success: true, cancelled: Boolean(order) };
}

export async function getOrderPaymentForUser(userId: number, orderId: number) {
  const connection = await getDb();
  if (connection) {
    const result = await connection.select().from(ordersTable).where(and(
      eq(ordersTable.id, orderId),
      eq(ordersTable.userId, userId),
      eq(ordersTable.isDeleted, false),
    )).limit(1);
    return result[0];
  }
  return memoryOrders.find(order => order.id === orderId && order.userId === userId && !order.isDeleted);
}

export const DOWNLOAD_ACCESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

export function isDownloadAccessActive(paymentConfirmedAt: Date | null | undefined, now = Date.now()) {
  return Boolean(paymentConfirmedAt) && (paymentConfirmedAt?.getTime() ?? 0) + DOWNLOAD_ACCESS_WINDOW_MS > now;
}

export async function getPaidDownloadsForUser(userId: number, now = Date.now()) {
  const userOrders = await getOrders(userId, false);
  const links = await listDownloadLinks();
  const linkMap = new Map(links.map(link => [link.productId, link.driveUrl]));
  return userOrders
    .filter(order => order.paymentStatus === "paid" && isDownloadAccessActive(order.paymentConfirmedAt, now))
    .flatMap(order => (order.items ?? []).filter(item => item.product?.type === "digital").map(item => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.product?.name ?? "Digital resource",
      fileSize: item.product?.fileSize ?? null,
      driveUrl: linkMap.get(item.productId) ?? item.product?.fileUrl ?? null,
      expiresAt: (order.paymentConfirmedAt?.getTime() ?? 0) + DOWNLOAD_ACCESS_WINDOW_MS,
    })));
}

export async function getInstantDownloadsForOrder(userId: number, orderId: number, now = Date.now()) {
  const downloads = await getPaidDownloadsForUser(userId, now);
  return downloads.filter(download => download.orderId === orderId);
}

async function confirmWalletTopupPayment(input: { providerTransactionId: string; transferAmount: number; transferContent: string; gateway: string }): Promise<{ success: boolean; alreadyProcessed?: boolean; reason?: string }> {
  const normalizedContent = input.transferContent.toUpperCase();
  const connection = await getDb();
  if (connection) {
    const duplicate = (await connection.select().from(walletTopups).where(eq(walletTopups.providerTransactionId, input.providerTransactionId)).limit(1))[0];
    if (duplicate) return { success: true, alreadyProcessed: true };
    const pendingTopups = await connection.select().from(walletTopups).where(eq(walletTopups.status, "pending"));
    const matchedTopup = pendingTopups.find(topup => normalizedContent.includes(topup.topupCode.toUpperCase()) && Number(topup.amount) === Math.round(input.transferAmount));
    if (!matchedTopup) return { success: false, reason: "No matching pending wallet topup" };
    return connection.transaction(async transaction => {
      const confirmed = await transaction.update(walletTopups).set({ status: "paid", providerTransactionId: input.providerTransactionId, transferContent: input.transferContent, gateway: input.gateway || null, paidAt: new Date() }).where(and(eq(walletTopups.id, matchedTopup.id), eq(walletTopups.status, "pending")));
      if (Number(confirmed[0]?.affectedRows ?? 0) !== 1) return { success: true, alreadyProcessed: true };
      await transaction.update(users).set({ balance: sql`${users.balance} + ${Number(matchedTopup.amount).toFixed(2)}` }).where(eq(users.id, matchedTopup.userId));
      const user = (await transaction.select({ balance: users.balance }).from(users).where(eq(users.id, matchedTopup.userId)).limit(1))[0];
      if (!user) throw new Error("USER_NOT_FOUND");
      await transaction.insert(balanceLedger).values({ userId: matchedTopup.userId, amount: Number(matchedTopup.amount).toFixed(2), balanceAfter: String(user.balance), reason: `Nạp ví SePay ${matchedTopup.topupCode}`, performedByUserId: matchedTopup.userId });
      await transaction.insert(adminActivity).values({ action: "wallet_topped_up", targetType: "user", targetId: matchedTopup.userId, details: JSON.stringify({ amount: Number(matchedTopup.amount), topupCode: matchedTopup.topupCode, providerTransactionId: input.providerTransactionId }), performedByUserId: matchedTopup.userId });
      return { success: true };
    });
  }
  const duplicate = memoryWalletTopups.find(topup => topup.providerTransactionId === input.providerTransactionId);
  if (duplicate) return { success: true, alreadyProcessed: true };
  const topup = memoryWalletTopups.find(candidate => candidate.status === "pending" && normalizedContent.includes(candidate.topupCode.toUpperCase()) && Number(candidate.amount) === Math.round(input.transferAmount));
  if (!topup) return { success: false, reason: "No matching pending wallet topup" };
  const user = memoryUsers.find(candidate => candidate.id === topup.userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  const now = new Date();
  topup.status = "paid";
  topup.providerTransactionId = input.providerTransactionId;
  topup.transferContent = input.transferContent;
  topup.gateway = input.gateway || null;
  topup.paidAt = now;
  topup.updatedAt = now;
  user.balance = (Number(user.balance) + Number(topup.amount)).toFixed(2);
  memoryBalanceMovements.unshift({ id: nextBalanceMovementId++, userId: user.id, amount: topup.amount, balanceAfter: user.balance, reason: `Nạp ví SePay ${topup.topupCode}`, performedByUserId: user.id, createdAt: now });
  memoryAdminActivity.unshift({ id: nextAdminActivityId++, action: "wallet_topped_up", targetType: "user", targetId: user.id, details: JSON.stringify({ amount: Number(topup.amount), topupCode: topup.topupCode, providerTransactionId: input.providerTransactionId }), performedByUserId: user.id, createdAt: now });
  return { success: true };
}

export async function confirmSePayPayment(input: {
  providerTransactionId: string;
  transferAmount: number;
  transferContent: string;
  gateway: string;
  paymentReference: string;
}): Promise<{ success: boolean; alreadyProcessed?: boolean; reason?: string }> {
  const normalizedContent = input.transferContent.toUpperCase();
  const walletResult = await confirmWalletTopupPayment(input);
  if (walletResult.success) return walletResult;
  const connection = await getDb();
  if (connection) {
    const duplicate = await connection.select().from(paymentTransactions).where(and(
      eq(paymentTransactions.provider, "sepay"),
      eq(paymentTransactions.providerTransactionId, input.providerTransactionId),
    )).limit(1);
    if (duplicate[0]) return { success: true, alreadyProcessed: true };

    const pendingOrders = await connection.select().from(ordersTable).where(and(eq(ordersTable.paymentStatus, "pending"), eq(ordersTable.status, "pending"), eq(ordersTable.isDeleted, false)));
    const matchedOrder = pendingOrders.find(order =>
      !order.hasPhysicalItems &&
      normalizedContent.includes(order.orderCode.toUpperCase()) && Number(order.totalAmount) === Math.round(input.transferAmount),
    );
    if (!matchedOrder) return { success: false, reason: "No matching pending order" };

    try {
      await connection.insert(paymentTransactions).values({
        provider: "sepay",
        providerTransactionId: input.providerTransactionId,
        orderId: matchedOrder.id,
        transferAmount: input.transferAmount.toFixed(2),
        transferContent: input.transferContent,
        gateway: input.gateway || null,
      });
    } catch {
      return { success: true, alreadyProcessed: true };
    }

    const confirmed = await connection.update(ordersTable).set({
      status: matchedOrder.hasPhysicalItems ? "processing" : "completed",
      paymentStatus: "paid",
      paymentReference: input.paymentReference || input.providerTransactionId,
      paymentConfirmedAt: new Date(),
    }).where(and(eq(ordersTable.id, matchedOrder.id), eq(ordersTable.paymentStatus, "pending"), eq(ordersTable.status, "pending")));
    if (Number(confirmed[0]?.affectedRows ?? 0) !== 1) return { success: false, reason: "No matching pending order" };
    if (matchedOrder.discountCode) await connection.update(discountCodes).set({ usedCount: sql`${discountCodes.usedCount} + 1` }).where(eq(discountCodes.code, matchedOrder.discountCode));
    return { success: true };
  }

  const duplicateKey = `sepay:${input.providerTransactionId}`;
  if (memoryProcessedTransactions.has(duplicateKey)) return { success: true, alreadyProcessed: true };
  const matchedOrder = memoryOrders.find(order =>
    !order.isDeleted &&
    !order.hasPhysicalItems &&
    order.paymentStatus === "pending" &&
    order.status === "pending" &&
    normalizedContent.includes(order.orderCode.toUpperCase()) &&
    Number(order.totalAmount) === Math.round(input.transferAmount),
  );
  if (!matchedOrder) return { success: false, reason: "No matching pending order" };

  memoryProcessedTransactions.add(duplicateKey);
  matchedOrder.status = matchedOrder.hasPhysicalItems ? "processing" : "completed";
  matchedOrder.paymentStatus = "paid";
  matchedOrder.paymentReference = input.paymentReference || input.providerTransactionId;
  matchedOrder.paymentConfirmedAt = new Date();
  if (matchedOrder.discountCode) {
    const code = memoryDiscountCodes.find(item => item.code === matchedOrder.discountCode);
    if (code) code.usedCount += 1;
  }
  return { success: true };
}
