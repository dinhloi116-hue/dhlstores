# DHL Product Factory — v0.9.0: MỘT SẢN PHẨM, MỘT THƯ MỤC, MỘT FILE MD

**Quy trình mới (20/10/2026):** Chụp màn hình → Dán ảnh → Phân tích → Lưu Drive.

Google Drive: `TRUNG TÂM TẠO SẢN PHẨM - 6 SHOP / <SHOP> / <TÊN SẢN PHẨM> /`, bên trong chỉ tự lưu ảnh nguồn, ảnh thành phẩm và **`THÔNG TIN SẢN PHẨM.md`** chứa tất cả dữ liệu, hai ngôn ngữ SEO, giá vốn/giá gợi ý (nếu có đủ phí), SKU, thông tin ảnh, tài liệu nguồn, 9 prompt và mục cần kiểm tra. Không tự tạo Excel/TXT/JSON/BigSeller/Lazada ở Drive.

Tên sản phẩm AI gợi ý được sử dụng nếu chưa nhập thủ công. SKU bán hàng **không bắt buộc** để lưu; hệ thống luôn dùng mã hồ sơ kỹ thuật SHA-256 ổn định theo shop/tên (độc lập với SKU bán hàng, để cập nhật cùng thư mục kể cả khi SKU thay đổi) (không công bố đó là SKU). Nếu có thư mục trùng tên nhưng khác mã hồ sơ, dừng để kiểm tra; không tự ghi đè.

**Quan trọng:** File cũ trong các thư mục sản phẩm đã tạo ở phiên bản trước **không bị xóa** và vẫn còn nguyên. Nếu phát hiện MD tên trùng không do tool tạo, tool không ghi đè. Bảng giá Shopee tổng và file gốc không bị sửa.

**Giới hạn:** Google Drive OAuth cần được chủ tài khoản cấp quyền trong Chrome. Chưa chứng thực đăng nhập/ghi Drive thật trên thiết bị của chủ shop. Kiểm thử bằng mock.

**Lưu ý:** Nút tải Excel/BigSeller theo yêu cầu riêng trong giao diện là chức năng xuất thủ công (nếu cần), **không** được lưu tự động lên Drive.

---

# DHL Product Factory — Chrome Extension (Manifest V3)

**Bản 0.8.0: dán ảnh chụp màn hình rồi phân tích, giao diện tab rộng, Gemini + Drive nguồn/đích + kiểm tra cập nhật GitHub + bộ cập nhật Windows.**

Extension dành cho **6 shop**; dùng **Gemini** để phân tích ảnh, SEO Việt/Anh; tạo **9 prompt** gửi thủ công sang ChatGPT; tính giá và tải Excel. Mở trong **một tab Chrome rộng toàn màn hình**, không còn Side Panel.

## Cài đặt bản thử (Windows / Chrome)

1. Giải nén `DHL_Product_Factory_Chrome_Extension.zip` vào một thư mục cố định trên máy, ví dụ `D:\\DHL-Product-Factory-Extension`.
2. Mở Chrome → gõ `chrome://extensions` → bật **Chế độ dành cho nhà phát triển** (Developer mode).
3. Chọn **Tải tiện ích đã giải nén** (Load unpacked) → chọn **thư mục có `manifest.json`**.
4. Bấm biểu tượng tiện ích DHL Product Factory trên thanh Chrome. Tab làm việc rộng toàn màn hình sẽ mở.
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


## Bản 0.2.0 — TỰ LƯU DRIVE VÀ TẠO THƯ MỤC SẢN PHẨM

### Sơ đồ thư mục (đã đối chiếu Google Drive thật 12/10/2026)

`TRUNG TÂM TẠO SẢN PHẨM - 6 SHOP` → **[đúng 1 trong 6 shop]** → **[Tên sản phẩm]** → các file.

