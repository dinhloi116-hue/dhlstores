# Cộng tác GitHub cho DHL Stores

Repository private hiện tại: [github.com/dinhloi116-hue/dhlstores](https://github.com/dinhloi116-hue/dhlstores).

## Quy tắc branch

`main` là nhánh ổn định đã được kiểm thử. Mỗi thay đổi nên làm trên branch riêng, đặt tên theo nhóm như `feat/catalog-filter`, `fix/cart-toast` hoặc `chore/docs`. Sau khi chạy test và build, mở Pull Request vào `main`, mô tả phạm vi thay đổi, ảnh hưởng dữ liệu và kết quả kiểm thử. Không commit `.env`, khóa API, token, database dump, `node_modules`, `dist` hoặc log.

## Quy trình đề xuất

```bash
git clone https://github.com/dinhloi116-hue/dhlstores.git
cd dhlstores
git checkout -b feat/ten-thay-doi
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm run build
git add .
git commit -m "feat: mo ta thay doi"
git push -u origin feat/ten-thay-doi
```

Sau khi review và merge, đồng bộ branch local bằng `git checkout main && git pull --ff-only`. Repository GitHub là nơi cộng tác mã nguồn; dữ liệu khách hàng, đơn hàng, database runtime và file vận hành S3 không được lưu trong Git. Muốn sao lưu dữ liệu thật, dùng quy trình trong `S3_GOOGLE_DRIVE_BACKUP_GUIDE.md`.

## Lưu ý với DHL Stores

Mã nguồn GitHub không thay thế checkpoint/phát hành của Manus. Khi code có thay đổi cần triển khai trên website, phải chạy test, lưu checkpoint trong dự án và kiểm tra phiên bản được phát hành. Nếu có thay đổi schema database, phải dùng quy trình migration của dự án, không tự sửa database production bằng script tùy ý.
