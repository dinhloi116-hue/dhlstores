# DHL Stock Sync – Chrome Extension

Phiên bản: **v0.26.0**.

## Tự động quét danh mục đã lưu và tự đẩy Sapo (v0.26.0)

- Chức năng **3. TỰ ĐỘNG QUÉT & ĐẨY SAPO** được thêm vào Side Panel; chế độ quét và đẩy Sapo thủ công hiện tại được giữ nguyên.
- **Mặc định tắt.** Người dùng chọn chính xác các hồ sơ danh mục đã lưu từ tab nguồn; chọn khoảng cách quét 1, 2, 3, 6, 12 hoặc 24 giờ. Có nút QUÉT NGAY để chạy thử khi đã bật.
- Tự quét dùng chung `DHLManualJobRunner` hiện có (popup-only, nhiều màu/size, báo cáo lỗi và retry), không bật lại `auto-sync-background-v2.js` cũ. Tool mở một cửa sổ Chrome riêng **không giành focus** cho từng danh mục rồi đóng cửa sổ đó khi quét xong, không đóng tab người dùng.
- Lưu checkpoint cho từng danh mục trong Chrome local. Chỉ khi **tất cả** hồ sơ được chọn quét xong đầy đủ, quality.ok, sourceVariantCount, SKU, màu/size và kiểm tra kho trùng khớp mới được đẩy tự động qua API riêng đã xác minh.
- Tùy chọn **Tự đẩy Sapo** là một công tắc riêng (mặc định tắt). Nếu chỉ bật tự quét, hoàn thành rồi lưu snapshot, không ghi Sapo. Người dùng cần vào ĐẦU RA để kết nối và xác minh `storeHost`, API key/secret và `locationId`; mật khẩu không nhập trong phần lịch.
- Khi bật tự đẩy, queue dùng lại cơ chế 4 SKU song song với xử lý 429/403, không ghi SKU sai, lưu checkpoint và không chạy nếu manual queue đang hoạt động. Nếu một tab không đủ dữ liệu, cả chu kỳ **không gửi SKU nào lên Sapo**.
- Giao diện hiển thị lần chạy gần nhất, lần tới, tab hiện tại, tiến độ quét và đẩy SKU, lý do lỗi, khả năng tiếp tục hàng đợi Sapo đang tạm dừng. Vẫn giữ chức năng Excel và tab báo cáo ảnh riêng.
- Chrome cần **đang mở** để lịch extension chạy; máy tắt/trình duyệt đóng sẽ không tự quét. Không cam kết máy quét hết danh mục nếu nguồn thay đổi HTML, mạng lỗi hoặc popup không hoạt động trên cửa sổ không focus; các trường hợp đó sẽ dừng, không đẩy sai.
- **Lưu ý bảo mật:** API key từng xuất hiện trong ảnh; hãy xoay vòng key/secret ở Sapo trước khi kích hoạt tự đẩy. Không ghi API vào GitHub hoặc tệp kiểm thử.
- CI mô phỏng hai danh mục, một lượt quét không đầy đủ bị chặn toàn bộ, một chu kỳ hợp lệ ghi queue Sapo, và kiểm tra bật/tắt lịch không xóa dữ liệu thủ công.

## Khôi phục kết nối Sapo và tăng tốc đồng bộ tồn (v0.25.2)

