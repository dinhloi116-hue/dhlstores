# Project TODO

- [x] Rà soát toàn bộ nội dung, dữ liệu và tài sản có sẵn trong thư viện dự án.
- [x] Xác định cấu trúc và phong cách trang bán hàng dựa trên nội dung đã có, không tạo đánh giá hoặc nhận xét khách hàng giả.
- [x] Hoàn thiện trải nghiệm website đáp ứng cho máy tính và thiết bị di động.
- [x] Kiểm thử tự động, kiểm tra giao diện và khắc phục các lỗi phát hiện được.
- [x] Lưu phiên bản đã xuất bản và hướng dẫn gắn tên miền dhlstores.com.
- [x] Rà soát mô hình dữ liệu, tuyến quản trị hiện có và phương án lưu ảnh/video/tệp phù hợp.
- [x] Cập nhật số Zalo 0963.898.871 tại khu vực liên hệ công khai.
- [x] Xây dựng quản trị danh mục để chủ cửa hàng có thể tự tạo, chỉnh sửa và ẩn danh mục.
- [x] Xây dựng quản trị sản phẩm để chủ cửa hàng có thể tự tạo, chỉnh sửa, ẩn và cập nhật ảnh, giá, mô tả, thông số cùng liên kết tải tệp.
- [x] Tích hợp thư viện tệp S3 của dự án để tải ảnh/video/tệp sản phẩm từ khu vực quản trị, không cần dùng mã nguồn hoặc Google Drive cho nội dung hiển thị.
- [x] Bổ sung kiểm thử cho API quản trị và kiểm tra giao diện quản trị trên máy tính lẫn điện thoại.
- [x] Bổ sung nhập URL dự phòng và thông báo lỗi rõ ràng cho ảnh/tệp sản phẩm khi dịch vụ lưu trữ tạm thời không phản hồi.
- [x] Lưu phiên bản xuất bản và hướng dẫn sử dụng khu vực quản trị cửa hàng.
- [x] Hiển thị và xác nhận thao tác sửa trực tiếp liên kết tải xuống trong màn hình sửa sản phẩm.
- [x] Đã hoãn theo yêu cầu: rà soát luồng đơn hàng và mô hình dữ liệu chi tiết cho sản phẩm vật lý.
- [x] Thêm các danh mục hàng vật lý: quần áo bóng đá, patch tay và nameset chống nhiễm.
- [x] Đã hoãn theo yêu cầu: quản trị tồn kho, kích cỡ, biến thể và trạng thái bán hàng vật lý.
- [x] Đã hoãn theo yêu cầu: thông tin nhận hàng và quy trình xử lý đơn vật lý sau thanh toán.
- [x] Đã hoãn theo yêu cầu: kiểm thử giỏ hàng, thanh toán và quản lý đơn vật lý chi tiết.
- [x] Tạo ba danh mục lớn trống: Quần áo bóng đá, Patch tay và Nameset chống nhiễm.
- [x] Xác nhận đường dẫn /admin cho chủ cửa hàng tự thêm sản phẩm vào các danh mục mới và xuất bản thay đổi.
- [x] Rà soát chi tiết giỏ hàng, checkout và mô hình dữ liệu để hỗ trợ sản phẩm vật lý.
- [x] Thiết kế và thêm dữ liệu biến thể sản phẩm vật lý theo kích thước, màu sắc, giá và tồn kho.
- [x] Bổ sung giao diện quản trị để tạo, sửa và ẩn biến thể cho từng sản phẩm vật lý.
- [x] Bổ sung bước thu thập thông tin nhận hàng, chọn phí giao hàng và tổng tiền thanh toán cho đơn vật lý.
- [x] Hiển thị riêng sản phẩm vật lý mới nhất hoặc nổi bật trên trang chủ.
- [x] Bổ sung kiểm thử cho biến thể, phí giao hàng, checkout vật lý và kiểm tra giao diện đáp ứng.
- [x] Bổ sung trạng thái chờ rõ ràng cho khu vực hàng vật lý khi chưa có sản phẩm công khai.
- [x] Lưu phiên bản xuất bản và cập nhật hướng dẫn vận hành hàng vật lý.
- [x] Rà soát luồng tạo đơn và xác nhận thanh toán để bổ sung thời hạn QR an toàn.
- [x] Tự hủy đơn QR chờ thanh toán sau 2.000 ms trong chế độ kiểm thử và hiển thị thông báo hết hạn.
- [x] Chặn xác nhận thanh toán cho đơn đã hết hạn và bổ sung kiểm thử.
- [x] Lưu phiên bản xuất bản chế độ kiểm thử, kèm hướng dẫn đổi lại thời hạn thực tế.
- [x] Rà soát sản phẩm và biến thể đang có giá trước khi chuyển sang cấu hình kiểm thử.
- [x] Chuyển giá sản phẩm và biến thể hiện có về 2.000 đ.
- [x] Xác minh tổng tiền trên cửa hàng và lưu phiên bản xuất bản giá kiểm thử.
- [x] Kiểm thử checkout để xác nhận hệ thống tính tổng 2.000 đ từ giá sản phẩm, không tin giá do trình duyệt gửi lên.
- [x] Lưu checkpoint xuất bản sau khi xác nhận luồng thanh toán giá kiểm thử.
- [x] Cập nhật thời hạn QR tự hủy từ 2 giây sang 10 phút và đồng bộ thông báo checkout.
- [x] Kiểm tra, xuất bản và bàn giao thời hạn QR 10 phút để thử thanh toán.
- [x] Rà soát quyền tải hiện có và mốc xác nhận thanh toán cho sản phẩm số.
- [x] Bổ sung API trả liên kết tải ngay chỉ cho đơn đã thanh toán và còn trong 7 ngày.
- [x] Thay màn QR đã thanh toán bằng nút Tải ngay cho sản phẩm số, giữ luồng xử lý cho hàng vật lý.
- [x] Kiểm thử chặn liên kết sau 7 ngày, kiểm tra giao diện và xuất bản bản cập nhật.
- [x] Kiểm thử API tải ngay để xác nhận đơn sản phẩm số quá bảy ngày không trả liên kết tải.
- [x] Kiểm tra trực quan trạng thái tải ngay và hết hạn sau thanh toán sản phẩm số.
- [x] Lưu checkpoint xuất bản cơ chế tải ngay bảy ngày.
- [x] Kiểm thử tRPC store.instantDownloads để xác nhận đơn số quá bảy ngày không nhận liên kết tải.
- [x] Xác nhận giao diện checkout thay QR bằng nút Tải ngay sau khi thanh toán đơn số.
- [x] Xác nhận hiển thị trạng thái liên kết tải hết hạn bảy ngày trong tài khoản.
- [x] Làm rõ thông điệp xác nhận thanh toán số để hướng dẫn khách bấm Tải ngay thay vì vào tài khoản.
- [x] Rà soát cơ chế xác thực hiện tại và các điểm tương thích cần giữ cho đơn hàng, tải tệp và quyền quản trị.
- [x] Bổ sung dữ liệu tài khoản nội bộ, mật khẩu băm và email liên kết với các ràng buộc duy nhất.
- [x] Xây dựng đăng ký, đăng nhập, đăng xuất và phiên truy cập an toàn bằng tên đăng nhập cùng mật khẩu.
- [x] Thêm giao diện tạo tài khoản, đăng nhập và liên kết email trong khu vực tài khoản.
- [x] Cấp quyền quản trị cho tài khoản chủ cửa hàng `dinhhoangloi` sau khi tài khoản này được tạo.
- [x] Kiểm thử luồng đăng ký, đăng nhập, liên kết email, quyền quản trị và xuất bản cập nhật.
- [x] Xác nhận trực quan luồng tạo tài khoản, đăng nhập và liên kết email trên giao diện với tài khoản chủ cửa hàng.
- [x] Xác nhận tài khoản chủ cửa hàng đã cấp quyền quản trị truy cập được `/admin`.
- [x] Xác nhận và cấp quyền quản trị cho tài khoản `dinhhoangloi` vừa được tạo.
- [x] Rà soát số lượng tồn kho sản phẩm và biến thể trong luồng đặt hàng hàng vật lý.
- [x] Chặn khách tạo đơn vượt số lượng tồn kho và hiển thị thông báo tồn kho rõ ràng.
- [x] Hoàn thiện quản trị tồn kho sản phẩm và biến thể, kiểm thử rồi xuất bản cập nhật.
- [x] Làm rõ đường dẫn liên kết email từ menu tài khoản và trang quản trị.
- [x] Bỏ hoặc thu gọn banner quản trị lớn để giao diện quản lý gọn hơn.
- [x] Thêm hiệu ứng hover, trạng thái chọn và phản hồi bấm mượt cho nút, thẻ và tab chính.
- [x] Kiểm tra trực quan giao diện mới trên máy tính, điện thoại và xuất bản cập nhật.
- [x] Xác nhận miền dhlstores.com và miền đích hiện tại của website để chuẩn bị cấu hình Cloudflare.
- [x] Hướng dẫn tạo bản ghi DNS Cloudflare và gắn dhlstores.com trong phần Domains của website.
- [x] Đã tạm dừng theo yêu cầu: không xác minh hoặc chuyển sang dhlstores.com cho đến khi chủ cửa hàng chủ động yêu cầu.
- [x] Tạm dừng cấu hình dhlstores.com cho đến khi website sẵn sàng vận hành.
- [x] Rà soát các trang mua hàng, giỏ, thanh toán, tài khoản và quản trị để xác định hạng mục cần hoàn thiện.
- [x] Sửa trang chi tiết sản phẩm để hiển thị lỗi hoặc trạng thái không tìm thấy thay vì quay vòng chờ tải.
- [x] Hoàn thiện các vấn đề ưu tiên được xác định trong quá trình rà soát.
- [x] Làm rõ trạng thái chưa liên kết email và nút liên kết email trên trang Tài khoản.
- [x] Tạo lối liên hệ Zalo trực tiếp từ chân trang để khách dễ nhận hỗ trợ.
- [x] Kiểm thử tổng thể và xuất bản phiên bản sẵn sàng vận hành.
- [x] Bỏ banner lớn ở trang chủ và thay bằng đầu trang gọn hơn.
- [x] Tăng cường hiệu ứng hover rõ ràng cho nút, danh mục và thẻ sản phẩm.
- [x] Kiểm tra trực quan, kiểm thử và xuất bản cập nhật giao diện trang chủ.
- [x] Thu gọn banner lớn còn lại ở trang danh mục sản phẩm và đồng bộ hover cho thẻ danh mục.
- [x] Kiểm thử desktop các luồng chính trên bản đã xuất bản: sản phẩm/SKU, giỏ, checkout hàng vật lý trước bước tạo QR, tài khoản/email, liên kết tải và quản trị; các thao tác chuyển tiền thật được giữ riêng trong `CHECKLIST_KIEM_THU_CHU_CUA_HANG.md`.
- [x] Lưu checkpoint xác nhận trạng thái vận hành sau kiểm thử tổng thể bằng phiên tài khoản thật (checkpoint `e464d342`).
- [x] Rà soát quyền của dinhhoangloi, dữ liệu hiện hữu và phân tích tệp PDF tham chiếu cho tồn kho.
- [x] Bổ sung dữ liệu thành viên phục vụ số dư nội bộ, trạng thái chặn và lịch sử thao tác quản trị.
- [x] Xây dựng mã giảm giá có thời hạn, điều kiện sử dụng và kiểm tra áp dụng an toàn khi thanh toán.
- [x] Bổ sung trang thống kê vận hành gồm thành viên, đơn hàng, doanh thu và lưu lượng truy cập có sẵn.
- [x] Cho phép chỉnh sửa nhãn tab/danh mục lớn trong quản trị mà không cần sửa mã nguồn.
- [x] Xây dựng bảng tồn kho hiện đại có lọc, tìm kiếm, chỉnh sửa hàng loạt và cảnh báo sắp hết hàng.
- [x] Bổ sung nhật ký quản trị cho chặn/mở khóa thành viên và thay đổi quyền, có thể xem theo tài khoản.
- [x] Sửa vòng đời mã giảm giá để chỉ tiêu hao lượt sau thanh toán thành công hoặc hoàn lượt khi QR bị hủy/hết hạn.
- [x] Hoàn thiện giao diện mã giảm giá với đơn tối thiểu, thời hạn bắt đầu-kết thúc và thao tác sửa.
- [x] Thêm bộ lọc nhật ký theo từng tài khoản trong Trung tâm vận hành và kiểm thử API lọc theo thành viên.
- [x] Kiểm thử phân quyền, ưu đãi, thao tác tồn kho hàng loạt và xuất bản quản trị nâng cao.
- [x] Kiểm thử trực quan desktop trên bản mới nhất: sản phẩm, giỏ hàng, checkout trước bước tạo QR, tài khoản/email, liên kết tải và quản trị.
- [x] Khắc phục tuyến trang chi tiết sản phẩm hợp lệ đang hiển thị 404.
- [x] Kiểm tra trực quan desktop giỏ hàng trên bản đã xuất bản: thêm SKU còn hàng, tăng số lượng từ 1 lên 2, xóa dòng và xác nhận trạng thái trống; dữ liệu thử đã được dọn sạch.
- [x] Kiểm tra luồng tải tệp desktop: đơn digital đã thanh toán hiện liên kết tải trong Tài khoản, đơn chờ/hủy không hiện liên kết; kiểm thử tự động xác nhận quyền truy cập hết hạn đúng mốc 7 ngày.
- [x] Sau kiểm thử trực quan tổng thể, lưu checkpoint xác nhận trạng thái vận hành bằng phiên tài khoản thật (checkpoint `e464d342`).
- [x] Rà soát và nhóm lại các tab quản trị để thao tác nhanh, dễ hiểu hơn.
- [x] Liên kết mỗi dòng tồn kho tới sản phẩm/biến thể tương ứng và mở thẳng chỉnh sửa sản phẩm.
- [x] Đồng bộ thao tác cập nhật tồn kho với tab Sản phẩm, hiển thị SKU, biến thể và trạng thái tồn rõ ràng.
- [x] Kiểm thử điều hướng tab quản trị mới và xuất bản cập nhật.
- [x] Thiết kế lại điều hướng quản trị theo nhóm Catalog, Kho, Đơn hàng và Khách hàng để thao tác dễ hiểu hơn.
- [x] Thêm nút trên từng dòng tồn kho để mở đúng sản phẩm hoặc biến thể tương ứng trong màn hình chỉnh sửa.
- [x] Đã thay thế theo bố cục ba cột: trạng thái tồn, SKU và biến thể được thao tác trực tiếp ở cột SKU trong Catalog; không còn bảng Tồn kho riêng.
- [x] Đối chiếu trực quan cùng một SKU giữa cột SKU Catalog và tab Biến thể, gồm mã SKU, tồn kho, giá điều chỉnh và trạng thái bán, trước khi đóng đồng bộ quản trị.
- [x] Bổ sung trường ảnh riêng cho biến thể để lưu URL ảnh phiên bản từ Excel và quản trị thủ công.
- [x] Cập nhật luồng nhập Excel để đưa cột Ảnh phiên bản vào từng biến thể thay vì bỏ mất dữ liệu.
- [x] Khôi phục ảnh cho 38 biến thể Nameset đã nhập và cho ảnh thay đổi theo biến thể trên trang chi tiết.
- [x] Kiểm thử, xuất bản và xác minh trực quan ảnh biến thể sau khi sửa lỗi.
- [x] Phân tích file HTML Tool người dùng cung cấp, bao gồm phụ thuộc, luồng dữ liệu và rủi ro tích hợp.
- [x] Thêm mục Tool có điều hướng rõ ràng trong DHL Stores và nhúng Tool HTML đã kiểm tra qua khung chạy cô lập.
- [x] Kiểm thử Tool trên máy tính/điện thoại, xuất bản và hướng dẫn truy cập.
- [x] Đưa phần chọn biến thể lên đầu khu vực thông tin sản phẩm, ngay sau giá bán.
- [x] Rút gọn mô tả sản phẩm dưới ảnh và thêm nút Xem thêm / Thu gọn.
- [x] Kiểm thử bố cục trang chi tiết trên máy tính/điện thoại và xuất bản cập nhật.
- [x] Thêm điều khiển sắp xếp SKU/biến thể theo tên, giá và tồn kho trên trang sản phẩm.
- [x] Chuyển ảnh đại diện sản phẩm và ảnh biến thể sang khung vuông rõ ràng, không phủ chữ hoặc nhãn lên nội dung ảnh.
- [x] Hiển thị bảng tồn kho theo SKU/biến thể, gồm ảnh nhỏ, trạng thái còn hàng và thao tác chọn biến thể để mua.
- [x] Kiểm thử trải nghiệm SKU/tồn kho/ảnh trên máy tính và điện thoại, rồi xuất bản cập nhật.
- [x] Rút gọn bộ sắp xếp SKU chỉ còn Theo tên và Theo giá tiền.
- [x] Kiểm thử và xuất bản cập nhật sắp xếp SKU tối giản.
- [x] Bổ sung sắp xếp SKU theo giá thấp → cao và giá cao → thấp, bên cạnh sắp xếp theo tên.
- [x] Phóng to ảnh SKU khoảng 200% khi rê chuột hoặc chạm xem trước, không che nội dung bảng.
- [x] Đổi mục Tool thành thư viện công cụ nổi bật, hỗ trợ mở rộng thêm nhiều Tool trong tương lai.
- [x] Thay luồng PET TRAM trong iframe dễ bị hạn chế bằng trang Tool độc lập trên cùng website; đã xác minh nạp ảnh mẫu và tạo tram hoạt động.
- [x] Mở rộng tài khoản khách hàng với địa chỉ giao hàng đã lưu cho đơn hàng vật lý.
- [x] Tách checkout hàng vật lý: thu thập/chọn địa chỉ giao hàng, không hiển thị quyền tải tệp và dùng QR thanh toán riêng.
- [x] Cấu hình QR thanh toán riêng cho hàng vật lý sau khi nhận thông tin ngân hàng/tài khoản của chủ cửa hàng.
- [x] Kiểm thử desktop SKU, Tool, hồ sơ địa chỉ và checkout vật lý bằng phiên đăng nhập phù hợp; SKU/tồn kho, địa chỉ mặc định, phí SPX và phương thức thanh toán đã được đối chiếu trên bản đã xuất bản, không tạo đơn hoặc thanh toán mới.
- [x] Đánh giá và thiết kế phương án đồng bộ Sapo theo SKU, nguồn tồn kho gốc là Sapo, chống xung đột và xử lý lỗi; phần kích hoạt production vẫn khóa an toàn.
- [x] Chuẩn bị kết nối Sapo Omni và giữ website ở chế độ không ghi kho cho đến khi Admin API production được xác minh.
- [x] Hoàn thiện thiết kế ánh xạ biến thể Sapo–website theo SKU và quy tắc báo SKU không khớp trước thao tác kho.
- [x] Hoàn thiện thiết kế nhật ký, khóa chống lặp và bù tồn cho đồng bộ hai chiều; chưa bật khi kết nối production chưa xác minh.
- [x] Đã xác định blocker xác minh Admin API Sapo: kết nối TLS bị đóng trước xác thực; website giữ đồng bộ ở chế độ tắt an toàn chờ chủ cửa hàng xác minh production.
- [x] Thêm trạng thái và nút kiểm tra kết nối Sapo chỉ dành cho chủ cửa hàng, không hiển thị khóa API và không thay đổi tồn kho; đã xác nhận bằng kiểm thử đơn vị, TypeScript và build.
- [x] Đặt khối chọn SKU và điều chỉnh số lượng cùng hàng; chuyển bảng tồn kho xuống cuối trang sản phẩm.
- [x] Thêm preview ảnh SKU thật sự khi hover/click, hiển thị ảnh phóng to ngoài ô thumbnail mà không bị cắt.
- [x] Hỗ trợ chạm thumbnail trên điện thoại để mở/đóng ảnh SKU phóng to an toàn.
- [x] Kiểm thử trực quan preview ảnh SKU trên desktop; phần điện thoại dừng theo yêu cầu ưu tiên của chủ cửa hàng.
- [x] Đã có xác nhận desktop cho preview SKU; không chụp thêm bằng chứng điện thoại theo yêu cầu ưu tiên mới.
- [x] Đã xác minh preview ảnh SKU trên desktop: mở ảnh lớn ngoài thumbnail, đóng an toàn và bảng SKU vẫn hoạt động.
- [x] Đã dừng kiểm thử preview SKU trên viewport điện thoại theo yêu cầu ưu tiên mới của chủ cửa hàng.
- [x] Không yêu cầu chụp bằng chứng preview SKU trên điện thoại theo yêu cầu ưu tiên mới của chủ cửa hàng.
- [x] Việt hóa toàn bộ nhãn, hướng dẫn và biểu mẫu cấu hình QR/ngân hàng cho hàng vật lý.
- [x] Kiểm thử trực quan nút Sửa trên dòng tồn kho cho cả sản phẩm và biến thể bằng tài khoản chủ cửa hàng, xác nhận mở đúng biểu mẫu chỉnh sửa.
- [x] Gộp tồn kho hàng loạt vào Catalog · Sản phẩm và bỏ tab tồn kho riêng trong điều hướng quản trị.
- [x] Hiển thị bảng tồn kho trong Catalog · Sản phẩm gồm sản phẩm, biến thể, SKU, tồn còn lại và số lượng đã giữ.
- [x] Cho phép chọn nhiều dòng tồn kho, nhập số lượng mới và lưu cập nhật hàng loạt ngay từ Catalog · Sản phẩm.
- [x] Kiểm thử giao diện quản trị hợp nhất và xuất bản cập nhật tồn kho.
- [x] Đã hủy theo yêu cầu: mở rộng danh mục lớn, nhóm con và dòng sản phẩm.
- [x] Đã hủy theo yêu cầu: quản trị danh mục con và chọn cấp danh mục khi thêm sản phẩm.
- [x] Đã hủy theo yêu cầu: lọc công khai theo danh mục nhiều cấp.
- [x] Đã hủy theo yêu cầu: kiểm thử phân loại danh mục nhiều cấp.
- [x] Đã hủy theo yêu cầu: mở rộng danh mục lớn–nhỏ; không áp dụng migration quan hệ danh mục cha–con.
- [x] Mở rộng từng sản phẩm bằng nhóm lựa chọn linh hoạt như màu sắc, kiểu dáng, size, chất liệu và SKU.
- [x] Cho phép tạo tổ hợp biến thể từ các lựa chọn sản phẩm, gắn giá và tồn kho riêng cho từng SKU.
- [x] Hiển thị các nhóm lựa chọn của sản phẩm trên trang chi tiết để khách chọn đúng biến thể trước khi mua.
- [x] Thêm quản trị nhóm lựa chọn ở cấp sản phẩm, ví dụ Màu sắc, Kiểu và Size, cùng nút tạo tổ hợp biến thể từ các giá trị đã nhập.
- [x] Cho phép sinh tự động SKU/biến thể từ tổ hợp lựa chọn, sau đó chỉnh riêng giá, tồn kho và trạng thái cho từng tổ hợp.
- [x] Phân tích file Excel mẫu người dùng cung cấp và xác định ánh xạ cột sang sản phẩm, danh mục, ảnh, giá và biến thể.
- [x] Xây dựng API quản trị để kiểm tra dữ liệu Excel và nhập hàng loạt sản phẩm/biến thể an toàn.
- [x] Thêm mục Nhập Excel trong Catalog · Sản phẩm: tải file, xem trước, báo lỗi theo dòng và xác nhận nhập.
- [x] Kiểm thử nhập liệu bằng file mẫu và viết hướng dẫn định dạng Excel.
- [x] Chạy đầy đủ luồng xem trước và nhập thực tế file Excel mẫu sau khi người dùng xác nhận danh mục đích, rồi đối chiếu sản phẩm/biến thể được tạo.
- [x] Lưu checkpoint sau khi xác nhận kiểm thử nhập Excel thực tế.
- [x] Nhập file Excel đã xác nhận vào danh mục Nameset Chống Nhiễm và đối chiếu số lượng sản phẩm/biến thể tạo được.
- [x] Bổ sung các khối nội dung cho trang chủ để giảm khoảng trống và làm rõ lợi ích, quy trình mua và danh mục nổi bật.
- [x] Kiểm thử giao diện trang chủ sau khi bổ sung nội dung, rồi xuất bản cập nhật.
- [x] Cấu hình QR VietQR Techcombank cho hàng vật lý: mã TCB, số tài khoản 19034203040019, tên chủ DINH HOANG LOI.
- [x] Bổ sung lựa chọn Order trước 7–10 ngày cho toàn bộ SKU hàng vật lý, giảm 10% so với mua ngay.
- [x] Lưu rõ loại mua ngay/Order, giá giảm và thời gian dự kiến ở cấp đơn hàng để cửa hàng xử lý chính xác.
- [x] Giữ nguyên toàn bộ lựa chọn SKU, tồn kho và thông tin giao hàng khi khách đổi giữa mua ngay và Order.
- [x] Hiển thị Order 7–10 ngày trong checkout, QR thanh toán và khu vực quản trị đơn hàng vật lý.
- [x] Kiểm thử giá Order giảm 10%, SKU, đơn hàng và QR Techcombank trước khi xuất bản.
- [x] Không áp dụng: kiểm thử iframe PET TRAM đã được thay bằng lối chạy Tool độc lập mặc định để tránh giới hạn sandbox/origin.
- [x] Nếu iframe vẫn bị giới hạn theo sandbox/origin, đổi luồng mặc định sang trang Tool độc lập và cập nhật thông báo để khách thao tác ổn định.
- [x] Sửa đường dẫn PET TRAM đang trả Not found và kiểm thử mở Tool từ thư viện.
- [x] Thêm khu vực Góp ý của khách hàng ở cạnh trái trang cửa hàng, lưu an toàn để chủ cửa hàng xem trong quản trị.
- [x] Thêm cổng nhắn tin trực tiếp giữa khách và chủ cửa hàng ở cạnh phải trên các trang chính.
- [x] Xây dựng hộp thư quản trị để dinhhoangloi đọc, trả lời, đánh dấu đã đọc và lọc hội thoại/góp ý.
- [x] Phát âm báo trong quản trị khi có tin nhắn hoặc góp ý mới, có nút bật/tắt rõ ràng.
- [x] Tạo thư viện khoảng 50 icon danh mục và thêm trường chọn icon khi tạo/sửa danh mục.
- [x] Đưa tồn kho cùng hàng với SKU trong bảng sản phẩm/biến thể để dễ đối chiếu.
- [x] Chỉnh vùng cuộn độc lập cho danh sách/khối đặt hàng để không kéo toàn bộ trang ngoài ý muốn.
- [x] Thêm preview các Tool khi rê chuột vào mục Công cụ trong điều hướng.
- [x] Viết kiểm thử cho góp ý, nhắn tin, trạng thái đã đọc và quyền quản trị; kiểm thử trực quan các luồng mới.
- [x] Hiển thị QR thanh toán trực tiếp trong trang sản phẩm để khách không cần chuyển sang trang thanh toán riêng.
- [x] Dùng QR Techcombank chung cho cả hàng số và hàng vật lý; không hiển thị hoặc yêu cầu cú pháp/nội dung chuyển khoản từ khách.
- [x] Giữ lựa chọn SKU, số lượng, Order trước và thông tin giao hàng khi khách mở QR tại trang sản phẩm.
- [x] Điều chỉnh tạo đơn, trạng thái chờ thanh toán và xử lý xác nhận để tương thích với QR chung không có nội dung đối soát.
- [x] Đã thay thế theo yêu cầu mới: kiểm thử QR VietinBank SePay tự đối soát cho digital và QR Techcombank không cú pháp, xác nhận thủ công cho hàng vật lý.
- [x] Đồng bộ hướng dẫn mua hàng công khai để bỏ mô tả SePay/cú pháp cũ, nêu QR Techcombank và bước chủ cửa hàng xác nhận tiền về.
- [x] Đặt mã SKU và trạng thái/số lượng tồn kho sát nhau trên cùng một hàng trong bảng SKU trang sản phẩm, rõ ràng ở desktop và điện thoại.
- [x] Kiểm thử trực quan bố cục SKU–tồn kho mới trên desktop và điện thoại trước khi xuất bản.
- [x] Sắp xếp quản trị sản phẩm theo ba cột: danh sách sản phẩm bên trái, tồn kho SKU có ảnh ở giữa và biểu mẫu sửa sản phẩm bên phải.
- [x] Hiển thị ảnh biến thể/SKU đầy đủ trong tồn kho quản trị để đối chiếu nhanh.
- [x] Mở rộng hộp góp ý và nhắn tin thành cửa sổ lớn, dễ đọc và dễ trả lời như hộp thoại chính.
- [x] Cho phép chủ cửa hàng xóa đơn hàng an toàn, hoàn tồn kho nếu đơn chưa thanh toán và ghi lại thao tác.
- [x] Thêm trang Đơn hàng của tôi cho khách với trạng thái hiện tại, ghi chú và liên kết theo dõi giao hàng do chủ cửa hàng nhập.
- [x] Thêm mốc Order: Đã đặt, Hàng đã về kho trung, Hàng đã ở Hà Nội sẵn sàng gửi và liên kết theo dõi sau cùng; chủ cửa hàng tự tích theo thực tế.
- [x] Di chuyển sắp xếp SKU sang quản trị; thứ tự chủ cửa hàng đặt được dùng cố định trên trang sản phẩm, không cho khách tự sắp xếp.
- [x] Viết kiểm thử và kiểm tra trực quan quản trị ba cột, xóa đơn, theo dõi đơn, mốc Order, liên kết giao hàng và thứ tự SKU.
- [x] Khôi phục QR VietinBank đã liên kết SePay cho đơn chỉ có sản phẩm digital để tự đối soát và mở tải ngay trong 7 ngày.
- [x] Giữ QR Techcombank chỉ cho đơn có hàng vật lý, không yêu cầu cú pháp và xác nhận tiền về thủ công.
- [x] Cập nhật QR, nhãn trạng thái và hướng dẫn mua tại trang sản phẩm theo đúng loại đơn hàng.
- [x] Kiểm thử đối soát SePay đơn digital, xác nhận thủ công đơn vật lý và quyền tải tệp sau thanh toán.
- [x] Thiết kế lại cả ba cột quản trị với vùng cuộn độc lập, giữ cột SKU ở giữa là khu thao tác chính.
- [x] Cho phép sửa trực tiếp giá, tồn kho, trạng thái và ảnh SKU trong cột giữa; hỗ trợ chọn nhiều SKU để cập nhật giá/tồn kho hàng loạt.
- [x] Thêm sắp xếp nhanh SKU theo tên và giá trong quản trị, bên cạnh kéo thả thứ tự hiển thị cố định cho khách.
- [x] Thêm cấu hình giá sỉ theo mốc số lượng 10, 25, 50 và cho phép chủ cửa hàng thêm/sửa/xóa mốc.
- [x] Áp dụng giá sỉ an toàn vào giỏ hàng, mua ngay, đơn hàng, QR và tổng tiền thanh toán.
- [x] Viết kiểm thử, kiểm tra trực quan desktop/mobile và xuất bản quản trị SKU cùng giá sỉ mới.
- [x] Sửa lịch sử đơn hàng để đơn vật lý không hiển thị trạng thái hoặc hướng dẫn tải tệp; thay bằng trạng thái xử lý/giao hàng phù hợp.
- [x] Tự gán icon phù hợp cho toàn bộ danh mục hiện có, gồm cả các nhóm hàng vật lý và tài nguyên số.
- [x] Sửa thẻ hàng thể thao trên điện thoại: bỏ lớp chữ/nhãn phủ ảnh, giữ ảnh vuông rõ ràng và đưa thông tin sản phẩm xuống phần nội dung thẻ.
- [x] Kiểm tra giao diện danh mục và thẻ hàng thể thao trên desktop/mobile trước khi xuất bản.
- [x] Sửa tuyến Giỏ hàng đang trả 404 để điều hướng đúng tới luồng giỏ/checkout hiện có.
- [x] Đặt mã SKU và tồn kho/trạng thái thành cụm ngang liền nhau trên từng dòng bảng tồn kho công khai, giữ ảnh SKU ở cột đối chiếu.
- [x] Kiểm tra desktop/mobile rằng cụm SKU–tồn kho không bị tách xa và preview ảnh SKU vẫn hoạt động.
- [x] Phóng to ảnh SKU khoảng 200% khi rê chuột tại trang chi tiết sản phẩm, không che cụm SKU–tồn kho hoặc cắt ảnh.
- [x] Di chuyển bảng tồn kho SKU lên ngay trong khối đặt hàng, ngang hàng với vùng chọn SKU và số lượng trên màn hình desktop.
- [x] Khắc phục preview ảnh SKU để rê chuột trên thumbnail luôn mở ảnh phóng to dễ nhìn, không bị che hoặc trôi khỏi vùng quan sát.
- [x] Kiểm thử trực quan lại bố cục đặt hàng–tồn kho và ảnh SKU phóng to trên desktop/mobile trước khi xuất bản.
- [x] Thiết kế lại khối chọn SKU, số lượng và Mua ngay/Order theo chiều rộng cân đối; không dùng cột tồn kho hẹp làm kéo dài toàn bộ khối mua hàng.
- [x] Đặt tồn kho SKU thành bảng rộng ngay dưới thao tác đặt hàng, vẫn trong cùng cụm mua để dễ đối chiếu mà không làm vỡ bố cục.
- [x] Giữ phóng to chỉ khi rê chuột vào thumbnail SKU; kiểm tra lại trực quan desktop/mobile trước khi xuất bản.
- [x] Thêm thanh hành động trong cột SKU để báo thứ tự đã thay đổi và có nút Lưu thứ tự SKU rõ ràng.
- [x] Thêm Hoàn tác để quay về thứ tự SKU đã lưu gần nhất trước khi người quản trị xác nhận lưu.
- [x] Kiểm thử kéo thả, lưu, hoàn tác và thứ tự hiển thị công khai của SKU trước khi xuất bản.
- [x] Mở rộng khung nội dung trang web và quản trị trên màn hình lớn để loại bỏ khoảng trắng thừa hai bên.
- [x] Giữ khoảng đệm và khả năng cuộn an toàn trên điện thoại sau khi nới khung desktop.
- [x] Kiểm thử trực quan desktop/mobile và xuất bản bố cục mở rộng.
- [x] Sửa preview thumbnail SKU để rê chuột trên desktop luôn mở ảnh lớn độc lập, kể cả SKU hết hàng.
- [x] Đặt SKU đang chọn, số lượng, Mua ngay và Order sát ngay dưới khu chọn SKU; không để bảng tồn kho chen giữa luồng mua.
- [x] Kiểm tra lại trực quan preview SKU và nhịp bố cục chi tiết sản phẩm trên desktop/mobile trước khi xuất bản.
- [x] Thêm tìm kiếm trong Catalog theo tên sản phẩm, SKU, tên biến thể và thuộc tính liên quan.
- [x] Hiển thị nút Lưu toàn bộ thứ tự SKU cố định trong cột SKU, kể cả khi chưa có thay đổi.
- [x] Kiểm thử tìm kiếm Catalog, lưu toàn bộ SKU và trạng thái chưa lưu trước khi xuất bản.
- [x] Tách trang chi tiết desktop thành ảnh sản phẩm cố định bên trái và vùng thao tác cuộn độc lập bên phải.
- [x] Bảo đảm hover thumbnail SKU trong bảng tồn kho mở preview ảnh lớn rõ ràng ngay trong vùng thao tác bên phải.
- [x] Kiểm thử vùng cuộn độc lập, preview SKU và bố cục điện thoại trước khi xuất bản.
- [x] Khi chọn sắp xếp SKU theo tên hoặc giá, tạo thứ tự nháp thực tế để nút Lưu toàn bộ thứ tự SKU được bật.
- [x] Cho phép lưu thứ tự theo tên/giá bằng một lần bấm và quay về chế độ thứ tự thủ công sau khi lưu.
- [x] Kiểm thử sắp xếp theo tên/giá, nút lưu và thứ tự khách nhìn thấy trước khi xuất bản.
- [x] Sửa dứt điểm preview ảnh SKU khi rê chuột bằng lớp hiển thị độc lập, không bị vùng cuộn che.
- [x] Kiểm tra hover thumbnail SKU trên desktop và chạm mở ảnh trên điện thoại trước khi xuất bản.
- [x] Thêm chỉ báo tổng quan SKU theo trạng thái: còn hàng, sắp hết, hết hàng, đang ẩn và thiếu ảnh.
- [x] Thêm bộ lọc nhanh SKU theo trạng thái xử lý và tìm SKU trong sản phẩm đang chọn.
- [x] Thiết kế lại hành động chọn nhiều SKU với thanh thao tác rõ ràng, xem trước số SKU bị ảnh hưởng và lưu/cancel trực quan.
- [x] Kiểm thử trực quan luồng tìm, lọc, chọn và chỉnh sửa SKU thông minh trước khi xuất bản.
- [x] Thêm phóng to ảnh sản phẩm lớn bên trái khi rê chuột trên trang chi tiết, không áp dụng cho thumbnail SKU.
- [x] Kiểm thử zoom ảnh lớn trên desktop và trải nghiệm ảnh tĩnh an toàn trên điện thoại trước khi xuất bản.
- [x] Thêm thanh tìm kiếm trên trang chủ với gợi ý sản phẩm theo tên, mô tả, SKU và danh mục khi khách nhập từ khóa.
- [x] Cho phép mở trang sản phẩm trực tiếp từ từng gợi ý và có trạng thái không tìm thấy rõ ràng.
- [x] Kiểm thử tìm kiếm gợi ý trên desktop/mobile trước khi xuất bản.
- [x] Thêm bộ chọn doanh thu theo Hôm nay, 7 ngày, 30 ngày, Tháng này và Năm nay trong quản trị.
- [x] Tính doanh thu đã thanh toán theo mốc thời gian chọn, đồng bộ nhãn khoảng thời gian hiển thị.
- [x] Kiểm thử bộ lọc doanh thu trên dữ liệu đơn hàng trước khi xuất bản.
- [x] Tách doanh thu đã thanh toán theo sản phẩm số và sản phẩm vật lý trong từng khoảng thời gian.
- [x] Hiển thị tổng doanh thu cùng hai khoản doanh thu số/vật lý rõ ràng trong quản trị.
- [x] Kiểm thử số liệu doanh thu tách nhóm trước khi xuất bản.
- [x] Cho phép khách đính kèm ảnh trong Tin nhắn và Góp ý, có xem trước trước khi gửi.
- [x] Hiển thị ảnh đính kèm an toàn trong hộp thư quản trị và cuộc hội thoại khách.
- [x] Kiểm thử gửi/hiển thị ảnh, phân quyền và trạng thái lỗi trong Tin nhắn/Góp ý.
- [x] Rà soát giao diện, tiện ích và vận hành để đề xuất lộ trình cải tiến theo mức ưu tiên.
- [x] Thêm khối lượng (gram) cho sản phẩm và SKU vật lý trong quản trị.
- [x] Tính phí SPX theo tổng khối lượng: đến 1 kg 20.000đ, đến 2 kg 30.000đ, đến 3 kg 40.000đ, sau đó tăng 10.000đ mỗi kg.
- [x] Đồng bộ khối lượng và phí SPX vào trang sản phẩm, giỏ hàng, checkout, đơn hàng và quản trị.
- [x] Kiểm thử các mốc phí SPX, đơn hỗn hợp và hiển thị desktop/mobile trước khi xuất bản.
- [x] Theo yêu cầu mới của chủ cửa hàng, dừng kiểm thử giao diện điện thoại và chỉ ưu tiên kiểm thử desktop cùng các chức năng vận hành.
- [x] Hiển thị rõ khối lượng thực tế và phí SPX đã tính trong quản trị đơn hàng, đồng thời nêu ước tính giao SPX ở trang sản phẩm vật lý trên desktop.
- [x] Sửa bố cục desktop trang sản phẩm để nút Thêm vào giỏ hàng và Mua ngay & chọn giao hàng luôn nằm trong vùng thao tác cuộn được, không phụ thuộc vào thao tác chuyển DOM theo nội dung nút.
- [x] Mở rộng preview ảnh SKU để rê chuột trên cả dòng SKU có ảnh đều xem được ảnh lớn, không chỉ giới hạn ở thumbnail.
- [x] Thêm khu tạo tài khoản khách thử nghiệm cho chủ cửa hàng trong quản trị, với username, tên hiển thị và mật khẩu tạm do chủ cửa hàng tự đặt.
- [x] Đã tạm hoãn theo yêu cầu: rà soát dịch vụ gửi email và chốt phương án email tự động cho mã giảm giá, khuyến mãi và sản phẩm mới.
- [x] Đã tạm hoãn theo yêu cầu: so sánh gói miễn phí của Resend, Mailchimp và Elastic Email trước khi tích hợp email.
- [x] Thêm ví số dư cho từng tài khoản, hiển thị số dư và lịch sử biến động trong mục Tài khoản.
- [x] Tạo QR nạp số dư qua VietinBank SePay với mã giao dịch riêng, tự đối soát và chống cộng trùng giao dịch.
- [x] Cho phép dùng số dư để thanh toán sản phẩm số và hàng vật lý, trừ số dư nguyên tử và mở khóa/tạo đơn theo đúng luồng thanh toán.
- [x] Cho phép chủ cửa hàng cộng hoặc trừ số dư cho bất kỳ tài khoản nào, bao gồm chính chủ cửa hàng, kèm lịch sử và lý do điều chỉnh.
- [x] Đồng bộ nhãn và thông báo checkout khi đơn đã được thanh toán ngay bằng số dư, không mô tả nhầm là QR ngân hàng.
- [x] Giải thích quy trình bàn giao mã nguồn/quyền quản trị và vị trí theo dõi dữ liệu lưu trữ của website.
- [x] Thêm thẻ thống kê dung lượng tệp đã đăng tải trong Trung tâm vận hành, gồm tổng số tệp và tổng dung lượng theo dữ liệu đã lưu.
- [x] Tổng hợp checklist duy nhất cho các thao tác cần chủ cửa hàng kiểm thử bằng tài khoản thật sau khi hoàn thiện kỹ thuật.
- [x] Đã xác minh không phải lỗi ứng dụng: lớp xem trước của môi trường chặn click nút Thêm vào giỏ; session replay cho thấy click bị nhận bởi `#manus-previewer-root` thay vì nút sản phẩm.
- [x] Kiểm tra trực quan desktop giới hạn tồn kho trên bản đã xuất bản: SKU `10#MESSI` có tồn 20, điều khiển số lượng dừng tại 20 và nút tăng bị khóa; kiểm thử máy chủ cũng xác nhận từ chối thêm khi biến thể không đủ tồn kho.
- [x] Ngăn thao tác tăng/giảm liên tiếp trong giỏ khi yêu cầu cập nhật số lượng đang xử lý, tránh gửi các yêu cầu lặp với dữ liệu tồn kho cũ; đã bổ sung hồi quy, chạy 67 kiểm thử, TypeScript và build thành công.

