# Ghi nhận kiểm tra trực quan

- Phiên chủ cửa hàng tải dữ liệu Catalog sau khi hoàn tất yêu cầu; trạng thái rỗng chỉ xuất hiện trong lúc dữ liệu đang nạp.
- Tab Bán hàng · Đơn hiển thị đúng phân luồng: đơn digital chờ SePay, đơn vật lý chờ Techcombank và mốc Order.
- Trang Tài khoản đã xác minh đơn vật lý hiển thị “Chờ xác nhận thanh toán”, không còn lời hứa tải tệp.
- Trang sản phẩm vật lý hiển thị SKU theo thứ tự cửa hàng đặt, tồn kho từng SKU và lựa chọn Order trước.
- Mở trực tiếp `/admin?editProduct=30001` trong phiên chủ cửa hàng đã nạp sản phẩm vật lý vào cột SKU, với 38 SKU, sắp xếp nhanh, chỉnh giá/tồn kho từng dòng, chọn nhiều và biểu mẫu giá sỉ ở cột phải.
- Nút Sửa trong Catalog mở biểu mẫu đúng sản phẩm; nút bút chì của dòng SKU trong tab Biến thể mở biểu mẫu “Sửa biến thể” đúng trong phiên chủ cửa hàng.