- Nút **XEM TRƯỚC SAPO** vẫn tồn tại nhưng có thể bị khóa nếu thiếu thông tin kết nối đã lưu. Giao diện cũ cho key/secret từng nằm trong auto-sync UI nay không được nạp. Đã bổ sung **KẾT NỐI / ĐỔI KHO SAPO** ngay trong ĐẦU RA.
- Nhập địa chỉ shop, API key và secret của **Ứng dụng riêng**; xác thực `/admin/store.json`, lấy các kho bằng `/admin/locations.json` và chỉ lưu ID chi nhánh sau khi xác minh. Nếu nhiều kho mà không trùng kho Excel được chọn, người dùng phải tự chọn kho. Không lấy credential từ ảnh hay lưu trong Git.
- Thay đổi credential thực hiện 2 bước lưu: credentials chưa xác minh trước, ID kho đã xác minh sau. Điều này tương thích cơ chế background xóa xác minh cũ khi thay API key, không để kết nối vừa được xác minh bị khóa ngược.
- Hàng đợi **đẩy trực tiếp lên Sapo chạy tối đa 4 SKU song song**, 12 SKU/lượt; lưu checkpoint sau mỗi nhóm 4 thay vì mỗi dòng. Chỉ dùng ghi số tồn tuyệt đối theo SKU, không cộng tồn. Kết nối chậm có thể nhanh hơn đáng kể nhưng không cam kết tốc độ cố định; phụ thuộc API/giới hạn Sapo.
- HTTP 429, 401/403 và lỗi hệ thống dừng an toàn, lưu các SKU đã thực sự thành công và không tự đẩy lại các SKU này khi tiếp tục. Trường hợp ngắt/đóng ứng dụng vẫn giữ dữ liệu quét và hàng đợi trong Chrome. Lệnh hủy không khởi động thêm nhóm đẩy mới.
- Vẫn yêu cầu kiểm tra chất lượng quét, **XEM TRƯỚC SAPO → XÁC NHẬN ĐẨY** và đối chiếu ID kho trước khi ghi. Không tự động đồng bộ tồn khi chỉ mở extension.
- **Bảo mật:** Không sao chép key/secret từ ảnh người dùng vào mã nguồn/CI, không trả credential vào kết quả kết nối. Nếu ảnh đã làm lộ API key, cần thu hồi/đổi bộ khóa trong Sapo.
- Bộ kiểm thử mới mô phỏng hai kho Sapo, kết nối/xác minh, 4 tác vụ song song, lỗi 429, resume không ghi lại những SKU thành công. Sau khi Pull origin và Reload, cần kiểm thử thực tế bằng một nhóm SKU nhỏ trước khi ghi toàn bộ.

## Báo cáo ảnh biến động tồn kho ở tab Chrome lớn (v0.25.1)

- Trong ĐẦU RA, sau khi quét có nút **XEM BÁO CÁO ẢNH CHI TIẾT ↗**. Chỉ mở tab mới khi người dùng bấm; không mở tab khi đang quét popup.
- Tab báo cáo riêng `stock-report.html` có ảnh đúng màu/biến thể lấy từ popup nguồn, tên sản phẩm, SKU đầy đủ, màu, size, tồn trước/sau, chênh lệch, liên kết nguồn; lọc theo danh mục, trạng thái, tìm kiếm, phóng to ảnh và in/lưu PDF.
- Nhóm hiển thị: **Đang hết hàng** (tồn hiện tại bằng 0), **Vừa hết hàng** (có → 0), **Có hàng trở lại** (0 → có), **Tăng tồn**, **Giảm tồn**, **Không còn thấy** và toàn bộ SKU.
- Chỉ phân loại chuyển trạng thái khi có **hai lượt quét toàn bộ đủ điều kiện so sánh** trong lịch sử; lần quét đầu vẫn xem được SKU có tồn 0 nhưng không tự báo "có lại". Lượt quét một phần chưa đủ chất lượng không được suy ra tăng/giảm.
- Ảnh từng màu lấy từ `variant.image` do popup đọc. Chỉ dùng ảnh đại diện sản phẩm khi sản phẩm có một màu; mẫu nhiều màu mà thiếu ảnh chính xác sẽ hiển thị chỗ trống để tránh ảnh sai SKU.
- SKU hiển thị được nối bằng mã ID biến thể nguồn + parent ID + size với các dòng Excel đã xác minh, **không ghép tên màu gần giống**. Giữ nguyên khóa nhận diện snapshot đời cũ để tránh báo sai tăng/giảm khi nâng cấp.
- Snapshot ảnh/SKU được giữ trong `dhlManualStockReportV1` sau khi quét, chỉ lưu URL ảnh (không lưu ảnh gốc); dữ liệu tiếp tục ở Chrome local. Không ghi lên Sapo từ tab báo cáo.
- Báo cáo cũ trước v0.25.1 có thể chưa có ảnh/SKU; quét mới để có metadata ảnh. Ảnh nguồn bên ngoài có thể không tải được nếu máy chủ chặn hotlink.

