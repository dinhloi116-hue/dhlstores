# DHL Nameset Layout - SePay license server

Muc tieu: khong dung tai khoan nguoi dung de cap trial/luot. Quyen su dung gan voi **device_id** (hash phan cung) va duoc luu tren server.

## Mo hinh thuong mai

- `LIFE`: mua 1 lan, 1 may, vinh vien.
- `CREDITS_100`: nap 100 luot. Co the nap tiep, credit cong don.
- 1 luot duoc tru khi bat dau **mot phien CorelDRAW moi**. Trong cung session_id, goi lai khong bi tru them.
- Khong co free credit theo account, nen tao nhieu account khong mang lai them luot.

## Bao mat don gian nhung hieu qua

1. Tool gui `device_id` la SHA-256 cua fingerprint phan cung; khong dung email/tai khoan lam khoa license.
2. So luot/lifetime nam tren D1 server, khong nam o Registry/localStorage.
3. Server tu quyet dinh gia goi; client khong duoc gui amount tuy y.
4. Moi don co ma `DHLxxxxxxxxxxxx` rieng va QR nap san so tien + noi dung.
5. SePay webhook dung HMAC-SHA256, timestamp +-5 phut va raw body.
6. `transaction_id` UNIQUE de webhook retry khong cong tien hai lan.
7. Moi payment chi gan cho 1 order -> 1 device.
8. Device co the block/unblock tu admin endpoint.

## API

- `POST /api/device/status` body `{ "deviceId": "..." }`
- `POST /api/session/start` body `{ "deviceId": "...", "sessionId": "..." }`
- `POST /api/orders` body `{ "deviceId": "...", "plan": "CREDITS_100" }` hoac `LIFE`
- `GET /api/orders/{code}` de poll trang thai thanh toan
- `POST /webhook/sepay` endpoint cho SePay
- `POST /api/admin/device` voi `Authorization: Bearer ADMIN_SECRET`

## Cloudflare Worker + D1

1. Tao D1 database.
2. Chay `schema.sql` vao D1.
3. Copy `wrangler.toml.example` thanh `wrangler.toml`, dien:
   - `database_id`
   - `BANK_CODE`
   - `BANK_ACCOUNT`
   - `PRICE_100`
   - `PRICE_LIFETIME`
4. Dat secrets:

```bash
wrangler secret put SEPAY_WEBHOOK_SECRET
wrangler secret put ADMIN_SECRET
```

5. Deploy Worker.
6. Test `GET /health`.

## Cau hinh SePay

Trong Dashboard SePay tao webhook:

- Su kien: **Tien vao**.
- URL: `https://<worker-domain>/webhook/sepay`
- Nen loc tien to ma thanh toan: `DHL`.
- Bao mat: **HMAC-SHA256**.
- Secret phai trung voi `SEPAY_WEBHOOK_SECRET` tren Worker.
- Content-Type: JSON.
- Bat retry.

Webhook handler kiem tra:

- HMAC + timestamp.
- `transferType = in`.
- dung tai khoan nhan (neu payload co `accountNumber`).
- ma order `DHL...`.
- so tien >= so tien server da tao cho order.
- transaction khong duoc xu ly hai lan.

## QR

Worker tra QR theo format SePay/VietQR:

`https://vietqr.app/img?acc=...&bank=...&amount=...&des=DHL...`

Client chi hien QR va poll `GET /api/orders/{code}`. Khi webhook xac nhan paid, server tu cong 100 credits hoac bat lifetime.

## Device fingerprint de tool gui len server

Khong nen dung Windows username. Nen lay 2-3 thanh phan on dinh, normalize roi SHA-256, vi du:

- `Win32_ComputerSystemProduct.UUID`
- `Win32_BaseBoard.SerialNumber`
- `Win32_Processor.ProcessorId`

Neu may thay main/CPU thi coi nhu may moi. Muon chuyen license, chu tool dung admin reset/chuyen thu cong thay vi cho nguoi dung tu reset.

## Viec con lai de noi vao Docker

Can mot patch client moi sau khi co URL Worker that:

- tao device_id SHA-256,
- hien 2 nut `MUA 100 LUOT` / `MUA VINH VIEN`,
- mo/nhung QR,
- poll order status,
- goi `/api/session/start` 1 lan moi phien Corel,
- khoa cac chuc nang neu server tra `allowed=false`.

Khong nen hard-code SePay secret, admin secret hoac private key trong Docker.
