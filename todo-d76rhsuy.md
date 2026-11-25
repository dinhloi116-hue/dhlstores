
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
- [x] Thêm test tự động cho việc chọn ảnh khác làm cover, giữ nguyên gallery, loại ảnh placeholder/trùng; test 4/4, TypeScript và production build đạt.
- [x] Đồng bộ thay đổi test lên GitHub main.
- [ ] Xác minh click trên sản phẩm thật trong admin browser sau khi owner đăng nhập; phiên hiện tại chỉ thấy màn hình bảo vệ quản trị.

## Tạo danh mục mới trong quản trị — 2026-11-19
- [x] Thêm nút “Tạo danh mục mới” ngay cạnh bộ chọn danh mục sản phẩm; nút chuyển thẳng sang tab Catalog · Danh mục.
- [x] Bổ sung trường tên VIE/EN, hiển thị song ngữ trong danh sách và giữ slug/icon/loại/hiển thị công khai.
- [x] Bảo vệ owner-only; test mục tiêu 16/16, full regression đạt, TypeScript, production build và diff check đạt.
- [ ] Xác minh thao tác click/lưu trên browser bằng phiên owner đang đăng nhập.

## Icon danh mục áo dài tay — 2026-11-19
- [x] Thêm lựa chọn `Áo dài tay` với key `LongSleeveShirt` vào thư viện icon danh mục; dùng được khi tạo/sửa danh mục.
- [x] Chạy test 6/6, TypeScript, production build, diff check, checkpoint và đồng bộ GitHub main.

## Đăng sản phẩm Scotland Retro Order-only — 2026-11-24
- [x] Đọc SEO VIE từ Google Drive, bổ sung nội dung EN trung thực, bảng size XS–2XL và danh sách 10 mẫu.
- [x] Upload 10 ảnh mẫu và 1 ảnh bảng size vào storage/CDN; tạo sản phẩm thật với gallery đủ 11 ảnh.
- [x] Bổ sung `products.orderOnly`, migration database, checkbox quản trị và enforcement server/UI chỉ nhận Order.
- [x] Tạo option groups `Mẫu` 01–10 và `Size` XS–2XL, đủ 60 SKU, tồn kho 0, giá 368.000đ/áo.
- [x] Seed database thật: product ID `600001`, slug `ao-bong-da-scotland-retro-ngan-tay-10-mau`, category `Quần Áo Bóng Đá`.
- [x] Regression 227 passed/2 skipped, TypeScript, production build và diff check đạt; guest API trả đúng dữ liệu song ngữ.
- [ ] Xác minh thao tác đặt Order hoàn chỉnh bằng phiên owner/customer đăng nhập; phiên browser hiện tại chỉ có guest session.

## Danh mục Sỉ cho khách nhập hàng — 2026-11-25
- [x] Thêm danh mục vật lý `Sỉ` / `Wholesale` để dùng khi đăng sản phẩm bán sỉ.
- [x] Seed và tạo danh mục thật trong database theo cơ chế idempotent, không trùng slug.
- [x] Test category, TypeScript, production build, diff check và kiểm tra storefront hiển thị bộ lọc Wholesale.

## Tách luồng bán lẻ và Wholesale — 2026-11-25
- [x] Ẩn sản phẩm thuộc danh mục Sỉ khỏi catalog bán lẻ chính và homepage bán lẻ.
- [x] Tạo route `/wholesale` là trang phụ trong website, có badge/giá đăng nhập và liên kết rõ ràng từ navigation.
- [x] Kiểm tra guest catalog, test hồi quy, TypeScript, build và diff check; không đánh dấu owner/customer browser nếu chưa có session thật.