- Không đặt tiền tố số, không tạo thư mục “cũ”, “chưa dùng”, “chưa phân loại” hoặc tầng trung gian.
- Bản quyền thư mục: shop chọn bằng dropdown; công cụ kiểm tra **ID cố định, tên shop và parent của thư mục nằm trong trung tâm**. Sai thì dừng, không ghi nhầm tài khoản.
- Tên thư mục sản phẩm lấy từ tên do bạn nhập, không tự thêm SKU vào tên. SKU được ghi vào thuộc tính riêng (appProperties) để nhận diện. SKU cũ → dùng lại đúng thư mục; tên trùng SKU khác → dừng yêu cầu kiểm tra.
- Những file do tool đã tạo có cùng tên + SKU sẽ cập nhật bằng Google Drive API. **Không ghi đè file thủ công của bạn** hoặc file không do tool quản lý.

### Bật quyền ghi trên Chrome — chỉ cấu hình một lần

1. Giải nén extension vào một **thư mục cố định**, sau đó mở `chrome://extensions` → bật Developer mode → **Load unpacked**. Ghi lại **Extension ID**. Nếu đã cài bản trước thì giữ nguyên đường dẫn thư mục để giữ ID; chọn **Reload** sau khi sửa `manifest.json`.
2. Vào `https://console.cloud.google.com/` tạo hoặc chọn dự án Google Cloud do bạn quản lý; bật **Google Drive API**. Cấu hình OAuth consent screen, thêm email Google của bạn vào **Test users** nếu dự án đang Testing.
3. Google Cloud → Credentials → Create OAuth client → loại **Chrome Extension**. Dán đúng Extension ID vào **Item ID**. Sao chép OAuth Client ID trả về (không phải API key Gemini, không phải client secret).
4. Mở `manifest.json` trong thư mục extension, thay **duy nhất** giá trị `oauth2.client_id` placeholder bằng OAuth Client ID mới. Đây là Client ID công khai, không phải khóa bí mật; đừng thêm `client_secret` hay refresh token.
5. Quay lại `chrome://extensions` → nhấn **Reload**. Mở extension → **Cài đặt** → **Kết nối Google Drive** và chọn tài khoản Google có quyền vào 6 thư mục shop. Cho phép truy cập Drive.
6. Tab **Lưu Drive** → **Kiểm tra thư mục shop**. Chỉ khi xác minh thành công mới xử lý sản phẩm và lưu.

**Quyền cấp:** scope `https://www.googleapis.com/auth/drive` cho phép truy cập rộng trong tài khoản. Quyền này cần thiết để kiểm tra/ghi vào các thư mục shop đã tồn tại, nhưng mã tool có danh sách cho phép **chính xác 6 ID shop**. Khi chia sẻ extension rộng rãi, Google có thể yêu cầu xác minh ứng dụng và scope Drive. Chrome tự quản lý và làm mới access token; token không được gửi tới Gemini hay GitHub và không có refresh token trong mã nguồn.

### Sử dụng hàng ngày

1. Tab **Sản phẩm** → chọn shop, nhập tên sản phẩm + SKU, ảnh gốc; Gemini phân tích và tạo SEO Việt/Anh.
2. Tab **Prompt ảnh** → tạo 9 prompt, dùng ChatGPT tạo ảnh, lưu ảnh thành phẩm về máy.
3. Tab **Xuất file** → nhập vốn và **phí đã được đối chiếu** để tạo bảng giá; có thể xuất BigSeller/Lazada từ backend (nếu đã cấu hình và kiểm duyệt).
4. Tab **Lưu Drive** → tải ảnh thành phẩm từ ChatGPT, đánh dấu xác nhận, bấm **Hoàn tất & tự lưu bộ file lên Drive**. Công cụ tự kiểm tra thư mục đúng Shop/SKU, tạo hoặc dùng lại thư mục, sau đó tự tải lên từng file và trả về link folder.
5. Khi thiếu chi phí hoặc chưa chốt thuộc tính, vẫn có thể lưu hồ sơ nhưng trạng thái là **CHỜ BỔ SUNG**, không tự nhận là đã đăng sàn. Sau khi bổ sung và phân tích lại, bấm Lưu Drive để cập nhật các file được tool quản lý.

