# DHL Nameset Layout V8.37 — chèn logo ở chân từng chữ số

## Mục tiêu

Từ logo vector/bitmap/Group có sẵn trong cùng tài liệu CorelDRAW, tool tạo bản sao và đặt vào chân **từng chữ số** trên nameset. Ví dụ số `10` sẽ có 2 logo. Số `7` có 1 logo. Không thêm logo khi dòng Excel chỉ có tên (`COACH`).

## Cách dùng

### Từ Excel

1. Mở file Corel, đặt logo nguồn (vector/bitmap/Group) **riêng** trong tài liệu. Chọn đúng một logo nguồn.
2. Vào **EXCEL → LOGO Ở CHÂN TỪNG CHỮ SỐ → LẤY LOGO ĐANG CHỌN**.
3. Bật **Chèn logo vào số**; chỉnh **Cỡ logo (% cao số)**, **Cách đáy (mm)**, **Lề ngang (mm)**.
4. Giữ mặc định **Mỗi chữ số 1 logo**; có tùy chọn một logo cho cả cụm số.
5. Chọn font tên/số và file Excel như trước. Bấm **TẠO CÁC BỘ TỪ EXCEL**. Logo được thêm vào cùng Group với tên, số và dòng thứ ba.
6. Bấm **Mỗi bộ = 1 trang riêng** ở bước 5. Bản sao nameset trên trang mới bao gồm logo; nếu logo mẫu nằm trong trang in nguồn, tool đưa nó ra ngoài trang in để không in thừa.

### Nameset thủ công

1. Chọn logo nguồn → **LẤY LOGO ĐANG CHỌN** trong tab NAMESET.
2. Chọn đối tượng số dạng Artistic Text (ví dụ `10`), hoặc Group nameset có chữ số Artistic Text.
3. Bật **Chèn logo vào số** → **CHÈN VÀO SỐ ĐÃ CHỌN**.
4. Tool đo glyph `1` và `0` tương ứng từ chính font đang dùng, giữ nguyên số gốc và gộp các logo vào Group.
5. Với số đã convert thành vector curves, chọn **mỗi digit là một object riêng** rồi bấm chèn. Không tự đo được chữ số nào trong một Group curve phức tạp; tool sẽ từ chối chèn đoán.

## Cấu hình

- **Cỡ logo mặc định:** 9% chiều cao số.
- **Cách đáy:** 2 mm.
- **Lề ngang:** 1 mm. Logo tự thu nhỏ để vừa chiều rộng glyph.
- **Chế độ:** từng chữ số (mặc định) hoặc một logo chung cho cả cụm.

Cấu hình được ghi nhớ. **Logo nguồn phải chọn lại sau khi khởi động lại Corel hoặc cập nhật Docker** vì hình vẫn nằm trong tài liệu CDR, không phải file đính kèm.

## Ràng buộc kỹ thuật và kiểm thử

- Áp dụng tự động với **Artistic Text** của số tạo từ Excel. Tính vị trí mỗi glyph bằng phép đo bản sao text cùng font và nội suy theo chiều rộng thực của cả số. Với các font có kerning/phối nét khác thường, cần kiểm tra vị trí và chỉnh thông số trước khi in số lượng lớn.
- Logo chỉ được **đặt chồng**, không khắc âm vào màu nền số. Người dùng có thể chuẩn bị artwork logo cùng màu phù hợp trước khi Capture.
- Số nhiều digit vẫn là Text gốc, logo được giữ cùng trong Group. Mirror và CopyToLayer áp dụng trên Group đầy đủ.
- Đối tượng logo nguồn không bị xóa hay biến dạng; khi tách trang in, nó có thể được chuyển **ra ngoài khổ giấy** trong cùng một thao tác Undo.
- Nếu một dòng Excel có số nhưng nguồn logo không còn tồn tại và chế độ chèn đang bật, tạo bộ sẽ báo lỗi và hoàn tác, không âm thầm bỏ logo.
- Chưa xác nhận cuối cùng trên CorelDRAW 2021/2025 Windows; kiểm tra lần đầu trên file CDR bản sao trước khi in.

Cấu trúc chính: `src/V837_DIGIT_LOGO.html` (module), `src/V86_PATCH.html` (Excel), `src/V810_WORKFLOW_ORDER.html` (trạng thái workflow), `src/DockerUI_CURRENT.html` (snapshot).
