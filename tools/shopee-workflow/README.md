# Shopee Product Workflow

Tool local-first chạy trên Chrome cho quy trình:

**Nguồn → Phân tích → Giá bán → Nội dung → Prompt ảnh bìa → Quản lý gian hàng → Xuất Shopee Mass Upload**

## Kiến trúc đã chốt

- Khối lượng tính cước tách riêng trọng lượng sản phẩm.
- Giá vốn = giá CNY × tỷ giá + ship nội địa TQ + ship quốc tế + chi phí khác.
- Phí Shopee tra theo database ngành, tính bằng code.
- Giá đề xuất chỉ theo dãy 19k, 29k, 39k, 49k...
- Ảnh bìa là ảnh chung cho listing; tool tạo prompt để dùng với ChatGPT.
- Tên shop/cấu hình phí được lưu xuyên suốt, không nhập lại cho mỗi sản phẩm.
- Quản lý nhiều sản phẩm và hàng chờ xuất.
- Export phải dựa trên chính template Shopee Mass Upload, giữ nguyên dòng 1–6, sheet ẩn, validation và metadata.

## Bản chạy local

Project hoàn chỉnh được đóng gói dưới dạng `shopee_product_workflow_v1.zip`.

Chạy Windows:

```
CAI_DAT_VA_CHAY.bat
```

Sau đó mở:

```
http://127.0.0.1:3131
```

Core tool không cần cài thư viện Python ngoài. OpenAI API là tùy chọn; không có API vẫn dùng được phần tính giá, quản lý, prompt ảnh và xuất Excel.

## Online

Project có cấu hình Render. Khi đưa toàn bộ source vào repository, có thể chạy bằng:

```
python server.py
```

với `HOST=0.0.0.0`.

> Branch này được tách riêng để không ảnh hưởng code đang chạy trên `main`.
