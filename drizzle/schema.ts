import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "blocked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  type: mysqlEnum("type", ["physical", "digital", "all"]).default("all").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["physical", "digital"]).notNull(),
  categoryId: int("categoryId").notNull(),
  image: text("image").notNull(),
  fileUrl: text("fileUrl"), // Dành cho sản phẩm số (link tải file)
  fileSize: varchar("fileSize", { length: 64 }), // VD: "45 MB", "Vector AI/SVG"
  stock: int("stock").default(100).notNull(), // Dành cho sản phẩm vật lý (áo bóng đá)
  specs: text("specs"), // Thông tin chi tiết (chất liệu, định dạng, kích thước...)
  featured: boolean("featured").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  attributes: varchar("attributes", { length: 255 }), // VD: "Size: L, Màu: Đỏ"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderCode: varchar("orderCode", { length: 64 }).notNull().unique(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "shipping", "completed", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 64 }).default("sepay_vietqr").notNull(),
  paymentReference: varchar("paymentReference", { length: 128 }),
  paymentConfirmedAt: timestamp("paymentConfirmedAt"),
  shippingName: varchar("shippingName", { length: 255 }),
  shippingPhone: varchar("shippingPhone", { length: 64 }),
  shippingAddress: text("shippingAddress"),
  shippingNote: text("shippingNote"),
  hasPhysicalItems: boolean("hasPhysicalItems").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  attributes: varchar("attributes", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Nhật ký giao dịch nhận từ webhook để đảm bảo cùng một giao dịch SePay chỉ
 * được xử lý một lần, kể cả khi SePay thử gửi lại webhook.
 */
export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 32 }).default("sepay").notNull(),
  providerTransactionId: varchar("providerTransactionId", { length: 128 }).notNull(),
  orderId: int("orderId").notNull(),
  transferAmount: decimal("transferAmount", { precision: 12, scale: 2 }).notNull(),
  transferContent: text("transferContent"),
  gateway: varchar("gateway", { length: 64 }),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
}, table => ({
  providerTransactionUnique: uniqueIndex("payment_transactions_provider_transaction_unique").on(
    table.provider,
    table.providerTransactionId,
  ),
}));

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

/** Link tải do admin cấu hình cho từng tài nguyên; chỉ server quyết định khi nào được trả về khách. */
export const productDownloadLinks = mysqlTable("product_download_links", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().unique(),
  driveUrl: text("driveUrl").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductDownloadLink = typeof productDownloadLinks.$inferSelect;

/** Metadata cho ảnh, video và tệp được tải vào kho S3 của dự án từ giao diện quản trị. */
export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: text("storageKey").notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;
