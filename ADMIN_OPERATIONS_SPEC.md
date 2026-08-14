# Đặc tả quản trị vận hành nâng cao

## Tham chiếu tồn kho

Tệp tham chiếu thể hiện quy trình quản lý một sản phẩm vật lý theo nhiều phiên bản. Mỗi phiên bản có tên, thuộc tính, SKU, giá, tồn kho và số lượng có thể bán. Người quản trị cần xem nhanh danh sách phiên bản ở một cột, chọn phiên bản để chỉnh sửa chi tiết ở cột còn lại, và xem lịch sử biến động tồn kho.

Phiên bản DHL Stores sẽ giữ các dữ liệu cần thiết cho vận hành cửa hàng: sản phẩm, biến thể, SKU, giá bán, số dư tồn, hàng đã giữ cho đơn QR, số lượng khả dụng và cảnh báo sắp hết. Bảng tồn kho sẽ ưu tiên thao tác hàng loạt bằng tìm kiếm, lọc, chọn nhiều dòng và tăng/giảm/đặt lại số lượng, thay vì buộc người quản trị mở từng phiên bản.

## Phạm vi quản trị nâng cao

Khu vực quản trị cần cung cấp quản lý thành viên, trạng thái chặn, số dư nội bộ có nhật ký, mã giảm giá, tổng quan đơn hàng và chỉ số truy cập đã có trong website. Nhãn điều hướng và danh mục sẽ được cấu hình trong quản trị để giảm phụ thuộc vào chỉnh sửa mã nguồn.

## Quyền và an toàn vận hành

Tài khoản `dinhhoangloi` được nâng lên vai trò **owner**. Vai trò này kế thừa mọi quyền quản trị nhưng giữ riêng các thao tác nhạy cảm: cấp hoặc thu hồi quyền quản trị, chỉnh số dư nội bộ, chặn tài khoản, tạo mã giảm giá và thay đổi nhãn hiển thị.

Mỗi thay đổi số dư hoặc tồn kho phải tạo nhật ký bất biến gồm người thao tác, lý do, số lượng trước/sau và thời điểm. Mã giảm giá không được ghi đè giá máy chủ: checkout phải tự xác minh hiệu lực, giới hạn dùng và ngưỡng đơn hàng trước khi giảm giá.
