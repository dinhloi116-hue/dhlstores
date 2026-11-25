# DHL Nameset Layout V8.51 — NAMESET: nhận diện & căn chỉnh

## Phạm vi giai đoạn 1
Đưa chức năng **nhận diện tên–số** và **căn chỉnh chính xác** lên đầu tab NAMESET. Các phần Font, tạo A3, chèn logo và các công cụ cũ chỉ mở khi người dùng yêu cầu, chưa viết lại trong phiên bản này. Giữ nguyên bộ DÀN FILE/true-contour, EXCEL, SET SIZE, ĐƯỜNG BAO.

## Luồng sử dụng
1. Chọn 2 đối tượng tên+số hoặc các Group nameset trong Corel.
2. Chọn **Tự nhận diện** (2 Text/2 Curves hoặc nhiều cặp Text) hoặc **Theo Group**.
3. Nhập khoảng cách chân tên → đỉnh số bằng **mm** (mặc định 30).
4. Bấm **1. KIỂM TRA CẶP**. Phân tích không chỉnh sửa tác phẩm.
5. Kiểm tra số cặp/nội dung ghép, bấm **2. CĂN CHỈNH**.
6. Nếu cần hoàn tác, Ctrl+Z.

## Chính sách nhận diện
- Text: số thuần 1–3 ký tự số (ví dụ `7`, `10`) nhận là số; Text còn lại là tên. Ưu tiên xác nhận quan hệ tên nằm trên số.
- Chính xác 2 Curves: chỉ suy ra dựa vào vị trí tên ở trên, số ở dưới và giới hạn khoảng cách ngang/dọc; nếu không rõ → dừng, yêu cầu chọn/Group lại.
- Nhiều cặp Text: thử ghép theo vị trí, từ chối các kết quả mơ hồ gần bằng nhau; tuyệt đối không chia nửa dãy theo chiều cao như code cũ.
- Theo Group: nếu chứa duy nhất 1 Text tên + 1 Text số có thể giữ thêm logo khác; nếu chỉ có đúng 2 đối tượng Curves, xét vị trí trên/dưới. Group phức tạp/không thể xác định → từ chối. Không Ungroup.
- Vùng chọn thay đổi sau kiểm tra → không căn, yêu cầu kiểm tra lại.

## Tính toán và an toàn
- Corel `doc.Unit=3` dùng mm trong cả quá trình đọc hình học và căn chỉnh. Khôi phục đơn vị gốc bằng `finally`.
- Cố định số tại vị trí hiện tại; đặt `name.CenterX=number.CenterX` và `name.CenterY=number.Top+gap+name.Height/2`. Do đó chân tên cách đúng `gap` mm so với đỉnh số. Không thay đổi font, kích thước, độ rộng hay đối tượng logo.
- Mọi thay đổi nằm trong một `BeginCommandGroup` cho Ctrl+Z. Nếu gặp lỗi khi di chuyển, gọi EndCommandGroup và Undo ngay; hiển thị lỗi.
- Giữ các bảng A3/font/logo cũ ở mục mở rộng để tránh làm mất khả năng đang dùng. Nút căn cặp cũ bị ẩn trong giao diện mới để tránh phép tính theo đơn vị tài liệu.

## Kiểm thử đã thực hiện
- Test `tests/safe_pair_v851.test.js` với mô phỏng Corel: 2 Text, 2 Curves, Group có logo, kiểm tra trước không sửa file, sai lệch khoảng cách mm, khôi phục đơn vị tài liệu, cặp mơ hồ, vùng chọn đổi, lỗi thao tác và hoàn tác.
- Kiểm thử hồi quy DÀN FILE: `direct_groups`, `group_open_pocket_v843`, `deep_contour_v845`, `open_gap_v843`, `contour_geometry`, `unified_mixed_v848`.
- Kiểm thử tab SET SIZE độc lập.
- Chưa có máy Corel thật hoặc file CDR của người dùng để xác minh chính xác dữ liệu, Group lồng phức tạp, ảnh/PowerClip và mọi tên số đã convert.

## Phần chưa làm
Các tính năng **FONT**, **LOGO CHÂN SỐ**, **TẠO TRANG A3** vẫn đang dùng mã cũ, hiển thị khi mở "CÔNG CỤ CŨ". Chúng cần được rà soát và nâng cấp riêng trong các giai đoạn tiếp theo. Không được xem là đã kiểm chứng bởi test V8.51.
