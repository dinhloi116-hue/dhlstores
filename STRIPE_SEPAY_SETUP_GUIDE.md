# Hướng dẫn cấu hình Stripe và SePay cho DHL Stores

Tài liệu này dành cho chủ cửa hàng. Mục tiêu là cấu hình **chế độ kiểm thử trước**, không tự ý bật giao dịch thật. Luồng dự kiến là Stripe cho sản phẩm số và SePay/VietinBank cho thanh toán QR trong nước.

## 1. Nguyên tắc an toàn

> Không dán secret key, webhook secret, API secret hoặc token ngân hàng vào mã nguồn, ảnh chụp màn hình, chat công khai hay GitHub. Chỉ nhập chúng trong mục Secrets của dự án.

Stripe xác nhận thanh toán không nên chỉ dựa vào trang khách được chuyển hướng về; server cần nhận và xác minh webhook để hoàn tất đơn hàng [1]. SePay gửi HTTP POST đến URL webhook khi phát sinh giao dịch và hỗ trợ xác thực bằng API key hoặc secret key; endpoint production phải là HTTPS [3].

| Thành phần | Mục đích | Chế độ nên dùng đầu tiên |
|---|---|---|
| Stripe Publishable key | Có thể dùng ở phía trình duyệt khi cần | `pk_test_...` |
| Stripe Secret key | Tạo Checkout và xác minh dữ liệu ở server | `sk_test_...` |
| Stripe webhook signing secret | Xác minh chữ ký webhook | `whsec_...` |
| SePay API/token | Quản lý hoặc kết nối webhook theo tài khoản SePay | Token test/sandbox nếu tài khoản hỗ trợ |
| SePay webhook secret | Xác minh header gửi đến server | Chuỗi ngẫu nhiên riêng, không dùng lại mật khẩu |

## 2. Chuẩn bị Stripe Test Mode

