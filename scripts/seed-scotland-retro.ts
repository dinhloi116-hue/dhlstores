import { createProduct, createProductVariant, getProductBySlug, replaceProductOptionGroups } from "../server/db";

const slug = "ao-bong-da-scotland-retro-ngan-tay-10-mau";
const images = [
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_01_-_Xanh_Navy_Caro_Tartan_-_M_t_tr_c_e49077bb.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_02_-_Xanh_Ho_ng_Gia_S_c_Ngang_-_M_t_tr_c_3e13283a.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_03_-_Xanh_Navy_S_c_D_c_Tr_ng_-_M_t_tr_c_656ee610.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_04_-_Xanh_Navy_H_a_Ti_t_H_nh_H_c_-_M_t_tr_c_3fdf8c88.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_05_-_Tr_ng_T_m_Navy_Ph_i_Ch_o_-_M_t_tr_c_3a448207.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_06_-_V_ng_Ph_i_en_-_M_t_tr_c_9ff9be9e.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_07_-_Tr_ng_S_c_V_ng_en_-_M_t_tr_c_913c3917.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_08_-_H_ng_Xanh_Ng_c_H_a_Ti_t_-_M_t_tr_c_392cd41a.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_09_-_H_ng_V_ng_Navy_H_a_Ti_t_-_M_t_tr_c_295eeb76.jpg",
  "/manus-storage/Scotland_Retro_-_BST_10_M_u_-_10_-_Xanh_Navy_S_c_Ngang_Mexico_86_-_M_t_tr_c_03981fb9.jpg",
  "/manus-storage/Scotland_Retro_-_B_NG_SIZE_-_XS-2XL_-_Theo_nh_cung_c_p_381df587.jpg",
];
const modelNames = [
  "Xanh navy caro tartan",
  "Xanh hoàng gia sọc ngang",
  "Xanh navy sọc dọc trắng",
  "Xanh navy họa tiết hình học",
  "Trắng tím navy phối chéo",
  "Vàng phối đen đỏ",
  "Trắng sọc vàng đen",
  "Hồng xanh ngọc họa tiết",
  "Hồng vàng navy họa tiết",
  "Xanh navy sọc ngang Mexico 86",
];
const modelNamesEn = [
  "Navy blue tartan check",
  "Royal blue horizontal stripes",
  "Navy blue with white vertical stripes",
  "Navy blue geometric pattern",
  "White, purple and navy diagonal panels",
  "Yellow with black and red accents",
  "White with yellow and black stripes",
  "Pink and teal pattern",
  "Pink, yellow and navy pattern",
  "Navy blue Mexico 86 horizontal stripes",
];
const sizes = ["XS", "S", "M", "L", "XL", "2XL"];
const sizeRows = [
  ["XS", "68 cm", "48 cm", "158–165 cm", "45–50 kg"],
  ["S", "70 cm", "50 cm", "165–170 cm", "50–60 kg"],
  ["M", "72.5 cm", "52 cm", "170–175 cm", "60–70 kg"],
  ["L", "75 cm", "54 cm", "175–180 cm", "70–80 kg"],
  ["XL", "78 cm", "56 cm", "180–185 cm", "80–90 kg"],
  ["2XL", "81 cm", "59 cm", "From 185 cm", "90–100 kg"],
];