## Nâng cấp an toàn dữ liệu và xem trước Sapo (v0.25.0)

- **Không tự xóa kết quả quét sau khi bấm tải Excel**. Chrome mới chỉ bắt đầu tải xuống, chưa chứng minh file đã được lưu hay Sapo đã nhập; dữ liệu được giữ cho tải lại. Nút **XÓA CACHE** hỏi xác nhận trước khi dọn.
- **Đóng Side Panel không còn xóa cache quét**. Chỉ khi chọn nút XÓA CACHE hoặc LÀM MỚI TOOL mới xóa kết quả tạm; hồ sơ cấu hình Sapo và lịch sử vẫn được giữ.
- **Đẩy Sapo hai bước:** bấm XEM TRƯỚC SAPO, kiểm tra tất cả SKU và tồn sẽ ghi (có tô rõ SKU tồn 0), sau đó mới bấm XÁC NHẬN ĐẨY. Preview chỉ có hiệu lực 10 phút và bị vô hiệu nếu dữ liệu quét/kho/cấu hình xác minh thay đổi; backend tự đối chiếu chữ ký toàn bộ SKU trước khi chấp nhận.
- **Mốc trước** trong bản xem trước là **giá trị ghi nhận lần đẩy thành công gần nhất bởi extension**, **không phải tồn thực tế đang đọc live từ Sapo**. Mục chưa có mốc hiển thị dấu —. Việc xác minh tồn thực tế trên Sapo vẫn cần thực hiện riêng.
- **Chọn màu khớp chính xác:** tên màu chuẩn hóa phải bằng nhau hoàn toàn. Không dùng ghép gần đúng `Trắng` với `Trắng Đỏ` hoặc `Xanh` với `Xanh Đen`; nếu không xác minh được thì báo thiếu màu và chặn xuất/đẩy.
- Không bật tự động đẩy tồn Sapo. Giữ chốt kiểm tra quality, toàn bộ SKU và đúng chi nhánh khi bắt đầu đẩy.
- Bổ sung regression test kiểm tra cache giữ qua Side Panel/Excel, hai màu Đức, token xem trước hết hạn/đổi kho và danh sách SKU.

## Xử lý thông điệp Sapo mất receiver (v0.24.10)

- `popup.html:38` nạp module `manual-sapo-output-mode.js`. Trong module này, lệnh khôi phục Excel `DHL_MANUAL_JOB_REBUILD_OUTPUT` từng dùng callback `chrome.runtime.sendMessage`.
- Dùng hoàn toàn API Promise `await chrome.runtime.sendMessage(...)` với xử lý lỗi rõ ràng khi service worker hoặc receiving end không khả dụng; tránh thông báo `Unchecked runtime.lastError` từ nhánh callback này.
- Chỉ thử tự khôi phục dữ liệu một lần cho mỗi trạng thái đầu ra trống trong phiên Side Panel. Khi kết nối lỗi, hiện thông báo thay vì gửi lại liên tục; không xóa cache, không sửa SKU hay số tồn.
- Việc tạo/đẩy tồn lên Sapo vẫn yêu cầu bấm nút, giữ nguyên các chốt kiểm tra chất lượng và kho.
- Chrome có thể giữ lỗi cũ trong trang `chrome://extensions` cho đến khi xóa danh sách lỗi; kiểm tra lỗi **mới phát sinh sau Reload** để xác nhận tác động.

## Khắc phục cảnh báo runtime.lastError của Side Panel (v0.24.9)