**Các file do tool tự lưu khi có dữ liệu:** `Thông tin sản phẩm.xlsx`, `SEO website.xlsx`, `Bảng giá đề xuất.xlsx` (chỉ khi có đủ chi phí/phí), `Prompt tạo ảnh ChatGPT.txt`, `Ảnh gốc 1.png`… `Ảnh thành phẩm 1.png`…, `BigSeller.xlsx`/`Lazada.xlsx` (chỉ khi đã xuất được ở backend), và `Thông tin và trạng thái.json`. Các file được ghi trực tiếp **vào thư mục sản phẩm dưới shop**, không rải rác ở My Drive.

**CHƯA HỖ TRỢ:** cập nhật trực tiếp workbook giá Shopee gốc `tham chiếu làm bảng giá sản phẩm bán shopee đừng động vào.xlsx` (phải làm riêng để bảo toàn công thức/kiểm SKU); đăng tự động lên sàn; xác nhận file BigSeller/Lazada import thành công vào tài khoản sàn; đồng bộ ảnh trực tiếp từ ChatGPT (ảnh phải được người dùng chọn tải vào extension).

### Kiểm thử và phạm vi xác nhận

- `node --test test/*.test.mjs`: có các bài kiểm thử mock cho OAuth, nhận diện 6 shop, tạo/dùng lại folder và tải file. Không cần gọi API thật khi chạy unit test.
- **Chưa** thử đăng nhập OAuth Google trên chính Chrome của bạn và **chưa** thử ghi trên Drive thật; cần một lần chạy thử một SKU trước khi dùng hàng loạt.
- Không ghi nhầm thư mục nếu quyền cấp cho Google account khác; verify sẽ báo lỗi.

## Bản 0.3.0 — KẾT NỐI DRIVE TRỰC TIẾP, CHỌN THƯ MỤC NGUỒN

**Mã nguồn:** Bản cập nhật Manifest V3 dùng `chrome.identity.getAuthToken`, với extension ID cố định là:

`ojbejkjaalblfimeojmobicanhbipkel`

Bản trước 0.2.0 có ID phụ thuộc đường dẫn cài đặt. Khi đổi sang 0.3.0, Chrome có thể coi đây là một extension mới; gỡ bản cũ sau khi sao lưu bản nháp, và **không di chuyển thư mục cài** tùy ý. Từ bản 0.3.0 trở đi ID được giữ ổn định bằng trường `key` chứa **khóa công khai**, không chứa khóa bí mật.

### Kết nối Google (cần chủ tài khoản thao tác một lần)

1. Truy cập <https://console.cloud.google.com/>, tạo/chọn Google Cloud Project và bật **Google Drive API**.
2. Vào **Google Auth Platform** (màn hình đồng ý OAuth). Điền thông tin ứng dụng, chọn đối tượng người dùng và thêm email của bạn vào **Test users** nếu dự án ở chế độ thử nghiệm. Scope cần dùng: `https://www.googleapis.com/auth/drive` (quyền rộng để đọc/ghi trong các thư mục shop đã tồn tại). Người dùng chịu trách nhiệm cho phép quyền này.
3. Vào **Clients → Create client → Chrome Extension**. Điền **Item ID** chính xác: `ojbejkjaalblfimeojmobicanhbipkel`. Tạo xong, sao chép **OAuth Client ID** dạng `xxxxxxxxxx-xxxx.apps.googleusercontent.com`. Đây là Client ID công khai, **không phải Gemini API key**.
4. Trong thư mục cài extension, mở `manifest.json`, thay `oauth2.client_id` bằng OAuth Client ID vừa tạo, hoặc dùng PowerShell: `./configure-drive.ps1 -ClientId "CLIENT_ID_CUA_BAN.apps.googleusercontent.com"`. Không điền client secret, access token hoặc refresh token.
5. Mở `chrome://extensions` → bấm **Reload** cho DHL Product Factory. Mở tab **Cài đặt → Kết nối Google Drive**; chọn đúng tài khoản Google và đồng ý phạm vi truy cập.
6. Bấm **Kiểm tra thư mục shop** ở tab **Lưu Drive**; khi thành công, tool xác nhận cả ID, tên và vị trí shop trong `TRUNG TÂM TẠO SẢN PHẨM - 6 SHOP`.

