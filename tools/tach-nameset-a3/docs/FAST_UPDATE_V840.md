# DHL Nameset Layout — Cập nhật nhanh trực tiếp V8.40+

## Cơ chế mới

`↻ CẬP NHẬT` trong Docker tải **updater hiện hành** tại `main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1`. Updater:

1. Tìm addon trong các đường dẫn cài CorelDRAW thường gặp, **không quét đệ quy** ổ đĩa.
2. Tải **đúng một** `src/DockerUI_CURRENT.html` từ `main`. Không chạy V8.22, V8.28... theo thứ tự, không tải hoặc chạy BAT cài đặt lại.
3. So SHA-256 của ảnh Docker mới và Docker đã cài: **trùng thì bỏ qua**, khác mới cập nhật.
4. Thay file qua staging cùng thư mục và `[IO.File]::Replace`, giữ `DockerUI.PREVIOUS.html` để rollback.
5. Cập nhật tất cả cài đặt đã tìm thấy, bao gồm Corel 2021 và 2025. Không reset Workspace.

Nút trong V8.40 sẽ luôn lấy updater mới từ nhánh main; **không khóa cứng version** vào updater. Khi phát hành V8.41+, chỉ cần đưa bản `DockerUI_CURRENT.html` mới lên main và cập nhật nút/updater khi cần.

## Cập nhật lần đầu từ V8.39 hoặc cũ hơn

Do nút bấm của bản cũ còn dùng launcher cũ, có thể chuyển sang updater mới **một lần** bằng PowerShell (Administrator) với:

```powershell
$u='https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/main/tools/tach-nameset-a3/UPDATE_DHL_NAMESET.ps1'
$p=Join-Path $env:TEMP 'UPDATE_DHL_NAMESET_LATEST.ps1'
Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $p
powershell -NoProfile -ExecutionPolicy Bypass -File $p
```

Sau khi xác nhận V8.40, các lần sau dùng trực tiếp nút ↻ CẬP NHẬT. Nếu thao tác ghi trong `Program Files` thiếu quyền, chạy PowerShell với **Run as administrator**.

## Giới hạn

- Đây là tối ưu hóa **thao tác cập nhật**, không phải refactor tất cả script khởi động lịch sử trong Docker. Tệp tổng hợp vẫn chứa các module cũ phục vụ tương thích.
- Khi Corel khóa file addon không cho thay thế, updater báo lỗi và **giữ file cũ**; đóng CorelDRAW rồi chạy lại PowerShell updater.
- Kết quả kiểm thử dựa trên giả lập launcher/DOM và rà soát cú pháp; chưa kiểm thử cập nhật file trong CorelDRAW 2021/2025 thực tế.
- Log: `%TEMP%\DHL_NAMESET_UPDATE_LOG.txt`.
