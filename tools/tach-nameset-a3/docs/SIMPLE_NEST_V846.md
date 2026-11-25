# DHL Nameset Layout V8.46 — Dàn file đơn giản

## Mục tiêu
Từ ảnh phản hồi ngày 10/11/2026: giảm độ phức tạp tab **DÀN FILE**, tránh hai luồng thao tác DÀN TỐI ƯU / DÀN GROUP gây nhầm lẫn; sửa thuật toán đọc sai cm thành mm và thông báo contour dự phòng không phải lỗi chính.

## Giao diện mặc định
- Một bảng **DÀN FILE THÔNG MINH** và **một nút DÀN TỐI ƯU**.
- Các khổ A4, A3, 58 × 20 m; có ô nhập rộng/dài và khoảng cách (cm).
- Tự tìm góc xoay (bật mặc định lần đầu); xếp contour tránh lỗ kín; tìm sâu ưu tiên tiết kiệm vật liệu.
- Tùy chọn riêng cho phép dàn các đối tượng rời. Không tự phá Group.
- **TÙY CHỌN NÂNG CAO** mở lại tất cả công cụ V8.45: sửa kích thước hàng loạt, khổ tùy chỉnh, lề, số lượng bản in, thứ tự, lật gương, dàn một Group/trang, kỹ thuật tìm kiếm.
- **HOÀN TÁC** chỉ hoạt động nếu có lượt dàn thành công qua bảng nhanh; không hoàn tác nhầm thao tác Corel trước đó.

## Sửa lỗi đơn vị
Ở `V838_DIRECT_GROUPS.html`, đầu vào `v77NestW`, `v77NestH`, `v77NestGap`, bốn lề và `v77FrameGapInput` đều là cm, được chuyển *10 sang mm. CorelDRAW và engine contour dùng mm.

Ví dụ: khổ **58 × 2000 cm**, khoảng cách **0,5 cm** phải được tính là **580 × 20.000 mm**, khoảng cách **5 mm**. Group rộng 250 mm phải được chấp nhận trong khổ 58 cm.

## Thông báo kết quả
Lượt dàn chính thành công nhưng lượt contour bổ sung không cải thiện thì giữ nguyên kết quả chính; không hiển thị câu gây hiểu nhầm “Chưa tìm được vị trí hợp lệ”.

## Kiểm thử
- `tests/simple_nest_v846.test.js`: giao diện, preset, cm/mm, Group/chi tiết rời, chế độ nâng cao, hoàn tác an toàn.
- `tests/direct_groups.test.js`: dàn cuộn, Group/trang, hoàn tác khi lỗi.
- `tests/group_open_pocket_v843.test.js` và `tests/deep_contour_v845.test.js`: khe mở, lỗ kín, góc xoay, dự phòng.
- Đã mô phỏng 26 Group có kích thước 220 × 280 mm trên cuộn 58 cm × 20 m: khớp 1 khung; không thay đổi tỷ lệ Group.

**Giới hạn:** kiểm thử trên mã nguồn / Corel mô phỏng, chưa kiểm chứng bố cục sản xuất trên CorelDRAW 2021/2025 và bộ file CDR người dùng.

## Cập nhật
Trong Docker nhấn **CẬP NHẬT** một lần để nhận V8.46, đóng/mở CorelDRAW. Cơ chế cập nhật hiện có kiểm tra file DockerUI.html đang sử dụng, không reset Workspace.
