# Ghi nhận rà soát đồng bộ Sapo

Ngày rà soát: 2026-08-18.

Tài liệu REST Admin API chính thức của Sapo nêu rằng request cần token hợp lệ trong header `X-Sapo-Access-Token`; tài liệu không mô tả API key/API secret Basic Auth là phương thức xác thực chuẩn cho app OAuth2. Tài liệu cũng nêu giới hạn mặc định bucket 40 request/app/store, leak rate 2 request/giây; lỗi 401/403 lần lượt biểu thị xác thực hoặc access scope không phù hợp. Dữ liệu inventory dùng các trường `location_id`, `inventory_item_id`, `available` và số lượng có thể được làm tròn tối đa ba chữ số thập phân.

URL nguồn: https://docs.sapo.vn/docs/api/admin-rest/overview/

Kết quả kiểm tra production hiện tại của dự án: test chỉ đọc `RUN_SAPO_LIVE_TEST=1 pnpm vitest run server/sapo-connection.test.ts` đã đạt HTTP 200, nhưng code hiện tại vẫn dựng `Authorization: Basic base64(API_KEY:API_SECRET)`. Vì vậy chưa bật thao tác ghi tồn kho; cần xác nhận bộ credential đang là token OAuth2 hay private-app credential và endpoint inventory/location thực tế trước khi triển khai DHL Stores → Sapo.


## Quyết định phạm vi

Storefront API không cần bật cho đồng bộ tồn kho DHL Stores → Sapo. Phần Storefront API trong Ứng dụng riêng phục vụ tài nguyên phía storefront như danh sách sản phẩm, khách hàng hoặc checkout; luồng kho cần quyền Admin API tương ứng với sản phẩm, phiên bản và tồn kho. DHL Stores vẫn là nguồn catalog và tồn kho chính.


## Kết quả từ PDF cấu hình của cửa hàng

Ảnh chụp trong PDF xác nhận ứng dụng riêng **DHL Stores – Đồng bộ tồn kho** dùng Basic Authentication với API Key/API Secret. Quyền Admin API hiện đang đặt **Đọc và ghi** cho mục **Sản phẩm, phiên bản và danh mục** và mục **Kho**. Các nhóm nội dung, khách hàng, đơn hàng/giao dịch/vận chuyển, đơn nhập hàng, chuyển kho, nhà cung cấp, khuyến mãi và các tài nguyên không cần thiết đang tắt hoặc chỉ đọc. Storefront API đang tắt, phù hợp với chính sách DHL Stores là nguồn catalog và kho chính.

Với cấu hình này, bước tiếp theo là thử cập nhật một SKU thật theo chế độ kiểm soát, đối chiếu lại tồn kho trên Sapo, sau đó mới bật đồng bộ theo lô; không được để Sapo ghi ngược về DHL Stores.


## Kết quả thử ghi một SKU

SKU DHL Stores `namearg-B-2026-6 nhỏ` có `variant_id=1` và tồn `0`. SKU tương ứng trên Sapo có `variant_id=221821065`, `inventory_item_id=221821063`, `location_id=529110`, `inventory_level_id=170002732`. Phương thức `PUT https://dhl-sport.mysapo.net/admin/inventory_levels/set.json` với payload `inventory_level.location_id`, `inventory_level.inventory_item_id` và `inventory_level.available` trả HTTP 200. Đọc lại inventory level trả `available=0`, khớp DHL Stores. Phương thức PUT vào resource `/admin/inventory_levels/{id}.json` trả 403 và POST vào `/set.json` trả 405; không sử dụng hai dạng đó.


## Quy tắc ghép biến thể

DHL Stores đã có trường `product_variants.sku` tương ứng với trường Mã SKU trong Sapo. Đồng bộ tồn kho dùng SKU đã chuẩn hóa để ghép biến thể; sau khi ghép thành công mới dùng `inventory_item_id` và `location_id` của Sapo để gọi endpoint inventory level. Mã vạch và đơn vị tính không bắt buộc cho luồng cập nhật tồn. SKU phải không trùng và giống tuyệt đối giữa hai hệ thống.

## Căn cứ thiết kế inbound sync hai chiều (2026-08-19)

- Tài liệu Sapo về **Đồng bộ đơn hàng Shopee - Sapo**: đơn Shopee được đồng bộ về Sapo với các trạng thái như chờ xác nhận, xuất kho, hoàn thành, hủy và trả hàng. Nguồn: https://help.sapo.vn/dong-bo-don-hang-shopee-sapo
- Tài liệu Sapo về **Công cụ đồng bộ tồn kho**: Sapo dùng tồn kho hệ thống để đồng bộ lên các sàn đã liên kết; thao tác đồng bộ một chiều từ Sapo lên sàn có thể không hoàn tác. Nguồn: https://help.sapo.vn/cong-cu-dong-bo-ton-kho-1
- Tài liệu Sapo về lỗi đồng bộ đơn từ sàn cảnh báo xung đột khi dùng phần mềm quản lý kho khác song song hoặc chỉnh tồn trực tiếp trên Seller Center. Nguồn: https://help.sapo.vn/cac-van-de-thuong-gap-khi-dong-bo-don-hang-tu-san-tmdt
- Quyết định kiến trúc: DHL Stores giữ quyền Catalog (sản phẩm, SKU, giá, ảnh); Sapo là nguồn biến động tồn từ Shopee/kênh bán. Inbound chỉ cập nhật `product_variants.stock` theo SKU đã mapping, ghi inventory movement và không cập nhật Catalog.
