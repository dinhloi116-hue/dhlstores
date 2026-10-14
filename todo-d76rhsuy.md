
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

## Tinh giản phiên bản web/desktop — 2026-10-15
- [x] Rút menu desktop còn các lối chính: Trang chủ, Hàng thể thao, Tài nguyên số, Công cụ.
- [x] Làm header, hero và thanh lọc web thoáng hơn; giữ tìm kiếm, giỏ hàng và tài khoản dễ thấy.
- [x] Bổ sung hồi quy cho menu đơn giản; full regression đạt 193 passed, 2 skipped, TypeScript/build đạt và screenshot desktop/mobile đã kiểm tra.

## Đăng áo Argentina Messi Last Dance 2024 Player — 2026-10-15
- [x] Đọc thư mục Drive, nội dung VI/EN, workbook 15 SKU và 12 ảnh preview/chi tiết.
- [x] Tạo sản phẩm physical song ngữ trong danh mục Quần Áo Bóng Đá, bố cục marketplace, slug `ao-bong-da-argentina-messi-last-dance-2024-player`.
- [x] Lưu 15 SKU theo 3 phiên bản: Áo trơn 329.000đ, in Name M10 399.000đ, M10 + Copa 2024 449.000đ; tồn kho giữ 0 vì workbook không có số lượng tồn.
- [x] Xác minh storefront desktop bằng browser DOM: tên EN, gallery 12 ảnh và 15 ô số lượng SKU đã render; xác minh mobile viewport 390px bằng Chromium headless sau 12 giây: tên VI, gallery 12 ảnh, 15 SKU và không còn trạng thái loading; tồn kho giữ 0 vì nguồn không cung cấp quantity.

## SEO động và video YouTube trong trang sản phẩm — 2026-10-15
- [x] Bổ sung metadata SEO động theo sản phẩm, canonical, Open Graph/Twitter và JSON-LD Product/VideoObject.
- [x] Bổ sung robots.txt, sitemap.xml và metadata SEO nền tảng màu xanh DHL Stores.
- [x] Lưu URL YouTube sản phẩm Argentina từ yt.txt và hiển thị trình phát YouTube responsive ngay trên trang sản phẩm.
- [x] Cho phép owner nhập/chỉnh URL YouTube trong biểu mẫu quản trị sản phẩm.
- [x] Chạy test 195 passed/2 skipped, TypeScript, production build và kiểm tra DOM desktop/mobile; đã xác minh iframe, title, canonical, JSON-LD.

## Làm rõ bảng size, song ngữ và video trên ProductDetail — 2026-10-15
- [x] Đưa bảng số đo size S–XXL lên vị trí dễ thấy trước vùng SKU, có chọn size nhanh.
- [x] Thêm công tắc VI/EN ngay cạnh tiêu đề sản phẩm và xác minh bằng browser: title, mô tả, tiêu đề thông số và nội dung specs đều đổi VI/EN; khôi phục VI thành công.
- [x] Cải thiện SEO hiển thị: title, description, Product JSON-LD có ngôn ngữ/size/phiên bản rõ ràng.
- [x] Thu gọn khung YouTube Shorts để không lấn át CTA, đánh giá và sản phẩm liên quan.
- [x] Chạy 195 test passed/2 skipped, TypeScript, build, screenshot responsive và DOM browser; sẵn sàng tự động commit/push main.

## Sửa tràn ngang bảng SKU trên màn hình hẹp — 2026-10-15
- [x] Điều chỉnh grid/cột SKU: mobile dùng 2 cột ảnh/phiên bản, vùng số lượng & hành động chiếm cả chiều ngang; desktop giữ đủ 4 cột.
- [x] Đưa các nút hành động xuống dòng hợp lý trên mobile, giữ preview ảnh không che nội dung.
- [x] Hồi quy SKU responsive 33/33 passed, TypeScript và production build đạt; screenshot tool vẫn có lúc chờ query dữ liệu nên cần kiểm tra lại trên thiết bị thật nếu cần.

## Cải tổ ProductDetail theo bố cục marketplace kiểu Shopee — 2026-10-15
- [x] Gộp cột SKU vào thông tin phiên bản, chỉ giữ 3 vùng: ảnh / phiên bản + SKU / kho + thao tác.
- [x] Làm vùng thao tác đủ rộng, không cắt nút nhận thông báo, tăng giảm số lượng và mua ngay.
- [x] Giữ bố cục dễ đọc trên desktop/mobile: desktop 3 cột, mobile 2 hàng; không dùng bảng ngang ép cột.
- [x] Full regression 195 passed, 2 skipped; TypeScript, build và diff check đạt. Screenshot tool vẫn có lúc treo loading do query runtime.
