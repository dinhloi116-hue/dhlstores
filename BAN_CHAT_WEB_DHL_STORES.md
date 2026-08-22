# Bản chất của DHL Stores

## 1. Nói ngắn gọn

**DHL Stores không chỉ là một website bán hàng.** Nó là một **hệ thống thương mại điện tử lai** gồm ba phần cùng dùng chung một kho dữ liệu: cửa hàng bán hàng cho khách, trung tâm vận hành cho chủ cửa hàng và bộ công cụ thiết kế chạy trực tiếp trên trình duyệt.

> Có thể hiểu DHL Stores là “kho và quầy bán chính của bạn”, còn Sapo là một hệ thống bên ngoài được liên kết chủ yếu để đồng bộ tồn kho. Website không phải bản sao đơn thuần của Sapo.

| Phần của hệ thống | Dùng cho ai | Mục đích chính |
| --- | --- | --- |
| Cửa hàng công khai | Khách hàng | Xem sản phẩm, chọn SKU, mua hàng, thanh toán, theo dõi đơn và tải tài nguyên số |
| Khu tài khoản | Mỗi khách | Quản lý hồ sơ, địa chỉ, ví, đơn hàng, QR nhận tiền rút ví, tin nhắn và góp ý |
| Trung tâm quản trị | Chỉ chủ cửa hàng | Quản lý sản phẩm/SKU/tồn kho, khách hàng, đơn, báo cáo, nội dung, tồn kho và vận hành |
| Thư viện công cụ | Người dùng website | Tạo nhãn vở, cắt/nối/nén video và các tiện ích thiết kế khác |

## 2. Website đang giải quyết việc gì?

Hệ thống hỗ trợ **hai mô hình bán hàng khác nhau** trong cùng một trang web.

| Loại sản phẩm | Cách mua | Sau khi thanh toán |
| --- | --- | --- |
| Tài nguyên số | Chọn sản phẩm, thanh toán QR/SePay hoặc số dư ví | Khách được mở quyền tải theo link tải do chủ cửa hàng quản lý, với thời hạn hiện hành là tối đa 7 ngày |
| Hàng vật lý | Chọn SKU, số lượng, địa chỉ, phương thức mua ngay hoặc đặt trước | Hệ thống tạo đơn, trừ tồn kho theo SKU và cho khách theo dõi trạng thái/giao hàng |

Các sản phẩm vật lý có thể có biến thể như màu, size, kiểu, nameset hoặc patch. Mỗi biến thể thực chất là một **SKU** có giá, giá vốn, tồn kho, ảnh và quy tắc giá riêng. Nhờ vậy chủ cửa hàng không phải tạo một sản phẩm mới cho từng màu/size.

## 3. “Kho chính” nằm ở đâu?

**DHL Stores là nơi quản lý sản phẩm và SKU chính theo yêu cầu hiện tại.** Sapo được kết nối để đồng bộ tồn kho, giúp số lượng thay đổi bởi Shopee/Sapo có thể được phản ánh về website theo lịch đồng bộ.

Điều này có nghĩa là:

1. Sản phẩm, SKU, ảnh, giá, giá vốn, biến thể và nội dung bán hàng được quản lý từ DHL Stores.
2. Sapo không phải nguồn duy nhất quyết định danh mục hay giao diện bán hàng của website.
3. Khi có thay đổi tồn kho ở Sapo, worker đồng bộ sẽ đối chiếu và cập nhật tồn kho website theo lịch đang cấu hình.

> Đồng bộ tồn kho không thay thế việc kiểm soát SKU. Một SKU ở website cần được đặt mã phù hợp với SKU tương ứng ở Sapo để đối chiếu chính xác.

## 4. Dữ liệu được chia thành ba nơi

