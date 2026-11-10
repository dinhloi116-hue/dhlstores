# DHL Nameset Layout V8.56 — Bật/tắt từng phần và màu riêng cho từng dòng

## Giao diện NAMESET
- Mỗi phần TÊN, SỐ ÁO, DÒNG THỨ BA có checkbox BẬT/TẮT ngay trên tiêu đề.
- Mặc định: TÊN = bật; SỐ ÁO = bật; DÒNG THỨ BA = tắt.
- Không tích sẽ thu gọn toàn bộ tùy chỉnh phần đó; phần không tích không tạo bất kỳ đối tượng Text nào.
- Mỗi phần được tích có nội dung, tìm kiếm font Windows, chọn font, chiều rộng/cao độc lập không khóa tỷ lệ.
- **Mỗi phần có màu thân (fill), màu viền (outline), độ dày viền (mm) riêng**. Dùng mã RGB HEX #RRGGBB hoặc nhấn ô vuông màu để hiện bảng màu nhanh.
- Bỏ bảng màu và viền dùng chung trước đây để không gây lẫn lộn.
- Chỉ các phần được tích và nhập nội dung mới được gom vào Group, không Convert to Curves.
- Khoảng cách TÊN → SỐ và SỐ → DÒNG 3 vẫn điều chỉnh được. Khi chỉ bật TÊN + DÒNG 3, khoảng cách thứ hai áp dụng giữa hai phần.
- Chỉ bật riêng một trong ba dòng cũng có thể tạo (bao gồm DÒNG 3 một mình). Không cho chạy nếu tất cả đều bỏ tích hoặc tích mà bỏ trống nội dung.
- Logo chân số chỉ khả dụng khi tích SỐ; bỏ tích SỐ tự tắt và khóa ô logo.
- Tùy chọn lật gương toàn bộ Group giữ nguyên.

## Kỹ thuật
- Cập nhật `src/V854_NAMESET_COMPOSER.html` (module giữ ID để tương thích) và snapshot `src/DockerUI_CURRENT.html` lên V8.56.
- `sizeRow` chỉ đọc và kiểm tra dữ liệu một dòng khi checkbox bật, trả null nếu tắt.
- Màu thân/viền áp theo chính đối tượng đó bằng `RGBAssign`; viền rộng 0 => `SetNoOutline`.
- Tạo nhóm trong một command group, rollback khi lỗi, phục hồi đơn vị Corel.
- Không thay đổi các tab EXCEL / DÀN FILE / ĐƯỜNG BAO / SET SIZE.

## Kiểm thử
- `tests/nameset_independent_rows_v856.test.js`: 55 assertions mô phỏng độc lập 3 phần, màu fill + outline, chỉ SỐ, chỉ DÒNG 3, kiểm tra giá trị sai ở phần bỏ tích không cản tạo, trường hợp trống hoặc bật logo nhưng tắt SỐ.
- `tests/nameset_composer_v854.test.js`: hồi quy tạo đầy đủ 3 dòng, kích thước không khóa, group, logo, lật gương.
- Các script kiểm tra cú pháp và bản đóng gói chính trong GitHub.

**Chưa chạy thử trực tiếp trên CorelDRAW 2021/2025 Windows.** Hãy thử trên một tài liệu CDR mới trước khi in hoặc sửa file gốc.
