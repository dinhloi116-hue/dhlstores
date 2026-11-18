# DHL Nest Studio V8.60 — Nhập số lượng in riêng cho từng mẫu

## Cách sử dụng

1. Trong CorelDRAW, chọn những mẫu cần in (mỗi Group nameset hoặc từng đối tượng rời được xem là **một mẫu nguồn**).
2. Mở **DÀN FILE → MỞ CỬA SỔ DÀN TỐI ƯU**.
3. Bên phải có bảng **SỐ LƯỢNG IN TỪNG MẪU (1–100)**. Bảng hiển thị số thứ tự, tên đối tượng Corel và ô số lượng. Mặc định mỗi mẫu **1 bản**.
4. Ví dụ chọn 3 mẫu và nhập `2`, `3`, `1`: Nest Studio tính tổng cộng **6 bản in**, cần nhân bản 3 đối tượng so với 3 đối tượng gốc.
5. Bấm **TÌM PHƯƠNG ÁN KHÁC** để tính lại. Phần xem trước phản ánh đủ 6 đối tượng ảo, thông số cuộn PET hoặc tấm được tính trên tổng số bản in.
6. Chọn phương án phù hợp, bấm **ÁP DỤNG VÀO COREL**. Chỉ lúc này tool mới nhân bản các đối tượng bổ sung và dàn theo đúng phương án đã chọn.

## Quy tắc dữ liệu

- Số lượng riêng từng mẫu phải là **số nguyên 1–100**; từ chối 0, số âm, số thập phân, ô trống, chuỗi ký tự.
- Tối đa **400 bản in trong một lần dàn**, tính tổng tất cả mẫu. Vượt giới hạn phải chia thành nhiều lượt.
- Những Group nameset đang được chọn được coi là một mẫu nguyên khối; bản sao tạo bằng `Duplicate(0,0)` của Corel, không Ungroup, không tự tháo Text, logo hoặc PowerClip.
- Nếu thay đổi số lượng mà chưa bấm TÌM PHƯƠNG ÁN KHÁC, nút ÁP DỤNG sẽ từ chối để tránh in sai số lượng.
- Kiểm tra lại tài liệu, kích thước, vị trí và chữ ký đường bao của những **mẫu nguồn** trước khi áp dụng. Mỗi bản sao chỉ tồn tại ảo ở bước tính toán.
- Phần xem trước hiển thị số **bản in / mẫu nguồn**. Bản gốc vẫn hiển thị các mẫu nguồn chưa nhân bản.
- Sau khi nhấn ÁP DỤNG, mọi bản sao được tạo ra trước khi di chuyển mẫu gốc, để các bản sao có cùng hình dạng chuẩn.
- Toàn bộ thao tác nhân bản, xoay và dàn file trong một Corel command group. Nếu `Duplicate()` hoặc bước đặt hình thất bại, tool gọi Undo và vô hiệu hóa phương án cũ; nếu Undo thất bại, báo phải kiểm tra CDR.

## Tương thích

- **Tấm cố định:** Tính đủ các bản sao trên một hoặc nhiều tấm như trước.
- **Cuộn PET:** Tính chiều dài từ tất cả bản sao; vẫn sử dụng một khung cuộn duy nhất và giới hạn chiều dài 30 m/lượt.
- **Xếp contour:** Dùng cùng hình học vector của mẫu nguồn cho các bản ảo; kiểm tra va chạm trước khi áp dụng.
- **NAMESET, EXCEL, font, PowerClip:** Không sửa thuật toán tạo chữ/số; chỉ thay luồng Nest Studio.

## Kiểm thử / giới hạn

- Test `tests/nest_studio_v858.test.js`: lượng 2/3/1 → 6 bản ảo và chỉ 3 lần Corel Duplicate khi áp dụng; số lượng cũ 1 vẫn giữ nguyên, kiểm tra không có thay đổi trong Preview.
- Kiểm tra từ chối số lượng sai, vượt 100, tổng vượt 400, thay số lượng nhưng chưa tính lại và lỗi Duplicate buộc Undo.
- Đã chạy test mô phỏng, **chưa thực nghiệm trên CorelDRAW 2021/2025 thực tế**. Nên kiểm tra bản sao CDR với 2–3 mẫu trước khi dùng để in.

## Nguồn trên GitHub

- `src/V858_NEST_STUDIO.html`: Module Nest Studio V8.60 (giữ tên file để tương thích đường dẫn cũ).
- `src/DockerUI_CURRENT.html`: Bundle phát hành V8.60.
- `tests/nest_studio_v858.test.js`: Test lượng in, cuộn PET và giao dịch Corel.
