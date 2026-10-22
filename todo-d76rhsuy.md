
## Tab danh mục trên hero xanh — 2026-10-22
- [x] Đưa toàn bộ tab danh mục lên nền xanh của hero trang chủ.
- [x] Tăng kích thước tab, thêm icon minh họa, giữ vuốt ngang trên mobile.
- [x] Kiểm tra responsive, test/build, checkpoint và commit/push main.

## Preview nhanh ngay trang chủ — 2026-10-22
- [x] Thêm nút Xem nhanh cho thẻ sản phẩm vật lý và tài nguyên số.
- [x] Mở Dialog có ảnh minh họa, mô tả, giá, tồn kho và link chi tiết.
- [x] Kiểm tra responsive, full regression, checkpoint và commit/push main.

## Thanh danh mục homepage theo mẫu dải ngang — 2026-10-22
- [x] Hiển thị đầy đủ nhóm danh mục bán chạy theo thứ tự storefront, không phụ thuộc việc API trả thiếu category.
- [x] Giữ đúng bố cục nền xanh: ô đang chọn màu trắng, icon, nhãn tự xuống dòng tối đa hai dòng và không bị cắt trên desktop/mobile.
- [x] Liên kết đúng category thật nếu có, fallback về tìm kiếm theo danh mục; test responsive, checkpoint và commit/push main.

## Lời nhắn cho shop trên mọi sản phẩm — 2026-10-22
- [x] Thêm CTA “Để lại lời nhắn cho shop” trên ProductDetail của cả physical/digital, song ngữ VI/EN.
- [x] Mở form nhắn tin nội bộ với product context (tên/slug), không chuyển sang Zalo; khách chưa đăng nhập được yêu cầu đăng nhập rõ ràng.
- [x] Gửi qua procedure chat hiện có, trạng thái loading/thành công/lỗi và reset form an toàn.
- [x] Thêm hồi quy quyền/auth và UI, kiểm tra desktop/mobile, test/build, checkpoint và commit/push main.

## Đăng sản phẩm digital Barcelona UEFA Home 2026/27 — 2026-10-22
- [x] Đọc nguồn Google Drive, lấy SEO VIE/EN, ZIP tải xuống và toàn bộ ảnh preview.
- [x] Đăng sản phẩm với giá Việt Nam 50.000đ, giá EN 4 USD, link tải Drive, 8 ảnh gallery và link YouTube để trống.
- [x] Bổ sung form quản trị digital: tên/mô tả/thông số VIE + EN, giá VND/USD, gallery, upload ảnh, link tải và YouTube.
- [x] Thêm trường priceUsd vào schema/database, hồi quy 217 passed/2 skipped, TypeScript/build và kiểm tra storefront VI/EN đạt.

## Sửa ảnh vỡ listing Barcelona trên mobile — 2026-10-22
- [x] Xác định nguyên nhân: các URL `/manus-storage/...` của 8 ảnh trả HTTP 502.
- [x] Tải lại toàn bộ 8 ảnh lên CDN public và cập nhật `image/gallery` sản phẩm trong database.
- [x] Xác minh CDN trả HTTP 200 và browser tải ảnh cover thành công với naturalWidth/naturalHeight thực tế.

## Quản trị ảnh đại diện và nhóm sản phẩm theo danh mục — 2026-10-22
- [x] Bổ sung khu vực đổi ảnh đại diện rõ ràng trong form sửa sản phẩm, hỗ trợ upload ảnh và dán URL.
- [x] Thêm bộ lọc danh mục trong danh sách sản phẩm quản trị, hiển thị tên danh mục trên từng dòng.
- [x] Viết hồi quy, kiểm tra admin responsive, full test/build, checkpoint và commit/push main.

## Chọn ảnh trong gallery làm ảnh đại diện — 2026-10-22
- [x] Hiển thị các ảnh gallery trong form sửa sản phẩm dưới dạng nút chọn.
- [x] Cho phép chọn một ảnh gallery làm ảnh đại diện, giữ nguyên gallery và cập nhật trường image khi lưu.
- [ ] Thêm hồi quy, kiểm thử build/browser, checkpoint và tự động đồng bộ Git.