- Side Panel khởi tạo kết nối background qua port `dhl-stock-sync-panel`. Nếu Chrome/extension bị Reload hoặc service worker chưa có listener, `port.onDisconnect` có thể báo `Could not establish connection. Receiving end does not exist.`
- Đọc `chrome.runtime.lastError` ngay trong callback onDisconnect, tránh `Unchecked runtime.lastError` khi mất receiver.
- Chỉ thử nối lại tối đa 2 lần nếu lỗi tạm thời, ngừng khi Side Panel đóng. Không tự quét lại, không tạo lệnh đẩy Sapo hay xóa cache chỉ vì lỗi kết nối.
- Script ở `popup.html:38` chỉ là vị trí nạp script; không phải chứng cứ trực tiếp lỗi nằm trong file đó. Test mô phỏng thiếu receiving end và kiểm tra xử lý lỗi.
- Những mục lỗi cũ của Chrome vẫn tồn tại trong trang quản lý cho đến khi người dùng xóa lịch sử lỗi; không cần xóa cache dữ liệu tool.

## Excel khớp đúng SKU, không ghép tên/màu gần giống (v0.24.8)

- Bảng tồn Excel dùng **toàn bộ SKU** để xác định biến thể; `dt-duc-2026-hd-trang-XXL` và `dt-duc-2026-hd-trang-do-XXL` là hai khóa riêng biệt.
- Bỏ fallback liên kết `Sapo variantId/productId` theo tên sản phẩm + size khi SKU không trùng; metadata chỉ được liên kết khi **SKU hoàn toàn khớp**.
- Trước xuất Excel, kiểm tra từng dòng từ cache có `SKU = alias + size` và tên biến thể khớp alias; chặn trùng SKU, SKU sai và tồn không hợp lệ. Cache giữ nguyên nếu kiểm tra lỗi.
- Kiểm thử tái hiện ĐT Đức 2026 HD: màu Trắng S/M/L/XL/XXL tồn 0; màu Trắng Đỏ lần lượt 4/8/38/19/10; đối chiếu trực tiếp dữ liệu trong file Excel tạo ra.
- Không thay đổi cách mở popup/quét trực tiếp; không tự đẩy lên Sapo. Nếu popup đọc sai số tồn cho màu, chỉ sửa SKU ở Excel **không thể tự xác minh** số liệu đó — cần đối chiếu popup nguồn.

## Kho xuất Excel chung cho toàn bộ DHL STOCK SYNC (v0.24.7)

- **Mọi hồ sơ của tool**, gồm HD, S trẻ em, M trẻ em và các tab nguồn khác, sử dụng cùng một kho xuất Excel mặc định **dhl sport**, theo tên kho người dùng đã cung cấp. Không cần API để tải Excel.
- Có ô **Kho xuất Excel (dùng cho tất cả hồ sơ)** tại TÙY CHỌN NÂNG CAO → Đầu ra / Ứng dụng riêng Sapo. Đổi tên kho một lần, extension tự lưu vào Chrome; toàn bộ cache và lượt quét mới dùng chung.
- Nếu hồ sơ có tên chi nhánh rõ ràng từ file Sapo cũ, không tự ghi đè khi khác tên kho chung; hiển thị xung đột để tránh nhập sai.
- Nếu đã xác minh chi nhánh bằng API, tên kho Excel phải khớp chi nhánh đó. Việc nhập tên kho để xuất Excel **không cấp quyền ghi Sapo**; đẩy trực tiếp vẫn cần xác minh locationId.
- Các lượt quét đã hoàn tất được phép khôi phục từ checkpoint nếu kiểm tra lại đầy đủ sản phẩm, SKU, size/tồn và 0 lỗi. Không thể phục hồi một bản quét lỗi thành bản xuất hợp lệ.
- Kiểm thử mô phỏng 244 biến thể S trẻ em (bao gồm tồn 0), các hồ sơ HD + trẻ em trong một file, ô F3 của mẫu Sapo, cache cũ và các trường hợp xung đột kho.

## Sửa tên kho khi xuất Excel Sapo HD (v0.24.6)

