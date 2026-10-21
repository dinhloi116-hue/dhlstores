
## Mẫu Excel Quần Áo Bóng Đá HD và sản phẩm Bồ Đào Nha — 2026-10-21
- [x] Thêm lựa chọn mẫu “Quần Áo Bóng Đá HD” trong khu Nhập sản phẩm từ Excel, mô tả cấu trúc và link tải static `/templates/quan-ao-bong-da-hd.xlsx`; HTTP kiểm chứng 200, đúng 11.417 bytes/ZIP.
- [x] Tạo danh mục physical “Quần Áo Bóng Đá HD” (id 38970027); handler `onChange` và effect selector đặt `excelCategoryId` sang category này sau khi chọn mẫu HD, áp dụng cả trước/sau khi preview.
- [x] Đọc/preview file mẫu, nhập sản phẩm Bồ Đào Nha xanh rêu với 11 ảnh gallery, 2 nhóm lựa chọn (Kiểu/Kích cỡ), 10 SKU và giá 119.000–149.000đ; storefront đã render sản phẩm, gallery, size và SKU.
- [x] Chuẩn hóa parser nhãn “Kíchcỡ” → “Kích cỡ”, cập nhật dữ liệu thật của 10 SKU; full regression 201 passed/2 skipped, TypeScript, build và diff check đạt.
