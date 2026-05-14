# Camera Monitor Dashboard - Deploy

## Yeu cau tren thiet bi dich

- Node.js 20 tro len.
- May dich phai ping duoc IP camera.
- May dich phai truy cap duoc RTSP URL neu muon stream/capture frame.
- Port mac dinh: `5174`.

## Cai dat tren thiet bi dich

1. Giai nen file `camera-monitor-dashboard.zip`.
2. Mo terminal trong thu muc vua giai nen.
3. Cai dependency:

```powershell
npm install
```

4. Tao file `.env` tu `.env.example`, sua cac gia tri can thiet:

```env
PORT=5174
CHECK_INTERVAL_MS=15000
PING_TIMEOUT_MS=3000
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_TIME_ZONE=Asia/Bangkok
```

5. Chay app:

```powershell
npm start
```

6. Mo dashboard:

```text
http://localhost:5174
```

Neu truy cap tu may khac trong LAN, dung IP cua may dang chay app:

```text
http://<ip-thiet-bi-dich>:5174
```

## Dong goi tu may hien tai

Tao goi source sach, khong kem camera/state hien tai:

```powershell
npm run package
```

Tao goi kem `data/cameras.json` va `data/state.json` hien tai:

```powershell
npm run package:with-data
```

Tao goi offline cho Windows, co kem `node_modules`:

```powershell
npm run package:offline-windows
```

Luu y: goi offline co `node_modules` chi nen dung khi thiet bi dich cung he dieu hanh/kien truc voi may dong goi. Neu deploy sang Linux hoac may khac kien truc, dung goi khong kem `node_modules` roi chay `npm install` tren may dich.

## Du lieu runtime

- Danh sach camera: `data/cameras.json`
- Trang thai/lịch su mat ket noi: `data/state.json`
- Anh capture: `data/captures/`
- HLS stream tam: `data/hls/`

Script dong goi khong dua `data/captures/` va `data/hls/` vao zip de goi nhe va tranh mang theo file tam.
