import { and, desc, eq, sql } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, cartItems, categories, mediaAssets, orderItems as orderItemsTable, orders as ordersTable, paymentTransactions, productDownloadLinks, productVariants, products, users } from "../drizzle/schema";
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
  sku?: string;
  priceAdjustment: string;
  stock: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CategoryType {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: 'digital' | 'physical' | 'all';
  isActive?: boolean;
}

export interface CartItemType {
  id: number;
  userId: number;
  productId: number;
  variantId?: number | null;
  quantity: number;
  attributes?: string;
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
  attributes?: string;
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
  paymentConfirmedAt?: Date | null;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  shippingNote?: string | null;
  shippingMethod?: string | null;
  shippingFee?: string;
  hasPhysicalItems?: boolean;
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
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

type LocalUserRecordType = ExtendedUserType & {
  passwordHash: string | null;
};

export type ShippingMethodCode = "pickup" | "standard" | "express";

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
  { id: 1, name: "Font Chữ & Font Thể Thao", slug: "font-chu-the-thao", description: "Font CLB, font áo bóng đá, font số, font retro, font Việt hóa...", type: "digital" },
  { id: 2, name: "Tên Số Áo Bóng Đá", slug: "ten-so-ao-bong-da", description: "Bộ name set theo CLB, đội tuyển, mùa giải, cầu thủ chuẩn in ấn.", type: "digital" },
  { id: 3, name: "Vector & SVG", slug: "vector-svg", description: "Logo, biểu tượng, icon, họa tiết, hình vector dùng Corel/Illustrator.", type: "digital" },
  { id: 4, name: "File In Áo / DTF / PET", slug: "file-in-ao-dtf", description: "Mẫu in ngực, lưng, tay áo, artwork đã xử lý sẵn để in PET/DTF.", type: "digital" },
  { id: 5, name: "Patch & Badge", slug: "patch-badge", description: "Patch giải đấu, logo tài trợ, huy hiệu, badge áo bóng đá, patch giả thêu.", type: "digital" },
  { id: 6, name: "Template Thiết Kế", slug: "template-thiet-ke", description: "Template áo đấu, mockup, banner, poster, social media, bảng giá...", type: "digital" },
  { id: 7, name: "Mockup Sản Phẩm", slug: "mockup-san-pham", description: "Mockup áo bóng đá, áo thun, hoodie, túi, cốc, phụ kiện trưng bày.", type: "digital" },
  { id: 8, name: "Clipart & PNG Không Nền", slug: "clipart-png", description: "Nhân vật, hình trang trí, sticker, đồ họa 2D, PNG chất lượng cao.", type: "digital" },
  { id: 9, name: "Pattern & Background", slug: "pattern-background", description: "Họa tiết áo, texture, pattern thể thao, background thiết kế.", type: "digital" },
  { id: 10, name: "Combo / Design Bundle", slug: "combo-design-bundle", description: "Bộ font + vector + patch + mockup hoặc các gói tài nguyên theo chủ đề.", type: "digital" },
  { id: 11, name: "Quần Áo Bóng Đá", slug: "quan-ao-bong-da", description: "Áo bóng đá, quần thi đấu và trang phục thể thao đặt theo mẫu.", type: "physical" },
  { id: 12, name: "Patch Tay", slug: "patch-tay", description: "Patch tay áo, badge giải đấu và phụ kiện ép nhiệt cho áo bóng đá.", type: "physical" },
  { id: 13, name: "Nameset Chống Nhiễm", slug: "nameset-chong-nhiem", description: "Nameset, số áo và chữ in chống nhiễm dành cho trang phục thể thao.", type: "physical" },
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
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  }
];

let memoryCart: CartItemType[] = [];
let memoryOrders: OrderType[] = [];
let memoryOrderItems: OrderItemType[] = [];
let memoryProductVariants: ProductVariantType[] = [];
const memoryProcessedTransactions = new Set<string>();
const memoryDownloadLinks = new Map<number, string>();
const memoryMediaAssets: Array<{ id: number; fileName: string; storageKey: string; url: string; mimeType: string; sizeBytes: number; createdAt: Date }> = [];
let nextCartId = 1;
let nextOrderId = 1;
let nextOrderItemId = 1;
let nextMediaAssetId = 1;
let nextProductVariantId = 1;

async function ensureDefaultCatalog(connection: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  await connection.insert(categories).values(memoryCategories.map(category => ({
    name: category.name,
    slug: category.slug,
    description: category.description,
    type: category.type,
    isActive: true,
  }))).onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } });

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
    sku: variant.sku ?? undefined,
    priceAdjustment: String(variant.priceAdjustment),
    stock: variant.stock,
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

