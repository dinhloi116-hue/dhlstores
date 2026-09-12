# DHL Stock Sync

Chrome extension đồng bộ tồn kho từ `si.aobongda.net` sang file nhập tồn kho Sapo.

## Bản ổn

- Nhánh an toàn: `stable/dhl-stock-sync-v0.15.1`
- Backup 130/130: `backup/dhl-stock-sync-130of130`
- Logic lõi đã chốt: file TỒN KHO là gốc, file `products_export` chỉ dùng tra SKU/ID theo đúng Tên + Size.

## UI v2

- Tự nhận tab HD / Trẻ em / Wika / Strivend.
- Ưu tiên nhận `Trẻ em` trước `HD`, nên hồ sơ `Trẻ em HD` không bị nhầm sang HD người lớn.
- Thanh hồ sơ hiểu `Trẻ em HD` là nhóm Trẻ em.
- Nút `ĐỒNG BỘ TAB ĐANG MỞ` tự chọn đúng hồ sơ rồi chạy quét → tạo file nhập Sapo.
- Tạo hồ sơ mới không được ghi đè hồ sơ đang chọn. Hồ sơ cũ luôn được giữ nguyên.
- Các nút quét và tạo file thủ công vẫn còn để kiểm tra hoặc fallback.

## Quy trình hằng ngày

1. Mở đúng tab danh mục nguồn.
2. Tool tự nhận nhóm và hồ sơ đã lưu.
3. Bấm `ĐỒNG BỘ TAB ĐANG MỞ`.
4. Nhận file Excel nhập tồn kho Sapo.

Chỉ cập nhật 2 file trong hồ sơ khi có thay đổi sản phẩm hoặc SKU trên Sapo.
