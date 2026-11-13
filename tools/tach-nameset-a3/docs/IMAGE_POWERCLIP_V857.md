# DHL Nameset Layout V8.57 — LỒNG ẢNH / POWERCLIP

## Cách dùng trong NAMESET

1. Mở tab **NAMESET**, kéo xuống phía dưới các tuỳ chọn TÊN / SỐ / DÒNG 3.
2. Bật **LỒNG ẢNH / POWERCLIP**.
3. Dùng **Chọn file ảnh** (PNG/JPG/BMP/GIF/TIFF/WEBP) hoặc chọn đúng một đối tượng ảnh trong Corel rồi nhấn **LẤY ẢNH ĐANG CHỌN**.
4. Nhập **Lặp X ảnh (1–64)**. Với X=1, ảnh sẽ phủ toàn bộ hình chữ/số. Với X>1, tool nhân đúng X bản theo hàng/cột tạo pattern, giữ tỷ lệ ảnh, sau đó PowerClip vào hình chữ/số.
5. Tích riêng **TÊN / SỐ / DÒNG 3**. Chỉ những phần được tích và tồn tại trong nameset mới được lồng ảnh. Các phần không tích giữ màu thân/viền cũ.
6. Nhấn **TẠO NAMESET TRONG COREL**. Tool nhóm ảnh đã PowerClip cùng Text. Có thể hoàn tác toàn bộ thao tác bằng Ctrl+Z.

## Excel hàng loạt

- Tab **EXCEL** sử dụng cùng cấu hình ở tab NAMESET khi nhấn **TẠO CÁC BỘ TỪ EXCEL**.
- Ảnh nguồn từ file được nhập **một lần trong mỗi lượt tạo hàng loạt** rồi nhân bản theo từng dòng và từng phần được tích. Kết thúc lượt tạo, ảnh nguồn tạm được xóa.
- Nếu dùng ảnh đã chọn trong Corel, ảnh nguồn gốc được giữ nguyên.
- Chỉ lồng ảnh khi tạo Group từ Excel. Bước DÀN MỖI BỘ → 1 TRANG RIÊNG tiếp tục xử lý Group đã có PowerClip; không nhân lại ảnh.
- Nếu cần áp dụng cùng một hình cho nhiều dòng, chọn file/mẫu nguồn trước, bật ảnh và cấu hình target trong NAMESET, rồi chuyển sang tab EXCEL.

## Hình học và in ấn

- Mọi bản sao có tỷ lệ **cover** theo kích thước từng ô lưới, không kéo méo bitmap.
- `AddToPowerClip(frame,0)` đưa ảnh đã nhập vào Text container, sử dụng bounding box của Text. Khung chứa có thể vẫn chỉnh sửa được.
- Khi X=1 dùng một ảnh phủ toàn bộ. Khi X>1, các ô chia cân theo tỷ lệ của khung; hàng cuối tự dàn kín chiều ngang.
- Màu thân của Text được bỏ để không che nội dung ảnh; viền Text theo thiết lập riêng vẫn giữ.
- Tối đa X=64 để hạn chế số đối tượng khi chạy Excel hàng loạt.

## Giới hạn và an toàn

- Dùng đường dẫn ảnh thực được CorelDRAW/MSHTML cung cấp. Nếu hộp file trả về `C:\fakepath\...`, hãy nhập ảnh vào Corel và dùng nút **LẤY ẢNH ĐANG CHỌN**.
- File ảnh hiện chọn không tự lưu giữa các lần khởi động, vì lý do bảo mật. Chọn lại ảnh sau khi mở Corel.
- Với shape phức tạp hoặc text font đặc biệt, PowerClip có thể khác kết quả dự kiến; kiểm tra bằng mắt trước khi in PET/DTF.
- Thiết kế chưa thử trực tiếp trên máy CorelDRAW 2021/2025 của người dùng. Đã mô phỏng API Corel và kiểm tra cú pháp, nhưng không thay cho thử nghiệm file CDR thật.
- Nếu Import / AddToPowerClip gây lỗi, thao tác tạo nameset nằm trong Corel command group để hoàn tác. Tool không xóa ảnh nguồn được chọn.

## Mã nguồn

- Module: `src/V857_IMAGE_POWERCLIP.html`.
- Tạo đơn: `src/V854_NAMESET_COMPOSER.html` (gọi module dùng chung trước Group).
- Excel: `src/V86_PATCH.html` (nạp ảnh một lần, áp dụng trong vòng lặp các dòng).
- Snapshot cài đặt: `src/DockerUI_CURRENT.html` phiên bản 8.57.
- Test: `tests/image_powerclip_v857.test.js` và các bài hồi quy V8.54–V8.56.
