# DHL Nest Studio V8.59 — DÀN CUỘN PET TỰ ĐỘNG

## Sử dụng

1. Trong CorelDRAW 2021/2025, chọn các chi tiết rời hoặc Group cần dàn.
2. Mở Docker **DÀN FILE → MỞ CỬA SỔ DÀN TỐI ƯU**.
3. Bên phải, tại **Loại vật liệu**, chọn **Cuộn PET – tự tính chiều dài**.
4. Nhập **Chiều rộng tấm / cuộn PET (mm)**, ví dụ **580 mm = 58 cm**.
5. Ô **Chiều cao tấm (mm)** chuyển sang trạng thái không chỉnh sửa; trong chế độ cuộn chiều cao cũ được bỏ qua.
6. Điều chỉnh khoảng cách chi tiết, lề đầu/cuối, lề hai bên (giao diện dùng cùng một giá trị lề cho cả bốn cạnh), xoay 0°/90°, dùng đường bao nếu cần.
7. Bấm **TÌM PHƯƠNG ÁN KHÁC**. Tool tính nhiều cách đặt các chi tiết trên **một dải cuộn liên tục**; tính chiều dài dựa trên vị trí kết thúc của chi tiết xa nhất cộng lề đầu và cuối.
8. Xem hình đường bao, so sánh chiều dài cuộn trong các phương án, chọn phương án và bấm **ÁP DỤNG VÀO COREL**.

## Kết quả

- Khung Corel được tạo đúng chiều rộng đã nhập và chiều dài của phương án đã chọn, đơn vị mm.
- Ví dụ: cuộn 580 mm, chi tiết cao nhất 400 mm trong bố cục, lề 5 mm mỗi đầu → chiều dài tối thiểu của chính bố cục đó 410 mm.
- Mỗi lượt chỉ tạo **một khung cuộn**, không tự tạo nhiều trang/tấm. Đối tượng được giữ nguyên Group; khi cần thiết chỉ xoay 90°.
- Dùng đúng khoảng cách đã nhập; chức năng kiểm tra va chạm và xác minh file chưa bị sửa kể từ khi xem trước vẫn áp dụng.
- Khi Xếp theo đường bao được bật, thử tận dụng khe lõm mở; lỗ kín 0, 6, 8, 9 không được tự động coi là vùng trống.
- Ưu tiên phương án dùng **chiều dài cuộn ngắn nhất trong những phương án hợp lệ tìm được**. Không bảo đảm tối ưu toàn cục.

## Hai chế độ tách biệt

| Chế độ | Điều kiện nhập | Kết quả |
|---|---|---|
| **Tấm cố định** | Chiều rộng + chiều cao | Một hoặc nhiều tấm như cũ |
| **Cuộn PET** | Chiều rộng; chiều dài tự tính | Một cuộn duy nhất, tự rút ngắn chiều dài |

## Giới hạn và bảo vệ

- Giới hạn tính toán **30.000 mm (30 m) cho mỗi lần dàn**; trường hợp quá dài cần chia lần tạo. Không tự chia để tránh in mất kiểm soát.
- Nếu có vật rộng hơn chiều rộng khả dụng của cuộn, kể cả khi xoay 90°, tool báo lỗi trước khi tạo phương án.
- Trước khi nhấn ÁP DỤNG, việc chọn và tính phương án **không di chuyển/không thêm khung** trong Corel.
- Đổi độ rộng cuộn, khoảng cách, lề, xoay hoặc chế độ vật liệu sau khi tính làm kết quả cũ vô hiệu; cần tính lại.
- % hiệu suất hiển thị là tỷ lệ ước tính bằng diện tích khung bao, không phải diện tích decal/đường cắt thực.
- Công việc dùng thuật toán packing hiện có cùng một phương án an toàn theo cột dọc; không cam kết tìm được chiều dài tuyệt đối ngắn nhất.

## Mã nguồn / thử nghiệm

- `src/V858_NEST_STUDIO.html` — module Nest Studio, API version **8.59**; giữ tên file V858 để không phá đường dẫn cũ.
- `src/DockerUI_CURRENT.html` — bản Docker cài đặt **V8.59**.
- `tests/nest_studio_v858.test.js` — hồi quy chế độ tấm; chế độ PET 580 mm, lề, tính chiều dài, khung Corel, xoay 90°, lỗi quá rộng và vượt 30 m.
- Những test này dùng môi trường JavaScript và Corel COM mô phỏng. **Chưa kiểm thử thực tế trên Windows CorelDRAW**; hãy dùng bản sao CDR trước khi sản xuất.
