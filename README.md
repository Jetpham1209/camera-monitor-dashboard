# Camera Monitor Dashboard

Dashboard local để quản lý nhiều camera RTSP, kiểm tra camera còn hoạt động bằng `ping`, xem stream, capture frame và lấy tọa độ shape trên ảnh capture.

## Tính năng

- Thêm, sửa, xóa nhiều camera RTSP.
- Kiểm tra camera online/offline bằng cách `ping` tới host trong RTSP URL.
- Ghi nhận lịch sử mất kết nối: thời điểm bắt đầu, thời điểm khôi phục và thời lượng.
- Gửi Telegram khi camera vừa bị ngắt kết nối.
- Stream RTSP lên trình duyệt bằng HLS.
- Capture frame từ camera.
- Vẽ shape trên frame capture: rectangle, circle, polygon.
- Xuất tọa độ shape theo pixel gốc của ảnh.
- Đóng gói app để triển khai sang thiết bị khác.

## Yêu Cầu

- Node.js 20 trở lên.
- Thiết bị chạy app phải `ping` được IP camera.
- Thiết bị chạy app phải truy cập được RTSP URL nếu muốn stream hoặc capture frame.
- Hệ điều hành có lệnh `ping`.
- Port mặc định: `5174`.

`ffmpeg` được cài qua package `ffmpeg-static`, nên thường không cần cài FFmpeg thủ công.

## Cài Đặt

Clone repo:

```bash
git clone https://github.com/Jetpham1209/camera-monitor-dashboard.git
cd camera-monitor-dashboard
```

Chạy script cài đặt và khởi động trên Linux/macOS/WSL/Git Bash:

```bash
sh install.sh
```

Script sẽ tự tạo `.env`, tạo file data tối thiểu, cài dependencies và chạy server.

Trên Linux/macOS cũng có thể cấp quyền execute rồi chạy trực tiếp:

```bash
chmod +x install.sh
./install.sh
```

Nếu muốn cài thủ công, dùng các bước dưới đây.

Cài dependencies:

```bash
npm install
```

Tạo file `.env` từ file mẫu:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Chạy app:

```bash
npm start
```

Mở dashboard:

```text
http://localhost:5174
```

Nếu truy cập từ máy khác trong cùng mạng LAN:

```text
http://<ip-may-dang-chay-app>:5174
```

## Cấu Hình `.env`

Ví dụ:

```env
PORT=5174
CHECK_INTERVAL_MS=15000
PROBE_TIMEOUT_MS=10000
PING_TIMEOUT_MS=3000

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_TIME_ZONE=Asia/Bangkok
TELEGRAM_TIMEOUT_MS=10000
```

Ý nghĩa:

- `PORT`: port chạy dashboard.
- `CHECK_INTERVAL_MS`: chu kỳ nền để quét danh sách camera.
- `PING_TIMEOUT_MS`: thời gian timeout cho mỗi lần ping camera.
- `PROBE_TIMEOUT_MS`: timeout khi capture frame bằng FFmpeg.
- `TELEGRAM_BOT_TOKEN`: token bot Telegram, lấy từ `@BotFather`.
- `TELEGRAM_CHAT_ID`: chat id nhận cảnh báo.
- `TELEGRAM_TIME_ZONE`: múi giờ hiển thị trong tin nhắn Telegram.
- `TELEGRAM_TIMEOUT_MS`: timeout khi gọi Telegram API.

Nếu không cấu hình Telegram, app vẫn chạy bình thường, chỉ bỏ qua bước gửi cảnh báo.

## Cách Kiểm Tra Online/Offline

App lấy host từ RTSP URL rồi gọi `ping`.

Ví dụ:

```text
rtsp://admin:password@192.168.1.230:554/stream1
```

Host được dùng để ping:

```text
192.168.1.230
```

Kết quả:

- `ping` thành công: camera `online`.
- `ping` lỗi hoặc timeout: camera `offline`.

Lưu ý: ping chỉ xác nhận thiết bị/IP còn reachable. Nó không xác nhận dịch vụ RTSP có đang phát video hay không.

## Telegram Alert

Khi camera chuyển từ `online/unknown` sang `offline`, app gửi một tin nhắn Telegram gồm:

```text
Camera bi ngat ket noi
Ten camera: <tên camera>
Thoi gian ngat ket noi: <thời gian>
```

Cách lấy `TELEGRAM_CHAT_ID`:

1. Tạo bot bằng `@BotFather`.
2. Nhắn một tin bất kỳ cho bot.
3. Mở URL sau, thay token thật vào:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

