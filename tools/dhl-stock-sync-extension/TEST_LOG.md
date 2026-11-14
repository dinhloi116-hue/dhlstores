# Test log – 5 vòng

## Vòng 1 – lõi quét cơ bản
- Dựng MV3 extension, popup, content script, core thu thập variant.
- Mock Mexico: S=7, M=19, L=20, XL=14, XXL=8.
- Kết quả: PASS, đủ 5 SKU và đúng tồn.

## Vòng 2 – nhiều màu / nhiều size
- Thêm stop reason + confidence để tránh coi response lặp là hoàn chỉnh.
- Test 2 màu × 6 size (có XXXL và tồn 0).
- Kết quả: PASS, đủ 12 variant; trường hợp response lặp 1 SKU bị nhận diện low-confidence.

## Vòng 3 – an toàn dữ liệu
- Thêm validate scan: thiếu SKU, SKU trùng, tồn bất thường, lỗi nguồn.
- Thêm timeout 10 giây và phát hiện response không phải JSON (khả năng hết login).
- Kết quả: PASS, dữ liệu lỗi bị chặn khỏi trạng thái safe-to-sync.

## Vòng 4 – nhận diện parent ID
- Không tin tuyệt đối ID cuối URL (có thể là child variant).
- Ưu tiên tìm `psId` / `data-parent-id` trong HTML rồi mới fallback URL.
- Kết quả: PASS với parent 4985510 dù URL fallback là child 4985511.

## Vòng 5 – bản tiện ích dùng thử
- Thêm lưu lần quét gần nhất, filter, xuất CSV, copy JSON, thống kê hết hàng/cần kiểm tra.
- Thêm build test kiểm manifest, host permission, file liên kết và guard chưa cấp quyền Sapo.
- Kết quả: PASS toàn bộ syntax + unit + build checks.
