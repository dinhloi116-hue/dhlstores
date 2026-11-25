# DHL Nest Studio V8.58 — cửa sổ xem trước DÀN FILE

## Mục tiêu

Thay thao tác dàn ngay lập tức trong Docker bằng một cửa sổ lớn (1440 × 900) để **thử các phương án mà chưa thay đổi file CorelDRAW**. Giao diện tham khảo cách trình bày trong ảnh Pikdecor do người dùng cung cấp, không sao chép mã/thuật toán độc quyền.

## Khởi chạy

1. Mở tài liệu CorelDRAW và chọn các đối tượng muốn dàn: Group nameset hoàn chỉnh hoặc từng Text/Curve rời. Tool không ungroup các đối tượng đã Group.
2. Trong tab **DÀN FILE**, bấm **MỞ CỬA SỔ DÀN TỐI ƯU**. Bảng Docker cũ được thu gọn; cần dùng thuật toán cũ thì bấm **CÔNG CỤ CŨ / TÙY CHỌN NÂNG CAO**.
3. Cửa sổ mới hiện các **phương án khác nhau được tìm thấy (tối đa 5)**. Có thể lựa chọn, zoom ±, hiện bản gốc, đổi kích thước phôi, lề, khoảng cách, xoay, gương và thời gian thử.
4. Nhấn **TÌM PHƯƠNG ÁN KHÁC** sau khi đổi thông số; sau đó chọn phương án rồi nhấn **ÁP DỤNG VÀO COREL**.
5. Nếu gặp lỗi sau khi áp dụng, thử **Ctrl+Z**. Nên thử trên file CDR bản sao trước khi chạy sản xuất.

## Giao diện

- Bên trái: danh sách phương án, SVG đường bao trên từng tấm, phóng to/thu nhỏ, số đối tượng, số tấm, độ dài sử dụng, hiệu suất proxy.
- Bên phải: kích thước phôi theo mm, khoảng cách, lề đối xứng, khoảng cách giữa tấm, xoay 0°/90°, đường bao/khe mở, lật gương, ngân sách tính toán.
- Dưới cùng: **HIỆN BẢN GỐC – TÌM PHƯƠNG ÁN KHÁC – ÁP DỤNG VÀO COREL – ĐÓNG**.
- Hiệu suất % là **ước tính theo diện tích khung bao**, không phải diện tích vật liệu cắt thực. Không áp dụng thời gian hoặc hiệu suất từ ảnh tham chiếu vào các bộ khác.

## Thuật toán và bảo vệ dữ liệu

- Dùng lại engine hiện có `DHLDirectGroups.runPlan()` (rectangle/bin packing) và `DHLContourGeometry.pack()/valid()/footprintAt()` thay vì tạo thuật toán không kiểm chứng.
- Tính tới 4 thứ tự đặt chi tiết khác nhau (diện tích, chiều cao, chiều rộng, thứ tự vùng chọn). Trùng nhau thì chỉ hiển thị một phương án, nên có thể ít hơn 5.
- Nếu bật đường bao, thử dàn một tấm hoặc tối ưu từng tấm trong phương án nhiều tấm; sử dụng phép kiểm tra va chạm đường bao của engine cũ, khoảng cách và biên phôi.
- Không đặt chi tiết trong **lỗ kín** của chữ 0/6/8/9: engine hiện có coi lỗ kín là vùng cấm. Chỉ tận dụng khe lõm mở có thể kiểm chứng.
- Trong lúc xem trước, chỉ đọc hình học và tạo SVG trong popup; **không** Duplicate/Rotate/Move đối tượng Corel. Lưu vị trí/kích thước/chữ ký đường bao ban đầu.
- Trước khi áp dụng phải kiểm tra lại: đúng tài liệu, không đổi kích thước/vị trí/đường bao, không đổi thông số sau lượt tính, không vật nằm ngoài biên, không va chạm trong kết quả.
- Chỉ nút **ÁP DỤNG VÀO COREL** mới tạo khung và di chuyển/đổi góc đối tượng trong một Corel command group. Có Undo khi phát sinh lỗi và khôi phục đơn vị tài liệu.
- Mặc định cho phép các đối tượng rời đang chọn, nhưng không phá các Group gốc.

## Giới hạn / việc cần kiểm tra trên máy

- Cửa sổ riêng được mở bằng MSHTML `window.open()`. Một số bản CorelDRAW OEM hoặc chính sách Windows có thể chặn popup; nếu vậy Docker sẽ báo lỗi, cần kiểm tra runtime trên CorelDRAW 2021/2025.
- Preview SVG là đường bao lấy mẫu theo Corel, không phải trình kiểm tra đường cắt CNC, không tạo đường dao, không tự động xử lý kerf.
- Bộ giải hiện tại không đảm bảo tìm được tối ưu toàn cục, chưa tương đương các phần mềm nesting chuyên nghiệp về hiệu suất hoặc tốc độ. Phải kiểm tra kích thước và khoảng trống trước khi cắt/in.
- Số lượng tối đa 400 đối tượng mỗi lượt; những lần xem trước đường bao trên >200 đối tượng sẽ ưu tiên xếp khung bao để tránh quá tải.
- Phương án nhiều tấm được vẽ các khung bên cạnh trang Corel hiện tại; cần bảo đảm trang có đủ không gian làm việc và không bị lẫn với các đối tượng ngoài vùng chọn.
- `tests/nest_studio_v858.test.js` thử popup, SVG, phương án, không sửa file khi preview, kiểm tra thay đổi khổ, di chuyển/đổi contour và áp dụng đúng command group. Không thay thế kiểm thử Corel trên Windows.

## Mã nguồn

- Module mới: `src/V858_NEST_STUDIO.html`.
- Snapshot để cập nhật: `src/DockerUI_CURRENT.html` (V8.58).
- Hồi quy: `tests/nest_studio_v858.test.js`, các test sẵn có V8.49–V8.57.
