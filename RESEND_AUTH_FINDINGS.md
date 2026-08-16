# Kết quả chẩn đoán Resend 401

Ngày kiểm tra: 2026-08-16.

## Kết luận

Test cũ gọi `GET /api-keys`. Resend xác nhận API key có quyền `sending_access` chỉ được gửi email; các thao tác quản lý tài nguyên khác yêu cầu `full_access`. Vì vậy, key nhập đúng nhưng gọi endpoint quản lý API key vẫn có thể trả `401 restricted_api_key`; lỗi này không chứng minh key gửi email bị sai.

Tài liệu Resend cũng phân biệt `restricted_api_key` (401: key chỉ có quyền gửi, cần Full access cho thao tác khác) với `invalid_api_key` (403: key không hợp lệ). Khi gửi đến người nhận ngoài tài khoản thử nghiệm, Resend yêu cầu domain gửi đã được xác minh và trường `from` phải dùng địa chỉ thuộc domain đó.

## Nguồn

1. Resend Errors: https://resend.com/docs/api-reference/errors
2. Resend Verified Domains: https://resend.com/docs/dashboard/domains/introduction
3. Resend Send Email: https://resend.com/docs/api-reference/emails/send-email

## Hành động kỹ thuật

Không dùng `GET /api-keys` làm bài kiểm tra duy nhất cho key Sending access. Cần kiểm tra cấu hình `RESEND_FROM_EMAIL` có đúng domain đã xác minh và chỉ thực hiện gửi test thật khi có sự đồng ý rõ ràng, vì bất kỳ request `POST /emails` hợp lệ nào cũng tạo email gửi đi.
