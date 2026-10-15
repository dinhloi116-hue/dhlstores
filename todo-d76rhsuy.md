
## Tự nhận diện khách quốc tế, SEO English và giá quốc tế — 2026-10-15
- [x] Tự chọn English cho visitor profile sạch: browser live trả `lang=en`, title English và giá USD; nút chuyển thủ công live trả `lang=vi`, title tiếng Việt, lưu `dhl_lang_selected=vi` và giá VND; resolver country header VN được khóa bằng hồi quy locale.
- [x] Đồng bộ `document.lang`, title/meta/OG và JSON-LD Product/Video theo English để bot và người dùng quốc tế thấy nội dung English; index fallback dùng English.
- [x] Hiển thị giá quốc tế gấp 2 giá Việt Nam: physical quy đổi VND x2 sang USD; digital dùng giá USD x2; giỏ hàng/checkout/QR dùng cùng giá thực thu, phí ship giữ riêng.
- [x] Hồi quy pricing/locale 5 passed, store 21 passed; full regression hiện tại 199 passed/2 skipped, TypeScript/build/diff check đạt; Chromium desktop và mobile profile sạch xác minh English, `$26.32`, HTML lang và SEO title; checkout shell mở được ở cả 1440px/390px (chưa submit thanh toán).
