# Ghi nhận kiểm tra trực quan

- Phiên chủ cửa hàng tải dữ liệu Catalog sau khi hoàn tất yêu cầu; trạng thái rỗng chỉ xuất hiện trong lúc dữ liệu đang nạp.
- Tab Bán hàng · Đơn hiển thị đúng phân luồng: đơn digital chờ SePay, đơn vật lý chờ Techcombank và mốc Order.
- Trang Tài khoản đã xác minh đơn vật lý hiển thị “Chờ xác nhận thanh toán”, không còn lời hứa tải tệp.
- Trang sản phẩm vật lý hiển thị SKU theo thứ tự cửa hàng đặt, tồn kho từng SKU và lựa chọn Order trước.
- Mở trực tiếp `/admin?editProduct=30001` trong phiên chủ cửa hàng đã nạp sản phẩm vật lý vào cột SKU, với 38 SKU, sắp xếp nhanh, chỉnh giá/tồn kho từng dòng, chọn nhiều và biểu mẫu giá sỉ ở cột phải.
- Nút Sửa trong Catalog mở biểu mẫu đúng sản phẩm; nút bút chì của dòng SKU trong tab Biến thể mở biểu mẫu “Sửa biến thể” đúng trong phiên chủ cửa hàng.
- Cột SKU Catalog có thể hiển thị tạm thời 0 SKU trong lúc truy vấn đang tải; sau khi dữ liệu hoàn tất, sản phẩm Argentina hiển thị đủ 38 SKU trùng với tab Biến thể.
- Đối chiếu SKU `namearg-B-2026-0 nhỏ`: Catalog hiển thị giá 19.000 đ, tồn 0, đang bán; tab Biến thể hiển thị cùng SKU, tồn 0, điều chỉnh 0 đ và đang bán.
- Khu vực Tài khoản hiển thị biểu mẫu địa chỉ giao hàng, trạng thái trống khi chưa lưu địa chỉ và lịch sử đơn; đơn Order vật lý hiển thị mốc theo dõi cùng trạng thái chờ xác nhận, không kèm quyền tải tệp.
- Trang sản phẩm vật lý hiển thị 38 SKU; chọn SKU `10#MESSI` còn 20 hàng đổi giá hiển thị lên 69.000 đ, đánh dấu dòng tồn kho đang chọn và mở rõ hai lựa chọn Mua ngay/Order trước mà không tạo đơn.
