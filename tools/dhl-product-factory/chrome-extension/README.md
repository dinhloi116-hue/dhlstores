# DHL Product Factory — Chrome Extension (Manifest V3)

Extension dành cho **6 shop**; dùng **Gemini** để phân tích ảnh, SEO Việt/Anh; tạo **9 prompt** gửi thủ công sang ChatGPT; tính giá và tải Excel. Mở qua Chrome **Side Panel**.

## Cài đặt bản thử (Windows / Chrome)

1. Giải nén `DHL_Product_Factory_Chrome_Extension.zip` vào một thư mục cố định trên máy, ví dụ `D:\\DHL-Product-Factory-Extension`.
2. Mở Chrome → gõ `chrome://extensions` → bật **Chế độ dành cho nhà phát triển** (Developer mode).
3. Chọn **Tải tiện ích đã giải nén** (Load unpacked) → chọn **thư mục có `manifest.json`**.
4. Bấm biểu tượng tiện ích DHL Product Factory trên thanh Chrome. Side Panel sẽ mở.
5. Tab **Cài đặt**: lấy Gemini API key tại `https://aistudio.google.com/apikey`, nhập và lưu. Key chỉ lưu trong `chrome.storage.local`, **không** nằm trong GitHub.
6. Tab **Sản phẩm**: chọn shop, nhập thông tin, đính kèm tối đa ba ảnh thật, nhấn **Phân tích bằng Gemini**.
7. Tab **Nội dung** kiểm tra, sửa SEO Việt/Anh; tab **Prompt ảnh** tạo/copy 9 prompt, rồi gửi kèm ảnh thật sang ChatGPT.
8. Tab **Xuất file** tính giá và tải Excel thông tin VI/EN, SEO VI/EN, bảng giá đề xuất (các file này không cần máy chủ).

**Lưu ý:** Free Tier Gemini có quota theo tài khoản và chính sách xử lý dữ liệu riêng. Không gửi thiết kế hoặc thông tin khách hàng nhạy cảm khi chưa xác nhận điều khoản sử dụng. Key lưu trên máy không bảo đảm an toàn tuyệt đối nếu Chrome/máy tính bị xâm nhập. Chỉ tải extension từ thư mục tin cậy.

## Sử dụng BigSeller / Lazada / Google Drive

Để giữ cấu trúc sheet ẩn và toàn bộ dữ liệu mẫu chính thức, extension dùng **chế độ máy chủ tùy chọn**, không cố tình làm giả file import:

- Cần chạy **backend DHL Product Factory** từ `tools/dhl-product-factory` (cùng repo), tại `http://127.0.0.1:4177`, cấu hình `PRODUCT_STUDIO_PASSWORD` và Google OAuth đọc Drive theo tài liệu backend.
- Tab **Xuất file**: nhập mật khẩu backend (không lưu vào Chrome). Với phần **Drive**, có thể chọn file từ thư mục shop qua máy chủ chỉ đọc.
- Đối với BigSeller/Lazada, điền SKU, mã danh mục của từng sàn, cân nặng, kích thước, URL ảnh HTTPS công khai, thương hiệu, giá/tồn và đánh dấu đã kiểm duyệt; nhấn xuất. File tạo dựa trên mẫu XLSX gốc từ Drive, không sửa mẫu.
- **Chưa** kiểm thử import thật ở tài khoản sàn, chưa tự lưu sản phẩm lên Drive, chưa cập nhật trực tiếp `tham chiếu làm bảng giá sản phẩm bán shopee đừng động vào.xlsx`, chưa tự đăng sản phẩm.
- Máy chủ đang là tùy chọn. Các chức năng phân tích Gemini, tạo prompt và Excel báo cáo vẫn chạy không cần máy chủ.

## Quyền truy cập

- `sidePanel`: mở giao diện cạnh trang web.
- `storage`: lưu key/model theo yêu cầu của người dùng, bản nháp nếu người dùng tự bấm Lưu.
- `activeTab` + `scripting`: **chỉ khi bấm** “Lấy tên từ trang hiện tại”, đọc title và meta description của tab đang mở. Không theo dõi trình duyệt nền.
- `host_permissions` cho `generativelanguage.googleapis.com`: gọi Gemini trực tiếp từ service worker.
- `127.0.0.1` / `localhost`: tùy chọn kết nối backend chạy trên máy người dùng. Không chuyển key Gemini cho backend.

Không có content script thường trực, không thu thập lịch sử duyệt web, không gắn key API vào mã nguồn, không tự gọi OpenAI API.

## Mã nguồn và kiểm thử

`tools/dhl-product-factory/chrome-extension` trong `dinhloi116-hue/dhlstores`.

Chạy `node --test test/*.test.mjs` với Node.js 22+. Bài test xác minh logic tính giá, cấu trúc prompt, Excel, manifest và UI. Chưa test trực tiếp trên Chrome hoặc với Gemini key thật. **Đây là bản extension chưa phát hành Chrome Web Store.**
