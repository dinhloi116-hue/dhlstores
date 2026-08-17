# Nghiên cứu payout và đối soát

## Kết luận sơ bộ

Website hiện chỉ có quy trình rút tiền thủ công. Để tự động chuyển khoản, cần nhà cung cấp có API disbursement/payout, tài khoản doanh nghiệp/merchant được phê duyệt, chữ ký hoặc khóa bảo mật, hạn mức và endpoint nhận kết quả giao dịch.

## Nguồn chính thức

- Brankas Disburse: https://www.brankas.com/disburse — hỗ trợ disbursement theo lô hoặc từng giao dịch, cập nhật trạng thái, kiểm soát giao dịch được duyệt; điều kiện hợp tác và coverage cần xác nhận riêng cho Việt Nam.
- MoMo Single Disbursement: https://developers.momo.vn/v3/vi/docs/payment/api/disbursement-v2/ — có API kiểm tra ví, số dư merchant và thanh toán disburse; hỗ trợ disburse tới ví hoặc ngân hàng, yêu cầu ký HMAC-SHA256, mã hóa RSA, IPN URL và thông tin merchant. Tài liệu nêu điều kiện xác minh người nhận và hạn mức.
- SePay Banking API: https://developer.sepay.vn/en — tài liệu công khai tập trung vào webhook nhận biến động số dư, tạo VietQR, truy vấn giao dịch/tài khoản và Bank Hub/OAuth; chưa đủ căn cứ để kết luận SePay cung cấp payout chuyển tiền ra ngân hàng cho luồng rút tiền của DHL Stores.

## Kiến trúc an toàn đề xuất

Chỉ tự động chuyển sau khi chủ shop duyệt yêu cầu. Server tạo idempotency key cho mỗi yêu cầu, gọi nhà cung cấp payout, lưu provider transaction ID, nhận callback/IPN, xác minh chữ ký, cập nhật thành công/thất bại và hoàn số dư khi thất bại. Không đưa secret/API key ra trình duyệt và không tự động chuyển khi chỉ mới có yêu cầu rút tiền.

## Trạng thái cần có

`pending_approval` → `approved` → `processing` → `paid` hoặc `failed`; yêu cầu `rejected` hoàn số dư ngay. Cần nhật ký người duyệt, thời gian, số tiền, người nhận, provider transaction ID và lý do thất bại.
