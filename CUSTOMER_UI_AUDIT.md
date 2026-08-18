# Audit tiện ích giao diện khách hàng

## Kết quả rà soát

Catalog hiện đã có lọc, sắp xếp, ảnh có chuyển động hover và trang chi tiết đã có phản hồi thêm giỏ/ảnh bay vào giỏ. Vì vậy, thay vì làm lại toast hoặc panel giỏ, đợt cải tiến tiếp theo sẽ tập trung vào năm khoảng trống còn lại: cảm giác chuyển trang, Quick View không làm mất vị trí duyệt, dock so sánh luôn dễ thấy, hướng dẫn chọn Size không bịa số đo, và điều hướng cuộn hỗ trợ bàn phím.

## Năm tính năng triển khai

1. Thanh tiến trình điều hướng và chuyển cảnh giảm chuyển động khi người dùng bật `prefers-reduced-motion`.
2. Dock so sánh cố định, chỉ hiện khi khách đã chọn sản phẩm; hiển thị số lượng và đường dẫn mở bảng so sánh.
3. Quick View ở catalog với ảnh, giá, mô tả rút gọn, trạng thái tồn cấp sản phẩm và lối mở trang SKU đầy đủ.
4. Hướng dẫn chọn nhanh cho hàng vật lý, chỉ dùng thuộc tính Size/SKU và mô tả do cửa hàng đã nhập; không đưa bảng số đo giả.
5. Nút quay lên đầu trang và thanh tiến độ cuộn, có nhãn truy cập/keyboard và chuyển động nhẹ.
