
## Khắc phục lỗi production `insertBefore` — 2026-10-21
- [x] Ngăn tiện ích dịch tự động của trình duyệt thay đổi DOM React bằng `translate=no`, class `notranslate` và meta notranslate; giữ chuyển ngôn ngữ VI/EN nội bộ.
- [x] Test 203 passed/2 skipped, TypeScript, production build và diff check đạt; artifact `dist/public/index.html` đã có đủ notranslate, checkpoint `1e6c46ac` đã lưu, commit `f8615e0` đã push lên `github/main` và SHA local/remote đã khớp.
