# DHL Product Factory — Gemini Free-tier + ChatGPT Image Prompt

Công cụ web độc lập cho **6 shop** (DHL Sports, DHL Studio, Rabbit Store, Store Miu Miu, Miu Clothing & Beauty, Phong Thủy Khánh Hòa). Chạy **Node.js 22+**, không cần cài package npm, không sửa mã website bán hàng chính.

## Chạy trên Windows (PowerShell)

1. Cài Node.js 22 hoặc mới hơn từ nodejs.org.
2. Giải nén thư mục này, mở PowerShell trong thư mục.
3. Đặt biến môi trường cho cửa sổ đang mở (không commit API key lên GitHub):

```powershell
$env:GEMINI_API_KEY="..."
$env:PRODUCT_STUDIO_PASSWORD="mat-khau-rieng-dai-va-kho-doan"
node .\server.mjs
```

4. Mở http://127.0.0.1:4177 và nhập **mật khẩu tool**, KHÔNG nhập API key vào giao diện.
5. Chọn shop, cung cấp ảnh thật, tên, SKU, giá vốn/phí đã đối chiếu; bấm phân tích; kiểm tra bản nháp và xuất `.xlsx`.

Dùng Docker: `docker build -t dhl-product-factory .` sau đó chạy container gắn `-e GEMINI_API_KEY -e PRODUCT_STUDIO_PASSWORD`, expose port 4177 với reverse proxy TLS. Với môi trường container, đặt `HOST=0.0.0.0`. **Không mở port trực tiếp ra Internet** khi chưa cấu hình HTTPS, xác thực reverse proxy và giới hạn truy cập.

## Chức năng đã có

- 6 shop, các quy tắc riêng theo sản phẩm.
- Nhận tối đa 3 ảnh JPG/PNG/WEBP (mỗi ảnh tối đa 5MB) và dữ liệu tên, SKU, chi phí.
- **Gemini generateContent API** để phân tích và soạn nội dung tiếng Việt/English có cấu trúc; thông tin chưa biết được đưa vào danh sách cần chốt. Model mặc định `gemini-2.5-flash-lite` (chỉnh bằng `GEMINI_TEXT_MODEL`).
- **Tạo chín prompt ảnh độc lập**: copy từng prompt từ giao diện rồi đính kèm ảnh gốc vào ChatGPT để tạo; công cụ KHÔNG gọi API tạo/chỉnh ảnh và không tính phí API cho prompt. Mỗi ảnh cần người dùng duyệt. Với nameset hướng dẫn ép cần dùng lại file gốc nguyên vẹn.
- Giá Shopee từ vốn + phí + lợi nhuận mục tiêu, làm tròn **lên** mức kết thúc **9.000 VND** (119.000, 129.000, ...). Giá web/offline tính theo tiền dự kiến thực nhận, cũng làm tròn lên.
- Xuất ba file XLSX: **Thông tin sản phẩm VI/EN**, **SEO Website VI/EN**, **Bảng giá đề xuất** (chờ duyệt). Không lưu API key và không ghi tự động dữ liệu nhạy cảm.
- Kiểm thử cục bộ `node --test test/server.test.mjs`.

## Giới hạn — phải làm trong giai đoạn kế tiếp

**Phiên bản MVP chưa tự động:**
1. Đọc ảnh trực tiếp từ Drive, quản lý Google OAuth và lưu bộ hồ sơ vào thư mục sản phẩm.
2. Sao chép/điền chính xác các template BigSeller và Lazada để **import trực tiếp**; cần test bằng hàng mẫu thật tại chính tài khoản sàn.
3. Ghi vào file tham chiếu bảng giá Shopee gốc `tham chiếu làm bảng giá sản phẩm bán shopee đừng động vào.xlsx`. Bản đó có công thức/định dạng riêng và **không được cập nhật tự động trước khi kiểm tra và phê duyệt**. Tool chỉ xuất `BANG_GIA_DE_XUAT.xlsx` để đối chiếu.
4. Đẩy sản phẩm lên Shopee, Lazada, website và cập nhật trạng thái thực tế.
5. Tạo ảnh tự động: hiện tool chỉ xuất prompt. Người dùng đính kèm ảnh gốc và nhập prompt vào ChatGPT để tạo từng ảnh, sau đó kiểm duyệt và đưa ảnh cuối lên Drive.

Mẫu nhập BigSeller mà người dùng cung cấp có dòng sản phẩm **ví dụ**. Không tự động gửi mẫu chưa xóa dòng ví dụ lên sàn.

