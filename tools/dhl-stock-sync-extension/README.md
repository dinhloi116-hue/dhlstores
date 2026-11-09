# DHL Stock Sync – Chrome Extension

Phiên bản: **v0.24.5**.

## Chỉ quét sản phẩm thuộc lưới trang danh mục đang hiển thị (v0.24.5)

- **ĐỒNG BỘ TAB NÀY** chỉ nhận những thẻ sản phẩm có ảnh, giá, nút thêm vào giỏ và liên kết chi tiết trong lưới sản phẩm chính của trang hiện tại; không quét từ mọi liên kết HTML như trước.
- Ví dụ trang HD có 24 thẻ trong ảnh, nhưng lượt quét cũ phát hiện 25 sản phẩm (có thể lẫn ĐT Đức trẻ em). Sau sửa, sản phẩm nằm ngoài lưới chính sẽ bị loại.
- **Không tự chuyển sang trang 2/3/4** hoặc lấy các trang phân trang khác. Muốn quét những trang đó cần mở đúng trang tương ứng và chạy lượt khác.
- Khi chọn **QUÉT LẠI MẪU LỖI**, checkpoint cũ được đối chiếu theo ID với danh sách đang hiển thị: bỏ mục ngoài trang, giữ kết quả đã xác minh của sản phẩm trùng ID và tiếp tục mẫu thực sự thiếu.
- Trước mỗi popup, công cụ xác minh ID thuộc lưới đang hiển thị; dừng sản phẩm ngoài trang thay vì quét nhầm.
- Có regression test mô phỏng 24 thẻ HD và một liên kết ĐT Đức trẻ em nằm ngoài lưới. CI không thay thế được thử nghiệm trên DOM thực của website.

## Hết hàng nghĩa là tồn kho 0 (v0.24.4)

- Khi cột `Tình trạng tồn` của một size ghi đúng **Hết hàng**, lưu giá trị `stock=0`; đây là một kết quả hợp lệ, không phải thiếu dữ liệu.
- Màu Đỏ, Kem, Trắng Hoa có thể có **cùng** bộ S/M/L/XL/XXL đều hết hàng. Sau khi đổi màu, radio đã được xác nhận và các dòng `Hết hàng` ổn định ít nhất 1,5 giây, kết quả 0 hợp lệ **ngay cả khi chữ ký số tồn không đổi**.
- Chỉ dùng cơ chế này khi size của màu đã đọc đủ và tất cả dòng đều ghi rõ `Hết hàng`. Nếu bảng chưa tải, chưa chọn được màu hoặc tồn không xác định, vẫn báo thiếu và quét lại, tuyệt đối không tự chuyển thiếu dữ liệu thành 0.
- Có unit test cho 5 size hết hàng, hai màu cùng tồn 0, màu chưa được chọn và bảng tồn dương chưa chuyển; test thêm quy tắc SKU với stock 0 và quality gate.
- Khi đã quét xác minh đủ, biến thể tồn 0 vẫn có thể xuất/đẩy Sapo theo thao tác thủ công.

## Tự quét lại sản phẩm chưa đủ dữ liệu (v0.24.3)

- Sau khi quét một lượt, tự động xác định các sản phẩm còn thiếu màu/size/tồn hoặc popup lỗi và **chỉ mở lại các mẫu đó trên đúng tab gốc**.
- Giữ nguyên kết quả sản phẩm đạt; kết quả quét lại thay thế đúng sản phẩm cũ, không cộng dồn/trùng SKU. Không gộp tồn từ hai popup lỗi ở hai thời điểm khác nhau.
- Tự động quét lại tối đa 4 lượt cho các mẫu chưa đạt (mỗi lượt có cơ chế thử lại popup nội bộ). Nếu vẫn lỗi, tạm dừng với nút **TIẾP TỤC QUÉT LỖI**; không quét vô hạn gây nghẽn website.
- Khi tiếp tục, giữ checkpoint và chỉ quét lại số mẫu còn lỗi. Nếu hủy, không mở thêm popup.
- Không tự xuất Excel hoặc đẩy tồn Sapo khi vẫn có mẫu chưa được xác minh. Kết quả quét lỗi được giữ để xem báo cáo.

## Chỉ đọc đúng bảng size/tồn trong popup (v0.24.2)

- Bảng tồn chuẩn có cột **Tên size** và **Tình trạng tồn**. Không dò số từ toàn bộ nội dung modal, nên giá `70.000đ` và mùa áo `26-27` không thể bị nhận nhầm thành size `70`/`26`.
- Nhận diện size của từng dòng đúng cột; chỉ coi tồn 0 khi cột tồn ghi rõ **Hết hàng** hoặc tồn 0.
- Quét màu Đỏ/Trắng trong cùng popup; xác minh đủ các size hiện diện trong bảng từng màu. Nếu bảng chưa tải hoặc màu không xác minh được, chặn đầu ra như v0.24.1.
- Bổ sung kiểm thử tái hiện popup: S=6, M=17, L=22, XL=25, XXL=10. Vẫn phải kiểm tra bằng popup thực tế trước khi dùng đẩy Sapo.

## Kiểm tra chất lượng tồn kho trước khi xuất (v0.24.1)

- Quét và xác minh **size độc lập cho từng màu**. Size số của màu đầu (ví dụ 70) không được suy diễn sang màu khác (ví dụ 26/28).
- Nếu bảng chưa xác nhận một màu hoặc chưa đọc được một size, cảnh báo trạng thái chưa xác minh; không coi như đã hết hàng.
- Trường hợp thiếu dữ liệu sẽ quét thử lại popup sản phẩm. Nếu vẫn chưa đầy đủ, kết quả được lưu để xem lỗi nhưng **không tạo Excel nhập tồn hoặc đẩy Sapo**.
- Chặn đẩy ngay trong background, không chỉ vô hiệu hóa nút giao diện. Dữ liệu đệm phiên bản cũ cũng không được tự mặc định là an toàn.
- Không lấy lịch sử tồn thiếu dữ liệu làm mốc so sánh hàng đã bán/hết.
- Bản này có thêm kiểm thử logic so khớp size theo từng màu và bộ kiểm tra an toàn. Cần kiểm nghiệm với popup nguồn thực tế để kết luận mức chính xác.

## Quét thích ứng nhanh hơn (v0.24.0)

- Popup được thử mở theo nhịp ngắn hơn, không chờ lâu ở từng nút không phản hồi. Có thêm khoảng chờ dự phòng nếu popup đến chậm.
- Khi một màu chỉ trả một phần size nhưng dữ liệu đã ổn định, chuyển bước sớm hơn; **vẫn báo thiếu size và quét lại sản phẩm** trước khi xuất.
- Khi popup hiện đủ size, giữ xác nhận dữ liệu ổn định. Nếu không xác nhận được màu/size, không gán nhầm tồn kho của màu trước.
- Hiệu quả tăng tốc phụ thuộc số màu/size thực tế và tốc độ của website. Chưa đo thời gian thực tế trên cửa hàng nguồn.

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