export async function updateUserStatus(userId: number, status: 'active' | 'blocked') {
  const connection = await getDb();
  if (connection) {
    await connection.update(users).set({ status }).where(eq(users.id, userId));
    return { success: true };
  }
  const u = memoryUsers.find(item => item.id === userId);
  if (u) {
    u.status = status;
  }
  return { success: true };
}

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const connection = await getDb();
  if (connection) {
    await connection.update(users).set({ role }).where(eq(users.id, userId));
    return { success: true };
  }
  const user = memoryUsers.find(item => item.id === userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  user.role = role;
  user.updatedAt = new Date();
  return { success: true };
}

export async function isUserActive(userId: number) {
  const connection = await getDb();
  if (connection) {
    const result = await connection.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    return result[0]?.status === "active";
  }
  return memoryUsers.find(user => user.id === userId)?.status === "active";
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
  });
  return { success: true };
}

export type CatalogVariantInput = {
  productId: number;
  size?: string;
  color?: string;
  sku?: string;
  priceAdjustment: string;
  stock: number;
  isActive: boolean;
};

export async function getProductVariants(productId: number, includeInactive = false) {
  const connection = await getDb();
  if (connection) {
    const rows = await connection.select().from(productVariants).where(eq(productVariants.productId, productId));
    return rows.filter(variant => includeInactive || variant.isActive).map(toProductVariantType);
  }
  return memoryProductVariants.filter(variant => variant.productId === productId && (includeInactive || variant.isActive));
}

export async function getAdminProductVariants(productId?: number) {
  if (productId) return getProductVariants(productId, true);
  const connection = await getDb();
  if (connection) return (await connection.select().from(productVariants)).map(toProductVariantType);
  return [...memoryProductVariants];
}