- [x] Mobile: không áp dụng bố cục Shopee cho toàn trang; đã thu hẹp theo yêu cầu chỉ hàng vật lý.
- [x] Mobile: hạng mục toàn trang không áp dụng; phần lưới 2 cột đã hoàn thiện riêng cho hàng vật lý.
- [x] Mobile: hạng mục toàn trang không áp dụng; trang chi tiết hàng vật lý đã hoàn thiện riêng.
- [x] Mobile: hạng mục toàn trang không áp dụng; thanh hành động cố định đã hoàn thiện riêng cho hàng vật lý.
- [x] Mobile: đã kiểm thử phạm vi hàng vật lý tại 375px/390px/430px và hồi quy trang số.
- [x] Mobile: đã cập nhật Vitest cho bộ lọc catalog vật lý và lưu checkpoint phiên bản 0e5d745c.
- [x] Sapo: giữ trạng thái đồng bộ hai chiều an toàn ở chế độ tắt, chờ chủ cửa hàng xác nhận kết nối production.

- [x] Mobile vật lý: áp dụng bố cục kiểu Shopee cho danh sách sản phẩm vật lý, không áp dụng cho sản phẩm số hoặc Tool.
- [x] Mobile vật lý: áp dụng trang chi tiết có ảnh lớn, biến thể ngang, vận chuyển và accordion thông tin.
- [x] Mobile vật lý: thêm hành động cố định Chat / Thêm vào giỏ / Mua ngay theo luồng hàng vật lý.
- [x] Mobile vật lý: kiểm thử riêng và hồi quy để bảo đảm trang sản phẩm số không bị thay đổi.

