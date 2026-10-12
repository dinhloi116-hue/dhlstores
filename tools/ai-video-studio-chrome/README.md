# DHL AI Video Studio — Chrome Extension MVP

Chrome Extension (Manifest V3) độc lập tại tools/ai-video-studio-chrome. Không sửa web bán hàng và không phụ thuộc giao diện chat.

## Chức năng đã có trong mã

- Mở giao diện Studio dạng tab Chrome; phân tích video MP4/MOV/WebM/M4V đã chọn trên máy.
- Upload video theo chunk 8 MiB đến **Gemini Files API**, đợi file xử lý và gọi **Gemini 2.5 Flash** để trả JSON storyboard.
- Chỉnh sửa từng cảnh: timecodes, mô tả, lời thoại, prompt ChatGPT, prompt Flow, ghi chú.
- Thêm/xóa cảnh, tự lưu bản nháp vào chrome.storage.local, xuất JSON hoặc CSV.
- OAuth Google Drive bằng chrome.identity với scope drive.file. Khi đã cấu hình Client ID, có thể tạo thư mục dự án / project.json, lưu lại, liệt kê/mở lại dự án và tùy chọn tải video gốc lên Drive.
- Không đóng gói API key / OAuth secret / access token vào repo hoặc file dự án.

## Cài đặt cho Chrome trên máy tính (chưa tự động đăng nhập)

1. Download hoặc clone repository; mở folder tools/ai-video-studio-chrome.
2. Vào chrome://extensions > bật Developer mode > Load unpacked > chọn **folder chứa manifest.json**.
3. Ghi lại extension ID của bản vừa cài. Mở Google Cloud Console trên tài khoản Google của bạn.
4. Tạo project Cloud; bật **Google Drive API**; tạo OAuth consent screen và OAuth Client ID cho **Chrome Extension**, điền đúng extension ID. Nếu ứng dụng còn ở trạng thái Testing, thêm tài khoản Google của bạn làm test user.
5. Thay giá trị REPLACE_WITH_CHROME_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com trong manifest.json bằng Client ID thật (chỉ Client ID, **không cần client secret**).
6. Trong chrome://extensions bấm Reload. Mở extension > Mở Video Studio > Kết nối Drive. Chấp thuận quyền drive.file.
7. Tạo Gemini API key riêng tại https://aistudio.google.com/apikey (giới hạn và tính phí theo tài khoản). Dán vào ô Gemini API key của Studio.
8. Chọn video trên máy, nhập mục tiêu cần chuyển thể, bấm **Phân tích video và tạo phân cảnh**, sửa cảnh nếu cần, bấm **Lưu lên Drive**.

> **Lưu ý:** Chrome Extension ID có thể đổi nếu cài cùng mã nguồn từ nơi khác. Dùng key manifest hoặc đóng gói cố định khi phát hành để giữ Extension ID, cập nhật OAuth Client ID tương ứng. Không chia sẻ bản build đã gắn API key. Client ID OAuth là thông tin nhận diện ứng dụng, không phải secret.

## Cấu trúc Google Drive

DHL AI Video Studio/
  Tên dự án/
    project.json
    video-goc.mp4 (tùy chọn)

Thư mục và file này do extension tạo thông qua OAuth. File **không tự động được tạo trên Drive chỉ vì mã nguồn đã được commit**. Tự lưu nháp qua Chrome hoạt động ngay khi chưa cấu hình Drive.

Drive OAuth scope drive.file chỉ cho phép ứng dụng quản lý file do ứng dụng tạo/mở. Không có quyền đọc toàn bộ Drive; vì vậy **trong MVP, link nguồn Drive chỉ lưu làm tham chiếu**, không tải và phân tích trực tiếp file nguồn trên Drive. Muốn phân tích video gốc đang ở Drive, trước mắt cần tải về máy rồi chọn file trong Studio. Nâng cấp tương lai: Google Picker để người dùng chọn video Drive được cấp quyền cho ứng dụng.

## Phân tích video lớn

- Mã hỗ trợ tải video thành các phần 8 MiB, không đọc toàn bộ 640 MB thành base64. Hãy giữ tab mở trong khi upload/phân tích.
- Google Gemini Files API hỗ trợ tới 2 GB/file trên Free tier theo tài liệu tại thời điểm phát triển; **không bảo đảm số lượng request miễn phí**.
- Kết quả Gemini có thể nhầm timecodes, mô tả hoặc lời thoại. Phải kiểm lại storyboard trước khi làm video.
- Gemini Files API lưu file tạm thời, có thời hạn. Video nguồn lâu dài phải lưu trên Google Drive riêng.
- Không phải công cụ nhận video bất kỳ từ URL Google Drive qua API; chỉ nhận file local chọn trong hộp thoại.
- Không chạy AI hoàn toàn offline. Không thay thế được CapCut/Google Flow.

## Bảo mật và vận hành

- Gemini API key được giữ trong chrome.storage.session, không lưu trong project.json, không commit, không đồng bộ Drive. Việc gọi trực tiếp API từ máy người dùng là giải pháp MVP; khi phát hành nhiều người dùng, cần server/proxy bảo mật, hạn mức và kiểm soát chi phí.
- Google Drive token do chrome.identity quản lý; không được ghi vào tệp.
- Không upload video sang Gemini khi người dùng chưa chủ động bấm Phân tích.
- Không upload video nguồn sang Drive khi người dùng chưa bấm riêng "Tải video ... lên Drive".
- Không ghi vào các thư mục shop hay dữ liệu khác trên Drive.
- Không có content script chạy trên Facebook, Google Drive, CapCut hoặc bất kỳ trang web nào.

## Giới hạn phiên bản 0.1.0

**Đã triển khai mã nguồn, chưa xác minh end-to-end trên Chrome thật**. Chưa có OAuth Client ID, chưa có Gemini API key hoặc phiên đăng nhập thực tế để chạy thử trực tiếp. Các nút cần quyền/API báo lỗi và hướng dẫn tương ứng.

Chưa có: tạo ảnh ChatGPT tự động (API tính phí riêng), tạo video Google Flow tự động, clone voice, xuất CapCut project, chọn video trực tiếp qua Google Picker, background jobs hoặc hàng đợi phân tích dài hạn.

## Lộ trình

1. QA extension tại chrome://extensions, kết nối OAuth Drive, test lưu/tải project.json.
2. Test Gemini với video ngắn rồi video 640 MB, kiểm tra lại phân cảnh/timestamps.
3. Đưa Google Picker vào để chọn video trực tiếp từ Drive.
4. Thêm bước tạo/duyệt ảnh, điều phối Flow và hỗ trợ voice.
5. Tạo gói phát hành ổn định, có kiểm soát phiên bản và backup.

Docs: https://developer.chrome.com/docs/extensions/ | https://developers.google.com/workspace/drive/api/ | https://ai.google.dev/gemini-api/docs/video-understanding
