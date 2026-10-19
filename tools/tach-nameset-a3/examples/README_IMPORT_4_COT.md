# DHL Nameset Layout – Import 4 cột (V8.35)

## File mẫu

- `IMPORT_NAMESET_4_COT_SIZE.csv` — có thể mở bằng Excel và nhập trong tab **EXCEL** của DHL Nameset Layout.
- Hàng đầu tiên: **Tên áo | Số áo | Dòng thứ 3 | Size**.
- Mỗi dòng dữ liệu tạo một bộ in. Không tự trộn tên, số, dòng thứ ba từ các dòng khác nhau.

| Tên áo | Số áo | Dòng thứ 3 | Size |
| --- | --- | --- | --- |
| MESSI | 10 | A12-K41-MK | S |
| RONALDO | 7 | A12-K41-MK | M |
| COACH | | | M |
| RONALDINHO | 10 | B05-K12 | L |

## Quy tắc xử lý

- **Tên áo**: bắt buộc.
- **Số áo**: có thể trống. Ví dụ `COACH` không có số sẽ tạo một đối tượng chữ tên riêng, không tự tạo số 0.
- **Dòng thứ 3**: tùy chọn; nếu có, in ở **dưới số áo**. Giữ nguyên dấu nối, ví dụ `A12-K41-MK`.
- **Size**: chỉ để phân loại và gắn nhãn tên object `DHL_EXCEL_ROW_<row>_SIZE_<size>`, không in lên hình và **không tự thay kích thước tên/số**.
- Excel 2 cột, 3 cột và một cột theo cú pháp `Tên - Số - Dòng dưới` của các bản trước vẫn hỗ trợ.
- Không đăng file Excel chứa dữ liệu khách hàng thật lên repository công khai; file mẫu trong repo chỉ dùng dữ liệu minh họa.

## Các bước

1. Vào **EXCEL** → chọn `.xlsx`, `.xls` hoặc `.csv` có cấu trúc trên.
2. Xem preview tổng dòng và dòng chỉ tên.
3. Nạp font; đặt chiều cao tên/số/dòng thứ 3 và khoảng cách.
4. **TẠO CÁC BỘ TỪ EXCEL**; từng hàng được tạo riêng, có nhãn Size trong tên object.
5. Chọn khổ in → **SET TRANG IN** → dàn file.

> Công cụ dùng Excel COM trên Windows, cần Excel có thể mở được file. Hãy kiểm tra một bản thử ở Corel trước khi đưa vào sản xuất.
