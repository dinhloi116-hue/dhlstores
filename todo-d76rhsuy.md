
## Hover preview ảnh trên thẻ catalog — 2026-10-22
- [x] Khi rê chuột trên thẻ sản phẩm, tự động chuyển qua gallery ảnh của chính sản phẩm đó mỗi 1,2 giây; rời chuột thì trở về ảnh bìa.
- [x] Có indicator `Preview image n of total` desktop-only; không ảnh hưởng link mở sản phẩm, Quick view, Quick add và chỉ dùng URL gallery đã có, không gọi API mới.
- [x] Mobile 390px vẫn render card/gallery không runtime error; animation dùng `motion-safe`; hover live đã xác minh ảnh đổi và reset đúng; test hover 3 passed, full regression 206 passed/2 skipped, TypeScript/build/diff check đạt.
