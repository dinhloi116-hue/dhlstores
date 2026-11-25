

## Cải tổ ProductDetail mobile theo mẫu Shopee — 2026-11-25
- [x] Sắp xếp mobile theo luồng ảnh/gallery → giá/tên → giao hàng/bảo vệ/đánh giá → chọn SKU/thuộc tính.
- [x] Bổ sung thanh hành động cố định đáy màn hình gồm Chat, Thêm vào giỏ và Mua ngay cho sản phẩm vật lý, không che nội dung.
- [x] Thêm hồi quy layout mobile, chạy test/check/build/diff và kiểm tra DOM runtime mobile.

## Sửa responsive khung preview tablet — 2026-11-25
- [x] Không để header desktop tràn/cắt trong khung preview khoảng 768–1023px.
- [x] Dùng layout header/navigation gọn cho tablet và thêm hồi quy breakpoint.
- [x] Chạy test, check, build, diff check và chụp lại preview sau sửa.

## Purge cache và audit responsive production — 2026-11-25
- [ ] Purge/invalidate CDN thật trên domain custom; hiện đã kiểm tra cache-control nhưng HTTP PURGE trả 400 và chưa có quyền Cloudflare/API purge.
- [x] Kiểm tra header cache-control production: HTML trả `no-cache, no-store, must-revalidate`; asset dùng tên hash sau build.
- [x] Rà các điểm gãy responsive chính ở tablet 768–1023px và mobile 390px.
- [x] Thêm script tự động kiểm tra cache header và header responsive trên production.
