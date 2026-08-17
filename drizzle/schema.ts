import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 32 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  avatarUrl: text("avatarUrl"),
  email: varchar("email", { length: 320 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "owner"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "blocked"]).default("active").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => ({
  usernameUnique: uniqueIndex("users_username_unique").on(table.username),
  emailUnique: uniqueIndex("users_email_unique").on(table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Địa chỉ khách lưu trong hồ sơ để dùng lại khi mua hàng vật lý. */
export const shippingAddresses = mysqlTable("shipping_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recipientName: varchar("recipientName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  address: text("address").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type InsertShippingAddress = typeof shippingAddresses.$inferInsert;

/** Góp ý độc lập của khách, có thể gửi khi chưa đăng nhập thông qua visitorKey. */
export const customerFeedback = mysqlTable("customer_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  visitorKey: varchar("visitorKey", { length: 96 }).notNull(),
  displayName: varchar("displayName", { length: 128 }),
  contact: varchar("contact", { length: 255 }),
  topic: mysqlEnum("topic", ["suggestion", "issue", "other"]).default("suggestion").notNull(),
  message: text("message").notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  imageKey: varchar("imageKey", { length: 1024 }),
  status: mysqlEnum("status", ["new", "reviewed", "resolved"]).default("new").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerFeedback = typeof customerFeedback.$inferSelect;

/** Một hội thoại hỗ trợ gắn với người dùng đăng nhập hoặc visitorKey ẩn danh. */
export const supportConversations = mysqlTable("support_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  visitorKey: varchar("visitorKey", { length: 96 }).notNull().unique(),
  displayName: varchar("displayName", { length: 128 }),
  lastMessagePreview: varchar("lastMessagePreview", { length: 255 }),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  customerReadAt: timestamp("customerReadAt"),
  ownerReadAt: timestamp("ownerReadAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportConversation = typeof supportConversations.$inferSelect;

export const supportMessages = mysqlTable("support_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderType: mysqlEnum("senderType", ["customer", "owner"]).notNull(),
  senderUserId: int("senderUserId"),
  body: text("body").notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  imageKey: varchar("imageKey", { length: 1024 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;

export const balanceLedger = mysqlTable("balance_ledger", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 12, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  performedByUserId: int("performedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Yêu cầu nạp ví VietinBank/SePay; một giao dịch ngân hàng chỉ được đối soát một lần. */
export const walletTopups = mysqlTable("wallet_topups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topupCode: varchar("topupCode", { length: 64 }).notNull().unique(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "expired", "cancelled"]).default("pending").notNull(),
  provider: varchar("provider", { length: 32 }).default("sepay").notNull(),
  providerTransactionId: varchar("providerTransactionId", { length: 128 }).unique(),
  transferContent: text("transferContent"),
  gateway: varchar("gateway", { length: 64 }),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WalletTopup = typeof walletTopups.$inferSelect;

export const adminActivity = mysqlTable("admin_activity", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 96 }).notNull(),
  targetType: varchar("targetType", { length: 64 }).notNull(),
  targetId: int("targetId").notNull(),
  details: text("details"),
  performedByUserId: int("performedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const discountCodes = mysqlTable("discount_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  type: mysqlEnum("type", ["percent", "fixed"]).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inventoryMovements = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  variantId: int("variantId"),
  quantityBefore: int("quantityBefore").notNull(),
  quantityAfter: int("quantityAfter").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  performedByUserId: int("performedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Cấu hình kho Sapo làm nguồn dữ liệu gốc cho hàng vật lý. */
export const sapoSyncSettings = mysqlTable("sapo_sync_settings", {
  id: int("id").autoincrement().primaryKey(),
  locationId: varchar("locationId", { length: 64 }),
  locationName: varchar("locationName", { length: 255 }),
  syncEnabled: boolean("syncEnabled").default(false).notNull(),
  lastInboundSyncedAt: timestamp("lastInboundSyncedAt"),
  lastOutboundSyncedAt: timestamp("lastOutboundSyncedAt"),
  scheduleTaskUid: varchar("scheduleTaskUid", { length: 65 }),
  lastError: text("lastError"),
  updatedByUserId: int("updatedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sapoVariantMappings = mysqlTable("sapo_variant_mappings", {
  id: int("id").autoincrement().primaryKey(),
  localVariantId: int("localVariantId").notNull(),
  localSku: varchar("localSku", { length: 128 }).notNull(),
  sapoProductId: varchar("sapoProductId", { length: 64 }).notNull(),
  sapoVariantId: varchar("sapoVariantId", { length: 64 }).notNull(),
  sapoInventoryItemId: varchar("sapoInventoryItemId", { length: 64 }).notNull(),
  sapoLocationId: varchar("sapoLocationId", { length: 64 }).notNull(),
  sapoInventoryLevelId: varchar("sapoInventoryLevelId", { length: 64 }),
  lastKnownAvailable: int("lastKnownAvailable"),
  lastSapoUpdatedAt: timestamp("lastSapoUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sapoSyncEvents = mysqlTable("sapo_sync_events", {
  id: int("id").autoincrement().primaryKey(),
  eventKey: varchar("eventKey", { length: 180 }).notNull().unique(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  eventType: mysqlEnum("eventType", ["inventory_import", "manual_adjust", "order_reserve", "order_release"]).notNull(),
  status: mysqlEnum("status", ["pending", "succeeded", "failed"]).default("pending").notNull(),
  orderId: int("orderId"),
  mappingId: int("mappingId"),
  localVariantId: int("localVariantId"),
  quantityBefore: int("quantityBefore"),
  quantityAfter: int("quantityAfter"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 128 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const visitorEvents = mysqlTable("visitor_events", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 128 }).notNull(),
  path: varchar("path", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  iconKey: varchar("iconKey", { length: 64 }).default("Package").notNull(),
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
  weightGrams: int("weightGrams").default(0).notNull(), // Khối lượng mặc định để tính phí SPX
  purchaseLayout: mysqlEnum("purchaseLayout", ["classic", "marketplace"]).default("classic").notNull(), // Bố cục mua hàng riêng cho sản phẩm vật lý
  specs: text("specs"), // Thông tin chi tiết (chất liệu, định dạng, kích thước...)
  featured: boolean("featured").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  size: varchar("size", { length: 64 }),
  color: varchar("color", { length: 64 }),
  attributes: text("attributes"),
  sku: varchar("sku", { length: 128 }),
  image: text("image"),
  priceAdjustment: decimal("priceAdjustment", { precision: 12, scale: 2 }).default("0").notNull(),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }).default("0").notNull(), // Giá vốn một đơn vị của SKU
  stock: int("stock").default(0).notNull(),
  weightGrams: int("weightGrams"), // Ghi đè khối lượng sản phẩm nếu SKU khác nhau
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

/** Giá sỉ áp dụng cho mỗi đơn vị của cùng một sản phẩm khi đạt mốc số lượng. */
export const productWholesaleTiers = mysqlTable("product_wholesale_tiers", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  minQuantity: int("minQuantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductWholesaleTier = typeof productWholesaleTiers.$inferSelect;
export type InsertProductWholesaleTier = typeof productWholesaleTiers.$inferInsert;

export const productOptionGroups = mysqlTable("product_option_groups", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  values: text("values").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductOptionGroup = typeof productOptionGroups.$inferSelect;
export type InsertProductOptionGroup = typeof productOptionGroups.$inferInsert;

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  variantId: int("variantId"),
  quantity: int("quantity").default(1).notNull(),
  fulfillmentMode: mysqlEnum("fulfillmentMode", ["in_stock", "preorder"]).default("in_stock").notNull(),
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
  discountCode: varchar("discountCode", { length: 64 }),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  paymentConfirmedAt: timestamp("paymentConfirmedAt"),
  shippingName: varchar("shippingName", { length: 255 }),
  shippingPhone: varchar("shippingPhone", { length: 64 }),
  shippingAddress: text("shippingAddress"),
  shippingNote: text("shippingNote"),
  shippingMethod: varchar("shippingMethod", { length: 64 }),
  shippingFee: decimal("shippingFee", { precision: 12, scale: 2 }).default("0").notNull(),
  shippingWeightGrams: int("shippingWeightGrams").default(0).notNull(),
  hasPhysicalItems: boolean("hasPhysicalItems").default(false).notNull(),
  hasPreorderItems: boolean("hasPreorderItems").default(false).notNull(),
  preorderDiscountAmount: decimal("preorderDiscountAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  preorderEstimatedDays: varchar("preorderEstimatedDays", { length: 32 }),
  trackingStage: mysqlEnum("trackingStage", ["ordered", "central_warehouse", "ready_hanoi", "tracking"]).default("ordered").notNull(),
  trackingUrl: text("trackingUrl"),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  variantId: int("variantId"),
  variantLabel: varchar("variantLabel", { length: 255 }),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }).default("0").notNull(), // Snapshot giá vốn tại thời điểm tạo đơn
  fulfillmentMode: mysqlEnum("fulfillmentMode", ["in_stock", "preorder"]).default("in_stock").notNull(),
  attributes: varchar("attributes", { length: 255 }),
  weightGrams: int("weightGrams").default(0).notNull(),
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

/** Đánh giá thật của khách hàng; không seed hoặc hiển thị nội dung giả. */
export const productReviews = mysqlTable("product_reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 128 }).notNull(),
  rating: int("rating").notNull(),
  body: text("body").notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = typeof productReviews.$inferInsert;


/** Yêu cầu rút số dư ví; tiền được khóa khi chờ duyệt và chỉ owner xác nhận chi trả. */
export const walletWithdrawals = mysqlTable("wallet_withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 12, scale: 2 }).default("0").notNull(),
  netAmount: decimal("netAmount", { precision: 12, scale: 2 }).notNull(),
  bankCode: varchar("bankCode", { length: 32 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 64 }).notNull(),
  accountHolder: varchar("accountHolder", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "paid", "rejected", "cancelled"]).default("pending").notNull(),
  note: varchar("note", { length: 500 }),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WalletWithdrawal = typeof walletWithdrawals.$inferSelect;
export type InsertWalletWithdrawal = typeof walletWithdrawals.$inferInsert;
