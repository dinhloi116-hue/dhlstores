import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, cartItems, categories, mediaAssets, orderItems as orderItemsTable, orders as ordersTable, paymentTransactions, productDownloadLinks, products, users } from "../drizzle/schema";
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
  quantity: number;
  attributes?: string;
  product?: ProductType;
}

export interface OrderItemType {
  id: number;
  orderId: number;
  productId: number;
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
  createdAt: Date;
  items?: OrderItemType[];
}

export interface ExtendedUserType {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
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

let memoryUsers: ExtendedUserType[] = [
  {
    id: 1,
    openId: ENV.ownerOpenId || "owner-admin",
    name: "Admin DHL Stores",
    email: "admin@dhlstores.vn",
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
    name: "Nguyễn Văn Khách",
    email: "khachhang@gmail.com",
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
const memoryProcessedTransactions = new Set<string>();
const memoryDownloadLinks = new Map<number, string>();
const memoryMediaAssets: Array<{ id: number; fileName: string; storageKey: string; url: string; mimeType: string; sizeBytes: number; createdAt: Date }> = [];
let nextCartId = 1;
let nextOrderId = 1;
let nextOrderItemId = 1;
let nextMediaAssetId = 1;

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
      name: user.name ?? null,
      email: user.email ?? null,
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
      name: user.name || "Khách hàng DHL",
      email: user.email || "user@dhlstores.vn",
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
  if (connection) return connection.select().from(users).orderBy(desc(users.createdAt));
  return memoryUsers;
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
    const inserted = await connection.insert(products).values({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      price: input.price,
      type: "digital",
      categoryId: input.categoryId,
      image: input.image,
      fileUrl: input.fileUrl ?? null,
      fileSize: input.fileSize ?? null,
      stock: 9999,
      specs: input.specs ?? null,
      featured: input.featured,
      isActive: input.isActive,
    });
    const row = await connection.select().from(products).where(eq(products.id, Number(inserted[0].insertId))).limit(1);
    return row[0] ? toProductType(row[0]) : undefined;
  }
  const product: ProductType = {
    id: Math.max(0, ...memoryProducts.map(item => item.id)) + 1,
    name: input.name,
    slug: input.slug,
    description: input.description ?? "",
    price: input.price,
    type: "digital",
    categoryId: input.categoryId,
    image: input.image,
    fileUrl: input.fileUrl,
    fileSize: input.fileSize,
    stock: 9999,
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
    await connection.update(products).set({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      price: input.price,
      categoryId: input.categoryId,
      image: input.image,
      fileUrl: input.fileUrl ?? null,
      fileSize: input.fileSize ?? null,
      specs: input.specs ?? null,
      featured: input.featured,
      isActive: input.isActive,
    }).where(eq(products.id, productId));
    return { success: true };
  }
  const product = memoryProducts.find(item => item.id === productId);
  if (!product) throw new Error("Product not found");
  Object.assign(product, input);
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
  const items = memoryCart.filter(item => item.userId === userId);
  return Promise.all(items.map(async item => ({
    ...item,
    product: await getProductById(item.productId),
  })));
}

export async function addToCart(userId: number, productId: number, quantity: number, attributes?: string) {
  const product = await getProductById(productId);
  if (!product || product.isActive === false) throw new Error("Sản phẩm hiện không khả dụng");
  const existing = memoryCart.find(i => i.userId === userId && i.productId === productId && i.attributes === attributes);
  if (existing) {
    existing.quantity += quantity;
  } else {
    memoryCart.push({
      id: nextCartId++,
      userId,
      productId,
      quantity,
      attributes
    });
  }
  return { success: true };
}

export async function updateCartItem(cartItemId: number, quantity: number) {
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
  memoryCart = memoryCart.filter(i => i.id !== cartItemId);
  return { success: true };
}

export async function clearCart(userId: number) {
  memoryCart = memoryCart.filter(i => i.userId !== userId);
  return { success: true };
}

export async function createOrder(userId: number, data: {
  totalAmount: number;
  items: Array<{ productId: number; quantity: number; price: number; attributes?: string }>;
}) {
  const orderCode = `DHL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const verifiedItems = await Promise.all(data.items.map(async item => {
    const product = await getProductById(item.productId);
    if (!product || product.isActive === false) throw new Error("Một sản phẩm trong giỏ hiện không khả dụng");
    return {
      productId: product.id,
      quantity: item.quantity,
      price: Number(product.price),
      attributes: item.attributes,
    };
  }));
  const verifiedTotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const connection = await getDb();
  if (connection) {
    const inserted = await connection.insert(ordersTable).values({
      userId,
      orderCode,
      totalAmount: verifiedTotal.toFixed(2),
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "sepay_vietqr",
      hasPhysicalItems: false,
    });
    const orderId = Number(inserted[0].insertId);
    await connection.insert(orderItemsTable).values(verifiedItems.map(item => ({
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price.toFixed(2),
      attributes: item.attributes ?? null,
    })));
    await connection.delete(cartItems).where(eq(cartItems.userId, userId));
    return { success: true, orderId, orderCode, totalAmount: verifiedTotal };
  }
  const orderId = nextOrderId++;
  const newOrder: OrderType = {
    id: orderId,
    userId,
    orderCode,
    totalAmount: verifiedTotal.toString(),
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "sepay_vietqr",
    createdAt: new Date(),
  };

  memoryOrders.unshift(newOrder);

  for (const item of verifiedItems) {
    memoryOrderItems.push({
      id: nextOrderItemId++,
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price.toString(),
      attributes: item.attributes,
    });
  }

  await clearCart(userId);

  return { success: true, orderId, orderCode, totalAmount: verifiedTotal };
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

export async function getPaidDownloadsForUser(userId: number) {
  const userOrders = await getOrders(userId, false);
  const links = await listDownloadLinks();
  const linkMap = new Map(links.map(link => [link.productId, link.driveUrl]));
  return userOrders
    .filter(order => order.paymentStatus === "paid")
    .flatMap(order => (order.items ?? []).map(item => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.product?.name ?? "Digital resource",
      fileSize: item.product?.fileSize ?? null,
      driveUrl: linkMap.get(item.productId) ?? item.product?.fileUrl ?? null,
    })));
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

    const pendingOrders = await connection.select().from(ordersTable).where(eq(ordersTable.paymentStatus, "pending"));
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

    await connection.update(ordersTable).set({
      status: "completed",
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
    normalizedContent.includes(order.orderCode.toUpperCase()) &&
    Number(order.totalAmount) === Math.round(input.transferAmount),
  );
  if (!matchedOrder) return { success: false, reason: "No matching pending order" };

  memoryProcessedTransactions.add(duplicateKey);
  matchedOrder.status = "completed";
  matchedOrder.paymentStatus = "paid";
  matchedOrder.paymentReference = input.paymentReference || input.providerTransactionId;
  matchedOrder.paymentConfirmedAt = new Date();
  return { success: true };
}
