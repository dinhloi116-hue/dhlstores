# Lộ trình cải tiến cửa hàng

## Nhận định tổng quát

Cửa hàng hiện đã có nền tảng bán cả tài nguyên số và hàng vật lý, quản trị SKU, thanh toán tách luồng, theo dõi đơn và hộp thư hỗ trợ. Bước tiếp theo nên ưu tiên **giảm do dự của khách trước khi mua**, **rút ngắn thao tác lặp lại cho chủ cửa hàng**, và **tạo bằng chứng vận hành rõ ràng** thay vì thêm nhiều tính năng rời rạc.

| Mức ưu tiên | Hạng mục | Lợi ích chính | Ghi chú triển khai |
|---|---|---|---|
| P0 | Gửi ảnh trong Tin nhắn/Góp ý | Khách gửi mẫu áo, lỗi in hoặc ảnh tham chiếu nhanh hơn | Đã hoàn thành trong phiên bản hiện tại |
| P0 | Bộ kiểm tra trước bán thật | Ngăn giá thử nghiệm, tệp lỗi, tồn kho âm hoặc QR cấu hình thiếu | Nên làm trước khi mở bán rộng rãi |
| P0 | Trạng thái đơn và thông báo chủ động | Giảm câu hỏi “đơn đến đâu rồi?” | Thông báo khi xác nhận tiền, đổi mốc vận chuyển và sắp hết hạn tải |
| P1 | Trang danh mục có bộ lọc sâu | Khách tìm nhanh hơn trong thư viện lớn | Lọc loại tệp, đội/giải, mùa, phần mềm, hàng số/vật lý, khoảng giá |
| P1 | So sánh/đề xuất SKU thông minh | Giảm chọn nhầm phiên bản | Gợi ý SKU còn hàng, ảnh mẫu, sản phẩm liên quan và “đã xem gần đây” |
| P1 | Dashboard vận hành | Chủ cửa hàng nhìn nhanh điểm cần xử lý | Đơn chờ xác nhận, SKU sắp hết, ảnh/tệp thiếu, tin nhắn chưa đọc, doanh thu theo loại hàng |
| P2 | Chương trình khách hàng quay lại | Tăng mua lại | Mã ưu đãi theo hành vi, số dư/điểm, nhắc bộ sưu tập mới; cần dùng có kiểm soát |
| P2 | Nội dung hướng dẫn theo sản phẩm | Giảm nhu cầu hỗ trợ thủ công | FAQ, hướng dẫn chọn SKU, phần mềm tương thích, hướng dẫn ép/in và chính sách đổi trả |
| P2 | Tối ưu hiệu năng và SEO | Tăng khả năng được tìm thấy và tốc độ tải | Ảnh nhiều kích thước, mô tả metadata, schema sản phẩm và phân tải JavaScript |

## Đề xuất giao diện

Trên trang chủ, khu tìm kiếm gợi ý nên được giữ ở vị trí đầu trang như hiện tại. Khi danh mục và số lượng sản phẩm tăng, cần bổ sung **bộ lọc dạng chip** ngay dưới thanh tìm kiếm, ví dụ “Font”, “Nameset”, “Patch”, “Hàng vật lý”, “Có sẵn”, “Order trước”. Trang danh mục nên hiển thị số kết quả, bộ lọc đang áp dụng và lối thoát rõ ràng để khách không bị lạc.

Trang chi tiết sản phẩm hiện phù hợp với sản phẩm có nhiều SKU. Nên tiếp tục giữ ảnh lớn cố định và vùng thao tác riêng, đồng thời bổ sung một khối tóm tắt ngắn: định dạng/tương thích đối với hàng số; thời gian chuẩn bị, hướng dẫn size và chính sách giao với hàng vật lý. Các nội dung này nên lấy từ dữ liệu sản phẩm để quản trị viên thay đổi mà không cần mã nguồn.

## Đề xuất tiện ích cho quản trị

Quản trị Catalog đã có tìm kiếm, lọc trạng thái và thao tác SKU hàng loạt. Hạng mục có giá trị tiếp theo là **hàng đợi cần xử lý**: SKU hết hàng, SKU sắp hết, SKU thiếu ảnh, sản phẩm thiếu mô tả, hàng số thiếu liên kết tải, đơn cần xác nhận thủ công và tin nhắn chưa đọc. Mỗi chỉ báo cần dẫn thẳng tới đúng màn hình chỉnh sửa thay vì chỉ hiển thị số lượng.

Nên bổ sung chức năng sao chép sản phẩm/SKU và lưu mẫu thuộc tính thường dùng, đặc biệt với nameset, patch và áo đấu. Điều này giúp tạo nhiều phiên bản tương tự nhanh hơn, giảm lỗi nhập lại giá, tồn kho và ảnh.

## Đề xuất vận hành và độ tin cậy

Trước khi tăng lượng khách thật, cần có một trang kiểm tra vận hành theo ngày gồm: QR hàng số và hàng vật lý, tồn kho, liên kết tải trong bảy ngày, quyền truy cập file, trạng thái đơn, ảnh sản phẩm, tốc độ trang và hộp thư hỗ trợ. Không nên giữ giá thử nghiệm khi bắt đầu bán thật; cần một cảnh báo trong quản trị cho sản phẩm có giá thấp bất thường hoặc tệp tải chưa cấu hình.

Về liên hệ, nên thống nhất quy trình trả lời: khách gửi ảnh/mẫu → chủ cửa hàng nhận trong Hộp thư → phản hồi xác nhận → cập nhật trạng thái góp ý hoặc đơn hàng. Việc này giúp các yêu cầu thiết kế riêng, lỗi in và tranh chấp đơn có lịch sử rõ ràng.

## Thứ tự triển khai đề xuất

1. **P0 — Bộ kiểm tra trước bán và hàng đợi cần xử lý.** Đây là hạng mục tạo an toàn vận hành cao nhất.
2. **P0 — Thông báo trạng thái đơn và thời hạn tải.** Giảm hỗ trợ lặp lại và tăng niềm tin khách hàng.
3. **P1 — Bộ lọc sâu và gợi ý sản phẩm/SKU.** Tăng khả năng tìm thấy đúng sản phẩm.
4. **P1 — Sao chép sản phẩm/SKU và mẫu thuộc tính.** Tăng tốc nhập hàng.
5. **P2 — Nội dung hướng dẫn, khách hàng quay lại, SEO/hiệu năng.** Tăng trưởng dài hạn sau khi luồng bán đã ổn định.