4. Lấy giá trị `chat.id`.

## Sử Dụng Dashboard

1. Bấm `Thêm camera`.
2. Nhập tên camera và RTSP URL.
3. Chọn camera trong danh sách.
4. Bấm `Check` để kiểm tra ngay.
5. Bấm `Stream` để xem luồng RTSP.
6. Bấm `Capture` để chụp frame.
7. Trong danh sách capture, bấm `Vẽ shape` để mở công cụ lấy tọa độ.

## Tọa Độ Shape

Trong công cụ vẽ frame:

- `Rectangle`: kéo chuột để vẽ hình chữ nhật.
- `Circle`: kéo chuột từ tâm ra bán kính.
- `Polygon`: click từng điểm, rồi bấm `Chốt polygon` hoặc double click.
- `Undo`: xóa shape cuối hoặc điểm polygon cuối.
- `Xóa`: xóa toàn bộ shape.
- `Copy JSON`: copy tọa độ ra clipboard.

Ví dụ output:

```json
{
  "image": {
    "url": "/captures/camera-id/frame.jpg",
    "width": 1920,
    "height": 1080
  },
  "shapes": [
    {
      "id": 1,
      "type": "rectangle",
      "x": 120,
      "y": 80,
      "width": 300,
      "height": 180
    },
    {
      "id": 2,
      "type": "circle",
      "center": {
        "x": 640,
        "y": 360
      },
      "radius": 90
    },
    {
      "id": 3,
      "type": "polygon",
      "points": [
        { "x": 100, "y": 100 },
        { "x": 220, "y": 120 },
        { "x": 200, "y": 240 }
      ]
    }
  ]
}
```

Tọa độ luôn theo pixel gốc của ảnh capture.

## Dữ Liệu Runtime

Các file/thư mục runtime:

- `data/cameras.json`: danh sách camera đã thêm.
- `data/state.json`: trạng thái và lịch sử mất kết nối.
- `data/captures/`: ảnh capture.
- `data/hls/`: file stream HLS tạm.

Các dữ liệu này không được commit lên Git để tránh lộ RTSP URL, username/password hoặc dữ liệu runtime.

Khi clone repo mới, app sẽ tự tạo file/thư mục cần thiết nếu chưa tồn tại.

## Đóng Gói Deploy

Tạo gói source sạch, không kèm camera/state hiện tại:

```bash
npm run package
```

Tạo gói kèm `data/cameras.json` và `data/state.json` hiện tại:

```bash
npm run package:with-data
```

Tạo gói offline cho Windows, có kèm `node_modules`:

```bash
npm run package:offline-windows
```

Lưu ý: gói offline có `node_modules` chỉ nên dùng cho thiết bị cùng hệ điều hành và kiến trúc với máy đóng gói. Nếu triển khai sang Linux hoặc máy khác kiến trúc, dùng gói không kèm `node_modules`, sau đó chạy `npm install` trên thiết bị đích.

## Scripts

```bash
npm start
```

Chạy server.

```bash
npm run dev
```

Chạy server tương tự `npm start`.

```bash
npm run package
```

Đóng gói source vào thư mục `dist/`.

## Cấu Trúc Dự Án

```text
.
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── scripts/
│   └── package.ps1
├── data/
│   ├── cameras.json
│   ├── state.json
│   ├── captures/
│   └── hls/
├── server.js
├── package.json
├── .env.example
└── README.md
```

## Bảo Mật

- Không commit `.env`.
- Không commit `data/cameras.json` nếu RTSP URL có username/password.
- Nên chạy dashboard trong mạng nội bộ hoặc sau reverse proxy có authentication nếu public ra internet.
- Telegram bot token cần được giữ bí mật.

## Troubleshooting

Camera báo offline dù vẫn xem được RTSP:

- Kiểm tra máy chạy app có ping được IP camera không.
- Một số camera/router có thể chặn ICMP ping. Khi đó logic ping sẽ báo offline dù RTSP còn hoạt động.

Không stream được:

- Kiểm tra RTSP URL, username/password và port.
- Đảm bảo máy chạy app truy cập được camera qua mạng.
- Xem log terminal khi chạy `npm start`.

Không capture được:

- Kiểm tra RTSP URL.
- Tăng `PROBE_TIMEOUT_MS` trong `.env` nếu camera phản hồi chậm.

Không nhận Telegram:

- Kiểm tra `TELEGRAM_BOT_TOKEN`.
- Kiểm tra `TELEGRAM_CHAT_ID`.
- Nhắn tin cho bot trước khi gọi `getUpdates`.