**Không thể làm thay bước 2–5 từ ChatGPT.** Kết nối Google Drive đã có trong ChatGPT không thể chuyển quyền/token sang Chrome Extension. Chưa thực hiện OAuth trên Chrome thật hoặc ghi thử trên Drive thật; cần thử với một SKU trước.

### Chọn thư mục tài liệu gốc (không cần backend)

- Chọn **Shop** → nhấn **Duyệt thư mục nguồn** trong tab Sản phẩm. Tool liệt kê thư mục con, cho phép duyệt tối đa 12 tầng và kiểm tra mỗi folder nằm trong đúng shop.
- Chọn file, nhấn **Lấy file đã chọn**. Hỗ trợ ảnh JPG/PNG/WEBP tối đa 3 MB/ảnh và TXT/MD/JSON, hoặc Google Docs xuất văn bản. Gemini nhận tối đa 3 ảnh và 5.000 ký tự ghi chú. Các file chưa hỗ trợ phân tích trực tiếp (ví dụ CDR, XLSX, DOCX, SVG) có thể nhìn thấy nhưng không tự gửi sang Gemini.
- Nhấn **Ghi nhận thư mục nguồn này** để lưu ID nguồn vào hồ sơ sản phẩm. Không di chuyển/xóa file gốc.
- Khi hoàn tất, tab **Lưu Drive** tự tạo/dùng lại folder sản phẩm theo SKU và ghi ảnh, văn bản, prompt, SEO và Excel. Không ghi vào bảng giá Shopee tổng.

### Bảo mật

- Token Google không đi vào Gemini hay GitHub; Chrome Identity tự quản lý token. Module nguồn kiểm tra chuỗi thư mục cha trước khi đọc file và giới hạn dung lượng; module ghi chỉ cho phép 6 ID shop đã đối chiếu.
- Không cài từ nguồn không tin cậy. Scope Drive cho phép quyền rộng trên tài khoản; các giới hạn thư mục thuộc **mã ứng dụng** chứ không phải ràng buộc quyền Google OAuth ở cấp máy chủ.


## Bản 0.4.0 — CẬP NHẬT NHANH TỪ GITHUB (CHROME EXTENSION CÀI THỦ CÔNG)

**Cài lần đầu:** giải nén ZIP vào một thư mục cố định, ví dụ `C:\DHL-Product-Factory`, sau đó bật `chrome://extensions` → Developer mode → Load unpacked, chọn đúng thư mục chứa `manifest.json`. Cố định đường dẫn từ đây.

**Kết nối AI:** vào tab Cài đặt nhập Gemini API key từ Google AI Studio, lưu trên Chrome (không đưa key vào GitHub).

**Kết nối Drive:** tạo Google OAuth Client loại Chrome Extension với ID `ojbejkjaalblfimeojmobicanhbipkel`, bật Google Drive API và cấu hình consent/test user, điền Client ID vào `manifest.json` (hoặc **nhấp đúp `CAU-HINH-DRIVE.cmd`** rồi dán OAuth Client ID, hay chạy `configure-drive.ps1 -ClientId "..."`). Chrome Reload, chọn Cài đặt → Kết nối Google Drive, cho phép Google, kiểm tra thư mục shop.

