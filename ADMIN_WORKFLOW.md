# Mô hình tự quản trị DHL Stores

## Mục tiêu vận hành

Chủ cửa hàng quản lý danh mục, sản phẩm, ảnh đại diện và tệp tải xuống tại `/admin`, không cần chỉnh sửa mã nguồn. Mọi thao tác tạo, cập nhật hoặc ẩn dữ liệu yêu cầu tài khoản có vai trò `admin`.

## Dữ liệu và khả năng hiển thị

Danh mục và sản phẩm có trạng thái hiển thị độc lập. Khi danh mục hoặc sản phẩm được ẩn, chúng không còn xuất hiện công khai nhưng được giữ lại trong quản trị để bật lại hoặc chỉnh sửa. Mỗi sản phẩm gồm tên, slug, danh mục, giá, mô tả, thông số, dung lượng/định dạng, nhãn nổi bật, ảnh đại diện và tệp tải xuống.

## Lưu tệp

Ảnh, video và tệp sản phẩm được tải lên từ trình duyệt vào kho S3 của chính dự án. Cơ sở dữ liệu chỉ lưu metadata và đường dẫn `/manus-storage/...`; dữ liệu nhị phân không lưu trong database. Khi đơn hàng đã thanh toán, hệ thống hiển thị liên kết tải xuống đã cấu hình cho sản phẩm đó.

## Luồng quản trị

1. Tạo danh mục hoặc chọn danh mục có sẵn.
2. Tải ảnh đại diện và tệp sản phẩm vào thư viện tệp.
3. Tạo sản phẩm, chọn ảnh/tệp, điền giá cùng thông số và bật hiển thị.
4. Chỉnh sửa hoặc ẩn mục bất kỳ mà không ảnh hưởng dữ liệu đơn hàng cũ.