- Bản v0.24.6 ban đầu chỉ áp dụng mặc định **dhl sport** cho HD; bản v0.24.7 đã sửa để áp dụng cho toàn bộ tool.
- Ưu tiên tên kho đã xác minh qua API, tiếp đến kho xuất Excel đã chọn; hồ sơ có tên chi nhánh riêng được kiểm tra xung đột. Nếu chưa cấu hình, dùng `dhl sport` cho tất cả hồ sơ trong extension.
- Nếu tên chi nhánh từ dữ liệu quét và tên chi nhánh đã xác minh khác nhau, báo lỗi để tránh xuất/ghi tồn sai kho.
- Không thay đổi dữ liệu scan, SKU, số lượng tồn, hoặc xóa cache khi export lỗi; chỉ dọn cache sau khi Excel thực sự tạo thành công.
- Tên `dhl sport` dùng để điền ô F3 trong template nhập tồn; **không tự xác minh hoặc tự kết nối API**. Muốn đẩy trực tiếp vẫn cần kiểm tra kết nối Sapo và locationId hợp lệ.
- Có regression test đọc file .xlsx, xác minh F3 và số tồn 0.

## Chỉ quét sản phẩm thuộc lưới trang danh mục đang hiển thị (v0.24.5)

- **ĐỒNG BỘ TAB NÀY** chỉ nhận những thẻ sản phẩm có ảnh, giá, nút thêm vào giỏ và liên kết chi tiết trong lưới sản phẩm chính của trang hiện tại; không quét từ mọi liên kết HTML như trước.
- Ví dụ trang HD có 24 thẻ trong ảnh, nhưng lượt quét cũ phát hiện 25 sản phẩm (có thể lẫn ĐT Đức trẻ em). Sau sửa, sản phẩm nằm ngoài lưới chính sẽ bị loại.
- **Không tự chuyển sang trang 2/3/4** hoặc lấy các trang phân trang khác. Muốn quét những trang đó cần mở đúng trang tương ứng và chạy lượt khác.
- Khi chọn **QUÉT LẠI MẪU LỖI**, checkpoint cũ được đối chiếu theo ID với danh sách đang hiển thị: bỏ mục ngoài trang, giữ kết quả đã xác minh của sản phẩm trùng ID và tiếp tục mẫu thực sự thiếu.
- Trước mỗi popup, công cụ xác minh ID thuộc lưới đang hiển thị; dừng sản phẩm ngoài trang thay vì quét nhầm.
- Có regression test mô phỏng 24 thẻ HD và một liên kết ĐT Đức trẻ em nằm ngoài lưới. CI không thay thế được thử nghiệm trên DOM thực của website.

## Hết hàng nghĩa là tồn kho 0 (v0.24.4)

- Khi cột `Tình trạng tồn` của một size ghi đúng **Hết hàng**, lưu giá trị `stock=0`; đây là một kết quả hợp lệ, không phải thiếu dữ liệu.
- Màu Đỏ, Kem, Trắng Hoa có thể có **cùng** bộ S/M/L/XL/XXL đều hết hàng. Sau khi đổi màu, radio đã được xác nhận và các dòng `Hết hàng` ổn định ít nhất 1,5 giây, kết quả 0 hợp lệ **ngay cả khi chữ ký số tồn không đổi**.
- Chỉ dùng cơ chế này khi size của màu đã đọc đủ và tất cả dòng đều ghi rõ `Hết hàng`. Nếu bảng chưa tải, chưa chọn được màu hoặc tồn không xác định, vẫn báo thiếu và quét lại, tuyệt đối không tự chuyển thiếu dữ liệu thành 0.
- Có unit test cho 5 size hết hàng, hai màu cùng tồn 0, màu chưa được chọn và bảng tồn dương chưa chuyển; test thêm quy tắc SKU với stock 0 và quality gate.
- Khi đã quét xác minh đủ, biến thể tồn 0 vẫn có thể xuất/đẩy Sapo theo thao tác thủ công.

