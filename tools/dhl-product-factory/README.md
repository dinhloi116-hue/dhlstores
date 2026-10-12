# DHL Product Factory — OpenAI API MVP

Công cụ web độc lập cho **6 shop** (DHL Sports, DHL Studio, Rabbit Store, Store Miu Miu, Miu Clothing & Beauty, Phong Thủy Khánh Hòa). Chạy **Node.js 22+**, không cần cài package npm, không sửa mã website bán hàng chính.

## Chạy trên Windows (PowerShell)

1. Cài Node.js 22 hoặc mới hơn từ nodejs.org.
2. Giải nén thư mục này, mở PowerShell trong thư mục.
3. Đặt biến môi trường cho cửa sổ đang mở (không commit API key lên GitHub):

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:PRODUCT_STUDIO_PASSWORD="mat-khau-rieng-dai-va-kho-doan"
node .\server.mjs
```

4. Mở http://127.0.0.1:4177 và nhập **mật khẩu tool**, KHÔNG nhập API key vào giao diện.
5. Chọn shop, cung cấp ảnh thật, tên, SKU, giá vốn/phí đã đối chiếu; bấm phân tích; kiểm tra bản nháp và xuất `.xlsx`.

Dùng Docker: `docker build -t dhl-product-factory .` sau đó chạy container gắn `-e OPENAI_API_KEY -e PRODUCT_STUDIO_PASSWORD`, expose port 4177 với reverse proxy TLS. Với môi trường container, đặt `HOST=0.0.0.0`. **Không mở port trực tiếp ra Internet** khi chưa cấu hình HTTPS, xác thực reverse proxy và giới hạn truy cập.

## Chức năng đã có

- 6 shop, các quy tắc riêng theo sản phẩm.
- Nhận tối đa 3 ảnh JPG/PNG/WEBP (mỗi ảnh tối đa 5MB) và dữ liệu tên, SKU, chi phí.
- **OpenAI Responses API** để phân tích và soạn nội dung tiếng Việt/English có cấu trúc; thông tin chưa biết được đưa vào danh sách cần chốt. Model mặc định `gpt-5-mini` (chỉnh bằng `OPENAI_TEXT_MODEL`).
- **OpenAI Image Edits API** để làm thử **một** mockup từ ảnh gốc; đây là ảnh cần duyệt, không phải bản sao chính xác tuyệt đối. Model mặc định `gpt-image-1`, điều chỉnh qua `OPENAI_IMAGE_MODEL` nếu tài khoản hỗ trợ.
- Giá Shopee từ vốn + phí + lợi nhuận mục tiêu, làm tròn **lên** mức kết thúc **9.000 VND** (119.000, 129.000, ...). Giá web/offline tính theo tiền dự kiến thực nhận, cũng làm tròn lên.
- Xuất ba file XLSX: **Thông tin sản phẩm VI/EN**, **SEO Website VI/EN**, **Bảng giá đề xuất** (chờ duyệt). Không lưu API key và không ghi tự động dữ liệu nhạy cảm.
- Kiểm thử cục bộ `node --test test/server.test.mjs`.

## Giới hạn — phải làm trong giai đoạn kế tiếp

**Phiên bản MVP chưa tự động:**
1. Đọc ảnh trực tiếp từ Drive, quản lý Google OAuth và lưu bộ hồ sơ vào thư mục sản phẩm.
2. Sao chép/điền chính xác các template BigSeller và Lazada để **import trực tiếp**; cần test bằng hàng mẫu thật tại chính tài khoản sàn.
3. Ghi vào file tham chiếu bảng giá Shopee gốc `tham chiếu làm bảng giá sản phẩm bán shopee đừng động vào.xlsx`. Bản đó có công thức/định dạng riêng và **không được cập nhật tự động trước khi kiểm tra và phê duyệt**. Tool chỉ xuất `BANG_GIA_DE_XUAT.xlsx` để đối chiếu.
4. Đẩy sản phẩm lên Shopee, Lazada, website và cập nhật trạng thái thực tế.
5. Tạo đủ bộ ảnh 8–9 tấm; hiện chức năng ảnh chỉ tạo từng bản mockup cần duyệt.

Mẫu nhập BigSeller mà người dùng cung cấp có dòng sản phẩm **ví dụ**. Không tự động gửi mẫu chưa xóa dòng ví dụ lên sàn.

## An toàn và chi phí

- API key chỉ ở server (`OPENAI_API_KEY`). Tool phải có mật khẩu (`PRODUCT_STUDIO_PASSWORD`) mới khởi động và dùng API.
- Không ghi khóa vào `.env` rồi đưa lên repo công khai. Khi triển khai Internet cần HTTPS, reverse proxy xác thực, hạn mức chi phí/billing, rate-limit và lưu log vận hành an toàn.
- Mỗi lần phân tích/generate ảnh là **một lần gọi API có tính phí riêng** ngoài đăng ký ChatGPT thông thường.
- Prompt injection trong ảnh/file được coi là dữ liệu, không phải chỉ dẫn. Tuy nhiên mô hình vẫn có thể sai; phải kiểm tra trước khi bán.
- Thuộc tính pháp lý, giá vốn, phí sàn, thuế, SKU, công dụng được đối chiếu thủ công; không mặc định từ kết quả AI.

## API nội bộ

- `GET /health`
- `GET /api/config` (mật khẩu trong header `x-tool-password`)
- `POST /api/analyze` — ảnh, shop, tên, SKU, ghi chú → nội dung VI/EN.
- `POST /api/image` — ảnh tham chiếu + prompt → một mockup PNG.
- `POST /api/price` — chi phí, phí → giá gợi ý.
- `POST /api/export` — `kind: info|seo|price` → XLSX.

**Nguồn chính:** https://drive.google.com/drive/folders/1tAceM6I0SoTn2UukYsXl6kq1gFeojQzu

**Hạn mức mặc định:** tối đa 20 lần gọi phân tích/ảnh mỗi giờ cho mỗi IP và chức năng, đổi qua `MAX_AI_CALLS_PER_HOUR`. Dùng một giới hạn chi tiêu phía tài khoản API để phòng phát sinh chi phí ngoài ý muốn.
