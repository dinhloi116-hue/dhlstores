# Checklist kiểm thử cuối cho chủ cửa hàng

> Mục tiêu của checklist này là xác nhận các bước cần phiên đăng nhập, giao dịch ngân hàng hoặc thao tác thực tế của chủ cửa hàng. Không cần kiểm thử các phần kỹ thuật đã được kiểm tra tự động.

## Chuẩn bị

Đăng nhập bằng tài khoản chủ cửa hàng. Nếu cần thử từ góc nhìn khách, mở **`/admin/test-customer`**, tạo một username và mật khẩu tạm, sau đó đăng xuất rồi đăng nhập bằng tài khoản khách đó.

| Mức ưu tiên | Khu vực | Cần xác nhận | Kết quả mong đợi |
|---|---|---|---|
| Bắt buộc | Tài khoản chủ cửa hàng | Mở **Trung tâm vận hành → Thành viên** và chọn chính tài khoản chủ cửa hàng. | Có thể cộng/trừ số dư, yêu cầu lý do và lịch sử biến động xuất hiện. |
| Bắt buộc | Tài khoản khách thử | Mở **Tài khoản → Ví số dư**, nhập một số tiền thử và tạo QR. | QR VietinBank xuất hiện kèm mã nạp riêng; chưa chuyển tiền thì số dư không thay đổi. |
| Bắt buộc | Đối soát nạp tiền | Chuyển đúng số tiền bằng QR nạp thử nếu muốn xác minh SePay thực tế. | Một giao dịch chỉ cộng một lần, lịch sử ghi “Nạp ví SePay …”. |
| Bắt buộc | Thanh toán bằng ví | Thêm một sản phẩm digital giá thử vào giỏ, chọn **Thanh toán bằng số dư** tại checkout. | Số dư bị trừ đúng một lần; đơn digital hoàn tất và có nút tải ngay. |
| Bắt buộc | Hàng vật lý | Chọn SKU còn hàng, thêm địa chỉ, kiểm tra phí SPX và chọn thanh toán phù hợp. | Tổng trọng lượng/phí SPX hiển thị đúng; QR và trạng thái đơn phù hợp với hàng vật lý. |
| Nên kiểm tra | Tải tài nguyên số | Mở lại đơn digital đã thanh toán trong Tài khoản. | Link tải hiển thị trong cửa sổ bảy ngày và không hiển thị cho hàng vật lý. |
| Nên kiểm tra | Tồn kho | Trong Catalog chỉnh tồn kho một SKU, sau đó mở trang sản phẩm. | Số lượng, trạng thái còn hàng và khả năng mua phản ánh dữ liệu mới. |
| Nên kiểm tra | Ảnh SKU | Rê chuột trên dòng SKU có ảnh ở trang sản phẩm desktop. | Preview ảnh lớn mở rõ ràng, không cản trở việc chọn SKU. |
| Nên kiểm tra | Tài sản tệp | Tải một ảnh hoặc tệp thử qua Catalog, mở Trung tâm vận hành. | Thẻ **Tệp Catalog** tăng số tệp/tổng dung lượng theo metadata tệp vừa tải. |
| Nên kiểm tra | Tin nhắn/Góp ý | Gửi một tin nhắn và một góp ý có ảnh nhỏ. | Hộp thư quản trị nhận được nội dung, ảnh và trạng thái chưa đọc. |

## Nếu phát hiện vấn đề

Ghi lại tên trang, thao tác vừa bấm, ảnh màn hình và thời điểm gặp lỗi. Với phần thanh toán, không chuyển khoản lặp lại nếu số dư/đơn chưa cập nhật; hãy chờ đối soát trong thời gian ngắn và kiểm tra lịch sử biến động trước.

## Lưu ý khi kiểm thử trong cửa sổ xem trước

Thanh **Preview mode** của môi trường quản lý có thể nằm đè lên các nút cố định sát cuối trang và nhận click thay cho website. Nếu nút giỏ hàng, mua ngay hoặc một nút cuối trang không phản hồi trong cửa sổ xem trước, hãy kiểm tra lại trên phiên bản đã xuất bản hoặc trong một cửa sổ trình duyệt thông thường trước khi coi đó là lỗi của website.

## Kết quả cần gửi lại

Sau khi kiểm thử, chỉ cần gửi lại danh sách ngắn theo mẫu:

```text
[x] Tạo tài khoản khách thử
[x] Tạo QR nạp ví
[ ] Đối soát nạp tiền — ghi chú lỗi nếu có
[x] Thanh toán bằng số dư
[x] Phí SPX và đơn vật lý
[x] Tải tài nguyên số
```
