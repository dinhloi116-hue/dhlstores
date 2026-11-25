# DHL Nameset Layout V8.53 — LOGO CHÂN SỐ

## Mục tiêu

Cải tiến chức năng chèn logo chân số trong tab **NAMESET** thành một luồng duy nhất:
**1. LẤY LOGO → 2. KIỂM TRA → 3. CHÈN VÀO SỐ**.
Không thêm tab mới; không trộn các thông số logo với DÀN FILE và SET SIZE.

## Thay đổi kỹ thuật

- Tạo giao diện gọn \`src/V853_LOGO_SAFE.html\`, hiện trực tiếp trong tab NAMESET, không phải mở khu **CÔNG CỤ CŨ**.
- Giữ engine \`DHLNumberLogo\` và các công cụ Excel cũ tương thích.
- Thêm \`inspectManual()\` đọc đối tượng hiện chọn, nhận số dạng Text (kể cả trong Group) hoặc tối đa 3 Curves riêng, tính số bản sao logo dự kiến mà **không** Duplicate, Move, Group hay Scale.
- Thêm \`configure()\` để đồng bộ các thông số: cỡ 2–30% cao số, cách đáy 0–30 mm, lề ngang 0–10 mm, một logo từng digit hoặc một logo cả cụm.
- Khi chèn, phải kiểm tra trước. Nếu số lượng/kiểu đối tượng hay các thuộc tính chính của vùng chọn thay đổi, huỷ và yêu cầu kiểm tra lại.
- Cấm chọn đồng thời logo nguồn và số đích, cấm Group đích chứa logo nguồn và cấm chèn lặp vào Group đã có \`DHL_DIGIT_LOGO\`.
- Khi Corel đang dùng đơn vị khác mm, chỉ chuyển \`doc.Unit=3\` tạm thời trong khâu kiểm tra và khôi phục đơn vị gốc trong \`finally\`.
- Khi CHÈN, logo được sao chép, cân chỉnh theo chiều cao số, Group cùng số. Lệnh chèn vẫn dùng Corel Undo group; Ctrl+Z để hoàn tác.

## Hướng dẫn sử dụng

1. Mở CorelDRAW, chọn **duy nhất** 1 logo vector/bitmap/Group làm mẫu, nhấn **LẤY LOGO**.
2. Bật **Chèn logo**, mặc định 9% chiều cao số, cách đáy 2 mm, lề ngang 1 mm.
3. Chọn số Text hoặc Group nameset hợp lệ; nếu đã convert, chọn trực tiếp từng digit riêng.
4. Nhấn **KIỂM TRA** để xem số lượng logo dự kiến; bước này không thay đổi bản in.
5. Nhấn **CHÈN VÀO SỐ**, kiểm tra lại vị trí logo trước khi xuất PET/DTF.

## Giới hạn đã biết

- Phân chia chiều rộng từng glyph của số Text được ước lượng từ kích thước chữ đo trên bản sao trong **bước chèn**. Kerning/ligature đặc biệt có thể gây sai vị trí; cần kiểm tra trực quan.
- Với Group Curves phức tạp không xác định được từng digit, tool từ chối đoán.
- Logo chỉ nằm chồng lên số, không tự khắc âm vào mảng mực.
- Engine Excel vẫn có thể di chuyển logo nguồn ra ngoài khổ giấy khi chia trang như bản trước; đây là hành vi cũ, chưa thay đổi ở V8.53.
- Chưa thử trực tiếp trên máy CorelDRAW 2021/2025 và file CDR thật; chỉ xác minh cú pháp và mô phỏng Corel. Hãy chạy trên bản sao file trước khi sản xuất.

## Kiểm thử

- \`tests/logo_safe_v853.test.js\`: nguồn, lựa chọn, khôi phục mm, dự kiến 2 logo cho số 10, kiểm tra không thay đổi bản in, chèn tạo 2 bản sao và 1 Group, chặn chọn nguồn, chặn nguồn nằm trong Group, kiểm soát tham số.
- \`tests/startup_version_v844.test.js\` và \`tests/print_preflight_v852.test.js\` cập nhật version kỳ vọng 8.53.
- Snapshot \`src/DockerUI_CURRENT.html\` đóng gói cả module V8.37 được bổ sung API và module V8.53; 41 thẻ script đã qua kiểm tra cú pháp.
