# Mô hình bán hàng vật lý DHL Stores

## Biến thể sản phẩm

Mỗi sản phẩm vật lý có thể có nhiều biến thể độc lập theo **kích thước**, **màu sắc**, mã SKU, giá bán bổ sung (nếu có), tồn kho và trạng thái bán. Khách phải chọn một biến thể đang bán trước khi thêm hàng vật lý vào giỏ. Đơn hàng lưu lại tên biến thể tại thời điểm mua để quản trị dễ đối chiếu khi đóng gói.

## Nhận hàng và giao hàng

Nếu giỏ có ít nhất một hàng vật lý, checkout bắt buộc thu thập họ tên, số điện thoại, địa chỉ nhận và ghi chú. Tạm thời, cửa hàng cung cấp ba tùy chọn có thể quản trị lại về sau: **Nhận tại cửa hàng** (0 đ), **Giao tiêu chuẩn** (30.000 đ) và **Giao nhanh** (50.000 đ). Phí đã chọn được lưu cùng đơn hàng và cộng vào mã QR thanh toán.

## Trưng bày công khai

Sản phẩm thuộc danh mục hàng vật lý hiển thị nhãn **Hàng vật lý**, tồn kho và lựa chọn biến thể ở trang chi tiết. Trang chủ có thêm khu vực **Hàng thể thao mới & nổi bật**; chỉ hiện khi quản trị đã tạo sản phẩm vật lý đang bật hiển thị.

## Quy tắc đơn hỗn hợp

Một đơn có thể có cả tài nguyên số và hàng vật lý. Sau khi thanh toán thành công, tài nguyên số được mở quyền tải như hiện tại; hàng vật lý được chuyển sang trạng thái **Đang xử lý** để cửa hàng đóng gói và giao hàng.
