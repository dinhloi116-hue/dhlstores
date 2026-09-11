# DHL Stock Sync – Chrome Extension

Phiên bản ổn định hiện tại: **v0.13.5**.

Tool dùng file **Danh sách quản lý kho phiên bản sản phẩm** của Sapo chỉ để nhận diện đúng sản phẩm/size/chi nhánh, quét tồn kho từ `si.aobongda.net`, rồi tạo **một file mới hoàn toàn** theo đúng mẫu nhập tồn kho chính thức của Sapo.

## Dùng hằng ngày

1. Đăng nhập `si.aobongda.net` trên Chrome.
2. Từ Sapo xuất **Danh sách quản lý kho phiên bản sản phẩm**.
3. Mở side panel `DHL Stock Sync` và chọn file kho vừa xuất.
4. Bấm `QUÉT KHO HD 2026`.
5. Tool quét nguồn trên trang danh mục HD, chỉ lấy size S/M/L/XL/XXL và ghép với sản phẩm trong file kho.
6. Bấm `TẠO FILE NHẬP TỒN KHO SAPO`.
7. Tool sinh file mới dạng `SAPO_NHAP_TON_KHO_YYYY-MM-DD.xlsx` với các cột: `Tên phiên bản sản phẩm`, `SKU*`, `Mã lô`, `Ngày sản xuất`, `Hạn sử dụng`, `Tồn kho`, `Vị trí lưu kho`.
8. Nhập file mới đó vào chức năng cập nhật tồn kho của Sapo.

## Bảo trì danh sách nguồn

Phần **BẢO TRÌ NGUỒN** trong giao diện được thu gọn mặc định. Chỉ mở phần này khi web nguồn có sản phẩm mới, đổi tên sản phẩm hoặc thêm màu mới. Không cần quét danh sách nguồn mỗi ngày.

Khi cần bảo trì:

1. Mở `BẢO TRÌ NGUỒN`.
2. Bấm `QUÉT TOÀN BỘ TRANG HD`.
3. Xuất Excel danh sách nguồn để kiểm tra/chuẩn hóa lại nếu cần.

## Nguyên tắc an toàn

- Không đọc được nguồn **không được coi là tồn = 0**.
- Chỉ ghi `0` khi nguồn thực sự trả về tồn 0/hết hàng.
- Chỉ những biến thể ghép chắc chắn mới được đưa vào file nhập tồn kho.
- File Quản lý kho đầu vào **không phải file đầu ra** và không được sửa để nhập ngược lại Sapo.
- Tool không dùng API/token Sapo và không ghi trực tiếp vào hệ thống Sapo.
- Scanner phải ở trang danh mục HD, không điều hướng sang trang chi tiết sản phẩm.

## Backup / khôi phục

Mã nguồn được lưu trong GitHub repository:

- Repository: `dinhloi116-hue/dhlstores`
- Branch ổn định đang dùng: `feature/dhl-stock-sync-extension`
- Thư mục dự án: `tools/dhl-stock-sync-extension`
- GitHub Actions workflow: `.github/workflows/dhl-stock-sync-extension.yml`

Mỗi lần có commit vào branch trên, GitHub Actions sẽ tự chạy test và đóng gói file ZIP cài extension. Artifact ZIP được giữ 14 ngày, còn **toàn bộ mã nguồn và lịch sử commit vẫn nằm trên GitHub** để khôi phục lâu dài.

Nếu máy bị mất tool, chỉ cần lấy lại thư mục `tools/dhl-stock-sync-extension` từ branch trên, hoặc tải ZIP từ lần build GitHub Actions gần nhất, giải nén và vào `chrome://extensions` → bật Developer mode → `Load unpacked`.

Không nên xóa branch `feature/dhl-stock-sync-extension` khi chưa merge dự án vào nhánh chính.