const description = `Khám phá bộ sưu tập 10 mẫu áo bóng đá Scotland Retro ngắn tay tại ĐHL SPORTS. Các thiết kế mang hơi hướng bóng đá thập niên 1980–1990 với xanh navy cổ điển, họa tiết tartan, sọc ngang, sọc dọc và các phối màu vintage.

Mỗi mẫu có ảnh mặt trước riêng để bạn dễ lựa chọn. Đây là áo phong cách retro tái hiện, không giới thiệu là áo đấu gốc từng được cầu thủ sử dụng.

Sản phẩm chỉ nhận Order theo mẫu và kích cỡ. Shop sẽ xác nhận tình trạng, thời gian nhận hàng và phí vận chuyển trước khi chốt đơn.`;
const descriptionEn = `Explore the Scotland Retro short-sleeve football shirt collection at DHL Stores. The ten designs draw on 1980s–1990s football styling, with classic navy blue, tartan patterns, horizontal and vertical stripes, and distinctive vintage colour combinations.

Each design has its own front-view image so you can choose the preferred pattern and colour. These are retro-style reproductions and are not presented as original historical match-worn jerseys.

This product is available by order only. The shop will confirm availability, estimated arrival timing and shipping fees before the order is finalised.`;
const specs = `BỘ SƯU TẬP 10 MẪU
01 – ${modelNames[0]}
02 – ${modelNames[1]}
03 – ${modelNames[2]}
04 – ${modelNames[3]}
05 – ${modelNames[4]}
06 – ${modelNames[5]}
07 – ${modelNames[6]}
08 – ${modelNames[7]}
09 – ${modelNames[8]}
10 – ${modelNames[9]}

BẢNG SIZE THAM KHẢO
Size | Dài áo | Ngang ngực | Chiều cao | Cân nặng
${sizeRows.map(row => row.join(" | ")).join("\n")}
Ngang ngực là số đo một mặt áo khi trải phẳng, không phải vòng ngực cơ thể. Bảng chỉ mang tính tham khảo; nên đối chiếu cả chiều cao và cân nặng.

CÁCH ĐẶT HÀNG
1. Chọn mã mẫu 01–10 theo ảnh mặt trước.
2. Chọn size XS, S, M, L, XL hoặc 2XL.
3. Nhắn ĐHL SPORTS qua Zalo 0963.898.871 để xác nhận mẫu, size, thời gian nhập và phí vận chuyển trước khi chốt đơn.

LƯU Ý: Áo phong cách Scotland Retro tái hiện, không phải áo thi đấu nguyên bản lịch sử. Giá Order: 368.000đ/áo.`;
const specsEn = `10-DESIGN COLLECTION
01 – ${modelNamesEn[0]}
02 – ${modelNamesEn[1]}
03 – ${modelNamesEn[2]}
04 – ${modelNamesEn[3]}
05 – ${modelNamesEn[4]}
06 – ${modelNamesEn[5]}
07 – ${modelNamesEn[6]}
08 – ${modelNamesEn[7]}
09 – ${modelNamesEn[8]}
10 – ${modelNamesEn[9]}

REFERENCE SIZE CHART
Size | Shirt length | Half-chest width | Height | Weight
${sizeRows.map(row => row.join(" | ")).join("\n")}
Half-chest width is measured across one side of the shirt laid flat, not the wearer's chest circumference. This chart is for reference; compare both height and weight.

HOW TO ORDER
1. Choose design 01–10 using the front-view images.
2. Choose XS, S, M, L, XL or 2XL.
3. Message DHL Stores via Zalo +84 963 898 871 to confirm design, size, arrival timing and shipping fee before finalising.

NOTE: Retro-style reproduction, not an original historical match jersey. Order price: VND 368,000 per shirt.`;

const existing = await getProductBySlug(slug);
if (existing) {
  console.log(JSON.stringify({ status: "already_exists", productId: existing.id, slug }, null, 2));
  process.exit(0);
}

const product = await createProduct({
  name: "Áo Bóng Đá Scotland Retro Ngắn Tay – Bộ Sưu Tập 10 Mẫu Cổ Điển",
  nameEn: "Scotland Retro Short-Sleeve Football Shirt – 10 Classic Designs",
  slug,
  description,
  descriptionEn,
  price: "368000",
  categoryId: 30011,
  image: images[0],
  gallery: images,
  stock: 0,
  weightGrams: 300,
  purchaseLayout: "marketplace",
  orderOnly: true,
  specs,
  specsEn,
  featured: true,
  isActive: true,
});
if (!product) throw new Error("Product creation returned no product");
await replaceProductOptionGroups({ productId: product.id, groups: [{ name: "Mẫu", values: modelNames.map((_, index) => String(index + 1).padStart(2, "0")) }, { name: "Size", values: sizes }] });
for (let modelIndex = 0; modelIndex < modelNames.length; modelIndex += 1) {
  for (const size of sizes) {
    await createProductVariant({
      productId: product.id,
      size,
      attributes: `Mẫu: ${String(modelIndex + 1).padStart(2, "0")}`,
      sku: `SCOT-RETRO-${String(modelIndex + 1).padStart(2, "0")}-${size}`,
      image: images[modelIndex],
      priceAdjustment: "0",
      costPrice: "0",
      stock: 0,
      weightGrams: 300,
      isActive: true,
    });
  }
}
console.log(JSON.stringify({ status: "created", productId: product.id, slug, galleryCount: images.length, variantCount: modelNames.length * sizes.length, orderOnly: true }, null, 2));
