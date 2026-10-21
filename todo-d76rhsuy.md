
## Mẫu HD VIE/EN và thứ tự Kiểu–Size — 2026-10-21
- [x] Parser nhận workbook có tab dữ liệu và tab `VIE`/`EN`; lưu `nameEn`, `descriptionEn`, `specsEn` vào product để ProductDetail đổi thông tin rõ ràng theo ngôn ngữ.
- [x] Chuẩn hóa thứ tự option group thành `Kiểu: Không in, Có in` rồi `Kích cỡ: S, M, L, XL, XXL`; sort variants theo cùng thứ tự khi import.
- [x] Nhập sản phẩm Việt Nam HD vào category physical: 8 ảnh gallery, 10 SKU, tên/mô tả song ngữ; browser VI xác minh 10 SKU/size và browser EN xác minh title `VIETNAM AWAY 2026 FOOTBALL KIT`, `Style`, `Size`, `lang=en`, giá USD.
- [x] Sắp xếp lại cả sản phẩm Portugal HD cũ và Vietnam HD mới trong database theo `Không in → S…XXL`, `Có in → S…XXL`; full regression 202 passed/2 skipped, TypeScript và production build đạt.
- [ ] Lưu checkpoint mới và commit/push GitHub main.
