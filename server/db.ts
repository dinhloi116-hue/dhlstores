import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      _db = null;
    }
  }
  return _db;
}

export interface ProductType {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  type: 'digital';
  categoryId: number;
  image: string;
  fileUrl?: string;
  fileSize?: string;
  stock: number;
  specs?: string;
  featured: boolean;
  createdAt: Date;
}

export interface CategoryType {
  id: number;
  name: string;
  slug: string;
  description: string;
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

export type OrderStatusType = 'pending' | 'preparing' | 'shipping' | 'completed' | 'cancelled';

export interface OrderType {
  id: number;
  userId: number;
  totalAmount: string;
  status: OrderStatusType;
  paymentStatus: 'pending' | 'paid';
  createdAt: Date;
  items?: OrderItemType[];
}

const logoUrl = "/manus-storage/logodhlstores_c8e433ed.png";

// Cây 10 danh mục chính chuyên sâu về tài nguyên thiết kế, in ấn và bóng đá
const memoryCategories: CategoryType[] = [
  { id: 1, name: "Font Chữ & Font Thể Thao", slug: "font-chu-the-thao", description: "Font CLB, font áo bóng đá, font số, font retro, font Việt hóa..." },
  { id: 2, name: "Tên Số Áo Bóng Đá", slug: "ten-so-ao-bong-da", description: "Bộ name set theo CLB, đội tuyển, mùa giải, cầu thủ chuẩn in ấn." },
  { id: 3, name: "Vector & SVG", slug: "vector-svg", description: "Logo, biểu tượng, icon, họa tiết, hình vector dùng Corel/Illustrator." },
  { id: 4, name: "File In Áo / DTF / PET", slug: "file-in-ao-dtf", description: "Mẫu in ngực, lưng, tay áo, artwork đã xử lý sẵn để in PET/DTF." },
  { id: 5, name: "Patch & Badge", slug: "patch-badge", description: "Patch giải đấu, logo tài trợ, huy hiệu, badge áo bóng đá, patch giả thêu." },
  { id: 6, name: "Template Thiết Kế", slug: "template-thiet-ke", description: "Template áo đấu, mockup, banner, poster, social media, bảng giá..." },
  { id: 7, name: "Mockup Sản Phẩm", slug: "mockup-san-pham", description: "Mockup áo bóng đá, áo thun, hoodie, túi, cốc, phụ kiện trưng bày." },
  { id: 8, name: "Clipart & PNG Không Nền", slug: "clipart-png", description: "Nhân vật, hình trang trí, sticker, đồ họa 2D, PNG chất lượng cao." },
  { id: 9, name: "Pattern & Background", slug: "pattern-background", description: "Họa tiết áo, texture, pattern thể thao, background thiết kế." },
  { id: 10, name: "Combo / Design Bundle", slug: "combo-design-bundle", description: "Bộ font + vector + patch + mockup hoặc các gói tài nguyên theo chủ đề." },
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

let memoryCart: CartItemType[] = [];
let memoryOrders: OrderType[] = [];
let memoryOrderItems: OrderItemType[] = [];
let nextCartId = 1;
let nextOrderId = 1;
let nextOrderItemId = 1;

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) return;
  const db = await getDb();
  if (db) {
    try {
      const values: InsertUser = { openId: user.openId };
      const updateSet: Record<string, unknown> = {};
      if (user.name) { values.name = user.name; updateSet.name = user.name; }
      if (user.email) { values.email = user.email; updateSet.email = user.email; }
      if (user.role) { values.role = user.role; updateSet.role = user.role; }
      else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
      values.lastSignedIn = new Date();
      updateSet.lastSignedIn = new Date();
      await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
    } catch (e) {}
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (result.length > 0) return result[0];
    } catch (e) {}
  }
  return {
    id: 1,
    openId: openId,
    name: openId === ENV.ownerOpenId ? "Admin DHL Stores" : "Khách hàng DHL",
    email: "dhlstores@manus.im",
    loginMethod: "manus",
    role: openId === ENV.ownerOpenId ? ("admin" as const) : ("user" as const),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

export async function getCategories() {
  return memoryCategories;
}

export async function getProducts(filter?: {
  categoryId?: number;
  search?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}) {
  let list = [...memoryProducts];
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
  return memoryProducts.find(p => p.slug === slug);
}

export async function getProductById(id: number) {
  return memoryProducts.find(p => p.id === id);
}

export async function getCartItems(userId: number) {
  return memoryCart
    .filter(item => item.userId === userId)
    .map(item => ({
      ...item,
      product: memoryProducts.find(p => p.id === item.productId)
    }));
}

export async function addToCart(userId: number, productId: number, quantity: number, attributes?: string) {
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
  const orderId = nextOrderId++;
  const newOrder: OrderType = {
    id: orderId,
    userId,
    totalAmount: data.totalAmount.toString(),
    status: "completed",
    paymentStatus: "paid",
    createdAt: new Date(),
  };

  memoryOrders.unshift(newOrder);

  for (const item of data.items) {
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

  return { success: true, orderId };
}

export async function getOrders(userId?: number, isAdmin?: boolean) {
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
  const order = memoryOrders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
  }
  return { success: true };
}
