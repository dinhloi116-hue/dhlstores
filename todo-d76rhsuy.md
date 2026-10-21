
## Rút gọn giao diện mua HD theo ảnh Shopee — 2026-10-22
- [x] Tách hero HD thành gallery trái và mua hàng phải; bỏ ô zoom phụ trống trên desktop.
- [x] Giữ trong hero chỉ title, giá, Kiểu, Kích cỡ, số lượng, Thêm vào giỏ và Mua ngay; xóa yêu thích/so sánh, card shop, giá sỉ, size guide trùng, card SKU và CTA sticky lặp.
- [x] Đưa mô tả, thông số, đánh giá và một khối sản phẩm liên quan xuống dưới; ẩn video/help/recommendation trùng cho HD.
- [x] Full regression 204 passed/2 skipped, TypeScript, production build và diff check đạt; browser live xác minh DOM tải đủ, mặc định Size S/Không in, đúng 2 CTA hiển thị trong hero, `#product-purchase-actions` có `display:none`, và các khối thừa không còn trong vùng mua; nhãn Sports shop còn lại chỉ là nav header.