**Cập nhật lần sau:** trong extension chọn Cài đặt → **Kiểm tra cập nhật Git**. Nếu có bản mới, **nhấp đúp `CAP-NHAT-TOOL.cmd` ngay trong thư mục cài**, chờ PowerShell tải các file từ GitHub. Sau khi thành công, mở `chrome://extensions` và nhấn **Reload**. Không phải giải nén ZIP và chọn Load unpacked lại. Không yêu cầu cài Git, không tải cả website. Giữ `oauth2.client_id` đã cấu hình, public key cố định và dữ liệu bản nháp lưu ở `chrome.storage.local`.

**Giới hạn của Chrome:** Nút kiểm tra GitHub không thể tự sửa các file tiện ích đang chạy; nút **Cập nhật từ Git — mở hướng dẫn** hiển thị và sao chép các bước, và mở trang extension. Việc ghi mã từ GitHub được thực hiện bởi file cập nhật cục bộ do người dùng chủ động chạy. Công cụ không sử dụng remote JS bên trong extension.

**An toàn:** Cập nhật chỉ tải các file thuộc `tools/dhl-product-factory/chrome-extension` trong repo công khai `dinhloi116-hue/dhlstores`, nhánh `feature/dhl-product-factory-mvp-20261012`, chốt SHA commit GitHub trước khi tải, kiểm tra khóa công khai và tên tiện ích, không đổi cấu hình OAuth. Chỉ chạy file cập nhật khi tin tưởng repo/commit. Cập nhật thất bại được thiết kế phục hồi các file đã sao lưu; nếu gián đoạn giữa chừng hãy chạy lại. Không đăng nhập Google/Gemini qua script và không gửi token, mật khẩu hoặc API key lên GitHub.

**Lưu ý phát hành:** PR #4 đang ở Draft; tool cập nhật từ nhánh phát triển chứ chưa phải kênh Chrome Web Store. Sau khi quy trình ổn định, có thể chuyển sang nhánh phát hành cố định hoặc Chrome Web Store để tận dụng cơ chế tự động cập nhật của Chrome.


## v0.4.1 — QUY TẮC LOGO 6 SHOP (14/10/2026)

- 5 shop DHL STUDIO, RABBIT STORE, STORE MIU MIU, MIU CLOTHING & BEAUTY, PHONG THỦY KHÁNH HÒA: mỗi prompt tạo ảnh bắt buộc đính kèm và dùng đúng logo shop gốc, đặt logo nhỏ trên ảnh bán hàng. Thiếu logo: báo CHỜ LOGO GỐC, không tự vẽ. Store Miu Miu chỉ dùng logo Thỏ Handmade khi SKU được chỉ định.
- DHL SPORTS: KHÔNG chèn logo/watermark shop; giữ nguyên các huy hiệu/patch/logo vốn có trên hàng thật.
- DHL STUDIO: ảnh quảng cáo phải có logo shop nhưng file in PET/artwork giao khách PHẢI KHÔNG bị chèn logo shop.
- Câu lệnh ảnh đầy đủ của mỗi shop nằm trên Google Drive trong `TRUNG TÂM TẠO SẢN PHẨM - 6 SHOP` → thư mục shop → Google Docs `CÂU LỆNH TẠO ẢNH SẢN PHẨM — [SHOP]`; bộ TXT ZIP đặt tại root trung tâm. Cần đính kèm file logo thật khi copy prompt sang ChatGPT.
- Mặc định 9 prompt riêng. Với preset áo người lớn DHL SPORTS đã duyệt 8 ảnh, ưu tiên đúng 8 ảnh hiện hành; prompt thứ 9 là ảnh thông tin tùy chọn.


## Bản 0.5.0 — MỞ TOÀN BỘ TOOL TRONG MỘT TAB CHROME

