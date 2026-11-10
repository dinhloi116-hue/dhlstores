# DHL Nameset Layout V8.54 — NAMESET TẠO MỚI

## Giao diện chính
- TÊN, SỐ ÁO và DÒNG THỨ BA (tùy chọn): 3 ô Text với font, chiều rộng và chiều cao riêng.
- Chọn từng font từ danh sách font cài đặt và gợi ý 10 font sử dụng gần nhất, lưu bằng localStorage.
- Khoảng cách tên–số và số–dòng ba, đơn vị cm.
- Màu thân (fill) và viền (outline) chung cho 3 dòng, RGB HEX #RRGGBB, palette chọn nhanh.
- Độ dày viền tính bằng mm; 0 = không viền.
- Logo chân số tùy chọn: capture đối tượng Corel, số lượng logo mỗi digit/cho cả cụm, % cao số, cách đáy và lề ngang.
- Lật gương ngang cho toàn bộ Group.
- Công cụ NAMESET cũ, A3, căn cặp nằm dưới nút mở rộng.

## Kỹ thuật
- Dùng Corel Artistic Text; không convert Curves; tạo 1 Group và chọn ngay sau khi xong.
- Không khóa tỷ lệ. Truyền đồng thời widthMm, heightMm vào Shape.SetSize khi người dùng nhập cả hai; rộng trống/0 = tự động theo chiều cao.
- Mặc định tên cao 5 cm, số 25 cm, dòng thứ ba 2 cm; khoảng cách 3 cm và 1 cm.
- Tự đổi cm sang mm khi tính toán hình học; chuyển doc.Unit = 3 và hoàn nguyên trong finally.
- Cả thao tác tạo nằm trong Corel command group để có thể Ctrl+Z; lỗi phải rollback.
- Font mới chỉ lưu vào danh sách 10 gần nhất sau khi tạo thành công.
- Logo nguồn không bị xóa, được chèn bản sao; chỉ hỗ trợ số thuần 1–4 digit khi bật logo.
- Giữ engine EXCEL, DÀN FILE, SET SIZE và ĐƯỜNG BAO không đổi.

## Kiểm thử và giới hạn
- 103 assertions đã chạy bằng mô phỏng JavaScript cho tính năng mới: Text, size độc lập, màu, viền, logo, Flip, Undo.
- Đã kiểm tra cú pháp của 42 inline scripts trong snapshot.
- Chưa chạy trực tiếp trên CorelDRAW 2021/2025 Windows hay file CDR sản xuất.
- 'Màu nền' tại đây nghĩa là màu thân chữ/số (fill), không tạo nền hình chữ nhật phía sau.
- Font tiếng Việt phụ thuộc glyph thực có trong font, không tự chuyển Curves.

## Cập nhật
Vào Docker đang sử dụng → ↻ CẬP NHẬT → đóng CorelDRAW → mở lại. Không reset Workspace.