- [x] Desktop vật lý: áp dụng ngôn ngữ marketplace kiểu Shopee cho catalog hàng vật lý, gồm nền xám nhạt, vùng trung tâm rộng, header màu cam và lưới thẻ sản phẩm dày.
- [x] Desktop vật lý: làm nổi bật giá, nhãn khuyến mãi, tồn kho, danh mục và thao tác mua nhưng không sao chép nguyên mẫu 100%.
- [x] Desktop vật lý: thiết kế lại trang chi tiết theo tầng thông tin sản phẩm, shop, vận chuyển, biến thể và mô tả.
- [x] Desktop vật lý: kiểm thử desktop và hồi quy mobile/sản phẩm số, cập nhật Vitest và lưu checkpoint.

- [x] Tạo tab lớn Shop áo in và liên kết với danh mục sản phẩm riêng.
- [x] Tạo một sản phẩm áo in mẫu duy nhất để chủ cửa hàng kiểm thử.
- [x] Bảo đảm chủ cửa hàng có thể thêm, sửa, ẩn và xuất bản sản phẩm Shop áo in từ quản trị; dùng quyền Catalog hiện có của chủ cửa hàng.
- [x] Kiểm thử điều hướng, danh mục, sản phẩm mẫu và quyền quản trị; 21/21 test liên quan đạt và TypeScript sạch.

