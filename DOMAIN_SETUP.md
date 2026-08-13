# Hướng dẫn gắn tên miền `dhlstores.com`

Sau khi phiên bản website được lưu, mở phần **Settings → Domains** trong bảng quản trị dự án và chọn **Add domain**. Nhập chính xác `dhlstores.com`. Hệ thống sẽ hiển thị các bản ghi DNS cần thiết cho tên miền gốc và, nếu bạn muốn dùng, cả `www.dhlstores.com`.

> **Chỉ sử dụng chính xác các giá trị DNS hiển thị trong bảng quản trị tại thời điểm kết nối.** Không dùng bản ghi mẫu hoặc giá trị từ hướng dẫn cũ, vì thông tin xác minh có thể khác theo từng dự án.

| Bước | Thực hiện |
|---|---|
| 1. Thêm tên miền | Trong bảng quản trị dự án, thêm `dhlstores.com` tại **Settings → Domains**. |
| 2. Sao chép DNS | Sao chép từng bản ghi loại, tên máy chủ và giá trị đích mà giao diện hiển thị. |
| 3. Cập nhật nơi quản lý DNS | Mở nhà đăng ký/tài khoản DNS nơi bạn đã mua tên miền và thêm hoặc thay thế các bản ghi tương ứng. Nếu đã có bản ghi A, AAAA hoặc CNAME xung đột tại cùng một host, chỉ giữ cấu hình mà giao diện dự án yêu cầu. |
| 4. Xác minh | Quay về trang **Domains** và dùng nút xác minh khi bản ghi đã được lưu. DNS có thể cần thời gian để lan truyền. |
| 5. Hoàn tất HTTPS | Khi trạng thái xác minh thành công, chứng chỉ HTTPS được quản lý tự động. Kiểm tra cả `https://dhlstores.com` và phiên bản `www` nếu đã cấu hình. |

Trước khi chuyển lưu lượng chính thức, nên mở thử trang chủ, danh mục, trang chi tiết một tài nguyên, giỏ hàng và quy trình thanh toán trên tên miền mới. Thông tin liên hệ trong chân trang hiện đang chờ chủ cửa hàng cung cấp; nên bổ sung trước khi giới thiệu website rộng rãi.
