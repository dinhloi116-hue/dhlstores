# DHL Stock Sync – Chrome Extension

Phiên bản: **v0.23.9**.

## Đồng bộ tồn kho trực tiếp trên tab đang xem (v0.23.9)

Đây là chế độ thay thế cho cách quét trong tab/cửa sổ riêng của v0.23.4–v0.23.8.

1. Đăng nhập `si.aobongda.net` trong Chrome và **mở đúng trang danh mục** (ví dụ HD).
2. Giữ tab danh mục này ở trạng thái đang được chọn, mở DHL Stock Sync Side Panel.
3. Bấm **ĐỒNG BỘ TAB NÀY**. Extension đọc danh sách sản phẩm trực tiếp trên tab đã chọn.
4. Popup thật của từng sản phẩm lần lượt được mở, đọc màu/size/tồn, rồi đóng trước khi sang sản phẩm kế tiếp.
5. Theo dõi số sản phẩm và báo cáo tại Side Panel. Quét xong, chọn **TẢI FILE EXCEL** hoặc **ĐẨY LÊN SAPO** (thao tác thủ công).

**Không tạo tab/cửa sổ quét mới. Không tự đóng tab/cửa sổ của người dùng.** Không chuyển tab hoặc điều hướng trang trong lúc quét; nếu tab đã bị đóng, không còn được chọn hoặc đã đổi danh mục, tool dừng an toàn để tránh ghi tồn sai.

**Nút TÙY CHỌN NÂNG CAO** hỗ trợ quét toàn danh mục, sản phẩm đã chọn hoặc một sản phẩm. Chức năng **HỦY NGAY**, **DỪNG SAU SP NÀY** và **TIẾP TỤC** vẫn giữ, cùng kết quả/checkpoint từng sản phẩm.

### Tránh xuất sai tồn kho

- Không đọc được popup/thiếu dữ liệu **không được coi là tồn = 0**.
- Chỉ được xuất dữ liệu có SKU và tồn đã đọc hợp lệ; nếu ba sản phẩm đầu đều không đọc được biến thể, tool dừng sớm.
- Không tự động đẩy Sapo. **ĐẨY LÊN SAPO** chỉ được thực hiện khi người dùng bấm nút.
- Nếu popup cũ không đóng được, dừng/quét lại sau khi đóng popup đó trên tab nguồn; không ép thay bằng tồn 0.

## Giữ hồ sơ và kết nối

- Hồ sơ danh mục đã lưu, mapping SKU, lịch sử biến động tồn và cấu hình Sapo vẫn được giữ qua cập nhật.
- Side Panel đóng có thể dọn **cache tác vụ tạm đã hoàn tất**, nhưng không xóa hồ sơ/cấu hình.
- Khi tác vụ đang chạy hoặc tạm dừng, không dọn cache quét.

## Thêm sản phẩm mới

Mục **THÊM SẢN PHẨM MỚI** được tải khi người dùng mở; sử dụng để quét mẫu mới và xuất Excel/đăng Sapo theo thao tác cụ thể. Luồng này độc lập với nút đồng bộ tồn kho nói trên.

## Cập nhật qua GitHub Desktop

Repository: `dinhloi116-hue/dhlstores`. Nhánh tool: `feature/dhl-stock-sync-extension`.

1. Trong GitHub Desktop, chọn clone riêng đặt tại `D:\GitHub\DHL-Stock-Sync`, branch `feature/dhl-stock-sync-extension`.
2. Bấm **Fetch origin → Pull origin**.
3. Trong Chrome mở `chrome://extensions` → **Reload** extension đã nạp từ thư mục:
   `D:\GitHub\DHL-Stock-Sync\tools\dhl-stock-sync-extension`.
4. Mở tab danh mục cần quét, mở lại Side Panel và thử **ĐỒNG BỘ TAB NÀY**.

Không cần tải ZIP hoặc gỡ/cài lại extension mỗi lần cập nhật. GitHub Actions kiểm thử và đóng gói ZIP dự phòng; dữ liệu Chrome extension được lưu riêng với mã nguồn GitHub.