- [x] Shop áo in: thêm bộ lọc theo khoảng giá, kích thước và màu sắc.
- [x] Shop áo in: thêm phóng to ảnh sản phẩm khi rê chuột/chạm và hướng dẫn chọn size.
- [x] Shop áo in: thêm hệ thống đánh giá sao và bình luận khách hàng thật, không tạo dữ liệu giả.
- [x] Shop áo in: kiểm thử cả ba tính năng, cập nhật Vitest và lưu checkpoint; 22/22 test liên quan đạt.

- [x] Điều hướng: đổi thành ba tab lớn Quần Áo Bóng Đá, Shop Áo Thun In Hình và Tài Nguyên Số.
- [x] Điều hướng: nhóm các danh mục nhỏ hiện có vào đúng tab lớn, không làm mất đường dẫn sản phẩm.
- [x] Điều hướng: thêm preview khi di chuột vào tab/danh mục trên desktop và menu mở dễ chạm trên mobile.
- [x] Điều hướng: kiểm thử desktop/mobile, hồi quy sản phẩm số và lưu checkpoint; 22/22 test liên quan đạt.

- [x] Hàng vật lý: đưa lựa chọn Mua ngay và Order trước lên bước 1 trước chọn SKU/số lượng.
- [x] Hàng vật lý: giữ đúng giá giảm 10%, tồn kho và phí SPX theo hình thức đã chọn.
- [x] Hàng vật lý: kiểm thử mua ngay, Order trước, mobile/desktop và hồi quy sản phẩm số; 22/22 test liên quan đạt.

