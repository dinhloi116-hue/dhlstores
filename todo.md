# Project TODO - DHL Stores

- [x] Khởi tạo dự án và cấu trúc cơ bản
- [x] Tải lên logo thương hiệu DHL Stores
- [x] Thiết kế và tạo schema cơ sở dữ liệu (`drizzle/schema.ts` cho products, categories, cartItems, orders, orderItems)
- [x] Tạo migration và áp dụng SQL
- [x] Viết query helpers trong `server/db.ts` và seed dữ liệu mẫu (Áo bóng đá, file in 4K, font số độc quyền)
- [x] Xây dựng tRPC router (`server/routers.ts`) quản lý sản phẩm, giỏ hàng, đơn hàng, tải file kỹ thuật số
- [x] Xây dựng giao diện Trang chủ cao cấp với Hero banner logo DHL Stores, danh mục nổi bật và sản phẩm tiêu biểu
- [x] Xây dựng Trang danh sách sản phẩm với bộ lọc thông minh (Loại: Số / Vật lý, Danh mục, Khoảng giá, Sắp xếp)
- [x] Xây dựng Trang chi tiết sản phẩm (chọn size/màu cho áo bóng đá, tải thử / thông tin tệp cho sản phẩm số)
- [x] Xây dựng Trang giỏ hàng và thanh toán (kiểm tra điều kiện: nếu có sản phẩm vật lý yêu cầu nhập địa chỉ giao hàng; thanh toán giả lập thành công)
- [x] Xây dựng Trang Tài khoản cá nhân & Lịch sử đơn hàng (tải xuống file kỹ thuật số ngay lập tức sau khi đơn hàng thanh toán thành công)
- [x] Xây dựng Trang Quản trị Admin (quản lý đơn hàng, cập nhật trạng thái đơn: Chờ thanh toán, Đang chuẩn bị, Đang giao, Đã giao, Đã hủy)
- [x] Viết kiểm thử Vitest cho các luồng nghiệp vụ chính và chạy xác thực (Passed)
- [x] Xây dựng bộ từ điển song ngữ Việt - Anh (`client/src/lib/i18n.ts`)
- [x] Tích hợp logic tự động phát hiện ngôn ngữ theo vị trí (mặc định tiếng Việt tại VN, tiếng Anh cho quốc tế) kèm nút chuyển đổi ngôn ngữ linh hoạt trên Header
- [x] Tối ưu hóa giao diện storefront thành dạng siêu gọn, mua hàng cực nhanh (1-click buy, hiển thị trực quan, nút CTA nổi bật)
- [x] Cập nhật toàn bộ các trang (Trang chủ, Danh sách, Giỏ hàng, Thanh toán, Tài khoản, Admin) hỗ trợ song ngữ hoàn hảo
- [x] Kiểm thử chuyển đổi ngôn ngữ và chạy lại Vitest