- Nhấp biểu tượng **DHL Product Factory** ở thanh công cụ Chrome: mở tab `chrome-extension://<EXTENSION_ID>/panel.html` độc lập, dùng toàn bộ chiều ngang cửa sổ.
- Nhấp lại: chuyển về tab tool đã mở, không sinh nhiều tab trùng. Các khu vực xem ảnh, tài liệu Drive, form và 9 prompt đã được mở rộng; giao diện tự co trên màn hình nhỏ.
- Bỏ quyền `sidePanel` và khai báo `side_panel` khỏi Manifest V3; không thêm quyền `tabs` toàn cục hoặc quyền truy cập trang web mới.
- Giữ nguyên toàn bộ tính năng Gemini, Google Drive, SEO, giá, Excel, 9 prompt và cập nhật GitHub; không tự tạo/chỉnh ảnh khác.
- Đã nâng phiên bản manifest lên 0.5.0 để nút kiểm tra GitHub nhận ra bản mới.
- Với bản cài thủ công: chạy `CAP-NHAT-TOOL.cmd` trong thư mục cài, sau đó nhấn **Reload** tại `chrome://extensions`. Cấu hình Google OAuth Client ID được giữ theo cơ chế updater hiện có.
- Nếu còn một Side Panel cũ đang mở, đóng nó sau khi Reload; bấm biểu tượng extension để mở tab mới.


## Bản 0.6.0 — NÚT CẬP NHẬT NGAY TỪ GITHUB TRONG TAB TOOL

- Lần đầu trên Windows: cài bản 0.6.0 từ ZIP vào cùng thư mục cài extension (cẩn thận giữ `oauth2.client_id` đã cấu hình). Nhấp đúp **`CAI-DAT-NUT-CAP-NHAT.cmd`** để tạo một native host EXE bằng .NET Framework có sẵn trên Windows và đăng ký cho tài khoản hiện tại, không cần quyền administrator.
- Từ lần sau: mở DHL Product Factory → Cài đặt → **Cập nhật ngay từ GitHub**. Nút kiểm tra Native Messaging và phiên bản. Nếu có bản mới, bộ cập nhật tải các file từ commit GitHub đã chốt, kiểm tra tên+khóa công khai tiện ích, sao lưu file cũ, giữ lại OAuth Client ID và khởi động lại extension.
- Nếu bản đã là mới nhất, tool thông báo và không ghi file. Nếu bộ cập nhật chưa cài, thông báo chạy file cài đặt một lần thay vì báo thành công giả.
- Chỉ extension ID cố định `ojbejkjaalblfimeojmobicanhbipkel` được cấp quyền dùng native host. Host chỉ nhận thông điệp `ping` hoặc `update`; không nhận URL, đường dẫn, lệnh shell từ web.
- Quyền Chrome mới: `nativeMessaging`. Bộ cập nhật chạy cục bộ, không gửi API key Gemini, token OAuth, mật khẩu hoặc hồ sơ khách hàng tới GitHub.
- **Giới hạn:** chưa kiểm thử host C# và trình cài đặt trên Windows/Chrome thật. Kiểm thử Node/Chromium Linux không thay thế được bước chạy thử lần đầu; nếu cấu hình Windows chặn .NET compiler/registry, dùng `CAP-NHAT-TOOL.cmd` như phương án dự phòng.
- **Từ v0.5.0 nâng cấp lần đầu:** bộ cập nhật cũ không có các file host mới trong danh mục tải. Tải ZIP v0.6.0, giữ cấu hình OAuth trong manifest cũ, thêm các file mới vào cùng thư mục và chạy `CAI-DAT-NUT-CAP-NHAT.cmd` một lần. Sau đó chỉ cập nhật qua nút trong tool.


## v0.7.0 — LUỒNG THÔNG TIN NGUỒN → PHÂN TÍCH → BÁN HÀNG