- [x] Hàng vật lý: thêm nhãn Bước 1/Bước 2/Bước 3 rõ ràng trên desktop cho khu vực mua hàng.
- [x] Hàng vật lý: hiển thị ngày giao dự kiến theo SKU đang chọn và hình thức Mua ngay/Order.
- [x] Hàng vật lý: cho phép đổi hình thức Mua ngay hoặc Order trực tiếp trong giỏ hàng, giữ đúng giá/tồn kho ở server.
- [x] Quy chuẩn: ghi lại quy trình trạng thái mua hàng vật lý thành skill dhl-physical-commerce; đã kiểm định hợp lệ.
- [x] Hàng vật lý: kiểm thử desktop/mobile, giỏ hàng, checkout và hồi quy sản phẩm số; 23/23 test liên quan đạt.

- [x] Tiền tệ: chuẩn hóa các ô nhập và hiển thị số tiền bằng dấu phân cách hàng nghìn, vẫn lưu giá trị số an toàn.
- [x] Ví: thêm phương thức thanh toán bằng số dư ví và hiển thị số dư hiện tại ở checkout.
- [x] Ví: thêm yêu cầu rút tiền, thông tin tài khoản nhận, trạng thái chờ duyệt/đã duyệt/từ chối và lịch sử đối soát.
- [x] Ví: giới hạn rút không vượt số dư khả dụng, giữ tiền ở trạng thái tạm khóa khi chờ duyệt và không tự động chuyển tiền thật.
- [x] Ví: viết/cập nhật Vitest cho thanh toán, rút tiền và định dạng tiền; 74/74 test chạy đạt, 1 test Sapo được skip có chủ đích.

- [x] Sửa lỗi click trực tiếp vào ba tab lớn không chuyển trang.
- [x] Giữ preview danh mục khi hover/mở mũi tên và bảo đảm menu mobile vẫn chạm được.
- [x] Kiểm thử điều hướng desktop/mobile, cập nhật Vitest và lưu checkpoint sửa lỗi; 75/75 test chạy đạt, 1 test Sapo được skip có chủ đích.

- [x] Hàng vật lý: trong hộp thanh toán cho chọn rõ Thanh toán bằng ví hoặc QR Techcombank trước khi tạo thanh toán.
- [x] Hàng vật lý: thêm ô nhập trực tiếp số lượng cạnh nút cộng/trừ, chuẩn hóa số nguyên và giới hạn theo tồn kho.
- [x] Hàng vật lý: kiểm thử hai phương thức thanh toán, số lượng nhập tay, giá/phí SPX và hồi quy sản phẩm số; 76/76 test chạy đạt, 1 test Sapo được skip có chủ đích.

- [x] Tài khoản: yêu cầu số điện thoại đã được bỏ theo yêu cầu; đăng ký dùng email hợp lệ và phần mã xác minh email giữ ở nhóm Auth email/Resend bên dưới.
- [x] Tài khoản: username và email được duy nhất hóa, chuẩn hóa email chữ thường; số điện thoại không còn nằm trong yêu cầu.
- [x] Quyền truy cập: yêu cầu đăng nhập cho giỏ hàng, mua hàng, checkout, ví, tải tài nguyên, đánh giá, nhắn tin/góp ý và đặt hàng; giữ trang xem sản phẩm công khai. Đã kiểm kê router, bổ sung kiểm tra tài khoản hoạt động cho đánh giá.
- [ ] Auth: kiểm thử mã xác minh, chống trùng, đăng nhập bắt buộc và hồi quy các luồng hiện có; cập nhật Vitest và lưu checkpoint.

- [x] Auth email: bỏ yêu cầu số điện thoại, đăng ký bắt buộc email duy nhất; chuẩn hóa email chữ thường và chặn trùng khi tạo tài khoản.
- [ ] Auth email: gửi mã xác minh email với thời hạn, giới hạn thử lại và không cho dùng mã đã hết hạn.
- [ ] Auth email: chống trùng email không phân biệt hoa thường và chặn tài khoản chưa xác minh dùng tính năng cần tài khoản.
- [x] Auth email: bảo vệ giỏ hàng, mua/checkout, ví, tải tài nguyên, đánh giá, nhắn tin/góp ý và đặt hàng; giữ xem sản phẩm công khai. Việc gửi mã xác minh vẫn chờ cấu hình email ngoài hệ thống.
- [ ] Auth email: kiểm thử đăng ký/xác minh/đăng nhập và hồi quy các luồng mua; cập nhật Vitest và lưu checkpoint.

- [x] Catalog vật lý: trạng thái Còn hàng/Hết hàng phải tính theo tổng tồn kho các SKU active, không chỉ tồn kho cấp sản phẩm.
- [x] Catalog vật lý: bỏ mô tả dài khỏi thẻ hàng vật lý; khách mở tên/thẻ để xem trang chi tiết.
- [x] Catalog vật lý: kiểm thử SKU còn hàng, thẻ hết hàng, mô tả mobile/desktop; 25/25 test mục tiêu đạt.

- [x] Checkout vật lý: thêm chọn Tỉnh/Thành phố và Xã/Phường theo bộ địa danh sau sáp nhập, kèm địa chỉ chi tiết.
- [x] Checkout vật lý: hiển thị thumbnail ảnh cạnh tên SKU/phiên bản trong luồng mua hàng.
- [x] Checkout vật lý: kiểm thử bộ chọn địa chỉ, thumbnail SKU và hồi quy thanh toán; 80 test đạt, 1 test Sapo được skip có chủ đích, build production đạt.

- [x] Resend: xác minh test hiện tại không nhầm endpoint quản lý API key với quyền Sending access.
- [ ] Resend: kiểm tra riêng quyền API key, địa chỉ người gửi và trạng thái domain trước khi bật mã xác minh email.
- [x] Resend: sửa test xác thực nhẹ và chỉ tiếp tục tích hợp auth email sau khi credentials được xác nhận hợp lệ.
- [ ] Resend: thêm domain gửi dhlstores.com hoặc subdomain gửi riêng vào Dashboard.
- [ ] Resend/Cloudflare: khai báo đầy đủ bản ghi DNS DKIM, SPF và MX/Return-Path theo giá trị Resend cung cấp.
- [ ] Resend: chọn địa chỉ From thuộc domain đã xác minh, ví dụ verify@dhlstores.com.
- [ ] Resend: kiểm tra lại domain và cập nhật luồng email verification sau khi DNS chuyển sang trạng thái Verified.
- [x] Thiết kế lại bảng chọn SKU trang sản phẩm vật lý: ảnh, giá, tồn kho và bộ điều khiển trừ/số lượng/cộng trên từng SKU.
- [x] Cho phép số lượng bằng 0 để khách chọn nhiều SKU trong cùng sản phẩm trước khi thêm giỏ.
- [x] Thêm API giỏ hàng hỗ trợ nhận nhiều SKU cùng lúc, chỉ tạo dòng cho SKU có số lượng lớn hơn 0.
- [x] Kiểm thử giới hạn tồn kho, thao tác tăng/giảm, thêm nhiều SKU và hiển thị desktop/mobile.

