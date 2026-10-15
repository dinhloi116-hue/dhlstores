
## Bỏ nhãn bước và bố trí mua ngang trên desktop — 2026-10-15
- [x] Bỏ nhãn “Bước 1/Bước 2”, giữ tiêu đề ngắn gọn theo từng khối và lựa chọn hình thức mua vẫn nằm trong checkout.
- [x] Chuyển vùng kho, số lượng, nhắc hàng và lưu mua sau thành flex ngang trên desktop; mobile vẫn tự xuống dòng.
- [x] Browser xác minh không còn Bước 1/Bước 2, computed action row là `display:flex; flex-direction:row`, không overflow ngang.

## Sửa heartbeat đồng bộ tồn Sapo — 2026-10-15
- [x] Heartbeat ưu tiên `OWNER_OPEN_ID`, nhưng fallback owner active trong database nếu môi trường cron lệch owner id, tránh trả `owner-not-found` và bỏ qua đồng bộ.
- [x] Thêm hồi quy fallback owner; full regression 197 passed, 2 skipped, TypeScript, production build và diff check đạt.