| Loại dữ liệu | Nơi lưu | Ví dụ |
| --- | --- | --- |
| Dữ liệu nghiệp vụ | Database MySQL/TiDB qua Drizzle ORM | Tài khoản, sản phẩm, SKU, đơn hàng, địa chỉ, ví, mã giảm giá, tin nhắn, tracking |
| Tệp và ảnh được người dùng tải lên | Object storage/S3 | Ảnh sản phẩm, QR rút tiền do khách tải, tệp đính kèm góp ý/tin nhắn |
| Dữ liệu tạm chỉ trên thiết bị | Bộ nhớ/trình duyệt người dùng | Video đang cắt/nối/nén, ảnh nhãn vở người dùng tự chọn, file kết quả video |

Riêng **công cụ video hiện không tải video lên máy chủ**. Video được đọc và xử lý trên trình duyệt của người dùng; vì vậy tệp không nằm trong database hay S3 của website. Đổi lại, tốc độ và khả năng chạy phụ thuộc vào trình duyệt, codec của tệp và bộ nhớ thiết bị.

## 5. Ai có quyền gì?

Hệ thống đang dùng mô hình quyền khá chặt:

| Vai trò | Có thể làm |
| --- | --- |
| Khách hàng | Mua hàng, quản lý tài khoản/địa chỉ/ví/đơn hàng, tải QR nhận tiền để yêu cầu rút, gửi tin nhắn/góp ý |
| Chủ cửa hàng (Owner) | Toàn quyền quản trị sản phẩm, SKU, tồn kho, đơn hàng, khách hàng, số dư ví, tracking, tin nhắn, góp ý và vận hành |

Quyền quản trị không chỉ dựa vào giao diện ẩn/hiện menu. Các API vận hành cũng được bảo vệ phía máy chủ bằng role **owner** và định danh chủ sở hữu trong môi trường production. Vì vậy tài khoản khách không thể chỉ đổi giao diện để gọi API quản trị.

## 6. Thanh toán và ví đang hoạt động như thế nào?

### Thanh toán trong nước

Website có luồng thanh toán QR cho hàng số và hàng vật lý theo cách đã phân loại. SePay được dùng cho phần xác nhận thanh toán QR khi cấu hình webhook production hoàn thiện. Khách cũng có thể dùng số dư ví nếu tài khoản có tiền.

### Ví và rút tiền

Ví là số dư nội bộ của từng tài khoản. Chủ cửa hàng có thể điều chỉnh số dư để hỗ trợ vận hành/test. Khi khách muốn rút, khách tải **QR tài khoản nhận tiền của chính khách**; chủ cửa hàng xem yêu cầu này trong khu vận hành và chuyển tiền thủ công. Hệ thống không tự động chuyển tiền ngân hàng.

### Thanh toán quốc tế

Stripe chưa hoàn tất vì còn cần tài khoản/khóa Stripe và cấu hình webhook riêng. Khi bổ sung, Stripe có thể xử lý thẻ quốc tế và các phương thức như Apple Pay/Google Pay nếu tài khoản Stripe đủ điều kiện. Đây là phần **chưa hoạt động production**.

## 7. Công cụ video vì sao có hai cách xử lý?

Tiện ích video cố gắng giữ nguyên nguyên tắc riêng tư: **không upload video lên máy chủ**.

| Thao tác | Cách xử lý khuyến nghị | Lý do |
| --- | --- | --- |
| Cắt video | **Cắt native theo timeline** | Dùng Canvas/MediaRecorder của trình duyệt, tránh lỗi decoder của FFmpeg WebAssembly khi video vẫn phát xem trước được |
| Ghép video | **Ghép native** | Phát lần lượt các video và ghi thành tệp mới tại thiết bị |
| Nén/chuyển đổi | FFmpeg WebAssembly local | Có thể tạo MP4 H.264/AAC nhưng phụ thuộc codec/bộ nhớ trình duyệt |

Điểm quan trọng là **“không giới hạn dung lượng cố định” không có nghĩa là mọi video đều chắc chắn xử lý được**. Vì không có máy chủ làm thay, một video rất nặng hoặc codec lạ vẫn có thể vượt quá khả năng điện thoại/trình duyệt. Tệp kết quả giữ tên video gốc và thêm hậu tố như `-cut`, `-merged`, `-compressed` hoặc `-converted`.

