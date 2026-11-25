# DHL Nameset Layout V8.55 — tìm kiếm font trong tab NAMESET

## Lỗi đã sửa
Ở V8.54, NAMESET mới chỉ lấy font từ các hộp chọn legacy (NAMESET/EXCEL). Khi các hộp đó chưa nạp font, 3 bộ chọn của NAMESET chỉ hiện Arial; 10 GẦN ĐÂY rỗng. Bộ nạp font cũ còn sử dụng chuỗi PowerShell `^|`, dễ bị phân tích sai khi khởi chạy trực tiếp bằng WScript.Shell.Exec.

## Thay đổi
- Mỗi mục TÊN, SỐ ÁO, DÒNG THỨ BA có ô `TÌM FONT`, lọc theo tên khi gõ, không phân biệt chữ hoa/thường.
- Tối đa 20 kết quả phù hợp hiển thị trong danh sách cuộn, ưu tiên tên bắt đầu bằng từ khóa; nhấn một kết quả để chọn riêng font cho mục đó.
- Nhấn Enter chọn kết quả đầu tiên, Esc đóng gợi ý. Danh sách chọn truyền thống vẫn có đầy đủ font.
- Nạp font trực tiếp từ Windows thông qua PowerShell + System.Drawing.Text.InstalledFontCollection, không dùng `^|`.
- Dùng font đã nạp từ hộp chọn cũ nếu sẵn có; nếu truy vấn Windows thất bại, thử bộ nạp cũ và báo lỗi rõ ràng (không báo đã nạp nếu chỉ có 1 font).
- Tự gọi nạp font sau khi giao diện khởi động. Có nút NẠP/LÀM MỚI FONT WINDOWS để quét lại sau khi cài font.
- Giữ 10 font đã sử dụng gần nhất trong localStorage, dùng chung giữa 3 ô.
- Không đổi phần tạo Artwork Text, kích thước, màu, logo, nhóm hoặc quy trình Excel/Dàn file.

## Kiểm thử
- `tests/searchable_fonts_v855.test.js`: mô phỏng WScript.Shell.Exec trả về 8 font cài đặt, kiểm tra 3 ô chọn, lọc 2 kết quả khi gõ 'rob', chọn Roboto cho số không đổi Arial của tên và lưu font gần đây.
- `tests/nameset_composer_v854.test.js`: kiểm tra hồi quy tạo 3 dòng, dãn rộng/cao độc lập, căn hàng, màu, viền, logo chân số, lật gương, hoàn tác lỗi.
- Kiểm tra cú pháp toàn bộ inline script và module nằm đúng một lần trong snapshot V8.55.

**Chưa xác minh trên CorelDRAW 2021/2025 Windows thực tế.** Nếu PowerShell bị chặn bằng chính sách máy, UI sẽ báo lỗi nạp font thay vì hiển thị thành công giả. Không xóa font, không cần reset Workspace.

## Cập nhật
Trong DHL Nameset Layout, bấm ↻ CẬP NHẬT sau đó đóng/mở lại CorelDRAW. Xem góc trên để xác nhận V8.55.
