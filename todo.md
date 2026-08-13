# Project TODO — DHL Stores

- [x] Khởi tạo website kho tài nguyên số và storefront song ngữ Việt–Anh.
- [x] Thiết lập 10 danh mục tài nguyên số và luồng giỏ hàng cơ bản.
- [x] Chuyển website sang catalog tài nguyên số, không còn sản phẩm vật lý.
- [x] Xây dựng trang tài khoản, lịch sử đơn hàng và khu vực admin quản lý đơn hàng.
- [ ] Lưu bền vững danh sách tài khoản, trạng thái active/blocked vào database thật sau khi kết nối hạ tầng ổn định.
- [ ] Hoàn thiện tab kiểm soát tài khoản admin trên dữ liệu database thật và kiểm thử khóa/mở khóa end-to-end.
- [ ] Thiết kế popup đăng nhập/đăng ký theo mẫu tham khảo và bắt buộc đăng nhập trước mua/tải.
- [ ] Chặn tài khoản bị khóa khỏi các luồng giỏ hàng, thanh toán và tải file.
- [x] Thiết kế checkout SePay/VietQR: tóm tắt đơn, điều khoản, mã đơn hàng và trạng thái chờ thanh toán.
- [x] Thêm endpoint webhook SePay có xác thực API Key, đối chiếu mã đơn/số tiền và chống xử lý trùng giao dịch.
- [ ] Thêm link Google Drive cho từng sản phẩm và chỉ hiển thị sau khi thanh toán được xác nhận.
- [x] Viết Vitest cho tạo QR VietinBank và luồng QR → xác nhận → mở khóa file trong môi trường kiểm thử.
- [ ] Rà soát giao diện responsive, kiểm thử và lưu checkpoint bàn giao.
