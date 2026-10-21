
## Tự phân loại áo Player CLB — 2026-10-22
- [x] Tạo danh mục physical “Áo Player CLB” (id 39180209) và bản English “Club Player Jerseys”.
- [x] Mở rộng quy tắc import: Player + tên quốc gia → Áo Player Đội Tuyển Quốc Gia; Player còn lại → Áo Player CLB.
- [x] Gán lại sản phẩm hiện có phù hợp; database hiện có 1 sản phẩm ở mỗi category Player, catalog browser hiển thị cả hai nút category và ô tìm kiếm vẫn giữ nguyên; helper test 3 passed, full regression 211 passed/2 skipped, TypeScript/build/diff check đạt.
