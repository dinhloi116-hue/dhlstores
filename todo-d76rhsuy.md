
## Sửa bộ chọn size HD và bảng số đo — 2026-10-22
- [ ] Bỏ bộ lọc Kích thước khỏi toolbar catalog theo yêu cầu; không ảnh hưởng ô tìm kiếm và danh mục lớn.
- [ ] Trong ProductDetail HD chỉ giữ một nhóm Kích cỡ; cho phép chọn mọi size S–XXL kể cả SKU tồn 0 để đặt trước/Order.
- [ ] Hiển thị bảng số đo ngay bên dưới bộ chọn Kiểu/Kích cỡ, phân biệt rõ S–XXL và VI/EN.
- [ ] Thêm hồi quy tương tác/markup, kiểm tra browser mobile/desktop, full test/build, checkpoint và push main.

## Hoàn thiện chọn size và Zalo trên HD — 2026-10-22
- [x] Hợp nhất `Kích cỡ`/`Kích thước` thành một nhóm; browser English chỉ còn một selector Kiểu–Size.
- [x] Bảng `Size and price by style` hiển thị đủ S, M, L, XL, XXL cho Không in/Có in; nút size hết kho vẫn không disabled và được phép chuyển Order.
- [x] Thêm nút lớn `Chat on Zalo for size advice` ngay dưới hai nút mua, href đúng `https://zalo.me/0963898871`; browser đã xác minh link và nút.
