
## Sửa bộ chọn size HD và bảng số đo — 2026-10-22
- [x] Bỏ bộ lọc Kích thước khỏi toolbar catalog; giữ nguyên ô tìm kiếm, bộ lọc màu và dải danh mục lớn.
- [x] ProductDetail HD chỉ còn một nhóm Kích cỡ chuẩn hóa; mọi size S–XXL kể cả SKU tồn 0 đều chọn được và tự chuyển fulfillment sang Order.
- [x] Hiển thị bảng giá `Size and price by style` và bảng số đo thật `Reference size guide`/`Bảng số đo tham khảo` ngay dưới bộ chọn Kiểu/Kích cỡ; browser xác minh 5 dòng S–XXL, chiều cao và cân nặng bằng cả EN/VI.
- [ ] Hồi quy 209 passed/2 skipped, TypeScript, production build và browser desktop/mobile đã đạt; cần lưu checkpoint mới và push main cho bảng số đo.

## Hoàn thiện chọn size và Zalo trên HD — 2026-10-22
- [x] Hợp nhất `Kích cỡ`/`Kích thước` thành một nhóm; browser English chỉ còn một selector Kiểu–Size.
- [x] Bảng `Size and price by style` hiển thị đủ S, M, L, XL, XXL cho Không in/Có in; nút size hết kho vẫn không disabled và được phép chuyển Order.
- [x] Thêm nút lớn `Chat on Zalo for size advice` ngay dưới hai nút mua, href đúng `https://zalo.me/0963898871`; browser đã xác minh link và nút.
