# Project TODO — DHL Stores

- [x] Khởi tạo website kho tài nguyên số và storefront song ngữ Việt–Anh.
- [x] Thiết lập 10 danh mục tài nguyên số và luồng giỏ hàng cơ bản.
- [x] Chuyển website sang catalog tài nguyên số, không còn sản phẩm vật lý.
- [x] Xây dựng trang tài khoản, lịch sử đơn hàng và khu vực admin quản lý đơn hàng.
- [x] Lưu bền vững danh sách tài khoản, trạng thái active/blocked vào database thật sau khi kết nối hạ tầng ổn định.
- [ ] Kiểm thử thật tab admin khóa/mở khóa tài khoản với database đang kết nối và xác nhận tài khoản bị khóa không thể mua/tải.
- [x] Hoàn thiện popup đăng nhập/đăng ký theo mẫu tham khảo với lựa chọn rõ ràng giữa đăng nhập và tạo tài khoản trên cổng OAuth.
- [x] Chặn tài khoản bị khóa khỏi các luồng giỏ hàng, thanh toán và tải file.
- [x] Thiết kế checkout SePay/VietQR: tóm tắt đơn, điều khoản, mã đơn hàng và trạng thái chờ thanh toán.
- [x] Thêm endpoint webhook SePay có xác thực API Key, đối chiếu mã đơn/số tiền và chống xử lý trùng giao dịch.
- [x] Xây dựng quản trị link Google Drive và chỉ trả link cho đơn đã thanh toán.
- [ ] Gắn link Google Drive thực tế cho từng sản phẩm cần bán.
- [ ] Ghi nhận đầy đủ migration Drizzle cho schema link Google Drive và xác nhận lịch sử migration đồng bộ với database.
- [ ] Gửi thử webhook SePay từ dashboard và xác nhận website trả HTTP 200.
- [ ] Kiểm tra end-to-end một giao dịch QR thật: đơn chờ → webhook → đã thanh toán → mở link Google Drive.
- [x] Viết Vitest cho tạo QR VietinBank và luồng QR → xác nhận → mở khóa file trong môi trường kiểm thử.
- [ ] Rà soát giao diện responsive, kiểm thử và lưu checkpoint bàn giao.