- [x] Thêm lựa chọn kiểu giao diện mua hàng theo từng sản phẩm vật lý: giao diện cũ hoặc giao diện bảng thuộc tính kiểu marketplace.
- [x] Hiển thị đúng giao diện đã chọn trên trang sản phẩm và giữ luồng giỏ hàng, mua ngay, Order, tồn kho tương thích.
- [x] Sửa preview ảnh SKU: rê chuột vào đúng dòng/ảnh SKU phóng to ảnh của SKU đó, không bị che hoặc nhầm ảnh.
- [x] Thêm quản trị lựa chọn giao diện khi tạo/sửa sản phẩm và kiểm thử desktop/mobile.

- [x] Marketplace: mở rộng khối mua hàng và giảm cảm giác bí của bảng SKU, giữ thao tác rõ trên desktop/mobile.
- [x] Marketplace: chỉ dùng vùng cuộn riêng khi danh sách SKU dài, tăng không gian cho ảnh và tên phiên bản.
- [x] Quản trị sản phẩm: thêm nhãn rõ ràng cho trường Giá bán và Tồn kho tổng thay vì chỉ hiển thị giá trị 0.
- [x] Kiểm thử hồi quy layout classic/marketplace, số lượng SKU, thêm giỏ và lưu sản phẩm.

- [x] Marketplace: đưa nút Thêm vào giỏ và Mua ngay lên ngay dưới tổng số lượng/phí SPX, không để bị khuất sau vùng cuộn SKU.
- [x] Giá sỉ: tính tổng số lượng của mọi SKU thuộc cùng một sản phẩm để chọn mốc giá sỉ chung.
- [x] Giá sỉ: hiển thị mốc/đơn giá đang áp dụng trong marketplace và giữ đúng tổng tiền ở giỏ, mua ngay, checkout.
- [x] Kiểm thử action bar, ví dụ tổng 5+15=20, giới hạn tồn kho và hồi quy thanh toán.

- [x] Marketplace: loại bỏ thanh kéo ngang; bảng SKU phải co giãn theo màn hình và chỉ cuộn dọc khi danh sách dài.
- [x] Marketplace mobile: bổ sung thanh hành động cố định với nút Thêm vào giỏ và Mua ngay luôn dễ bấm.
- [x] Marketplace: hiển thị tổng tiền tạm tính cập nhật ngay khi thay đổi số lượng SKU.
- [x] Marketplace: hiển thị rõ mốc giá sỉ và đơn giá đang áp dụng theo tổng số lượng.
- [x] Skill tái sử dụng: đánh giá và ghi lại quy trình triển khai giao diện mua nhiều SKU nếu phù hợp.

- [x] Marketplace: hiện thông báo thành công sau khi thêm SKU vào giỏ.
- [x] Marketplace: thêm nút Xóa tất cả để đưa toàn bộ số lượng SKU về 0.
- [x] Marketplace: highlight rõ các dòng SKU có số lượng lớn hơn 0.

- [x] Marketplace: thêm thanh tóm tắt cố định hiển thị tổng số lượng và tổng tiền tạm tính.
- [x] Marketplace: cho nhập số lượng trực tiếp bằng bàn phím và tự highlight dòng sau khi nhập.
- [x] Marketplace: thêm nút Xem giỏ hàng trong toast thành công và tự ẩn thông báo sau 3 giây.

- [x] Marketplace: thêm hiệu ứng ảnh sản phẩm bay vào biểu tượng giỏ sau khi thêm thành công.
- [x] Marketplace: hiển thị số tiền tiết kiệm từ giá sỉ trên thanh tóm tắt cố định.
- [x] Header: preview nhanh giỏ hàng khi rê chuột vào biểu tượng giỏ trên desktop.

- [x] Toast: xác nhận thêm giỏ có nút chuyển nhanh sang trang thanh toán.
- [x] Header mobile: thêm preview giỏ gọn, dễ thao tác trên thiết bị cảm ứng.
- [x] Marketplace: thêm tìm kiếm nhanh theo tên, thuộc tính hoặc mã SKU trong bảng chọn hàng loạt.

- [ ] Stripe digital: kích hoạt cổng thanh toán quốc tế, giữ nguyên QR/SePay cho khách Việt Nam.
- [ ] Stripe digital: tạo checkout, xác nhận webhook và chỉ mở quyền tải trong 7 ngày sau khi thanh toán thành công.
- [ ] Stripe digital: thêm lựa chọn thanh toán quốc tế rõ ràng trên luồng mua sản phẩm số.
- [ ] Stripe digital: kiểm thử sandbox và hướng dẫn cấu hình production an toàn.

- [x] Sản phẩm một SKU: đặt bộ điều khiển trừ/số lượng/cộng ngay cạnh tên SKU.
- [x] Sản phẩm nhiều SKU: giữ nguyên bảng chọn hàng loạt và không ảnh hưởng giá sỉ theo tổng SKU.
- [x] Kiểm thử một SKU, nhiều SKU, nhập số lượng, thêm giỏ và mua ngay.

- [x] Marketplace: ưu tiên SKU còn hàng lên đầu bảng, giữ thứ tự hiện có trong từng nhóm.
- [x] Kiểm thử SKU còn hàng/hết hàng, quantity và không ảnh hưởng giá sỉ tổng SKU.

- [x] Marketplace: mở rộng vùng hiển thị bảng SKU để xem nhiều biến thể hơn, giảm cuộn dọc nhưng vẫn giữ thanh hành động và khả năng dùng trên màn hình nhỏ.
- [x] Kiểm thử chiều cao bảng SKU trên desktop/mobile và hồi quy các thao tác chọn số lượng, thêm giỏ, mua ngay.

- [x] Cả Classic và Marketplace: chuyển danh sách SKU sang bố cục mở rộng theo chiều dọc kiểu marketplace, không giới hạn trong khung cuộn thấp.
- [x] Cả Classic và Marketplace: hiển thị ảnh nhỏ, tên/mã SKU, giá, tồn kho và bộ trừ/số lượng/cộng trên cùng một hàng.
- [x] Giữ thanh hành động mua dễ thấy, không che danh sách SKU; kiểm thử chọn nhiều SKU, mua ngay và thêm giỏ.

- [x] Thêm giá vốn riêng cho từng SKU/biến thể trong schema và API quản trị, mặc định an toàn khi chưa nhập.
- [x] Hiển thị và cho chỉnh giá vốn ngay trong khu vực quản trị sản phẩm/tồn kho theo từng SKU.
- [x] Mở rộng báo cáo doanh thu: doanh thu gộp, giá vốn, lợi nhuận gộp và biên lợi nhuận; lọc theo hôm nay, 7 ngày, 30 ngày, tháng, năm.
- [x] Tách báo cáo theo sản phẩm số/vật lý và kiểm thử phép tính lợi nhuận từ đơn hàng thực tế.

- [x] Giao diện mua hàng: với SKU chọn Order, hiển thị giá gốc gạch ngang và giá Order giảm 10% ngay tại cột đơn giá.
- [x] Kiểm thử giá Order ở Classic/Marketplace và xác nhận giá thanh toán server vẫn giảm 10%, không ảnh hưởng mua ngay/giá sỉ.

- [x] Audit giao diện: rà soát trang chủ, danh mục, chi tiết sản phẩm, giỏ/checkout và quản trị để xác định các điểm cần làm rõ, cân đối và đồng nhất.
- [x] UI polish: cải thiện các điểm ưu tiên về phân cấp thị giác, khoảng cách, trạng thái tải/rỗng, nút hành động và responsive sau khi audit.
- [x] Kiểm thử trực quan desktop/mobile, chạy hồi quy và xuất bản các tinh chỉnh UI không ảnh hưởng logic bán hàng.

- [x] Sửa lỗi thanh tóm tắt và thanh nút mua trong bảng SKU bị dính/che dòng cuối khi cuộn.
- [x] Bổ sung vùng đệm an toàn và kiểm thử nút Thêm vào giỏ/Mua ngay trên desktop và mobile.

- [x] Địa chỉ giao hàng: thêm dropdown Tỉnh/Thành phố và Phường/Xã trong form lưu địa chỉ, giữ ô địa chỉ chi tiết.
- [x] Ghép và lưu địa chỉ hoàn chỉnh tương thích với checkout, kiểm thử reset phường/xã khi đổi tỉnh và responsive.

- [x] Rút tiền tự động: đã bỏ hoàn toàn khỏi phạm vi theo yêu cầu của chủ cửa hàng.
- [x] Rà soát và sửa các lỗi giao diện đang hiển thị trong các mục được người dùng phản ánh.
- [x] Bổ sung lựa chọn sổ địa chỉ cho checkout đơn hàng số theo cách không bắt buộc địa chỉ giao hàng vật lý.
- [x] Kiểm thử độc lập ba hạng mục và lưu phiên bản ổn định.

- [x] Quản trị: thêm upload/cập nhật mã QR nhận tiền cho quy trình rút số dư thủ công, lưu URL tệp an toàn.
- [x] Khách hàng: hiển thị mã QR, thông tin chuyển khoản và hướng dẫn sau khi gửi yêu cầu rút tiền.
- [x] Kiểm thử quyền admin, upload/hiển thị ảnh QR và hồi quy luồng khóa/hoàn số dư.

- [x] Giỏ hàng: thêm nút xóa từng dòng sản phẩm và nút xóa toàn bộ giỏ với xác nhận.
- [x] Đồng bộ xóa giỏ với checkout, trạng thái rỗng và hồi quy thao tác số lượng/đặt hàng.

- [x] Header: menu tài khoản mở khi hover hoặc keyboard focus, vẫn có fallback click trên mobile.
- [x] Menu tài khoản: thêm lối tắt ví/số dư, đơn hàng, địa chỉ, tải xuống, hồ sơ/email, quản trị và đăng xuất với trạng thái rõ ràng.
- [x] Kiểm thử accessibility, hover/focus, mobile và hồi quy header.

