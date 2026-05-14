# Company Heartbeat Server

Server này chạy ở phía công ty/VPS để theo dõi Jetson có còn sống không.

Ý tưởng:

- Jetson gọi `POST /api/heartbeat/:deviceId` mỗi phút.
- Server lưu `lastSeenAt`.
- Nếu quá `HEARTBEAT_TIMEOUT_MS` không nhận heartbeat, server chuyển thiết bị sang `down` và gửi Telegram.
- Khi Jetson gửi heartbeat trở lại, server chuyển sang `up` và có thể gửi recovery alert.

## Cài đặt

Từ root repo:

```bash
npm install
cp company-heartbeat-server/.env.example company-heartbeat-server/.env
```

Sửa `company-heartbeat-server/.env`:

```env
PORT=8080
HEARTBEAT_SECRET=replace_with_a_long_random_secret
HEARTBEAT_TIMEOUT_MS=180000
HEARTBEAT_CHECK_INTERVAL_MS=30000
HEARTBEAT_TIME_ZONE=Asia/Bangkok
SEND_RECOVERY_ALERT=true
TELEGRAM_BOT_TOKEN=123456789:replace_with_your_bot_token
TELEGRAM_CHAT_ID=replace_with_your_chat_id
TELEGRAM_TIMEOUT_MS=10000
```

Chạy server:

```bash
npm run company:heartbeat
```

Chạy nền bằng PM2 để tự restart khi crash:

```bash
npm run company:pm2:start
```

Xem logs:

```bash
npm run company:pm2:logs
```

## Endpoint

Health check:

```bash
curl http://localhost:8080/health
```

Gửi heartbeat:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"app":"camera-monitor-dashboard"}' \
  http://localhost:8080/api/heartbeat/jetson-01
```

Xem danh sách thiết bị:

```bash
curl -H "Authorization: Bearer YOUR_SECRET" \
  http://localhost:8080/api/devices
```

## Cron trên Jetson

Nếu chỉ muốn biết Jetson còn sống:

```bash
* * * * * curl -fsS -X POST -H "Authorization: Bearer YOUR_SECRET" -H "Content-Type: application/json" -d '{"app":"jetson"}' https://monitor.company.com/api/heartbeat/jetson-01 >/dev/null
```

Nếu muốn heartbeat chỉ gửi khi dashboard camera monitor còn chạy:

```bash
* * * * * curl -fsS http://localhost:5174/api/cameras >/dev/null && curl -fsS -X POST -H "Authorization: Bearer YOUR_SECRET" -H "Content-Type: application/json" -d '{"app":"camera-monitor-dashboard"}' https://monitor.company.com/api/heartbeat/jetson-01 >/dev/null
```

## Lưu ý

- `HEARTBEAT_SECRET` phải đủ dài và giữ bí mật.
- Endpoint heartbeat nên chạy qua HTTPS nếu đi qua internet.
- Dữ liệu runtime lưu ở `company-heartbeat-server/data/devices.json`.
