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
  type: 'physical' | 'digital';
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
  type: 'physical' | 'digital' | 'all';
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
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingNote?: string;
  hasPhysicalItems: boolean;
  createdAt: Date;
  items?: OrderItemType[];
}

const logoUrl = "/manus-storage/logodhlstores_c8e433ed.png";

const memoryCategories: CategoryType[] = [
  { id: 1, name: "Áo Bóng Đá", slug: "ao-bong-da", description: "Áo đấu chính hãng, chất liệu cao cấp thoáng khí, in ấn sắc nét.", type: "physical" },
  { id: 2, name: "File In Hình Ảnh", slug: "file-in-hinh-anh", description: "Artwork, poster bóng đá độ phân giải cao 4K sẵn sàng in ấn.", type: "digital" },
  { id: 3, name: "File Font Số & Chữ", slug: "file-font-so", description: "Font số áo đấu độc quyền, chuẩn typography thể thao chuyên nghiệp.", type: "digital" },
];

const memoryProducts: ProductType[] = [
  {
    id: 1,
    name: "Áo Đấu CLB Hoàng Gia Đỏ 2026/27",
    slug: "ao-dau-clb-hoang-gia-do-2026",
    description: "Mẫu áo đấu sân nhà mới nhất của CLB Hoàng Gia Đỏ mùa giải 2026/27. Chất liệu thun mè cao cấp thấm hút mồ hôi cực tốt, logo thêu nổi tinh tế.",
    price: "450000",
    type: "physical",
    categoryId: 1,
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
    stock: 120,
    specs: "Chất liệu: Polyester 100% thun lạnh cao cấp. Size: S, M, L, XL, XXL. Màu sắc: Đỏ hoàng gia / Trắng. Công nghệ thấm hút Dry-Fit.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "Áo Đấu Đội Tuyển Quốc Gia Xanh Hoàng Lịch",
    slug: "ao-dau-dtqg-xanh-hoang-lich-2026",
    description: "Thiết kế đầy kiêu hãnh với sắc xanh ngọc lục bảo kết hợp hoạ tiết trống đồng cách điệu, biểu trưng cho tinh thần chiến đấu đỉnh cao.",
    price: "480000",
    type: "physical",
    categoryId: 1,
    image: "https://images.unsplash.com/photo-1518063319789-7217e6706704?auto=format&fit=crop&w=800&q=80",
    stock: 85,
    specs: "Chất liệu: Recycled Polyester cao cấp thân thiện môi trường. Size: M, L, XL. Màu sắc: Xanh ngọc / Vàng đồng.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 3,
    name: "Áo Đấu Sân Khách Đen Hổ Phách 2026",
    slug: "ao-dau-san-khach-den-ho-phach-2026",
    description: "Sự pha trộn huyền bí giữa tông đen nhám obsidian và các đường nét phản quang màu hổ phách cực kỳ cá tính và hiện đại.",
    price: "450000",
    type: "physical",
    categoryId: 1,
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    stock: 60,
    specs: "Chất liệu: Vải lưới chuyên dụng đá bóng. Size: S, M, L, XL. Màu sắc: Đen nhám / Hổ phách.",
    featured: false,
    createdAt: new Date(),
  },
  {
    id: 4,
    name: "Bộ Sưu Tập Poster Bóng Đá 4K - Vector & High-Res",
    slug: "bo-suu-tap-poster-bong-da-4k",
    description: "Trọn bộ 50+ file thiết kế vector và ảnh 4K cực nét các huyền thoại bóng đá thế giới. Dành riêng cho thiết kế banner, poster, ốp lưng hoặc in ấn trang trí.",
    price: "150000",
    type: "digital",
    categoryId: 2,
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "185 MB (ZIP - AI, PSD, PNG 4K)",
    stock: 9999,
    specs: "Định dạng: AI, PSD, PNG 4K (3840x2160 pixels). Cấp quyền thương mại trọn đời.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 5,
    name: "Artwork Đồ Họa Cầu Thủ Huyền Thoại - PSD Layered",
    slug: "artwork-do-hoa-cau-thu-huyen-thoai-psd",
    description: "File Photoshop tách lớp chi tiết từng layer hiệu ứng ánh sáng, khói lửa và texture đỉnh cao để làm quà tặng hoặc tranh canvas.",
    price: "200000",
    type: "digital",
    categoryId: 2,
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "320 MB (.PSD Full Layers)",
    stock: 9999,
    specs: "Định dạng: .PSD (Adobe Photoshop CC). Độ phân giải 300 DPI sẵn sàng in khổ lớn.",
    featured: false,
    createdAt: new Date(),
  },
  {
    id: 6,
    name: "Font Số Áo Đấu Thể Thao Pro 2026 - OTF/TTF",
    slug: "font-so-ao-dau-the-thao-pro-2026",
    description: "Bộ font chữ và số áo bóng đá độc quyền được thiết kế chuẩn typography thể thao quốc tế. Tương thích hoàn hảo với Illustrator, Corel, Photoshop.",
    price: "250000",
    type: "digital",
    categoryId: 3,
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "12 MB (.OTF, .TTF, .WOFF2)",
    stock: 9999,
    specs: "Định dạng: OTF, TTF, WOFF2. Hỗ trợ đầy đủ ký tự tiếng Việt và dấu số.",
    featured: true,
    createdAt: new Date(),
  },
  {
    id: 7,
    name: "Font Tên & Số Áo Vintage Classic - OTF/TTF",
    slug: "font-ten-va-so-ao-vintage-classic",
    description: "Phong cách retro hoài cổ gợi nhớ các huyền thoại thập niên 80-90. Cực kỳ phù hợp cho các mẫu áo đấu phong cách cổ điển.",
    price: "180000",
    type: "digital",
    categoryId: 3,
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80",
    fileUrl: logoUrl,
    fileSize: "8.5 MB (.OTF, .TTF)",
    stock: 9999,
    specs: "Định dạng: OTF, TTF. Phù hợp cho thiết kế áo đấu retro, poster câu lạc bộ.",
    featured: false,
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
  type?: string;
  categoryId?: number;
  search?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}) {
  let list = [...memoryProducts];
  if (filter?.type && filter.type !== 'all') {
    list = list.filter(p => p.type === filter.type);
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
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingNote?: string;
  totalAmount: number;
  hasPhysicalItems: boolean;
  items: Array<{ productId: number; quantity: number; price: number; attributes?: string }>;
}) {
  const orderId = nextOrderId++;
  const newOrder: OrderType = {
    id: orderId,
    userId,
    totalAmount: data.totalAmount.toString(),
    status: "preparing",
    paymentStatus: "paid",
    shippingName: data.shippingName,
    shippingPhone: data.shippingPhone,
    shippingAddress: data.shippingAddress,
    shippingNote: data.shippingNote,
    hasPhysicalItems: data.hasPhysicalItems,
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
