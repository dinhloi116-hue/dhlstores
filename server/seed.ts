import { getDb } from "./db";
import { categories, products } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("[Seed] Database not available");
    process.exit(1);
  }

  console.log("[Seed] Starting database migration & seeding for DHL Stores...");

  // 1. Create tables if not exist
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`slug\` varchar(128) NOT NULL,
        \`description\` text,
        \`type\` enum('physical','digital','all') NOT NULL DEFAULT 'all',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`categories_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`categories_slug_unique\` UNIQUE(\`slug\`)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`slug\` varchar(255) NOT NULL,
        \`description\` text,
        \`price\` decimal(12,2) NOT NULL,
        \`type\` enum('physical','digital') NOT NULL,
        \`categoryId\` int NOT NULL,
        \`image\` text NOT NULL,
        \`fileUrl\` text,
        \`fileSize\` varchar(64),
        \`stock\` int NOT NULL DEFAULT 100,
        \`specs\` text,
        \`featured\` boolean NOT NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`products_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`products_slug_unique\` UNIQUE(\`slug\`)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`cart_items\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`productId\` int NOT NULL,
        \`quantity\` int NOT NULL DEFAULT 1,
        \`attributes\` varchar(255),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`cart_items_id\` PRIMARY KEY(\`id\`)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`totalAmount\` decimal(12,2) NOT NULL,
        \`status\` enum('pending','processing','shipping','completed','cancelled') NOT NULL DEFAULT 'pending',
        \`paymentStatus\` enum('paymentStatus','pending','paid') NOT NULL DEFAULT 'pending',
        \`shippingName\` varchar(255),
        \`shippingPhone\` varchar(64),
        \`shippingAddress\` text,
        \`shippingNote\` text,
        \`hasPhysicalItems\` boolean NOT NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`orders_id\` PRIMARY KEY(\`id\`)
      );
    `).catch(() => {
      // fallback if paymentStatus enum syntax differs
    });

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`order_items\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`orderId\` int NOT NULL,
        \`productId\` int NOT NULL,
        \`quantity\` int NOT NULL,
        \`price\` decimal(12,2) NOT NULL,
        \`attributes\` varchar(255),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`order_items_id\` PRIMARY KEY(\`id\`)
      );
    `);

    console.log("[Seed] Tables verified / created successfully.");
  } catch (err) {
    console.warn("[Seed] Table creation notice:", err);
  }

  // 2. Seed Categories
  const catData = [
    { name: "Áo Bóng Đá", slug: "ao-bong-da", description: "Áo đấu chính hãng, chất liệu cao cấp thoáng khí, in ấn sắc nét.", type: "physical" as const },
    { name: "File In Hình Ảnh", slug: "file-in-hinh-anh", description: "Artwork, poster bóng đá độ phân giải cao 4K sẵn sàng in ấn.", type: "digital" as const },
    { name: "File Font Số & Chữ", slug: "file-font-so", description: "Font số áo đấu độc quyền, chuẩn typography thể thao chuyên nghiệp.", type: "digital" as const },
  ];

  for (const c of catData) {
    await db.insert(categories).values(c).onDuplicateKeyUpdate({ set: { name: c.name } }).catch(() => {});
  }

  // Get category IDs
  const allCats = await db.select().from(categories);
  const catMap = new Map(allCats.map(c => [c.slug, c.id]));

  const physicalCatId = catMap.get("ao-bong-da") || 1;
  const imageCatId = catMap.get("file-in-hinh-anh") || 2;
  const fontCatId = catMap.get("file-font-so") || 3;

  // Logo URL for fallback/default banner
  const logoUrl = "/manus-storage/logodhlstores_c8e433ed.png";

  const productData = [
    {
      name: "Áo Đấu CLB Hoàng Gia Đỏ 2026/27",
      slug: "ao-dau-clb-hoang-gia-do-2026",
      description: "Mẫu áo đấu sân nhà mới nhất của CLB Hoàng Gia Đỏ mùa giải 2026/27. Chất liệu thun mè cao cấp thấm hút mồ hôi cực tốt, logo thêu nổi tinh tế.",
      price: "450000",
      type: "physical" as const,
      categoryId: physicalCatId,
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
      stock: 120,
      specs: "Chất liệu: Polyester 100% thun lạnh cao cấp. Size: S, M, L, XL, XXL. Công nghệ thấm hút Dry-Fit.",
      featured: true,
    },
    {
      name: "Áo Đấu Đội Tuyển Quốc Gia Xanh Hoàng Lịch",
      slug: "ao-dau-dtqg-xanh-hoang-lich-2026",
      description: "Thiết kế đầy kiêu hãnh với sắc xanh ngọc lục bảo kết hợp hoạ tiết trống đồng cách điệu, biểu trưng cho tinh thần chiến đấu đỉnh cao.",
      price: "480000",
      type: "physical" as const,
      categoryId: physicalCatId,
      image: "https://images.unsplash.com/photo-1518063319789-7217e6706704?auto=format&fit=crop&w=800&q=80",
      stock: 85,
      specs: "Chất liệu: Recycled Polyester cao cấp thân thiện môi trường. Size: M, L, XL.",
      featured: true,
    },
    {
      name: "Áo Đấu Sân Khách Đen Hổ Phách 2026",
      slug: "ao-dau-san-khach-den-ho-phach-2026",
      description: "Sự pha trộn huyền bí giữa tông đen nhám obsidian và các đường nét phản quang màu hổ phách cực kỳ cá tính và hiện đại.",
      price: "450000",
      type: "physical" as const,
      categoryId: physicalCatId,
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
      stock: 60,
      specs: "Chất liệu: Vải lưới chuyên dụng đá bóng. Size: S, M, L, XL.",
      featured: false,
    },
    {
      name: "Bộ Sưu Tập Poster Bóng Đá 4K - Vector & High-Res",
      slug: "bo-suu-tap-poster-bong-da-4k",
      description: "Trọn bộ 50+ file thiết kế vector và ảnh 4K cực nét các huyền thoại bóng đá thế giới. Dành riêng cho thiết kế banner, poster, ốp lưng hoặc in ấn trang trí.",
      price: "150000",
      type: "digital" as const,
      categoryId: imageCatId,
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
      fileUrl: logoUrl, // link tải mẫu
      fileSize: "185 MB (ZIP - AI, PSD, PNG 4K)",
      specs: "Định dạng: AI, PSD, PNG 4K (3840x2160 pixels). Cấp quyền thương mại trọn đời.",
      featured: true,
    },
    {
      name: "Artwork Đồ Họa Cầu Thủ Huyền Thoại - PSD Layered",
      slug: "artwork-do-hoa-cau-thu-huyen-thoai-psd",
      description: "File Photoshop tách lớp chi tiết từng layer hiệu ứng ánh sáng, khói lửa và texture đỉnh cao để làm quà tặng hoặc tranh canvas.",
      price: "200000",
      type: "digital" as const,
      categoryId: imageCatId,
      image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
      fileUrl: logoUrl,
      fileSize: "320 MB (.PSD Full Layers)",
      specs: "Định dạng: .PSD (Adobe Photoshop CC). Độ phân giải 300 DPI sẵn sàng in khổ lớn.",
      featured: false,
    },
    {
      name: "Font Số Áo Đấu Thể Thao Pro 2026 - OTF/TTF",
      slug: "font-so-ao-dau-the-thao-pro-2026",
      description: "Bộ font chữ và số áo bóng đá độc quyền được thiết kế chuẩn typography thể thao quốc tế. Tương thích hoàn hảo với Illustrator, Corel, Photoshop.",
      price: "250000",
      type: "digital" as const,
      categoryId: fontCatId,
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
      fileUrl: logoUrl,
      fileSize: "12 MB (.OTF, .TTF, .WOFF2)",
      specs: "Định dạng: OTF, TTF, WOFF2. Hỗ trợ đầy đủ ký tự tiếng Việt và dấu số.",
      featured: true,
    },
    {
      name: "Font Tên & Số Áo Vintage Classic - OTF/TTF",
      slug: "font-ten-va-so-ao-vintage-classic",
      description: "Phong cách retro hoài cổ gợi nhớ các huyền thoại thập niên 80-90. Cực kỳ phù hợp cho các mẫu áo đấu phong cách cổ điển.",
      price: "180000",
      type: "digital" as const,
      categoryId: fontCatId,
      image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80",
      fileUrl: logoUrl,
      fileSize: "8.5 MB (.OTF, .TTF)",
      specs: "Định dạng: OTF, TTF. Phù hợp cho thiết kế áo đấu retro, poster câu lạc bộ.",
      featured: false,
    }
  ];

  for (const p of productData) {
    await db.insert(products).values(p).onDuplicateKeyUpdate({ set: { price: p.price } }).catch(() => {});
  }

  console.log("[Seed] Seeding completed successfully for DHL Stores!");
}

main().catch(err => {
  console.error("[Seed] Error during seeding:", err);
  process.exit(1);
});
