# DHL Stock Sync – Chrome Extension (prototype)

Tiện ích local để đọc tồn kho từ `si.aobongda.net` theo SKU / màu / size. Bản này **chỉ đọc**, chưa có quyền ghi Sapo.

## Cách test trên Chrome

1. Đăng nhập `https://si.aobongda.net`.
2. Mở `chrome://extensions` → bật **Chế độ dành cho nhà phát triển**.
3. Chọn **Tải tiện ích đã giải nén** và chọn thư mục này.
4. Ghim `DHL Stock Sync` lên thanh công cụ.
5. Mở một trang sản phẩm hoặc trang danh mục của nguồn.
6. Bấm **Quét sản phẩm hiện tại** hoặc **Quét danh sách**.

## Nguyên tắc an toàn

- Không đọc được nguồn ≠ tồn bằng 0.
- Dữ liệu quét có `confidence` và `validation`.
- SKU trùng / thiếu SKU / phản hồi lỗi sẽ bị đánh dấu cần kiểm tra.
- Quét tuần tự, không bắn hàng loạt request đồng thời.
- Chưa có host permission hoặc API token Sapo trong prototype.

## Cơ chế đang thử nghiệm

Endpoint nguồn đã quan sát:

`/product/child?psId=<parentId>`

Trong phiên đăng nhập, các request tuần tự có thể trả các child variant khác nhau. Tool thu thập ID duy nhất và dừng khi phát hiện vòng lặp về variant đầu tiên. Vì đây là hành vi cần xác minh thêm trên Chrome thật, kết quả ít variant hoặc lặp bất thường sẽ được đánh dấu `low confidence` thay vì coi là hoàn chỉnh.
