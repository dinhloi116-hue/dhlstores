# DHL Stock Sync – Chrome Extension

Phiên bản ổn định hiện tại: **v0.14.0**.

Tool có 2 việc tách riêng:

- **Dùng hằng ngày:** lấy file **Danh sách quản lý kho phiên bản sản phẩm** của Sapo để đối chiếu, quét tồn ở **danh mục supplier đang mở**, rồi tạo một file nhập tồn kho mới đúng mẫu Sapo.
- **Bảo trì nguồn / thêm sản phẩm mới:** khi supplier có hàng mới hoặc màu mới, quét danh mục đang mở và tạo file Excel **tạo sản phẩm mới Sapo** theo đúng form 36 cột, có link ảnh, size, SKU và tồn nguồn.

## Dùng hằng ngày – cập nhật tồn kho

1. Đăng nhập `si.aobongda.net` trên Chrome.
2. Mở đúng danh mục cần đồng bộ: HD người lớn, áo trẻ em, CLB/ĐT hoặc danh mục khác.
3. Từ Sapo xuất **Danh sách quản lý kho phiên bản sản phẩm** tương ứng.
4. Mở side panel `DHL Stock Sync` và chọn file kho vừa xuất.
5. Bấm `QUÉT KHO TRANG ĐANG MỞ`.
6. Tool đọc sản phẩm/màu/size của chính danh mục đang mở. Hỗ trợ size chữ và size số, không còn khóa cứng S/M/L/XL/XXL.
7. Bấm `TẠO FILE NHẬP TỒN KHO SAPO`.
8. Tool sinh file mới `SAPO_NHAP_TON_KHO_YYYY-MM-DD.xlsx` với các cột: `Tên phiên bản sản phẩm`, `SKU*`, `Mã lô`, `Ngày sản xuất`, `Hạn sử dụng`, `Tồn kho`, `Vị trí lưu kho`.
9. Nhập file mới đó vào chức năng cập nhật tồn kho của Sapo.

## BẢO TRÌ NGUỒN – chỉ khi web có sản phẩm/màu mới

Phần **BẢO TRÌ NGUỒN** được thu gọn mặc định và không cần dùng mỗi ngày.

Khi supplier có sản phẩm mới:

1. Mở đúng danh mục supplier cần lấy hàng, ví dụ HD người lớn hoặc áo bóng đá trẻ em.
2. Mở `BẢO TRÌ NGUỒN`.
3. Bấm `QUÉT SẢN PHẨM TRANG ĐANG MỞ`.
4. Tool lần lượt lấy tên sản phẩm, màu, toàn bộ size, tồn kho và link ảnh từ card sản phẩm.
5. Bấm `TẠO FILE SẢN PHẨM SAPO (.XLSX)`.
6. Tool tạo `SAPO_TAO_SAN_PHAM_MOI_YYYY-MM-DD.xlsx` theo form sản phẩm Sapo 36 cột, gồm các cột quan trọng như `Đường dẫn/Alias`, `Tên sản phẩm*`, thuộc tính Size, `Mã SKU`, `Ảnh đại diện`, `Ảnh phiên bản`, `Cửa hàng chính_Tồn kho` và `Id phiên bản`.

Với sản phẩm đã có quy tắc SKU cũ, tool giữ SKU cũ. Với sản phẩm nguồn mới chưa từng có trong tool, tool tự tạo SKU ổn định dạng `ABDN-...` để lần sau vẫn nhận diện được đúng biến thể.

## Nguyên tắc an toàn

- Không đọc được nguồn **không được coi là tồn = 0**.
- Chỉ ghi `0` khi nguồn thực sự trả về tồn 0/hết hàng.
- Chỉ những biến thể ghép chắc chắn mới được đưa vào file nhập tồn kho.
- File Quản lý kho đầu vào **không phải file đầu ra** và không được sửa để nhập ngược lại Sapo.
- Tool không dùng API/token Sapo và không ghi trực tiếp vào hệ thống Sapo.
- Scanner chỉ thao tác popup mua nhanh trên danh mục đang mở và chặn điều hướng nhầm sang trang chi tiết.

## Backup / khôi phục

Mã nguồn được lưu trong GitHub repository:

- Repository: `dinhloi116-hue/dhlstores`
- Branch: `feature/dhl-stock-sync-extension`
- Thư mục dự án: `tools/dhl-stock-sync-extension`
- GitHub Actions workflow: `.github/workflows/dhl-stock-sync-extension.yml`

Mỗi commit vào branch trên sẽ tự chạy test và đóng gói ZIP cài extension. Artifact ZIP được giữ 14 ngày; **toàn bộ mã nguồn và lịch sử commit vẫn nằm trên GitHub lâu dài**, nên tool có thể khôi phục kể cả khi máy hiện tại bị mất dữ liệu.

Nếu cần khôi phục: lấy lại thư mục `tools/dhl-stock-sync-extension` từ branch trên, vào `chrome://extensions` → bật Developer mode → `Load unpacked`. Hoặc dùng ZIP artifact của lần GitHub Actions gần nhất.

Không xóa branch `feature/dhl-stock-sync-extension` khi chưa merge/backup sang nhánh khác.
