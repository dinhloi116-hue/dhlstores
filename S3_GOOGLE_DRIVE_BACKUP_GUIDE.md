# Hướng dẫn lưu trữ và sao lưu DHL Stores

## 1. Phân biệt hai nơi lưu dữ liệu

**S3 của DHL Stores là kho vận hành chính.** Website lưu URL hoặc key của ảnh, video, PDF, ZIP và tệp sản phẩm ở đây; các bản ghi sản phẩm trong cơ sở dữ liệu chỉ giữ metadata và tham chiếu, không nên lưu toàn bộ bytes tệp trong database.

**Google Drive chỉ nên là kho sao lưu phụ.** Bản sao trên Drive không tự thay thế URL đang chạy trên website. Không đổi URL ảnh hoặc link tải trong database chỉ vì đã tạo bản sao; nếu đổi, các trang sản phẩm và đơn cũ có thể mất liên kết.

| Nhu cầu | Nơi nên dùng | Ghi chú |
|---|---|---|
| Hiển thị ảnh/tệp cho website | S3 của dự án | Giữ nguyên key/URL đang chạy |
| Sao lưu ngoại vi | Google Drive | Lưu bản sao và metadata, không thay link vận hành |
| Thông tin sản phẩm, quyền và đơn hàng | Database | Không lưu bytes tệp lớn trong database |

## 2. Quy trình sao lưu thủ công an toàn

Trước hết, xuất danh sách metadata từ khu vực quản trị: tên tệp, product ID, tên sản phẩm, loại MIME, kích thước, S3 key/URL và thời điểm cập nhật. Tiếp theo, tải bản gốc từ S3 về máy hoặc một thư mục tạm đã được bảo vệ, rồi tải lên Google Drive theo cấu trúc thư mục năm/tháng hoặc product ID. Giữ lại một file manifest CSV/JSON gồm tên tệp, hash SHA-256, kích thước và URL/key S3 hiện tại.

Sau khi tải lên Drive, mở thử một số tệp đại diện và so sánh kích thước/hash với bản tải từ S3. Chỉ xóa bản sao cũ sau khi bản mới đã kiểm tra. Không dán URL Drive thay vào trường URL S3 và không đặt file Drive ở chế độ công khai nếu tệp chứa nội dung nội bộ.

## 3. Điều kiện để tự động hóa sau này

Tự động hóa cần một tài khoản Google có quyền Drive API tối thiểu, thư mục đích riêng, cơ chế lưu OAuth refresh token an toàn, lịch chạy hoặc job nền, giới hạn kích thước/tốc độ và nhật ký kết quả. Job phải có idempotency: so sánh hash hoặc S3 ETag trước khi tải lại, không tạo bản sao vô hạn, xử lý retry, ghi nhận lỗi và gửi cảnh báo khi thất bại.

Không nên thực hiện job sao lưu trong request web đồng bộ vì tệp lớn có thể làm timeout. Nếu cần chạy định kỳ, dùng cơ chế Heartbeat/Schedule của dự án hoặc hạ tầng persistent phù hợp; trước khi viết code lịch chạy phải xác định rõ tần suất, quyền truy cập và chính sách lưu giữ.

## 4. Checklist vận hành

- [ ] Xác định danh sách tệp cần sao lưu và quyền truy cập của từng nhóm.
- [ ] Tạo thư mục Drive riêng, giới hạn người được chia sẻ.
- [ ] Xuất manifest trước khi sao lưu.
- [ ] Sao chép tệp từ S3, không thay URL sản phẩm.
- [ ] Kiểm tra hash/kích thước một mẫu sau khi tải.
- [ ] Lưu lại ngày sao lưu, người thực hiện và số tệp thành công/thất bại.
- [ ] Thử khôi phục một tệp vào thư mục tạm trước khi coi bản sao là hợp lệ.
- [ ] Không đưa khóa S3, OAuth token hoặc dữ liệu khách hàng vào GitHub, log hay tài liệu công khai.

## 5. Giới hạn hiện tại

DHL Stores hiện chưa tự động đồng bộ sang Google Drive. Hướng dẫn này chỉ mô tả quy trình an toàn và các điều kiện cần thiết. S3 vẫn là nguồn dữ liệu vận hành; Drive chỉ là bản sao dự phòng cho đến khi có cấu hình API, quyền và job được người quản trị xác nhận.
