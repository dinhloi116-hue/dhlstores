# Hướng dẫn quản trị DHL Stores

Sau khi đăng nhập bằng tài khoản quản trị, mở **Tài khoản → Admin Dashboard** hoặc truy cập trực tiếp [trang quản trị](https://cuahangtoit-9a4r8wsz.manus.space/admin). Khu vực quản trị gồm các tab **Sản phẩm**, **Danh mục**, **Thư viện tệp**, **Đơn hàng** và **Tài khoản**.

## 1. Tạo hoặc chỉnh sửa danh mục

Trong tab **Danh mục**, nhập tên, slug và mô tả ngắn rồi chọn **Tạo danh mục**. Với một danh mục đã có, nhấn biểu tượng sửa để thay đổi thông tin hoặc bỏ chọn **Hiển thị danh mục công khai** để ẩn nó khỏi cửa hàng mà không xóa dữ liệu.

## 2. Nhập sản phẩm từ Excel

Trong **Catalog · Sản phẩm**, dùng khối **Nhập sản phẩm từ Excel** và bấm **Chọn file Excel**. Website nhận file `.xlsx` tối đa 10 MB, bao gồm file xuất từ Bizweb/Sapo như mẫu bạn đã dùng. Dữ liệu sẽ luôn được **xem trước** trước khi tạo bất kỳ sản phẩm nào.

| Cột Excel | Cách DHL Stores sử dụng |
|---|---|
| `Đường dẫn/Alias` | Slug/đường dẫn sản phẩm; sản phẩm trùng slug hiện có sẽ được bỏ qua, không ghi đè |
| `Tên sản phẩm*` | Tên sản phẩm; chỉ cần điền ở dòng đầu tiên của mỗi sản phẩm có nhiều biến thể |
| `Ảnh đại diện`, `Ảnh phiên bản` | URL ảnh bìa và ảnh của biến thể |
| `Giá` | Giá sản phẩm hoặc giá của mỗi biến thể |
| `Mã SKU` | SKU của biến thể |
| `Thuộc tính 1–3`, `Giá trị thuộc tính 1–3` | Nhóm lựa chọn như Màu sắc, Kiểu, Kích thước và giá trị tương ứng |
| `Mô tả sản phẩm`, `Tags` | Mô tả và thông tin bổ sung của sản phẩm |

Sau khi xem trước, chọn **danh mục đích**. Nếu chọn danh mục hàng vật lý, các dòng cùng Alias sẽ được gộp thành một sản phẩm và các dòng thuộc tính sẽ thành biến thể có SKU. Tồn kho nhập mặc định là `0` để bạn kiểm tra trước khi mở bán. Bất kỳ lỗi nào, chẳng hạn dòng mở đầu thiếu tên sản phẩm, đều hiển thị theo **số dòng** và chặn nút xác nhận nhập cho đến khi sửa file.

> Với file mẫu đã cung cấp, hệ thống nhận diện **1 sản phẩm, 38 biến thể và không có lỗi dữ liệu**. Hãy chọn danh mục phù hợp như **Nameset Chống Nhiễm** hoặc **Patch Tay** trước khi xác nhận nhập.

## 3. Thêm sản phẩm mới thủ công

Mở tab **Sản phẩm** và điền tên, slug, danh mục, giá, mô tả và thông số/định dạng. Ba danh mục trống mới là **Quần Áo Bóng Đá**, **Patch Tay** và **Nameset Chống Nhiễm** đã sẵn sàng để chọn. Chọn **Nổi bật** nếu muốn xuất hiện trong khu vực giới thiệu. Chọn **Hiển thị công khai** khi sản phẩm sẵn sàng bán; bỏ chọn để lưu nháp hoặc tạm ẩn.

## 4. Quản lý hàng vật lý, biến thể và tồn kho

Khi chọn một trong ba danh mục hàng vật lý, biểu mẫu sản phẩm hiển thị trường **Tồn kho tổng**. Dùng trường này nếu sản phẩm không phân kích thước hoặc màu sắc. Nếu có nhiều phiên bản, sau khi tạo sản phẩm hãy mở tab **Biến thể**, chọn sản phẩm đó rồi thêm từng kết hợp **kích thước**, **màu sắc**, **SKU**, **chênh giá** và **tồn kho**. Khi có biến thể, khách phải chọn một phiên bản còn hàng trước khi thêm vào giỏ.

Sản phẩm vật lý mới hoặc nổi bật tự xuất hiện trong khu vực **Hàng Thể Thao Mới & Nổi Bật** trên trang chủ ngay khi bật **Hiển thị công khai**. Khu vực này đang hiển thị trạng thái chờ nếu chưa có sản phẩm vật lý được đăng.

## 5. Thêm ảnh và tệp tải xuống

Nhấn **Tải ảnh** để chọn ảnh đại diện, hoặc **Tải file** để đưa video, PDF, ZIP và các tệp hỗ trợ lên kho tệp của website. Mỗi tệp tối đa 20 MB. Sau khi tải thành công, liên kết tệp được tự điền vào sản phẩm và lưu trong tab **Thư viện tệp**.

Nếu kho tệp tạm thời chậm hoặc không phản hồi, dán trực tiếp **URL ảnh đại diện** hoặc **URL tệp tải xuống** trong biểu mẫu, sau đó lưu sản phẩm. Ảnh tải từ kho website hoặc URL công khai sẽ hiển thị trên bìa sản phẩm. Khách chỉ thấy liên kết tải khi đơn hàng của họ đã được xác nhận thanh toán.

Với **sản phẩm số**, ngay sau khi SePay xác nhận, màn QR tự chuyển thành nút **Tải ngay**. Nút này và danh sách tải trong tài khoản chỉ hiển thị trong **7 ngày** kể từ thời điểm thanh toán. Nếu dùng liên kết Google Drive ở chế độ công khai, liên kết đã bị khách sao chép ra ngoài website không thể bị thu hồi tự động bởi DHL Stores.

## 6. Giao hàng và theo dõi đơn

Khi giỏ có hàng vật lý, checkout yêu cầu tên, số điện thoại, địa chỉ và phương thức nhận hàng. Mức phí hiện có là **nhận tại cửa hàng 0 đ**, **giao tiêu chuẩn 30.000 đ** hoặc **giao nhanh 50.000 đ**. Phí giao được cộng vào QR thanh toán. Sau khi SePay xác nhận, đơn vật lý chuyển sang **Đang xử lý** và tồn kho sản phẩm hoặc biến thể sẽ giảm theo số lượng đã mua. Tại tab **Đơn hàng**, cập nhật tiếp sang **Đang giao hàng** rồi **Hoàn tất** theo thực tế.

> **Cấu hình hiện tại:** QR tự hủy sau **10 phút**. Đơn đã hết hạn không thể được xác nhận bởi giao dịch đến muộn. Trước khi mở bán thật, có thể đổi `PAYMENT_QR_TEST_TTL_MS` sang thời hạn khác phù hợp với quy trình vận hành.

## 7. Theo dõi đơn hàng và tài khoản

Tab **Đơn hàng** cho phép xem mã đơn, giá trị và cập nhật trạng thái xử lý. Tab **Tài khoản** cho phép khóa hoặc mở lại tài khoản khách thông thường. Không thay đổi quyền của tài khoản quản trị trong khu vực này.
