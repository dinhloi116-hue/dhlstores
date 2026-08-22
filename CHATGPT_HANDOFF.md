# DHL Stores — Gói bàn giao mã nguồn

## Mục đích

Gói này chứa mã nguồn ứng dụng **DHL Stores**, một website thương mại điện tử kết hợp sản phẩm số, hàng vật lý và thư viện công cụ thiết kế. Mã nguồn được đóng gói để có thể tải lên ChatGPT/Codex hoặc mở trong IDE để tiếp tục phát triển.

> Không có khóa bí mật, dữ liệu cơ sở dữ liệu, tệp khách hàng, nội dung S3, `node_modules`, tệp build hay lịch sử Git trong gói này.

## Công nghệ chính

| Hạng mục | Công nghệ |
| --- | --- |
| Giao diện | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Máy chủ | Express 4, tRPC 11 |
| Cơ sở dữ liệu | Drizzle ORM, MySQL/TiDB |
| Xác thực | Manus OAuth và local authentication hiện có |
| Xử lý video | FFmpeg WebAssembly và Canvas/MediaRecorder hoàn toàn local |
| Xuất nhãn | jsPDF, Canvas, SheetJS |

## Chạy ở máy cục bộ

Yêu cầu Node.js 22+ và pnpm.

```bash
pnpm install
pnpm dev
```

Lệnh kiểm tra:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm run build
```

Ứng dụng cần các biến môi trường runtime của nền tảng để dùng đầy đủ database, xác thực, lưu tệp và các tích hợp thanh toán. Không đưa giá trị thật vào mã nguồn hoặc chat. Khi chuyển sang môi trường khác, cần tự cấu hình lại kết nối database, JWT/session, OAuth, S3/storage, Sapo, SePay, Resend và Stripe nếu dùng.

## Các vị trí mã quan trọng

| Nhu cầu | Tệp chính |
| --- | --- |
| Route giao diện | `client/src/App.tsx` |
| Khung cửa hàng và menu Công cụ | `client/src/components/StoreLayout.tsx` |
| Cửa hàng, admin và tRPC | `server/routers.ts` |
| Schema database | `drizzle/schema.ts` |
| Helpers database | `server/db.ts` |
| Cắt/nối/nén video | `client/src/pages/VideoCutterJoiner.tsx` |
| Tạo nhãn vở | `client/src/pages/NotebookLabelMaker.tsx` |
| Thư viện công cụ | `client/src/pages/ToolsLibrary.tsx` |
| Hồi quy video | `server/video-cutter-joiner.test.ts` |

## Ghi chú cho tiện ích video

Video luôn được xử lý **trên thiết bị của người dùng**, không tải video lên máy chủ. Các nút **Cắt native theo timeline** và **Ghép native (khuyên dùng)** dùng Canvas/MediaRecorder, phù hợp khi video phát được trong Chrome/Edge nhưng FFmpeg WebAssembly không đọc được codec. Đầu ra giữ tên video gốc và thêm hậu tố `-cut`, `-merged`, `-compressed` hoặc `-converted`.

## Phần cần cấu hình lại khi chuyển nền tảng

| Hạng mục | Tình trạng |
| --- | --- |
| Database và dữ liệu hiện hữu | Không nằm trong ZIP; cần export/import riêng |
| S3 và ảnh/tệp đã tải | Không nằm trong ZIP; cần di chuyển bucket hoặc cấu hình storage mới |
| Resend xác minh email | Cần domain và From đã xác minh |
| Stripe quốc tế | Chưa cấu hình khóa Stripe riêng |
| SePay | Cần webhook production đúng domain mới |
| Sapo | Cần nhập lại API key/secret và hostname bảo mật |

## Lưu ý trước khi đưa cho AI khác

Hãy yêu cầu AI khác **đọc tài liệu này trước**, không sửa trực tiếp các tệp secret và không tự tạo dữ liệu khách hàng/đánh giá giả. Khi có thay đổi database, AI cần cập nhật cả `drizzle/schema.ts`, migration và test. Để triển khai production ở nền tảng khác, cần cấu hình lại biến môi trường và dịch vụ bên thứ ba thay vì sao chép thông tin nhạy cảm từ đây.