## 8. Kiến trúc kỹ thuật, nếu trao đổi với lập trình viên khác

```text
Trình duyệt React + Tailwind
        │
        ├── tRPC ──> Express/Node.js ──> Drizzle ──> MySQL/TiDB
        │                                      │
        │                                      └── S3 (ảnh, QR, tệp đính kèm)
        │
        ├── FFmpeg WebAssembly / Canvas / MediaRecorder (video local)
        │
        └── Tích hợp ngoài: Sapo, SePay, Resend, Stripe (khi cấu hình)
```

| Lớp | Công nghệ | Vai trò |
| --- | --- | --- |
| Giao diện | React 19, TypeScript, Tailwind 4, shadcn/ui | Trang cửa hàng, tài khoản, quản trị và công cụ |
| API | Express 4, tRPC 11 | Kiểm tra quyền và giao tiếp giữa giao diện với dữ liệu |
| Database | Drizzle ORM, MySQL/TiDB | Lưu dữ liệu nghiệp vụ |
| Lưu tệp | S3 | Lưu ảnh/tệp cần tồn tại lâu dài |
| Tác vụ định kỳ | Heartbeat | Đồng bộ tồn kho Sapo theo lịch |

## 9. Những gì chưa phải là “xong hoàn toàn”

Website hiện đã có nền tảng vận hành, nhưng các phần dưới đây phụ thuộc vào tài khoản hoặc cấu hình bên ngoài:

| Hạng mục | Cần làm thêm |
| --- | --- |
| Xác minh email | Xác minh domain và địa chỉ From trong Resend, sau đó bật luồng gửi mã |
| Thanh toán quốc tế | Cấp Stripe Secret Key, Publishable Key và Webhook Secret |
| Xác nhận QR tự động | Cấu hình webhook SePay với domain production |
| Đồng bộ tồn kho Sapo | Duy trì API key/secret đúng và mapping SKU chính xác |
| Link tải sản phẩm số | Chủ cửa hàng thay các link mẫu bằng link tải thật |
| Video codec rất lạ | Không thể bảo đảm 100% trong local-only; cần tệp phát được trong Chrome/Edge hoặc dùng phần mềm cài máy nếu codec không được trình duyệt hỗ trợ |

## 10. Nếu chuyển sang ChatGPT, Codex hoặc nền tảng khác

Bạn hoàn toàn có thể chuyển mã nguồn sang bên khác. ZIP đã có `CHATGPT_HANDOFF.md` và không chứa bí mật. Tuy nhiên, **mã nguồn không tự mang theo** database đang chạy, tệp trong S3, domain, API key hay cấu hình tích hợp.

Khi chuyển nền tảng, bên phát triển mới cần làm bốn việc riêng:

1. Import hoặc kết nối lại database.
2. Chuyển/cấu hình lại S3 cho ảnh và tệp đang tồn tại.
3. Nhập lại các secret của Sapo, SePay, Resend, Stripe và OAuth trong môi trường mới.
4. Trỏ domain và webhook sang địa chỉ mới.

> Nói đơn giản: ZIP là “bản thiết kế và máy móc”; database, kho tệp, domain và các chìa khóa dịch vụ là “tài sản vận hành” cần chuyển riêng và bảo mật.

## 11. Kết luận

DHL Stores đang là một **hệ thống bán hàng và vận hành riêng cho bạn**, không phải website mẫu tĩnh. Nó có thể bán hàng số/hàng vật lý, quản lý SKU/tồn kho/đơn hàng, vận hành ví thủ công, liên kết Sapo, giao tiếp với khách và cung cấp công cụ thiết kế cục bộ. Điểm mạnh là mọi thứ được gom vào một nơi; điểm cần quản lý cẩn thận là các cấu hình bên ngoài và dữ liệu thật khi bạn muốn đổi nền tảng phát triển hoặc hosting.
