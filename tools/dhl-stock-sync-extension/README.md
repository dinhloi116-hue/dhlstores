# DHL Stock Sync – Chrome Extension

Mục tiêu của bản 0.9 rất đơn giản: đọc tồn kho từ `si.aobongda.net` theo **đội/mẫu → màu → size**, ghép với đúng biến thể trong **file xuất Sapo**, rồi tạo file nhập Sapo trong đó **chỉ thay đổi tồn kho**.

Ví dụ: nguồn đọc được `ĐT Mexico 2026 HD / Rêu / S = 7` thì tool tìm biến thể Sapo tương ứng `Mexico xanh 26 HD-S` và điền `Cửa hàng chính_Tồn kho = 7` cho đúng `Id phiên bản` đó.

## Luồng dùng

1. Đăng nhập `si.aobongda.net` trên Chrome.
2. Mở side panel `DHL Stock Sync`.
3. Chọn file xuất Sapo.
4. Chọn file mẫu nhập Sapo.
5. Bấm `QUÉT KHO HD 2026`.
6. Tool tự chuyển tab nguồn tới danh mục HD, lần lượt bấm nút mua nhanh của từng sản phẩm, mở popup và đọc từng màu + từng size + số tồn.
7. Tool ghép **từng biến thể**. Không còn yêu cầu phải đủ 26/26 sản phẩm hoặc 130/130 size mới tạo file.
8. Bấm `TẠO FILE NHẬP SAPO`. Chỉ những biến thể đã có dữ liệu nguồn mới được đưa vào file; dòng chưa đọc được nguồn bị bỏ qua, tuyệt đối không tự coi là 0.

## Hai file Sapo được dùng thế nào

- **File xuất Sapo** là dữ liệu thật của shop: tên, SKU, size, ảnh, giá, Id sản phẩm, Id phiên bản. Đây là nơi tool tìm đúng biến thể cần cập nhật.
- **File mẫu nhập Sapo** chỉ dùng làm khuôn cột, đặc biệt là `Cửa hàng chính_Tồn kho` và `Id phiên bản`. Các dòng Iphone mẫu trong file này không được dùng để ghép sản phẩm.

## Nguyên tắc an toàn

- Không đọc được nguồn ≠ tồn bằng 0.
- Tồn `0` chỉ được ghi khi popup nguồn thực sự hiển thị hết hàng/0.
- Tool giữ tên, SKU, ảnh, giá và Id phiên bản theo file xuất Sapo.
- Có thể tạo file từ một phần biến thể đã ghép; các biến thể chưa có dữ liệu không xuất vào file.
- Không dùng API/token Sapo và không ghi trực tiếp vào Sapo.