Đăng nhập [Stripe Dashboard](https://dashboard.stripe.com/) và bật **Test mode**. Tạo hoặc lấy các giá trị test trong khu vực Developers. Với DHL Stores, cần cung cấp riêng ba secret sau khi tính năng Stripe được bật trong dự án:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Không dùng `sk_live_...` ở giai đoạn này. Secret key phải đặt ở server-side; publishable key mới là loại có thể xuất hiện ở client. Nếu chưa có tính năng Stripe trong dự án, cần bật phần tích hợp Stripe trước rồi mới điền Secrets.

## 3. Tạo Stripe webhook test

Trong Stripe Dashboard, vào **Developers → Webhooks → Add endpoint**. Dùng URL webhook production của dự án theo endpoint mà ứng dụng cung cấp; không tự đoán đường dẫn. Chọn các sự kiện tối thiểu cho luồng hàng số, thường gồm `checkout.session.completed` và các sự kiện thanh toán thất bại cần theo dõi. Stripe khuyến nghị endpoint phản hồi mã `2xx` nhanh trước khi thực hiện xử lý nặng và xác minh chữ ký bằng signing secret [1].

Quy trình kiểm thử:

1. Tạo endpoint trong **Test mode**, không tạo trong Live mode.
2. Dán URL HTTPS của endpoint.
3. Sao chép signing secret `whsec_...` vào Secrets của dự án.
4. Tạo một đơn hàng số bằng thẻ test của Stripe, không dùng thẻ ngân hàng thật.
5. Kiểm tra webhook event, trạng thái đơn hàng và quyền tải trong thời hạn 7 ngày.
6. Thử giao dịch thất bại hoặc hủy checkout để bảo đảm hệ thống không mở quyền tải.
7. Chỉ chuyển sang Live mode sau khi webhook, idempotency và quyền tải đã được kiểm tra.

Stripe cung cấp Stripe CLI để chuyển tiếp và mô phỏng webhook khi phát triển cục bộ; không cần đưa secret live vào máy cá nhân [1] [2].

## 4. Chuẩn bị SePay

Trong [SePay Developer](https://developer.sepay.vn/en/), cần có tài khoản SePay và ít nhất một tài khoản ngân hàng đã liên kết. SePay yêu cầu URL công khai nhận POST; môi trường production phải dùng HTTPS [3]. Với DHL Stores, webhook cần xác minh bằng secret header trước khi ghi nhận tiền vào ví hoặc mở quyền tải.

Các thông tin cần chuẩn bị:

```text
SEPAY_WEBHOOK_API_KEY=<token/API key do SePay cấp>
SEPAY_WEBHOOK_SECRET=<chuỗi bí mật riêng, 32-64 ký tự>
SEPAY_ACCOUNT_NUMBER=<số tài khoản nhận tiền>
SEPAY_ACCOUNT_HOLDER=<tên chủ tài khoản>
SEPAY_BANK_CODE=<mã ngân hàng>
```

Không chia sẻ các giá trị trên trong ảnh hoặc tin nhắn. Thông tin tài khoản hiển thị cho khách chỉ nên là dữ liệu nhận tiền mà chủ shop chủ động công khai; API key và webhook secret phải giữ kín.

## 5. Cấu hình SePay webhook

Trong phần cấu hình webhook của SePay, nhập URL HTTPS của endpoint nhận giao dịch, chọn xác thực bằng `SECRET_KEY` hoặc phương án được tài khoản của bạn hỗ trợ, đặt secret riêng và chỉ đăng ký nhóm sự kiện cần thiết. Tài liệu SePay mô tả API upsert webhook tại `https://bankhub-api.sepay.vn/v1/webhook`, sử dụng Bearer token và cho phép `active` cùng danh sách `allow_events` [4].

Khi endpoint nhận request, server cần:

1. Đọc header xác thực, ví dụ `X-Secret-Key`.
2. So sánh bằng phép kiểm tra an toàn với secret lưu trong environment.
3. Kiểm tra số tiền, mã giao dịch, tài khoản nhận và trạng thái giao dịch.
4. Chống ghi nhận trùng bằng mã giao dịch hoặc event ID.
5. Chỉ cập nhật đơn hàng/ví sau khi dữ liệu hợp lệ.
6. Trả HTTP 200 sau khi tiếp nhận hợp lệ; nếu xử lý lỗi, ghi log an toàn và không ghi dữ liệu thanh toán giả.

SePay có cơ chế retry khi endpoint lỗi, vì vậy xử lý **idempotent** là bắt buộc: cùng một giao dịch gửi lại không được cộng tiền hoặc mở quyền tải lần thứ hai [3].

## 6. Checklist kiểm thử trước production

| Hạng mục | Đạt khi |
|---|---|
| Stripe test key | Bắt đầu bằng `sk_test_` và không xuất hiện trong client bundle |
| Stripe webhook | Chữ ký sai bị từ chối; event hợp lệ không tạo đơn trùng |
| Stripe checkout | Thanh toán thành công mới mở quyền tải; hủy/thất bại không mở quyền |
| SePay webhook | Secret sai bị từ chối; request lặp không cộng tiền lần hai |
| QR trong nước | Số tiền và nội dung hiển thị đúng, không lộ secret |
| Ví khách hàng | Cộng tiền đúng một lần và có lịch sử giao dịch |
| Quyền owner | Chỉ chủ shop được xem/chỉnh cấu hình quản trị |
| Production | Dùng HTTPS, secret production riêng, không dùng lại test secret |

## 7. Thứ tự gửi thông tin cho dự án

Khi đã sẵn sàng, gửi theo từng nhóm riêng trong mục Secrets của dự án: trước hết Stripe Test keys, sau đó SePay webhook credentials. Không gửi khóa Live cho tới khi đã xác nhận test thành công. Tôi sẽ chỉ tích hợp và kiểm thử server-side; việc chuyển Live mode, bật webhook thật và xác nhận giao dịch thật cần được chủ tài khoản thực hiện có chủ đích.

## Tài liệu tham khảo

[1]: https://docs.stripe.com/webhooks "Stripe — Receive events in your webhook endpoint"

[2]: https://docs.stripe.com/checkout/fulfillment "Stripe — Fulfill orders"

[3]: https://developer.sepay.vn/en/sepay-webhooks "SePay — What are SePay Webhooks?"

[4]: https://developer.sepay.vn/en/bankhub/api/api-webhook/cap-nhat-webhook "SePay — Create or update Webhook API"
