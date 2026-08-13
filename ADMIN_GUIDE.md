# Hướng dẫn quản trị DHL Stores

Sau khi đăng nhập bằng tài khoản quản trị, mở **Tài khoản → Admin Dashboard** hoặc truy cập trực tiếp [trang quản trị](https://cuahangtoit-9a4r8wsz.manus.space/admin). Khu vực quản trị gồm các tab **Sản phẩm**, **Danh mục**, **Thư viện tệp**, **Đơn hàng** và **Tài khoản**.

## 1. Tạo hoặc chỉnh sửa danh mục

Trong tab **Danh mục**, nhập tên, slug và mô tả ngắn rồi chọn **Tạo danh mục**. Với một danh mục đã có, nhấn biểu tượng sửa để thay đổi thông tin hoặc bỏ chọn **Hiển thị danh mục công khai** để ẩn nó khỏi cửa hàng mà không xóa dữ liệu.

## 2. Thêm sản phẩm mới

Mở tab **Sản phẩm** và điền tên, slug, danh mục, giá, mô tả và thông số/định dạng. Ba danh mục trống mới là **Quần Áo Bóng Đá**, **Patch Tay** và **Nameset Chống Nhiễm** đã sẵn sàng để chọn. Chọn **Nổi bật** nếu muốn xuất hiện trong khu vực giới thiệu. Chọn **Hiển thị công khai** khi sản phẩm sẵn sàng bán; bỏ chọn để lưu nháp hoặc tạm ẩn.

## 3. Quản lý hàng vật lý, biến thể và tồn kho

Khi chọn một trong ba danh mục hàng vật lý, biểu mẫu sản phẩm hiển thị trường **Tồn kho tổng**. Dùng trường này nếu sản phẩm không phân kích thước hoặc màu sắc. Nếu có nhiều phiên bản, sau khi tạo sản phẩm hãy mở tab **Biến thể**, chọn sản phẩm đó rồi thêm từng kết hợp **kích thước**, **màu sắc**, **SKU**, **chênh giá** và **tồn kho**. Khi có biến thể, khách phải chọn một phiên bản còn hàng trước khi thêm vào giỏ.

Sản phẩm vật lý mới hoặc nổi bật tự xuất hiện trong khu vực **Hàng Thể Thao Mới & Nổi Bật** trên trang chủ ngay khi bật **Hiển thị công khai**. Khu vực này đang hiển thị trạng thái chờ nếu chưa có sản phẩm vật lý được đăng.

## 4. Thêm ảnh và tệp tải xuống

Nhấn **Tải ảnh** để chọn ảnh đại diện, hoặc **Tải file** để đưa video, PDF, ZIP và các tệp hỗ trợ lên kho tệp của website. Mỗi tệp tối đa 20 MB. Sau khi tải thành công, liên kết tệp được tự điền vào sản phẩm và lưu trong tab **Thư viện tệp**.

Nếu kho tệp tạm thời chậm hoặc không phản hồi, dán trực tiếp **URL ảnh đại diện** hoặc **URL tệp tải xuống** trong biểu mẫu, sau đó lưu sản phẩm. Ảnh tải từ kho website hoặc URL công khai sẽ hiển thị trên bìa sản phẩm. Khách chỉ thấy liên kết tải khi đơn hàng của họ đã được xác nhận thanh toán.

Với **sản phẩm số**, ngay sau khi SePay xác nhận, màn QR tự chuyển thành nút **Tải ngay**. Nút này và danh sách tải trong tài khoản chỉ hiển thị trong **7 ngày** kể từ thời điểm thanh toán. Nếu dùng liên kết Google Drive ở chế độ công khai, liên kết đã bị khách sao chép ra ngoài website không thể bị thu hồi tự động bởi DHL Stores.

## 5. Giao hàng và theo dõi đơn

Khi giỏ có hàng vật lý, checkout yêu cầu tên, số điện thoại, địa chỉ và phương thức nhận hàng. Mức phí hiện có là **nhận tại cửa hàng 0 đ**, **giao tiêu chuẩn 30.000 đ** hoặc **giao nhanh 50.000 đ**. Phí giao được cộng vào QR thanh toán. Sau khi SePay xác nhận, đơn vật lý chuyển sang **Đang xử lý** và tồn kho sản phẩm hoặc biến thể sẽ giảm theo số lượng đã mua. Tại tab **Đơn hàng**, cập nhật tiếp sang **Đang giao hàng** rồi **Hoàn tất** theo thực tế.

> **Cấu hình hiện tại:** QR tự hủy sau **10 phút**. Đơn đã hết hạn không thể được xác nhận bởi giao dịch đến muộn. Trước khi mở bán thật, có thể đổi `PAYMENT_QR_TEST_TTL_MS` sang thời hạn khác phù hợp với quy trình vận hành.

## 6. Theo dõi đơn hàng và tài khoản

Tab **Đơn hàng** cho phép xem mã đơn, giá trị và cập nhật trạng thái xử lý. Tab **Tài khoản** cho phép khóa hoặc mở lại tài khoản khách thông thường. Không thay đổi quyền của tài khoản quản trị trong khu vực này.
