# Gắn tên miền dhlstores.com qua Cloudflare

Trước hết, trong phần **Domains** của website, thêm `dhlstores.com` và chờ hệ thống hiển thị trạng thái chờ xác minh cùng tên miền đích. Dùng chính tên miền đích mà màn hình này cung cấp; hiện tại đó là `cuahangtoit-9a4r8wsz.manus.space`.

Trong Cloudflare, mở **dhlstores.com → DNS → Records → Add record** và tạo bản ghi sau:

| Trường | Giá trị |
|---|---|
| Type | `CNAME` |
| Name | `@` |
| Target | `cuahangtoit-9a4r8wsz.manus.space` |
| Proxy status | `DNS only` (đám mây xám, trong lúc xác minh) |
| TTL | `Auto` |

Nếu Cloudflare không cho tạo CNAME tại tên miền gốc, hãy dùng lựa chọn CNAME flattening mặc định của Cloudflare. Không thêm bản ghi A hoặc AAAA cho `@` cùng lúc, vì chúng sẽ xung đột với CNAME.

Sau khi lưu, quay lại phần Domains của website và bấm kiểm tra/xác minh. DNS thường cập nhật trong vài phút, nhưng có thể cần tối đa 24 giờ. Khi chứng chỉ SSL đã hoạt động, có thể giữ DNS only để giảm rủi ro định tuyến; chỉ bật proxy Cloudflare khi tên miền đã xác minh và trang vẫn hoạt động bình thường.

Để hỗ trợ `www`, thêm bản ghi CNAME `www` trỏ tới `dhlstores.com`, cũng đặt **DNS only** lúc đầu. Sau đó đặt `dhlstores.com` làm tên miền chính trong phần Domains của website.
