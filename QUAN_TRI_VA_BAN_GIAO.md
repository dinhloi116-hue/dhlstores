# Quản trị, lưu trữ và bàn giao website

## 1. Vận hành hằng ngày không cần dùng mã nguồn

Chủ cửa hàng quản lý sản phẩm, SKU, tồn kho, giá sỉ, đơn hàng, tài khoản khách, số dư, tin nhắn và góp ý từ khu vực **Quản trị**. Khu vực **Trung tâm vận hành** dành cho các phần mở rộng như thành viên, số dư, mã giảm giá, nhật ký, cài đặt nhãn và QR hàng vật lý.

Để tự tạo một tài khoản khách nhằm kiểm thử theo góc nhìn người mua, chủ cửa hàng dùng trang **`/admin/test-customer`**. Tài khoản tại đây chỉ mang vai trò khách hàng; không được cấp quyền quản trị.

## 2. Tệp, ảnh và dung lượng lưu trữ

Ảnh, video và tệp sản phẩm được tải qua Catalog được lưu trong **kho đối tượng S3 tích hợp của dự án**. Cơ sở dữ liệu chỉ lưu tên tệp, loại tệp, dung lượng và đường dẫn an toàn; không lưu trực tiếp nội dung tệp trong bảng dữ liệu.

Trong **Trung tâm vận hành**, thẻ **Tệp Catalog** hiển thị số tệp và tổng dung lượng của các tệp đã tải lên thông qua Catalog. Đây là số liệu quản trị của tệp có metadata trong Catalog; không dùng để khẳng định hạn mức gói dịch vụ hoặc bao gồm mọi tệp kỹ thuật/đính kèm không đi qua Catalog.

## 3. Ví số dư và thanh toán

Khách tạo mã QR nạp tiền trong **Tài khoản → Ví số dư**. Mỗi mã nạp có nội dung riêng; hệ thống chỉ cộng số dư khi giao dịch VietinBank/SePay có đúng mã và đúng số tiền. Một mã giao dịch ngân hàng chỉ được xử lý một lần.

Khách có thể chọn **Thanh toán bằng số dư** ở checkout. Hệ thống trừ tiền và đổi trạng thái đơn trong cùng một giao dịch, vì vậy không thể chi tiêu hai lần trên cùng số dư. Chủ cửa hàng có thể cộng hoặc trừ số dư trong **Trung tâm vận hành → Thành viên**; mọi biến động giữ lại lý do và lịch sử.

## 4. Bàn giao mã nguồn và làm việc với lập trình viên khác

Chủ cửa hàng là người sở hữu dữ liệu và mã nguồn dự án. Để bàn giao hoặc làm việc với GitHub/Codex/lập trình viên khác, dùng **Settings → GitHub** trong khu quản lý dự án để xuất code sang một repository GitHub riêng tư. Sau đó có thể cấp quyền repository cho người phát triển hoặc để công cụ lập trình làm việc trên bản sao đó.

Khi bàn giao, không gửi các khóa bí mật hoặc chuỗi kết nối cơ sở dữ liệu qua chat, repository công khai hay file `.env` đã commit. Các khóa cần được tạo lại hoặc cấp riêng cho môi trường mới. Nếu tiếp tục lưu trữ và triển khai trong hệ thống hiện tại, website vẫn dùng hạ tầng S3, cơ sở dữ liệu và secrets đã cấu hình. Nếu chuyển hẳn sang bên khác, người phát triển cần chuẩn bị hạ tầng thay thế tương ứng trước khi đổi nơi chạy website.

## 5. Danh sách kiểm tra trước khi chuyển nơi vận hành

1. Xuất mã nguồn sang GitHub repository riêng tư.
2. Sao lưu danh sách sản phẩm, SKU, đơn hàng và danh sách khách theo quy trình được thống nhất.
3. Ghi nhận các tên biến môi trường cần thiết, nhưng không sao chép giá trị bí mật vào repository.
4. Kiểm thử đăng nhập, catalog, nạp số dư, checkout, SePay webhook và tải tệp trên môi trường mới.
5. Chỉ chuyển traffic sau khi đã đối chiếu dữ liệu và kiểm thử thanh toán thành công.
