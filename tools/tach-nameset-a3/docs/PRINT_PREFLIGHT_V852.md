# DHL Nameset Layout V8.52 — KIỂM TRA FILE TRƯỚC IN

## Trạng thái
Đã thêm vào `src/DockerUI_CURRENT.html` qua module độc lập `src/V852_PRINT_PREFLIGHT.html`, không thêm tab mới, không thay đổi thuật toán dàn hoặc thiết kế gốc.

Chức năng này là **bộ kiểm tra hình học theo đường bao lấy mẫu**, không phải chứng nhận chất lượng in PET/DTF tổng thể.

## Thao tác trong CorelDRAW
1. Mở tab **DÀN FILE**, chọn khoảng cách vật liệu (ví dụ 0,5 cm = 5 mm).
2. Trong khối **KIỂM TRA TRƯỚC IN**, chọn **Đối tượng đang chọn** hoặc **Toàn trang hiện tại**.
3. Nhấn **KIỂM TRA FILE**. Kết quả liệt kê: số đối tượng, xung đột giữa đường bao/vùng kín, khoảng cách nhỏ hơn ngưỡng, đường path hở, đối tượng chỉ kiểm tra bằng khung bao và hình học không đọc được.
4. Nếu có cảnh báo, nhấn **CHỌN ĐỐI TƯỢNG CẦN KIỂM TRA** để Corel chọn các hình có vấn đề, sau đó tự xử lý.
5. Quét lại sau khi sửa trước khi xuất bản in.

## Quy tắc kỹ thuật
- Chỉ đọc `ActiveSelectionRange` hoặc `ActivePage.Shapes`. Không tạo bản sao, không xóa, không dịch chuyển, không Scale, không Convert, không Ungroup.
- Trước khi đọc: chuyển đơn vị tài liệu sang mm (Corel `doc.Unit=3`); luôn khôi phục giá trị cũ trong `finally`.
- Dùng `DHLContourGeometry.footprintAt(shape,0)`, vốn hỗ trợ nhóm nhiều leaf và các SubPath.
- So sánh biên hình học bằng khoảng cách hai đoạn, giao đoạn và kiểm tra containment với vùng contour khép kín.
- Khoảng cách lấy từ ô `v77NestGap` trên tab DÀN FILE, nhập cm và quy đổi sang mm.
- **Vùng lỗ kín** (0/6/8/9 và tương tự) được coi là vùng cấm một cách bảo thủ. Đặt một hình vào vùng này sinh cảnh báo xung đột, dù không nhất thiết chồng mực trong thực tế.
- Đường mở `SubPath.Closed=false` được cảnh báo riêng.
- Đối tượng có path không đọc được được kiểm tra bằng khung bao **và gắn nhãn ước lượng**, không cấp trạng thái "đạt".
- Tự bỏ qua khung vật liệu do công cụ tạo có tên `DHL_NEST_FRAME_*`.
- Giới hạn một lượt quét tối đa 250 đối tượng và khoảng thời gian tìm kiếm ~9 giây; nếu chưa hoàn thành, báo **chưa kiểm hết**, không tuyên bố an toàn.
- Nếu số trường hợp lỗi vượt 35, hiển thị tổng chính xác nhưng giới hạn chi tiết danh sách.
- Nút chọn lỗi chỉ thay đổi Selection của Corel, không làm thay đổi tài liệu.

## Những gì V8.52 chưa kiểm tra
Không kiểm tra chính xác màu CMYK/RGB, kênh trắng, độ phân giải DPI, hệ màu in PET, transparency/PowerClip phức tạp, chất liệu/vải, khả năng ép nhiệt hoặc độ chính xác tuyệt đối của đường Bézier. Engine hiện dùng polyline lấy mẫu, **không phải** phép giao polygon chính xác như Clipper2. Chưa hỗ trợ sửa lỗi vector tự động hoặc so sánh trước/sau một cách trực quan.

## Kiểm thử
- `tests/print_preflight_v852.test.js`: khoảng cách 3mm so với yêu cầu 5mm, chồng hình, cách xa không báo lỗi, khe L mở hợp lệ, vùng kín bị cấm, path mở, fallback raster, frame bỏ qua, file lỗi, hoàn nguyên đơn vị, chọn đối tượng lỗi, toàn trang, không chỉnh sửa.
- 17/17 bài kiểm thử JS hồi quy liên quan đạt trong mô phỏng (bao gồm NAMESET V8.51, SET SIZE V8.50, DÀN FILE và Corel 2021).
- Chưa chạy kiểm chứng trực tiếp trên CorelDRAW thực và file CDR cụ thể của người dùng. Cần thử trên bản sao trước khi sản xuất.

## Ghi chú về mã nguồn mở
Có tham khảo khả năng kiểm tra hình học của SVGnest/Clipper2; không sao chép, không nhúng thư viện độc lập nào vào bản V8.52. Toàn bộ kiểm tra vẫn chạy bằng ES5/MSHTML trong CorelDRAW Docker.