- [x] Tạo skill tái sử dụng cho quy trình marketplace DHL Stores theo hướng dẫn skill-creator.
- [x] Tài khoản & Email: thêm ảnh đại diện và fallback chữ cái khi chưa có ảnh.
- [x] Menu tài khoản: thêm loading transition khi chuyển mục, không gây dead-end khi điều hướng.
- [x] Header: thêm chuông thông báo với badge số đơn cần chú ý, có trạng thái đã xem phù hợp.
- [x] Kiểm thử bốn cải tiến trên desktop/mobile, accessibility và hồi quy header/account/order.

- [x] Quyết định phạm vi: gác payout tự động; giữ rút tiền thủ công với QR và quy trình duyệt hiện tại.

- [x] Sửa lần hai action bar SKU: không bị cắt ở đáy viewport, không che dòng cuối và có chiều cao ổn định.
- [x] Làm rõ trạng thái chưa chọn SKU: nút disabled dễ đọc, không dùng màu quá nhạt và vẫn responsive.
- [x] Kiểm thử bằng screenshot đúng trang sản phẩm trên desktop/mobile và hồi quy thêm giỏ/mua ngay.

- [x] Sửa action bar Marketplace khỏi trạng thái sticky gây che/cắt nội dung; thêm khoảng đệm tối thiểu, thông báo khi chưa chọn SKU và trạng thái disabled rõ ràng cho desktop/mobile.
- [x] Kiểm tra TypeScript và chụp toàn trang sản phẩm vật lý sau thay đổi; xác nhận bố cục không còn lớp action bar đè lên bảng SKU.

- [x] Rà soát toàn diện desktop/mobile cho trang chi tiết sản phẩm, bảng SKU Marketplace và khu vực tồn kho hiện tại.
- [x] Thiết kế lại phân cấp thông tin SKU/tồn kho để ảnh, thuộc tính, mã SKU, giá, tồn kho và số lượng dễ quét hơn.
- [x] Cải tiến phản hồi chọn SKU, cảnh báo tồn kho thấp/hết hàng và phần tổng kết mua để thao tác hàng loạt rõ ràng hơn.
- [x] Kiểm thử TypeScript, hồi quy giỏ hàng/batch SKU và xác minh trực quan trên desktop/mobile trước khi xuất bản.
- [x] Xác minh storefront thật với sản phẩm nhiều SKU: tổng kho 120, 12/12 SKU còn hàng, cột Khả dụng và action bar hiển thị đúng sau khi tải dữ liệu.

- [x] Thêm bộ lọc và sắp xếp danh sách sản phẩm theo tình trạng tồn kho để quản trị tìm hàng cần xử lý nhanh hơn.
- [x] Bổ sung cảnh báo trực quan bằng màu sắc và biểu tượng cho sản phẩm sắp hết hoặc đã hết hàng trong danh sách.
- [x] Cho phép chỉnh tồn kho nhanh ngay trên từng dòng danh sách sản phẩm, kèm xác nhận cập nhật và ghi nhận lịch sử kho.
- [x] Viết kiểm thử, kiểm tra TypeScript và xác minh giao diện quản trị sau khi cải tiến danh sách sản phẩm.

- [x] Cho phép chọn và chỉnh tồn kho hàng loạt cho SKU thuộc nhiều sản phẩm ngay từ danh sách quản trị.
- [x] Bổ sung lịch sử thay đổi tồn kho có thể xem/lọc theo từng sản phẩm hoặc SKU.
- [x] Đóng gói quy trình thiết kế, cập nhật an toàn và kiểm thử quản trị tồn kho thành skill tái sử dụng.
- [x] Viết kiểm thử hồi quy, kiểm tra TypeScript và xác minh trực quan các thao tác kho mở rộng trước khi xuất bản.

- [x] Đặt DHL Stores làm nguồn dữ liệu chính cho sản phẩm, SKU, giá và tồn kho; cấm Sapo ghi đè Catalog website.
- [x] Chuyển thiết kế Sapo thành kênh nhận đồng bộ tồn kho một chiều từ DHL Stores theo SKU, giữ ở chế độ an toàn khi API production chưa xác minh.
- [x] Hiển thị rõ hướng đồng bộ và nguồn dữ liệu tại khu quản trị để tránh thao tác nhầm.
- [x] Kiểm thử rào chắn đồng bộ và xác nhận mọi thay đổi Catalog/tồn kho vẫn do DHL Stores quyết định.

- [x] Thêm biểu mẫu tạo đơn hàng mới cho quản trị, chọn sản phẩm/SKU từ tồn kho DHL Stores.
- [x] Kiểm tra tồn khả dụng và trừ tồn kho nguyên tử theo SKU khi đơn quản trị được tạo.
- [x] Ghi nhật ký biến động kho và liên kết đơn hàng để dễ tra cứu/xử lý hoàn tồn khi cần.
- [x] Viết kiểm thử, kiểm tra TypeScript và xác minh giao diện tạo đơn quản trị trước khi xuất bản.

- [x] Thêm tìm kiếm và gợi ý SKU nhanh trong biểu mẫu tạo đơn quản trị để chọn hàng thao tác ít bước hơn.
- [x] Làm nổi bật cảnh báo khi số lượng nhập vượt tồn khả dụng, cả theo từng SKU và phần tổng kết đơn.
- [x] Bổ sung xuất hóa đơn PDF hoặc in trực tiếp cho đơn vừa tạo, dùng dữ liệu đơn thực tế.
- [x] Cập nhật skill vận hành tồn kho để bao gồm tạo đơn quản trị, trừ tồn và chứng từ hóa đơn.
- [x] Viết kiểm thử, kiểm tra TypeScript và xác minh giao diện nâng cấp trước khi xuất bản.

- [x] Thêm danh sách yêu thích để khách lưu sản phẩm và quay lại mua sau bằng dữ liệu tài khoản thật.
- [x] Thêm so sánh sản phẩm/SKU để khách đối chiếu giá, tồn, thuộc tính và lựa chọn phù hợp trước khi mua.
- [x] Thêm thông báo trở lại hàng cho SKU hết hàng, lưu yêu cầu của khách và tránh đăng ký trùng.
- [x] Thêm danh sách sản phẩm đã xem gần đây theo thiết bị để khách quay lại so sánh hoặc mua nhanh.
- [x] Thêm hộp trợ giúp mua hàng theo ngữ cảnh tại trang sản phẩm/giỏ/checkout, dẫn khách tới thông tin hoặc hỗ trợ thực có sẵn.
- [x] Cập nhật schema/API/giao diện, viết kiểm thử và xác minh desktop/mobile cho cả năm tính năng trước khi xuất bản.

- [x] Thêm thanh tiến trình đọc trang và chuyển cảnh nhẹ giữa các trang công khai, tôn trọng chế độ giảm chuyển động.
- [x] Thêm dock so sánh cố định, chỉ hiện khi khách đã chọn sản phẩm và dẫn thẳng tới bảng so sánh mà không che nội dung.
- [x] Thêm Quick View sản phẩm ở catalog để khách xem giá, tồn kho tóm tắt và mở chi tiết mà không mất vị trí đang duyệt.
- [x] Thêm bảng size/hướng dẫn chọn nhanh theo ngữ cảnh cho hàng vật lý có biến thể Size, không tạo số đo giả.
- [x] Thêm tiện ích quay lại đầu trang và điều hướng mục đang xem, có chuyển động nhẹ và hỗ trợ bàn phím.
- [x] Viết kiểm thử, kiểm tra TypeScript và xác minh desktop/mobile cho năm cải tiến giao diện trước khi xuất bản.

- [x] Yêu cầu đăng nhập cho gửi góp ý, nhắn tin và xem/đánh dấu hội thoại; ràng buộc hội thoại với đúng tài khoản để ngăn đọc hoặc chiếm phiên của khách khác.

- [x] Việt hóa đồng nhất các nhãn giao diện công khai còn hiển thị tiếng Anh trên trang chủ, catalog và trang sản phẩm; không dịch hoặc thay đổi dữ liệu sản phẩm thực tế. Mặc định tiếng Việt, vẫn cho phép tự đổi sang tiếng Anh.

- [x] Việt hóa đồng nhất các nhãn giao diện công khai còn hiển thị tiếng Anh trên trang chủ, catalog và trang sản phẩm; không dịch hoặc thay đổi dữ liệu sản phẩm thực tế. Mặc định tiếng Việt, vẫn cho phép tự đổi sang tiếng Anh.
- [x] Trang Tài khoản: chia thành hai cột trên desktop, nhóm khối thông tin/ví/địa chỉ và khối danh sách yêu thích/đơn hàng hợp lý; giữ một cột trên điện thoại. Đã kiểm thử TypeScript, 2 hồi quy mục tiêu và xác minh desktop.

- [x] Trang Tài khoản: hiển thị danh sách đơn hàng thành lưới hai cột trên desktop để giảm chiều cuộn, vẫn xếp một cột an toàn trên màn hình hẹp. Đã bổ sung hồi quy và xác minh trực quan desktop.

- [x] Thanh toán công khai: thay tên ngân hàng cụ thể bằng nhãn QR/chuyển khoản trung tính, không thay đổi đối soát hay mã QR thực tế. Đã quét các trang khách và giữ nguyên luồng xử lý máy chủ.

- [x] Trang Tài khoản: đưa đơn đang xử lý/giao và Order trước lên khu ưu tiên, đồng thời thu gọn đơn lịch sử thành một đến hai hàng thông tin để giảm chiều cao thẻ. Đã giữ liên kết tải/theo dõi, chạy 4 hồi quy mục tiêu và xác minh trực quan desktop.

- [x] Trang Tài khoản: bổ sung bộ lọc nhanh theo trạng thái đơn để khách thu hẹp lịch sử mà không phải cuộn qua các đơn đã hoàn tất hoặc đã hủy. Có Tất cả, Chờ thanh toán, Hoàn tất và Đã hủy; đã kiểm thử hồi quy và xác minh desktop.

- [x] Catalog: bổ sung bộ lọc nhanh Tất cả, Tài nguyên số, Hàng vật lý và Còn hàng để khách tìm sản phẩm phù hợp nhanh hơn, không thay đổi dữ liệu sản phẩm. Với tài nguyên số, trạng thái Có thể mua ngay vẫn hiển thị vì không phụ thuộc tồn kho vật lý.

- [x] Catalog: hiển thị số sản phẩm khớp bộ lọc và nút xóa nhanh các điều kiện đang chọn để khách dễ quay lại danh sách đầy đủ. Đã kiểm thử hồi quy catalog, TypeScript và xác minh desktop.

- [x] PWA: thêm manifest, metadata cài đặt và biểu tượng DHL Stores dùng cho Android/iPhone.
- [x] PWA: thêm service worker và lời mời cài đặt không ảnh hưởng luồng đăng nhập, giỏ hàng, checkout hoặc quản trị.
- [x] PWA: kiểm thử khả năng cài đặt, mở lại ứng dụng và giao diện mobile trước khi xuất bản. Đã kiểm thử branding, build production, MIME manifest/service worker và xác minh desktop/mobile.

