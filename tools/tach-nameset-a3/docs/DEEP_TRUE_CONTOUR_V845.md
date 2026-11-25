# DHL Nameset Layout V8.45 — Deep True-Contour Nesting

## Mục tiêu
Xếp chi tiết nhỏ vào các khe mở thực sự của số/chữ lớn nhưng không được chui vào lỗ kín như 0/6/8/9 hoặc bất kỳ counter khép kín nào. Dùng cho Nameset in PET trong CorelDRAW. Không tháo Group, thu phóng hoặc làm biến dạng file in.

## Thao tác
1. Mở CorelDRAW, chọn các Group hoàn chỉnh trong tài liệu, mỗi Group chứa đúng vật cần dàn.
2. Vào **DÀN FILE → DÀN GROUP ĐÃ CHỌN**, để **Dàn chung khổ / cuộn**.
3. Bật **Xếp sâu theo contour; cấm lỗ kín 0 / 6 / 8 / 9**.
4. Chọn **Tự xoay 0° / 90° / 180° / 270°** nếu cho phép xoay. Nếu số/logo cần đứng nguyên, chọn **Giữ hướng hiện tại**.
5. Chọn ngân sách:
   - **Nhanh**: tối đa 1,8 giây tìm kiếm.
   - **Cân bằng**: tối đa 6,5 giây (mặc định).
   - **Chuyên sâu**: tối đa 18 giây.
6. Chọn khổ vật liệu, lề và khoảng cách đối tượng (mm). Nhấn **DÀN CÁC GROUP ĐÃ CHỌN**.
7. Xem số lượt thử và lượng vật liệu tiết kiệm trong thông báo. Chạy thử trên **bản sao CDR**, kiểm tra đường cắt thực trước khi sản xuất.

## Các quy tắc an toàn
- Tính đường bao của từng Group (các Shape con), tái sử dụng mẫu contour đã tính cho 4 góc xoay.
- Xác thực vị trí cuối cùng bằng kiểm tra giao cắt, khoảng cách đã đặt, khổ in và lề.
- Lỗ kín thuộc vùng cấm, kể cả khi hình học của lòng số trông đủ rộng cho vật nhỏ.
- Không dùng hình chữ nhật bao ngoài làm vật cản cố định trong chế độ contour nếu đường bao thật an toàn; nếu không có contour khả dụng, thuật toán trở về phương án cũ.
- Chỉ nhận bố cục nếu giảm số khổ hoặc giảm chiều dài so với phương án an toàn; không làm xấu bố cục nền.
- Phần kiểm tra tiến hành trước khi thay đổi vật thể thật. Nếu thao tác Corel thất bại, sử dụng nhóm lệnh Undo đã có của tool.
- Không can thiệp chế độ Excel, in mỗi Group một trang, xuất file hoặc các công cụ ngoài phạm vi tính năng này.

## Kiểm thử đã thực hiện trong môi trường JS mô phỏng
- 15/15 bài hồi quy đã chạy và đạt, gồm khóa lỗ kín, khe mở, Group, bản in nhiều trang, Excel, kiểm soát phông, tính tương thích Corel 2021 DOM và cập nhật phiên bản.
- `deep_contour_v845.test.js`: kiểm tra 0°/90°/180°/270°, không xoay, ba ngân sách, xếp đủ trong 1 khổ, bảo toàn bố cục khi tối ưu không thành công hoặc ném lỗi.
- `group_open_pocket_v843.test.js`: mẫu L + vật nhỏ, chiều dài khung bao 107 mm và contour 80 mm (giảm 27 mm, khoảng 25,2%) trong kiểm thử mô phỏng.
- `startup_version_v844.test.js`: kiểm tra V8.45 được hiển thị ngay khi mở, 29 đoạn mã cũ không thể ghi lùi nhãn phiên bản.
- Cú pháp 36 khối JS trong `DockerUI_CURRENT.html` được kiểm tra.

**Giới hạn:** Bài test dùng bộ giả lập API Corel và engine hình học; chưa xác minh GUI/COM trong CorelDRAW 2021/2025 thật hoặc sản phẩm in thực tế. Thời gian tối ưu là ngân sách nỗ lực, không phải cam kết độ trễ toàn bộ thao tác.

## Cập nhật
Bấm **CẬP NHẬT** trong Docker để lấy một snapshot `src/DockerUI_CURRENT.html` duy nhất, đóng CorelDRAW rồi mở lại để kiểm tra hiển thị V8.45. Bộ cập nhật xác minh đúng đường dẫn `DockerUI.html` đang hoạt động, không reset Workspace.

Mã nguồn: `src/V845_DEEP_TRUE_CONTOUR.html`.
Kiểm thử: `node tools/tach-nameset-a3/tests/deep_contour_v845.test.js`.
