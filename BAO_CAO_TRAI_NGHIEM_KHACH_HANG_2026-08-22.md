# Báo cáo kiểm tra trải nghiệm khách hàng — DHL Stores

**Phạm vi kiểm tra:** Trang chủ, catalog hàng vật lý/tài nguyên số, hai trang chi tiết sản phẩm, giỏ hàng, tài khoản và thư viện công cụ trên desktop lẫn mobile. Tôi không tạo đơn mới, thanh toán hoặc thay đổi tồn kho.

## Kết luận ngắn

Luồng cơ bản đã dễ hiểu hơn: khách thấy được sự khác nhau giữa hàng số và hàng vật lý, ảnh/SKU/tồn kho có mặt ở sản phẩm vật lý, catalog có lọc và tài khoản có ví/địa chỉ/đơn hàng. Tuy vậy, **5 điểm dưới đây nên được ưu tiên hơn các thay đổi trang trí** vì chúng ảnh hưởng trực tiếp đến việc khách hiểu, tin tưởng và hoàn tất mua hàng.

| Ưu tiên | Điểm cần cải thiện | Quan sát khi kiểm tra | Hướng xử lý đề xuất |
| --- | --- | --- | --- |
| 1 | Các nút nổi che nội dung trên mobile | Nút **Nhắn tin** và **Góp ý** chồng lên ảnh sản phẩm, khu liên kết email và phần nội dung ở cạnh phải. | Gom hai nút vào một launcher nhỏ; khi cuộn xuống mới hiện, hoặc tự thu gọn thành icon. Đặt khoảng cách an toàn với vùng thao tác/màn hình mobile. |
| 2 | Trạng thái “còn hàng” và CTA chưa nhất quán | Sản phẩm áo mẫu hiển thị **Còn 10 trong kho** nhưng cạnh đó vẫn có nút **Nhắc lại khi có hàng**. | Chỉ hiển thị “Nhắc lại khi có hàng” khi mọi SKU đã hết; khi còn hàng, thay bằng CTA mua/giỏ hàng và trạng thái “Có thể đặt ngay”. |
| 3 | Sản phẩm 0đ/hết hàng tạo cảm giác không thể mua | Có sản phẩm vật lý giá `0đ`, tồn kho `0`; nếu vẫn hiện như sản phẩm bình thường, khách dễ bấm vào rồi rơi vào ngõ cụt. | Ẩn khỏi catalog mặc định, hoặc gắn nhãn rõ “Sắp về / Liên hệ báo giá”; chỉ cho hiển thị khi đã có giá và SKU có thể bán. |
| 4 | Ảnh và nội dung sản phẩm vật lý chưa khớp hoàn toàn | Sản phẩm “Áo in thể thao mẫu DHL Stores” hiện dùng ảnh ba quả bóng; hình này không cho khách thấy áo, chất liệu, vị trí in hay biến thể thực tế. | Thay bằng ảnh sản phẩm thật hoặc mockup áo rõ ràng; ưu tiên 1 ảnh cover, 1 ảnh mặt sau/chi tiết in, 1 ảnh bảng size. Đây là cải thiện niềm tin quan trọng nhất cho hàng vật lý. |
| 5 | Trang tài khoản thiếu thứ tự ưu tiên cho khách mới | Khách mới thấy email chưa liên kết, ví, nạp/rút, địa chỉ và các khối tài khoản cùng lúc; khó biết nên làm gì trước. | Thêm “Việc cần hoàn thành” gồm 3 bước: liên kết email, thêm địa chỉ, xem đơn/khám phá sản phẩm. Các mục ví/rút tiền nên thu gọn nếu số dư là 0 hoặc chưa dùng. |

## Ghi chú thêm

Trang chi tiết tài nguyên số có cấu trúc tốt và giải thích rõ giá/giấy phép/kích thước tệp. Trang hàng vật lý đã có thông tin size và tồn kho, nhưng nên bảo đảm nút mua/giỏ hàng luôn xuất hiện rõ sau khi khách chọn SKU, đặc biệt trên mobile.

> Thứ tự làm khuyến nghị là **(1) nút nổi**, **(2) CTA tồn kho**, **(3) ẩn/đánh dấu sản phẩm không thể mua**, **(4) thay ảnh sản phẩm thật**, rồi **(5) onboarding tài khoản**. Ba mục đầu có thể cải thiện bằng code ngay; mục ảnh cần bạn cung cấp hoặc tải ảnh sản phẩm thật vào quản trị.