export async function createProductVariant(input: CatalogVariantInput) {
  const product = await getProductById(input.productId);
  if (!product || product.type !== "physical") throw new Error("Chỉ hàng vật lý mới có biến thể");
  const connection = await getDb();
  if (connection) {
    const inserted = await connection.insert(productVariants).values({
      productId: input.productId,
      size: input.size || null,
      color: input.color || null,
      sku: input.sku || null,
      priceAdjustment: input.priceAdjustment,
      stock: input.stock,
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
    sku: input.sku,
    priceAdjustment: input.priceAdjustment,
    stock: input.stock,
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
      sku: input.sku || null,
      priceAdjustment: input.priceAdjustment,
      stock: input.stock,
      isActive: input.isActive,
    }).where(eq(productVariants.id, variantId));
    return { success: true };
  }
  const variant = memoryProductVariants.find(item => item.id === variantId);
  if (!variant) throw new Error("Không tìm thấy biến thể");
  Object.assign(variant, input);
  return { success: true };
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

export async function addToCart(userId: number, productId: number, quantity: number, variantId?: number, attributes?: string) {
  const product = await getProductById(productId);
  if (!product || product.isActive === false) throw new Error("Sản phẩm hiện không khả dụng");
  let variant: ProductVariantType | undefined;
  if (product.type === "physical") {
    const variants = await getProductVariants(productId);
    variant = variantId ? variants.find(item => item.id === variantId) : undefined;
    if (variants.length > 0 && !variant) throw new Error("Hãy chọn kích thước hoặc màu sắc trước khi thêm vào giỏ");
    if (variant && variant.stock < quantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
    if (!variant && product.stock < quantity) throw new Error("Sản phẩm không đủ tồn kho");
  }
  const connection = await getDb();
  if (connection) {
    const current = await connection.select().from(cartItems).where(eq(cartItems.userId, userId));
    const existing = current.find(item => item.productId === productId && (item.variantId ?? null) === (variantId ?? null) && (item.attributes ?? undefined) === attributes);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (variant && variant.stock < nextQuantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
    if (product.type === "physical" && !variant && product.stock < nextQuantity) throw new Error("Sản phẩm không đủ tồn kho");
    if (existing) await connection.update(cartItems).set({ quantity: nextQuantity }).where(eq(cartItems.id, existing.id));
    else await connection.insert(cartItems).values({ userId, productId, variantId: variantId ?? null, quantity, attributes: attributes ?? null });
    return { success: true };
  }
  const existing = memoryCart.find(i => i.userId === userId && i.productId === productId && (i.variantId ?? null) === (variantId ?? null) && i.attributes === attributes);
  if (existing) {
    if (variant && variant.stock < existing.quantity + quantity) throw new Error("Biến thể đã chọn không đủ tồn kho");
    existing.quantity += quantity;
  } else {
    memoryCart.push({
      id: nextCartId++,
      userId,
      productId,
      variantId: variantId ?? null,
      quantity,
      attributes
    });
  }
  return { success: true };
}

export async function updateCartItem(cartItemId: number, quantity: number) {
  const connection = await getDb();
  if (connection) {
    if (quantity <= 0) await connection.delete(cartItems).where(eq(cartItems.id, cartItemId));
    else await connection.update(cartItems).set({ quantity }).where(eq(cartItems.id, cartItemId));
    return { success: true };
  }
  const item = memoryCart.find(i => i.id === cartItemId);
  if (item) {
    if (quantity <= 0) {
      memoryCart = memoryCart.filter(i => i.id !== cartItemId);
    } else {
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
  items: Array<{ productId: number; quantity: number; price: number; variantId?: number; attributes?: string }>;
  shipping?: { name: string; phone: string; address: string; note?: string; method: ShippingMethodCode };
}) {
  const orderCode = `DHL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const verifiedItems = await Promise.all(data.items.map(async item => {
    const product = await getProductById(item.productId);
    if (!product || product.isActive === false) throw new Error("Một sản phẩm trong giỏ hiện không khả dụng");
    const variants = product.type === "physical" ? await getProductVariants(product.id) : [];
    const variant = item.variantId ? variants.find(candidate => candidate.id === item.variantId) : undefined;
    if (product.type === "physical" && variants.length > 0 && !variant) throw new Error("Hãy chọn biến thể hợp lệ cho hàng vật lý");
    if (variant && variant.stock < item.quantity) throw new Error("Biến thể không đủ tồn kho");
    if (product.type === "physical" && !variant && product.stock < item.quantity) throw new Error("Sản phẩm không đủ tồn kho");
    return {
      productId: product.id,
      quantity: item.quantity,
      price: Number(product.price) + Number(variant?.priceAdjustment ?? 0),
      variantId: variant?.id ?? null,
      variantLabel: variant ? [variant.size, variant.color].filter(Boolean).join(" · ") || null : null,
      isPhysical: product.type === "physical",
      attributes: item.attributes,
    };
  }));
  const hasPhysicalItems = verifiedItems.some(item => item.isPhysical);
  if (hasPhysicalItems && (!data.shipping?.name || !data.shipping.phone || !data.shipping.address)) throw new Error("Vui lòng điền đủ thông tin nhận hàng");
  const shipping = hasPhysicalItems ? getShippingOption(data.shipping?.method ?? "standard") : getShippingOption("pickup");
  const verifiedTotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + shipping.fee;
  const connection = await getDb();
  if (connection) {
    const inserted = await connection.insert(ordersTable).values({
      userId, orderCode, totalAmount: verifiedTotal.toFixed(2), status: "pending", paymentStatus: "pending", paymentMethod: "sepay_vietqr",
      shippingName: data.shipping?.name ?? null, shippingPhone: data.shipping?.phone ?? null, shippingAddress: data.shipping?.address ?? null, shippingNote: data.shipping?.note ?? null,
      shippingMethod: hasPhysicalItems ? shipping.code : null, shippingFee: shipping.fee.toFixed(2), hasPhysicalItems,
    });
    const orderId = Number(inserted[0].insertId);
    await connection.insert(orderItemsTable).values(verifiedItems.map(item => ({ orderId, productId: item.productId, variantId: item.variantId, variantLabel: item.variantLabel, quantity: item.quantity, price: item.price.toFixed(2), attributes: item.attributes ?? null })));
    await connection.delete(cartItems).where(eq(cartItems.userId, userId));
    return { success: true, orderId, orderCode, totalAmount: verifiedTotal, hasPhysicalItems };
  }
  const orderId = nextOrderId++;
  memoryOrders.unshift({
    id: orderId, userId, orderCode, totalAmount: verifiedTotal.toString(), status: "pending", paymentStatus: "pending", paymentMethod: "sepay_vietqr",
    shippingName: data.shipping?.name ?? null, shippingPhone: data.shipping?.phone ?? null, shippingAddress: data.shipping?.address ?? null, shippingNote: data.shipping?.note ?? null,
    shippingMethod: hasPhysicalItems ? shipping.code : null, shippingFee: shipping.fee.toFixed(2), hasPhysicalItems, createdAt: new Date(),
  });
  for (const item of verifiedItems) memoryOrderItems.push({ id: nextOrderItemId++, orderId, productId: item.productId, variantId: item.variantId, variantLabel: item.variantLabel, quantity: item.quantity, price: item.price.toString(), attributes: item.attributes });
  await clearCart(userId);
  return { success: true, orderId, orderCode, totalAmount: verifiedTotal, hasPhysicalItems };
}

export async function getOrders(userId?: number, isAdmin?: boolean) {
  const connection = await getDb();
  if (connection) {
    const orderRows = isAdmin
      ? await connection.select().from(ordersTable).orderBy(desc(ordersTable.createdAt))
      : await connection.select().from(ordersTable).where(eq(ordersTable.userId, userId!)).orderBy(desc(ordersTable.createdAt));
    return Promise.all(orderRows.map(async order => {
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
  let list = [...memoryOrders];
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
    await connection.update(ordersTable).set({ status }).where(eq(ordersTable.id, orderId));
    return { success: true };
  }
  const order = memoryOrders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
  }
  return { success: true };
}

export async function cancelPendingOrderForUser(userId: number, orderId: number) {
  const connection = await getDb();
  if (connection) {
    const updated = await connection.update(ordersTable).set({ status: "cancelled" }).where(and(
      eq(ordersTable.id, orderId),
      eq(ordersTable.userId, userId),
      eq(ordersTable.status, "pending"),
      eq(ordersTable.paymentStatus, "pending"),
    ));
    return { success: true, cancelled: Number(updated[0]?.affectedRows ?? 0) > 0 };
  }
  const order = memoryOrders.find(item => item.id === orderId && item.userId === userId && item.status === "pending" && item.paymentStatus === "pending");
  if (order) order.status = "cancelled";
  return { success: true, cancelled: Boolean(order) };
}

export async function getOrderPaymentForUser(userId: number, orderId: number) {
  const connection = await getDb();
  if (connection) {
    const result = await connection.select().from(ordersTable).where(and(
      eq(ordersTable.id, orderId),
      eq(ordersTable.userId, userId),
    )).limit(1);
    return result[0];
  }
  return memoryOrders.find(order => order.id === orderId && order.userId === userId);
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

export async function confirmSePayPayment(input: {
  providerTransactionId: string;
  transferAmount: number;
  transferContent: string;
  gateway: string;
  paymentReference: string;
}): Promise<{ success: boolean; alreadyProcessed?: boolean; reason?: string }> {
  const normalizedContent = input.transferContent.toUpperCase();
  const connection = await getDb();
  if (connection) {
    const duplicate = await connection.select().from(paymentTransactions).where(and(
      eq(paymentTransactions.provider, "sepay"),
      eq(paymentTransactions.providerTransactionId, input.providerTransactionId),
    )).limit(1);
    if (duplicate[0]) return { success: true, alreadyProcessed: true };

    const pendingOrders = await connection.select().from(ordersTable).where(and(eq(ordersTable.paymentStatus, "pending"), eq(ordersTable.status, "pending")));
    const matchedOrder = pendingOrders.find(order =>
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

    const lineItems = await connection.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, matchedOrder.id));
    for (const item of lineItems) {
      if (item.variantId) {
        await connection.update(productVariants).set({ stock: sql`GREATEST(${productVariants.stock} - ${item.quantity}, 0)` }).where(eq(productVariants.id, item.variantId));
      } else {
        const product = await getProductById(item.productId);
        if (product?.type === "physical") await connection.update(products).set({ stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)` }).where(eq(products.id, item.productId));
      }
    }
    await connection.update(ordersTable).set({
      status: matchedOrder.hasPhysicalItems ? "processing" : "completed",
      paymentStatus: "paid",
      paymentReference: input.paymentReference || input.providerTransactionId,
      paymentConfirmedAt: new Date(),
    }).where(and(eq(ordersTable.id, matchedOrder.id), eq(ordersTable.paymentStatus, "pending")));
    return { success: true };
  }

  const duplicateKey = `sepay:${input.providerTransactionId}`;
  if (memoryProcessedTransactions.has(duplicateKey)) return { success: true, alreadyProcessed: true };
  const matchedOrder = memoryOrders.find(order =>
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
  for (const item of memoryOrderItems.filter(item => item.orderId === matchedOrder.id)) {
    if (item.variantId) {
      const variant = memoryProductVariants.find(candidate => candidate.id === item.variantId);
      if (variant) variant.stock = Math.max(0, variant.stock - item.quantity);
    } else {
      const product = memoryProducts.find(candidate => candidate.id === item.productId);
      if (product?.type === "physical") product.stock = Math.max(0, product.stock - item.quantity);
    }
  }
  return { success: true };
}