- Tab Sản phẩm bao gồm ba bước: chọn/nhập nguồn (ảnh, ghi chú, TXT/MD/CSV/JSON/HTML/DOCX/XLSX trên máy hoặc Drive), Phân tích sản phẩm bằng Gemini (không tự chuyển tab), sau đó người dùng xác minh vốn, phí, cân nặng kiện, kích thước vận chuyển và loại muốn bán.
- Có checkbox độc lập cho các hình thức Làm sẵn, Nguyên liệu DIY, Không in, Có in. Người dùng quyết định. Các nhóm phân loại Màu, Size, Kiểu/loại tối đa 2 nhóm/sản phẩm khi xuất sàn.
- Bảng SKU tự sinh từ dữ liệu người dùng xác nhận, không bịa giá bán/tồn kho; có thể sửa từng dòng và đồng bộ sang trường xuất BigSeller/Lazada.
- Đầu vào giá vốn, phí, cân nặng và SKU nằm trong Sản phẩm; tab Xuất file dùng trực tiếp các ô đó, không phải nhập lại. Hồ sơ sản phẩm.xlsx và JSON trên Drive lưu thông tin bán hàng và kiện vận chuyển. Không thay mẫu import gốc/giá Shopee tổng.
- XLSX/DOCX đọc các chuỗi XML cơ bản ở máy bằng Web DecompressionStream (không tính công thức trong Excel; nội dung Office phức tạp có thể cần xác minh bằng mắt). Tài liệu nguồn chỉ gửi đến Gemini sau khi nhấn Phân tích.
- Giới hạn: 5 file nguồn mỗi lần, 5 MB/file; tối đa 3 ảnh; text từ nguồn có thể cắt bớt theo giới hạn.


Trên tab toàn màn hình, nút "Dán văn bản đã sao chép từ web" có thể đọc clipboard khi Chrome cấp quyền theo thao tác người dùng; nếu bị từ chối thì dán trực tiếp bằng Ctrl+V. Không tự đọc nội dung những tab đang mở.

**Tương thích cập nhật từ v0.6:** mã giao diện v0.7 chỉ import từ các module có sẵn trong whitelist cập nhật v0.6 (lib/core.mjs, lib/xlsx-lite.mjs). Bộ các hàm phân loại và đọc tài liệu được export đồng thời ở core.mjs để bản cập nhật một nút cũ không bị thiếu module; các module nguồn mới cũng được lưu trong repo cho các bản phát triển sau.


## v0.8.0 — DÁN ẢNH CHỤP MÀN HÌNH RỒI PHÂN TÍCH

- Màn hình mặc định chỉ cần chọn shop và **dán ảnh bằng Ctrl+V**, kéo thả ảnh hoặc bấm vào khung chọn ảnh; thêm tối đa 6 ảnh theo nhiều lượt, có preview và nút xóa từng ảnh.
- Ảnh quá 3 MB được thử chuyển JPEG/thu nhỏ **trên máy**, trước khi gửi Gemini. Ảnh được gửi lên Gemini **chỉ khi nhấn Phân tích**; không tự gửi khi dán.
- Có thể thêm mô tả tự do, nhưng mọi trường tên, SKU, ngành hàng, tài liệu, giá vốn, cân nặng và lựa chọn bán đều **không bắt buộc khi phân tích**.
- Các trường tên/SKU/tệp tài liệu thu gọn vào **Thông tin khác (tùy chọn)**; phần giá, vận chuyển, phân loại nằm trong **Bổ sung thông tin bán hàng khi cần**.
- Gemini được hướng dẫn đọc nội dung **ảnh chụp màn hình**, chỉ rút trích dữ liệu có căn cứ; không tự coi giá sản phẩm gốc là giá vốn hoặc giá bán đã duyệt.
- Khi hoàn thiện và lưu Google Drive hoặc xuất file sàn, vẫn kiểm tra các trường bắt buộc tương ứng; không tự tạo SKU, phí, tồn kho hay kích thước.
- Cập nhật bằng nút **Cập nhật ngay từ GitHub** trong Cài đặt sau khi thiết lập bộ cập nhật cục bộ trên Windows.
