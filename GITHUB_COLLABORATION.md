# Cộng tác GitHub cho DHL Stores

**Repository GitHub được kết nối trực tiếp với dự án Website trên Manus:** [github.com/dinhloi116-hue/cuahang-cua-toi](https://github.com/dinhloi116-hue/cuahang-cua-toi), nhánh `main`. Đây là repository chính để cộng tác mã nguồn website với ChatGPT/Codex.

**Lưu ý phân biệt:** [github.com/dinhloi116-hue/dhlstores](https://github.com/dinhloi116-hue/dhlstores) là repository khác, hiện cũng có mã website và công cụ Nameset. Không tự push thay đổi website sang `dhlstores` hoặc tự merge/force-push giữa hai repository. Trước mỗi lượt đồng bộ, kiểm tra URL remote thực tế trong workspace Manus (`git remote -v` hoặc `git remote get-url github`) và xác nhận remote dùng để push trỏ đến `dinhloi116-hue/cuahang-cua-toi`. Nếu chưa đúng, dừng và sửa cấu hình remote một cách có kiểm soát; không coi việc chỉnh tài liệu này là đã sửa remote.

## Quy tắc đồng bộ mặc định

Trong các phiên làm việc của DHL Stores, sau mỗi thay đổi code hoàn tất, agent phải chạy kiểm thử phù hợp, kiểm tra TypeScript/build khi cần, tạo commit mô tả rõ thay đổi và push lên `main`. Người dùng không cần yêu cầu lại việc đồng bộ GitHub. Website live vẫn được quản lý bằng checkpoint của Manus; push GitHub là bước cộng tác mã nguồn bổ sung, không thay thế checkpoint.

Không sử dụng `force-push`, không commit `.env`, khóa API, token, database dump, `node_modules`, `dist` hoặc log. Nếu `main` trên GitHub đã có commit mới từ phiên hoặc công cụ khác, trước khi push phải fetch và đồng bộ theo hướng fast-forward/merge an toàn. Nếu phát sinh xung đột hoặc thay đổi có ý nghĩa khác nhau, phải dừng và báo người dùng thay vì tự ghi đè.

## Quy trình sau mỗi thay đổi

```bash
git fetch github
git status --short
pnpm test
pnpm exec tsc --noEmit
pnpm run build
git add <cac-file-da-thay-doi>
git commit -m "<mo-ta-ngan-gon>"
git push github main
```

Tên remote GitHub dùng trong quy trình này là `github`. Trước khi chạy quy trình, xác minh `git remote get-url github` trả về `https://github.com/dinhloi116-hue/cuahang-cua-toi.git` (hoặc địa chỉ SSH tương ứng), rồi kiểm tra `git ls-remote github refs/heads/main`. Nếu `github` chưa tồn tại hoặc trỏ sang repository khác, cần sửa remote đúng đích sau khi đối chiếu trạng thái local và không ghi đè công việc chưa đồng bộ. Chỉ push sau khi fetch và xác nhận branch local tương thích với `github/main`.

## Checkpoint và phát hành Manus

Mã nguồn GitHub không thay thế checkpoint/phát hành của Manus. Khi code có thay đổi cần đưa lên website, phải chạy test, lưu checkpoint trong dự án và kiểm tra phiên bản được phát hành. Vì dự án đang bật auto-publish, checkpoint thành công sẽ phát hành phiên bản website tương ứng; sau đó thay đổi mã nguồn cũng phải được push lên GitHub `main` theo quy tắc trên.

Nếu có thay đổi schema database, phải dùng quy trình migration của dự án và công cụ quản lý database, không tự sửa database production bằng script tùy ý. Repository GitHub cũng không phải nơi lưu dữ liệu khách hàng, đơn hàng, database runtime hoặc file vận hành S3; việc sao lưu dữ liệu thật phải theo quy trình trong `S3_GOOGLE_DRIVE_BACKUP_GUIDE.md`.

## Cộng tác với công cụ khác

Các công cụ như Codex, GitHub Codespaces hoặc môi trường local khác phải fetch `github/main` trước khi sửa. Sau khi hoàn tất, chúng nên push commit lên `main` hoặc mở pull request nếu thay đổi lớn. Khi có nhiều phiên sửa đồng thời, ưu tiên bảo toàn lịch sử và nội dung của tất cả phiên; không dùng force-push để giải quyết khác biệt.