- [x] Chat nội bộ: nút Nhắn cửa hàng trên trang sản phẩm mở CustomerContactHub trong website, lưu hội thoại trên máy chủ và gửi thông báo cho quản trị; không chuyển khách sang Zalo. Đã thay liên kết ngoài bằng sự kiện mở chat nội bộ, thêm hồi quy UI và kiểm thử 5 ca hỗ trợ/phân quyền.

- [x] Sapo production: xác minh kết nối TLS/API, quyền ghi tồn kho và mapping SKU trước khi bật đồng bộ một chiều DHL Stores → Sapo; không cho Sapo ghi đè catalog DHL Stores. Đã xác minh thành công qua SKU thử nghiệm; đồng bộ theo lô vẫn chưa bật.

- [x] Hỗ trợ nội bộ: gom nút Góp ý và Nhắn tin về cùng cụm bên phải, giữa màn hình; giữ sheet chat/góp ý, quyền đăng nhập và không che nội dung mua hàng. Đã chạy 4 hồi quy hỗ trợ, TypeScript sạch và xác minh desktop/mobile.

- [x] Sapo credential: xác nhận API Key/API Secret của Ứng dụng riêng có quyền đọc/ghi tồn kho; không dùng `SAPO_ACCESS_TOKEN` nếu không phải OAuth2. PDF và kiểm tra read-only xác nhận Basic Auth hoạt động.

- [x] Sapo thử nghiệm: ghi một inventory level theo đúng số tồn hiện tại của DHL Stores, đọc lại Sapo và lưu kết quả đối chiếu trước khi đồng bộ theo lô. SKU `namearg-B-2026-6 nhỏ`, DHL Stores tồn `0`; Sapo PUT `/admin/inventory_levels/set.json` trả 200 và đọc lại `available=0` khớp.

- [x] Sapo security: giữ nguyên tắc quyền tối thiểu; chỉ bật Đọc và ghi cho Sản phẩm/phiên bản/danh mục và Kho, không cấp quyền dư thừa cho đơn hàng, khách hàng hoặc khuyến mãi. PDF xác nhận Storefront API tắt và quyền Admin API đúng phạm vi.

- [x] Sapo thử SKU `namearg-B-2026-10#MESSI`: đối chiếu tồn DHL Stores 15 với Sapo, ghi cùng giá trị và đọc lại; không tác động SKU khác.

- [x] Xây dựng Sapo Sync Preview trong Trung tâm vận hành: chọn tối đa 20 SKU, dry-run mapping, chạy đồng bộ thủ công có xác nhận và hiển thị kết quả từng dòng. Đã chạy 110 test đạt, TypeScript sạch; giao diện yêu cầu đăng nhập owner để xem tab Sapo.

- [x] Đồng bộ tồn hai chiều: kéo tồn Sapo về DHL Stores cho biến động từ Shopee/kênh bán, giữ DHL Stores là nguồn Catalog và ngăn vòng lặp ghi tồn. Đã có inbound worker, nút khẩn cấp, audit movement/event và không chạm Catalog.

- [x] Tự động hóa inbound Sapo → DHL Stores: chạy Heartbeat mỗi 60 phút, đọc tồn các SKU đã mapping, cập nhật website không cần thao tác thủ công, có chống lặp và giới hạn lỗi. Callback `/api/scheduled/sapo-inventory`, task UID `ZyM2BadmBCdbuKTu4WsExB` đang bật.

- [x] Đăng ký lịch Heartbeat inbound Sapo → DHL Stores mỗi 60 phút theo lựa chọn của chủ cửa hàng; xác minh cron production và độ trễ tối đa khoảng 1 giờ. Task `ZyM2BadmBCdbuKTu4WsExB` đang enable.

- [x] Tối ưu đồng bộ theo biến động: tài liệu Sapo công khai chưa xác nhận webhook tồn kho cho biến động Shopee, nên giữ đối soát Heartbeat mỗi 60 phút; worker chỉ ghi DHL Stores khi tồn Sapo thực sự khác local, không gửi lệnh cập nhật khi không đổi và có audit/idempotence.

- [x] Sapo vận hành: tạo skill tái sử dụng cho quy trình đồng bộ tồn. Skill `sapo-inventory-sync` đã validate thành công.
- [x] Sapo vận hành: thêm nút Đồng bộ ngay trong Trung tâm vận hành. Nút outbound ghi lịch sử theo từng SKU sau khi chạy.
- [x] Sapo vận hành: thêm lịch sử các lần đồng bộ để theo dõi kết quả. Có hướng inbound/outbound, trạng thái, tồn sau cùng và thời gian xử lý.
- [x] Sapo vận hành: hiển thị thời gian cập nhật tồn gần nhất tại trang sản phẩm và khu quản trị. ProductDetail hiển thị mốc Sapo gần nhất theo các variant đã mapping.

- [x] Tìm kiếm bằng hình ảnh: cho phép tải/chụp ảnh, nhận diện và trả về sản phẩm/SKU phù hợp, không lưu ảnh truy vấn lâu hơn cần thiết. Đã thêm LLM vision server-side, nút camera header, tải/chụp ảnh mobile, giới hạn 6 MB, kết quả link về sản phẩm; 119 test đạt, TypeScript và build sạch.

- [x] Tạo lời nhắc một lần lúc 22:00 GMT+7 ngày 19/08/2026 về xác minh Resend và Stripe Test; không nhắc lại mục rút tiền tự động. Task UID `d76rHsuY8heKiRyCIQOsdZ`.

- [x] Rà soát cải thiện DHL Stores: đã kiểm tra luồng mua hàng, thanh toán, tồn kho/Sapo, hiệu năng PWA và khu quản trị; triển khai nút Tìm bằng ảnh tại ô tìm kiếm trang chủ và giới hạn payload vision. Các thay đổi lớn về phong cách và các hạng mục cần Resend/Stripe giữ ở backlog.

- [x] Cải thiện tìm kiếm trang chủ: đưa nút Tìm bằng ảnh cạnh ô tìm chữ, tối ưu hiển thị trên desktop/mobile và giữ luồng dialog hiện tại. Đã kiểm tra mobile, TypeScript, build và 119 test đạt.

- [x] Tối ưu image search: giới hạn số ứng viên/ảnh tham chiếu trong mỗi lần đối chiếu để giảm payload, độ trễ và chi phí mà vẫn giữ kết quả catalog thật. Giới hạn còn 24 sản phẩm active; TypeScript, 119 test và build sạch.

- [x] Tracking Order 1688: hỗ trợ nhiều mã/chặng vận chuyển YTO, J&T, kho trung chuyển và Việt Nam; quản trị nhập trạng thái/link, khách xem timeline theo từng chặng. Đã có bảng `order_tracking_events`, API protected/admin, form timeline trong quản trị, timeline khách hàng; 122 test đạt, TypeScript và build sạch.

- [x] Sửa luồng rút số dư: khách tải QR tài khoản nhận tiền của chính họ; admin chỉ xem QR, chuyển khoản thủ công và cập nhật trạng thái; bỏ admin upload QR dùng chung cho khách.


## Phiên wallet withdrawal 2026-08-19
- [x] Hoàn tất chuyển QR tài khoản nhận tiền rút từ cấu hình admin sang form yêu cầu rút của khách
- [x] Hiển thị QR riêng của khách trong Trung tâm vận hành và kiểm tra luồng duyệt/đã chuyển
- [x] Viết hoặc cập nhật test hồi quy cho qrUrl của yêu cầu rút tiền
- [x] Chạy kiểm tra TypeScript, Vitest và build sau thay đổi wallet withdrawal
- [x] Lưu checkpoint sau khi xác minh (checkpoint `5f2db90e`)


## Phiên chuẩn hóa quyền chủ cửa hàng 2026-08-19
- [x] Xác minh tài khoản chủ duy nhất của người dùng và các role đang tồn tại trong backend
- [x] Kiểm tra mọi adminProcedure/ownerProcedure, route quản trị và điều kiện hiển thị giao diện
- [x] Siết để chỉ tài khoản chủ cửa hàng có quyền quản trị; tài khoản khác chỉ là khách hàng
- [x] Bảo đảm chủ cửa hàng vẫn dùng được luồng khách hàng và xem/xử lý đơn của khách
- [x] Viết hoặc cập nhật test phân quyền và kiểm thử đơn hàng khách
- [x] Chạy TypeScript, Vitest và build; lưu checkpoint


## Phiên cải tiến quản trị theo yêu cầu 2026-08-19
- [x] Thêm tìm kiếm và lọc đơn hàng theo trạng thái hoặc tên khách hàng trong AdminOrders.
- [x] Thêm nhãn Owner nổi bật trên giao diện quản trị để nhận diện quyền cao nhất.
- [x] Thêm bảng tổng quan quản trị hiển thị tổng đơn hàng, đơn chờ xử lý và hoạt động gần đây của khách hàng.
- [x] Viết/cập nhật test, kiểm tra giao diện và phát hành checkpoint cho ba cải tiến quản trị.


## Phiên tối ưu phân loại trải nghiệm mua hàng 2026-08-19
- [x] Đánh giá các điểm khách có thể nhầm giữa tài nguyên số và hàng vật lý trên trang chủ, catalog và trang sản phẩm.
- [x] Thiết kế phân loại điều hướng rõ theo mục đích mua, loại sản phẩm và hình thức nhận hàng.
- [x] Triển khai các cải tiến ưu tiên giúp khách tìm đúng sản phẩm và đi tới mua hàng ít bước hơn.
- [x] Viết/cập nhật test, kiểm tra trực quan và phát hành checkpoint cho tối ưu phân loại.


## Phiên sổ địa chỉ tạo đơn quản trị 2026-08-19
- [x] Thêm chọn sổ địa chỉ đã lưu của khách trong form tạo đơn quản trị.
- [x] Thêm tạo địa chỉ mới cho khách ngay trong form, gồm người nhận, số điện thoại và địa chỉ chi tiết; địa chỉ có thể chứa phường/xã, tỉnh/thành phố.
- [x] Bảo đảm địa chỉ được truyền đúng vào đơn, giữ owner-only và không lộ địa chỉ giữa các khách.
- [x] Viết/cập nhật test, kiểm tra trực quan và phát hành checkpoint cho sổ địa chỉ quản trị.


## Phiên mở rộng sổ địa chỉ quản trị 2026-08-19
- [x] Cho phép owner sửa địa chỉ đã lưu của khách trong form tạo đơn.
- [x] Cho phép owner xóa địa chỉ đã lưu an toàn, bảo đảm địa chỉ mặc định được thay thế đúng.
- [x] Thêm tìm kiếm nhanh địa chỉ và gợi ý tỉnh/thành phố khi tạo địa chỉ mới; ô chi tiết vẫn cho nhập phường/xã, quận/huyện và số nhà.
- [x] Viết/cập nhật test, kiểm tra trực quan và build cho mở rộng sổ địa chỉ.