## An toàn và chi phí

- API key chỉ ở server (`GEMINI_API_KEY`). Tool phải có mật khẩu (`PRODUCT_STUDIO_PASSWORD`) mới khởi động và dùng API.
- Không ghi khóa vào `.env` rồi đưa lên repo công khai. Khi triển khai Internet cần HTTPS, reverse proxy xác thực, hạn mức chi phí/billing, rate-limit và lưu log vận hành an toàn.
- Mỗi lần phân tích gọi **Gemini API**; có thể miễn phí trong hạn mức, có khả năng bị giới hạn hoặc tính phí tùy tier. Việc tạo prompt ảnh không gọi API. Tạo ảnh thủ công trong ChatGPT tuân theo giới hạn gói ChatGPT của người dùng.
- Prompt injection trong ảnh/file được coi là dữ liệu, không phải chỉ dẫn. Tuy nhiên mô hình vẫn có thể sai; phải kiểm tra trước khi bán.
- Thuộc tính pháp lý, giá vốn, phí sàn, thuế, SKU, công dụng được đối chiếu thủ công; không mặc định từ kết quả AI.

## API nội bộ

- `GET /health`
- `GET /api/config` (mật khẩu trong header `x-tool-password`)
- `POST /api/analyze` — ảnh, shop, tên, SKU, ghi chú → nội dung VI/EN.
- `POST /api/prompts` — bản nháp + shop → chín prompt ảnh riêng biệt để copy vào ChatGPT, không gọi AI.
- `POST /api/price` — chi phí, phí → giá gợi ý.
- `POST /api/export` — `kind: info|seo|price` → XLSX.

**Nguồn chính:** https://drive.google.com/drive/folders/1tAceM6I0SoTn2UukYsXl6kq1gFeojQzu

**Hạn mức mặc định:** tối đa 20 lần gọi phân tích/ảnh mỗi giờ cho mỗi IP và chức năng, đổi qua `MAX_AI_CALLS_PER_HOUR`. Dùng một giới hạn chi tiêu phía tài khoản API để phòng phát sinh chi phí ngoài ý muốn.

## Phase 2 — đọc Drive, tra cứu ngành hàng, xuất file theo mẫu gốc

**Trạng thái:** Đã viết mã và kiểm thử cục bộ bằng các file Excel thật do chủ shop cung cấp, chưa kết nối đến Google OAuth của người dùng trong môi trường production.

### Cấu hình Google Drive

1. Trong Google Cloud Console, tạo dự án, bật **Google Drive API** và tạo OAuth client do chính chủ tài khoản quản lý.
2. Cấp scope **`https://www.googleapis.com/auth/drive.readonly`**, lấy refresh token cho tài khoản có quyền truy cập các file trên Drive. Không đưa token, client secret hoặc key lên GitHub.
3. Cài `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` trong biến môi trường của máy chủ.
4. Thiết lập `DRIVE_SHOP_FOLDERS_JSON`: đối tượng JSON gán đúng tên 6 shop với ID thư mục Google Drive của mỗi shop. Chỉ hiển thị file trong thư mục shop và thư mục sản phẩm con trực tiếp, không lục Drive ngoài phạm vi.
5. Thiết lập `DRIVE_BIGSELLER_TEMPLATE_ID` trỏ đến bản mới `BIGSELLER - MẪU ĐĂNG SẢN PHẨM (CÓ DỮ LIỆU VÍ DỤ).xlsx`, `DRIVE_LAZADA_TEMPLATE_ID` trỏ đến `LAZADA - MẪU ĐĂNG SẢN PHẨM.xlsx`, và `DRIVE_SHOPEE_PRICE_FILE_ID` trỏ đến đúng file tham chiếu bảng giá gốc. Đây phải là **XLSX**, không phải Google Sheets.

Ứng dụng chỉ đọc tài liệu; người dùng có thể chọn ảnh, TXT/MD/DOCX trong thư mục shop hoặc trong thư mục sản phẩm con để đưa vào bản phân tích. Không gửi tài liệu của shop khác. Không nhận tệp thực thi, SVG có script hoặc URL bất kỳ để tải trực tiếp.

### Tạo file xuất BigSeller / Lazada