## Tự quét lại sản phẩm chưa đủ dữ liệu (v0.24.3)

- Sau khi quét một lượt, tự động xác định các sản phẩm còn thiếu màu/size/tồn hoặc popup lỗi và **chỉ mở lại các mẫu đó trên đúng tab gốc**.
- Giữ nguyên kết quả sản phẩm đạt; kết quả quét lại thay thế đúng sản phẩm cũ, không cộng dồn/trùng SKU. Không gộp tồn từ hai popup lỗi ở hai thời điểm khác nhau.
- Tự động quét lại tối đa 4 lượt cho các mẫu chưa đạt (mỗi lượt có cơ chế thử lại popup nội bộ). Nếu vẫn lỗi, tạm dừng với nút **TIẾP TỤC QUÉT LỖI**; không quét vô hạn gây nghẽn website.
- Khi tiếp tục, giữ checkpoint và chỉ quét lại số mẫu còn lỗi. Nếu hủy, không mở thêm popup.
- Không tự xuất Excel hoặc đẩy tồn Sapo khi vẫn có mẫu chưa được xác minh. Kết quả quét lỗi được giữ để xem báo cáo.

## Chỉ đọc đúng bảng size/tồn trong popup (v0.24.2)

- Bảng tồn chuẩn có cột **Tên size** và **Tình trạng tồn**. Không dò số từ toàn bộ nội dung modal, nên giá `70.000đ` và mùa áo `26-27` không thể bị nhận nhầm thành size `70`/`26`.
- Nhận diện size của từng dòng đúng cột; chỉ coi tồn 0 khi cột tồn ghi rõ **Hết hàng** hoặc tồn 0.
- Quét màu Đỏ/Trắng trong cùng popup; xác minh đủ các size hiện diện trong bảng từng màu. Nếu bảng chưa tải hoặc màu không xác minh được, chặn đầu ra như v0.24.1.
- Bổ sung kiểm thử tái hiện popup: S=6, M=17, L=22, XL=25, XXL=10. Vẫn phải kiểm tra bằng popup thực tế trước khi dùng đẩy Sapo.

## Kiểm tra chất lượng tồn kho trước khi xuất (v0.24.1)

- Quét và xác minh **size độc lập cho từng màu**. Size số của màu đầu (ví dụ 70) không được suy diễn sang màu khác (ví dụ 26/28).
- Nếu bảng chưa xác nhận một màu hoặc chưa đọc được một size, cảnh báo trạng thái chưa xác minh; không coi như đã hết hàng.
- Trường hợp thiếu dữ liệu sẽ quét thử lại popup sản phẩm. Nếu vẫn chưa đầy đủ, kết quả được lưu để xem lỗi nhưng **không tạo Excel nhập tồn hoặc đẩy Sapo**.
- Chặn đẩy ngay trong background, không chỉ vô hiệu hóa nút giao diện. Dữ liệu đệm phiên bản cũ cũng không được tự mặc định là an toàn.
- Không lấy lịch sử tồn thiếu dữ liệu làm mốc so sánh hàng đã bán/hết.
- Bản này có thêm kiểm thử logic so khớp size theo từng màu và bộ kiểm tra an toàn. Cần kiểm nghiệm với popup nguồn thực tế để kết luận mức chính xác.

## Quét thích ứng nhanh hơn (v0.24.0)

- Popup được thử mở theo nhịp ngắn hơn, không chờ lâu ở từng nút không phản hồi. Có thêm khoảng chờ dự phòng nếu popup đến chậm.
- Khi một màu chỉ trả một phần size nhưng dữ liệu đã ổn định, chuyển bước sớm hơn; **vẫn báo thiếu size và quét lại sản phẩm** trước khi xuất.
- Khi popup hiện đủ size, giữ xác nhận dữ liệu ổn định. Nếu không xác nhận được màu/size, không gán nhầm tồn kho của màu trước.
- Hiệu quả tăng tốc phụ thuộc số màu/size thực tế và tốc độ của website. Chưa đo thời gian thực tế trên cửa hàng nguồn.

