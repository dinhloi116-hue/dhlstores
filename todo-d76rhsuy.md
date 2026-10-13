
## Kiểm tra gallery và tự lưu ảnh Drive khi nhập Excel — 2026-10-07
- [x] Kiểm tra gallery sản phẩm sau nhập Excel bằng hồi quy hiển thị thumbnail và xác minh responsive desktop/mobile.
- [x] Tự tải ảnh Google Drive hợp lệ vào storage website khi xác nhận nhập Excel, giới hạn 10 MB/ảnh và bỏ qua link thư mục; nếu môi trường thiếu cấu hình R2, import giữ nguồn ảnh và báo cảnh báo thay vì làm hỏng sản phẩm.
- [x] Cảnh báo rõ trong preview Excel các sản phẩm thiếu ảnh hoặc chỉ có ảnh placeholder.

## Đổi chủ đề DHL Stores sang xanh dương theo logo — 2026-10-10
- [x] Chuyển màu thương hiệu chính từ cam/vàng sang xanh dương/xanh cyan lấy cảm hứng từ logo DHL SPORTS.
- [x] Đồng bộ CTA, header, giỏ hàng nổi, trạng thái tương tác và các điểm nhấn storefront/admin.
- [x] Bổ sung hồi quy màu theme; chạy test, TypeScript, build và kiểm tra responsive desktop/mobile.

## Đăng bán Copa América 2024 digital song ngữ — 2026-10-10
- [x] Tạo sản phẩm digital với tên, mô tả, thông số và lưu ý quyền sử dụng đầy đủ VI/EN.
- [x] Gắn giá cố định 50.000đ / 4 USD, ảnh gallery công khai và bundle tải sau thanh toán.
- [x] Kiểm tra trang storefront desktop, full regression 191 passed / 2 skipped, TypeScript và build production; sẵn sàng đồng bộ GitHub main.

## Đồng bộ giao diện web/mobile theo mẫu marketplace — 2026-10-13
- [x] Chuyển catalog sang lưới 2 cột mobile, ảnh vuông lớn, tên/giá dễ đọc và card gọn.
- [x] Tái bố cục ProductDetail: breadcrumb, gallery lớn + thumbnail ngang, giá/giảm giá/trạng thái và CTA rõ ràng.
- [x] Giữ đầy đủ SKU, tồn kho, Order 7 ngày, review và sản phẩm liên quan; không làm mất luồng mua hiện tại.
- [x] Bổ sung hồi quy, chạy test/build và chụp kiểm tra desktop/mobile.
