# DHL Stores Android app

## Trạng thái hiện tại

Dự án web đã được chuẩn bị để đóng gói bằng Capacitor với tên **DHL Stores** và package ID `com.dhlstores.app`. Thư mục `android/` là Android project được tạo từ bản web production. Website vẫn là nguồn giao diện và dữ liệu chính; Android app chỉ là lớp đóng gói, nên các thay đổi storefront tiếp theo cần chạy `pnpm app:sync` để đồng bộ sang Android.

## Google Login hiện tại

Google Login đang đi qua Manus OAuth. Luồng web dùng `window.location.origin` để tạo callback `/api/oauth/callback`, nonce trong cookie `__Host-oauth_state` và state chống CSRF. Cấu hình Capacitor hiện tại dùng HTTPS domain `https://cuahangtoit-9a4r8wsz.manus.space`, vì vậy app vẫn truy cập đúng web origin, callback và session cookie hiện có.

Đây là cấu hình **web-first an toàn để kiểm thử**. Android Manifest hiện đã có HTTPS App Link cho `https://cuahangtoit-9a4r8wsz.manus.space` và website có `/.well-known/assetlinks.json`. Bản assetlinks hiện dùng SHA-256 của debug keystore để kiểm thử cục bộ; trước khi phát hành cần bổ sung fingerprint của keystore release hoặc Google Play App Signing vào cùng tệp. Chưa thêm custom scheme như `dhlstores://oauth/callback` vì callback native cần được đăng ký đồng thời ở Android Manifest, OAuth portal và backend. Không nên tự đổi sang deep link một phía; làm vậy có thể gây lỗi `OAuth callback failed` hoặc tạo phiên không liên tục.

## Lệnh phát triển

```bash
pnpm app:sync   # build web production và đồng bộ vào android/
pnpm app:open   # mở Android project trong Android Studio
pnpm app:run    # chạy trên emulator hoặc thiết bị Android đã kết nối
```

Nếu domain production thay đổi, đồng bộ bằng biến môi trường trước khi chạy:

```bash
CAPACITOR_SERVER_URL=https://ten-mien-moi.example pnpm exec cap sync android
```

Chỉ dùng HTTPS production; không bật cleartext cho bản phát hành.

## Kiểm tra Google Login trên Android

Trên thiết bị thật, mở app, đăng xuất, bấm **Continue with Google**, hoàn tất đăng nhập và kiểm tra app quay lại đúng trang web với phiên người dùng còn hiệu lực. Cần kiểm tra thêm account owner `dinhloi116@gmail.com` vẫn vào được `/admin`, tài khoản khách không nhìn thấy khu vực quản trị, và đóng/mở app không làm mất session ngoài thời hạn cookie.

Hook auth hiện chủ động gọi lại `auth.me` khi cửa sổ/app nhận `focus`, khi document chuyển sang `visibilityState=visible`, khi có `pageshow` và khi mạng kết nối lại. Cơ chế này chỉ đọc session cookie HttpOnly từ server; không lưu access token hoặc refresh token trong localStorage. Vì vậy khi người dùng chuyển sang Google/browser rồi quay lại app, UI sẽ xác nhận lại phiên thay vì giữ trạng thái đăng nhập cũ một cách mù quáng.

Nếu Android WebView hoặc trình duyệt Google chặn đăng nhập nhúng, bước tiếp theo là dùng Capacitor Browser/System Custom Tab kết hợp deep link đã đăng ký đầy đủ. Không đưa client secret vào app và không xử lý token Google trực tiếp ở client.

## Trước khi phát hành Google Play

Cần mở Android Studio để kiểm tra application ID, version code, icon, splash screen, signing keystore và build file `.aab`. Cần chuẩn bị privacy policy, khai báo dữ liệu, nội dung giới thiệu, ảnh chụp màn hình và tài khoản Play Console. Luồng thanh toán sản phẩm số cũng phải được rà soát riêng theo chính sách Google Play; việc đóng gói Capacitor không tự giải quyết yêu cầu thanh toán của nền tảng.

Gradle đã hỗ trợ signing release qua bốn biến môi trường: `ANDROID_RELEASE_KEYSTORE`, `ANDROID_RELEASE_STORE_PASSWORD`, `ANDROID_RELEASE_KEY_ALIAS` và `ANDROID_RELEASE_KEY_PASSWORD`. Khi cả bốn biến có giá trị, lệnh build release sẽ dùng keystore đó; khi thiếu, bản debug/dev vẫn hoạt động nhưng bản release cần được ký trong Android Studio hoặc CI bảo mật. Không đặt các giá trị này trong `package.json`, GitHub, frontend hoặc file `.env` đã commit.

Quy trình Play App Signing nên là: tạo hoặc chọn app với package ID `com.dhlstores.app` trong Play Console, đăng ký Play App Signing, upload `.aab` đã ký bằng upload key, sau đó lấy **App signing certificate SHA-256** từ Play Console. Fingerprint App Signing này cần được thêm vào `client/public/.well-known/assetlinks.json`; fingerprint debug hiện tại chỉ dành cho kiểm thử và không thay thế chứng chỉ production.

## Cảnh báo dữ liệu

Không commit keystore, secret OAuth, API key, `.env` hoặc file credential vào GitHub. Repository nên để **Private** nếu có mã nguồn/quy trình nội bộ. Backend, database, S3 và quyền owner vẫn nằm ở môi trường web; xóa app khỏi điện thoại không xóa dữ liệu máy chủ.