## Đồng bộ tồn kho trực tiếp trên tab đang xem (v0.23.9)

Đây là chế độ thay thế cho cách quét trong tab/cửa sổ riêng của v0.23.4–v0.23.8.

1. Đăng nhập `si.aobongda.net` trong Chrome và **mở đúng trang danh mục** (ví dụ HD).
2. Giữ tab danh mục này ở trạng thái đang được chọn, mở DHL Stock Sync Side Panel.
3. Bấm **ĐỒNG BỘ TAB NÀY**. Extension đọc danh sách sản phẩm trực tiếp trên tab đã chọn.
4. Popup thật của từng sản phẩm lần lượt được mở, đọc màu/size/tồn, rồi đóng trước khi sang sản phẩm kế tiếp.
5. Theo dõi số sản phẩm và báo cáo tại Side Panel. Quét xong, chọn **TẢI FILE EXCEL** hoặc **ĐẨY LÊN SAPO** (thao tác thủ công).

**Không tạo tab/cửa sổ quét mới. Không tự đóng tab/cửa sổ của người dùng.** Không chuyển tab hoặc điều hướng trang trong lúc quét; nếu tab đã bị đóng, không còn được chọn hoặc đã đổi danh mục, tool dừng an toàn để tránh ghi tồn sai.

**Nút TÙY CHỌN NÂNG CAO** hỗ trợ quét toàn danh mục, sản phẩm đã chọn hoặc một sản phẩm. Chức năng **HỦY NGAY**, **DỪNG SAU SP NÀY** và **TIẾP TỤC** vẫn giữ, cùng kết quả/checkpoint từng sản phẩm.

### Tránh xuất sai tồn kho

- Không đọc được popup/thiếu dữ liệu **không được coi là tồn = 0**.
- Chỉ được xuất dữ liệu có SKU và tồn đã đọc hợp lệ; nếu ba sản phẩm đầu đều không đọc được biến thể, tool dừng sớm.
- Không tự động đẩy Sapo. **ĐẨY LÊN SAPO** chỉ được thực hiện khi người dùng bấm nút.
- Nếu popup cũ không đóng được, dừng/quét lại sau khi đóng popup đó trên tab nguồn; không ép thay bằng tồn 0.

## Giữ hồ sơ và kết nối

- Hồ sơ danh mục đã lưu, mapping SKU, lịch sử biến động tồn và cấu hình Sapo vẫn được giữ qua cập nhật.
- Side Panel đóng **không tự xóa dữ liệu quét**. Chỉ xóa cache khi người dùng thao tác rõ ràng.
- Khi tác vụ đang chạy hoặc tạm dừng, không dọn cache quét.

## Thêm sản phẩm mới

Mục **THÊM SẢN PHẨM MỚI** được tải khi người dùng mở; sử dụng để quét mẫu mới và xuất Excel/đăng Sapo theo thao tác cụ thể. Luồng này độc lập với nút đồng bộ tồn kho nói trên.

## Cập nhật qua GitHub Desktop

Repository: `dinhloi116-hue/dhlstores`. Nhánh tool: `feature/dhl-stock-sync-extension`.

1. Trong GitHub Desktop, chọn clone riêng đặt tại `D:\GitHub\DHL-Stock-Sync`, branch `feature/dhl-stock-sync-extension`.
2. Bấm **Fetch origin → Pull origin**.
3. Trong Chrome mở `chrome://extensions` → **Reload** extension đã nạp từ thư mục:
   `D:\GitHub\DHL-Stock-Sync\tools\dhl-stock-sync-extension`.
4. Mở tab danh mục cần quét, mở lại Side Panel và thử **ĐỒNG BỘ TAB NÀY**.

Không cần tải ZIP hoặc gỡ/cài lại extension mỗi lần cập nhật. GitHub Actions kiểm thử và đóng gói ZIP dự phòng; dữ liệu Chrome extension được lưu riêng với mã nguồn GitHub.