- Chạy Gemini để tạo **bản nháp**, rà soát văn bản và giá.
- Chọn đúng **mã ngành hàng của sàn tương ứng**, nhập thương hiệu Lazada, cân nặng/kích thước đóng gói, URL ảnh HTTPS công khai, SKU, biến thể, tồn kho và giá thực tế.
- Nhấn các ô xác nhận duyệt. Phải hoàn thành trường bắt buộc trước khi được xuất file.
- Tool đọc template từ Google Drive, **không sửa file gốc**. Với BigSeller, tool xóa 2 dòng ví dụ từ bản xuất, giữ nguyên 31 cột, `Sheet2`/`Sheet3`. Với Lazada, giữ nguyên 4 dòng tiêu đề/hướng dẫn cùng `template_hide`, `Kết quả`, `global_hide`.
- **Chưa xác nhận import chính thức:** hãy test 1 SKU trong BigSeller và Lazada Seller Center và đối chiếu lỗi nhận được. Không nhập hàng loạt khi chưa test.

### Tra cứu phí theo bảng giá Shopee chính

- Tool lấy sheet `Ngành hàng` theo tên ngành hàng **khớp chính xác** và hiển thị tỷ lệ phí cố định tại cột F; lấy cấu hình tham khảo trong sheet `Cấu hình`.
- **Không tự cộng/gán toàn bộ phí** vì còn phụ thuộc loại shop, chương trình Voucher Xtra, phí thực tế, Ads, thuế và thời điểm.
- Bảng `tham chiếu làm bảng giá sản phẩm bán shopee đừng động vào.xlsx` chỉ được **đọc**, không sửa công thức, không thêm sản phẩm và không ghi dữ liệu lên file khi thiếu bước đối soát.
- Tool tiếp tục cho phép xuất bảng giá đề xuất, để so sánh và duyệt trước khi lập chức năng ghi cập nhật an toàn ở giai đoạn sau.

### API bổ sung

- `GET /api/drive/list?shop=...&parentId=...` — liệt kê file trong shop/thư mục sản phẩm con được phép.
- `POST /api/drive/source` với `{shop,ids:[...]}` — tải tối đa 4 tệp ảnh/tài liệu có phạm vi.
- `POST /api/drive/fees` với `{category:"Tên ngành hàng đầy đủ"}` — phí và nguồn ô tham chiếu.
- `POST /api/export-platform` với `{platform:"bigseller"|"lazada",draft,product,listing}` — file XLSX dựa trên mẫu thực. `listing` phải có `reviewed`, `categoryConfirmed`, và nếu là Lazada thì cả `brandConfirmed`.

**Chưa có:** tự ghi bảng giá, sao lưu/cập nhật file gốc, lưu hồ sơ đã duyệt lên Drive, tự đăng sàn, triển khai hosting. Các chức năng này cần thử nghiệm riêng bằng SKU thật và bảo đảm quyền ghi đúng file/đúng thư mục.

### Kiểm thử

`node --test test/*.test.mjs`

Các test có dữ liệu mẫu thực tế tại `/mnt/data` nếu môi trường kiểm thử có gắn chúng; trên CI/thiết bị khác những bài cần workbook ngoài sẽ được skip. Không đưa tệp tham chiếu giá, mẫu seller hoặc token riêng lên repo public.


## Luồng ưu tiên (cập nhật 2026-10-12)

1. Nhập ảnh và thông tin sản phẩm từ máy hoặc Drive theo shop.
2. Gemini Flash-Lite phân tích và xuất bản nháp Việt/Anh, facts/missing/photoPlan. Chỉ chạy được khi máy chủ có `GEMINI_API_KEY`.
3. Sau khi kiểm tra bản nháp, bấm **Tạo 9 prompt ảnh**; sao chép từng prompt hoặc tải `.txt`, **đính kèm ảnh thật** khi gửi ChatGPT. Không chuyển ảnh qua API tạo ảnh, không dùng OpenAI API key.
4. Tự làm/duyệt ảnh trong ChatGPT; đưa ảnh cuối cùng và URL công khai trở lại tool.
5. Xuất SEO/giá dự kiến, BigSeller, Lazada khi dữ liệu đã xác minh; chưa ghi trực tiếp bảng giá gốc.

**Về dữ liệu và chi phí:** Google nêu Free Tier có thể dùng dữ liệu gửi lên để cải thiện sản phẩm. Không gửi thiết kế bí mật/nội dung khách hàng khi chưa chấp nhận chính sách và chưa xác nhận loại tài khoản. Free Tier bị giới hạn quota; không tự động chuyển sang Paid Tier hay model trả phí. Cấu hình API key ở máy chủ (không commit).
