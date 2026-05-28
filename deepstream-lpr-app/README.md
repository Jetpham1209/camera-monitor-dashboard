# DeepStream Jetson App

Scaffold deploy tren Jetson cho DeepStream detection app co the chay LPR processor hoac generic detection flow trong ROI.

## Muc tieu

- Input nhieu RTSP camera.
- Moi camera co config rieng: ten camera, RTSP URL, ROI polygon, class id dau xe, cooldown capture.
- Phat hien dau xe trong vung polygon xac dinh cua tung camera.
- Detect/OCR bien so.
- Tracking object id de tranh capture qua nhieu lan cho cung mot xe.
- Control UI de nhap RTSP, ve ROI polygon tren anh mau, upload/build model YOLO, build ONNX/TensorRT engine, roi bam Deploy.
- Camera Monitor duoc mount vao cung Jetson Console de ping camera, xem HLS stream, capture frame, ve shape va cau hinh Telegram alert.
- Triton tab de quan ly Triton model repository, start/stop Triton server, upload/delete model va dung nhu service inference rieng cho automation workflow.

## Chay dang product Docker

Day la cach khuyen nghi tren Jetson de isolate moi truong. Control UI chay trong container, runtime DeepStream chay trong image `camera-monitor-deepstream-runtime:local` co san Python binding `pyds`, con model-builder image `deepstream-lpr-model-builder:local` lo export YOLO `.pt` sang ONNX. Mac dinh engine duoc build bang `trtexec` trong DeepStream runtime image da duoc profile hoa de TensorRT version khop voi container inference. Host Jetson khong can cai `torch`, `onnx`, `ultralytics`, hay `pyds` bang pip.

### Compatibility target

Product deploy path hien tai target JetPack 6.x tren Jetson Orin. Script install se tu detect L4T va chon profile:

| Jetson L4T | JetPack | CUDA | TensorRT | DeepStream | pyds | Triton image | Profile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36.4.x | 6.1 GA | 12.6 | 10.3 | 7.1 | 1.2.0 | `nvcr.io/nvidia/tritonserver:24.08-py3-igpu` | `jp61-ds71` |
| 36.3.x | 6.0 GA | 12.2 | 8.6 | 7.0 | 1.1.11 | `nvcr.io/nvidia/tritonserver:24.03-py3-igpu` | `jp60-ds70` |
| 36.2.x | 6.0 DP | 12.2 | 8.6 | 6.4 | 1.1.10 | `nvcr.io/nvidia/tritonserver:23.11-py3-igpu` | `jp60dp-ds64` experimental |

JetPack 5.x hien khong duoc dong goi mac dinh cho product Docker path nay vi khac Ubuntu/Python/DeepStream stack. Neu preflight detect JetPack 5.x, script se dung som va yeu cau upgrade len JetPack 6.x hoac tao image set rieng cho JetPack 5.

Ly do phai strict version: TensorRT engine phu thuoc GPU + TensorRT + CUDA + DeepStream image. Clone repo sang Jetson khac thi nen build lai engine tren chinh Jetson do, va build bang TensorRT cua runtime target, khong copy engine tu may khac.

Tu root repo:

```bash
chmod +x deepstream-lpr-app/install.sh
deepstream-lpr-app/install.sh
```

Script se:

- chay `scripts/jetson-preflight.sh` de detect L4T/JetPack/CUDA/TensorRT/DeepStream profile.
- tao `deepstream-lpr-app/.env.product` tu profile neu chua co.
- build DeepStream runtime image co `pyds` dung version.
- build/start control UI bang Docker Compose.
- mount Docker socket de control UI co the start/stop DeepStream runtime container.

Mo:

```text
http://<ip-jetson>:5190
```

Jetson Console la web app product duy nhat tren port nay. Sidebar `Camera Monitor` mo lai luong monitor RTSP cu trong cung server tai `/camera-monitor/`; khong can start them dashboard monitor port `5174` khi chay product Docker.

### Operator Agent

Sidebar `Agent` cung cap mot operator agent de hoi dap ve camera, model library, deploy status, FPS, logs, events va result captures. Agent duoc thiet ke read-only: no co the doc trang thai va de xuat buoc thao tac, nhung khong tu deploy/stop/delete. Trong tab nay co **Agent Settings** de chon provider, model, API key/base URL va cac tham so LLM nhu temperature, max tokens, top P.

Memory cua agent duoc luu persistent trong:

```text
deepstream-lpr-app/runtime/agent-memory.json
```

Memory co 2 lop:

- Chat history: ngu canh hoi dap gan day trong tab Agent. Nut **Clear chat** chi xoa lop nay.
- Long-term notes: ghi chu/preference van hanh do user bam **Save note** de agent ghi nho lau dai, vi du "camera lobby hay dung model X" hoac "khi hoi thong ke thi uu tien label person". Nut **Clear notes** moi xoa lop nay.
- Learned memories: agent co the de xuat memory moi bang tool `remember_note`, nhung memory nay o trang thai pending cho den khi user bam **Approve** trong Memory inspector. Day la policy mac dinh de tranh agent tu ghi nho sai.

Memory architecture hien tai dung LangGraph/LangChain cho agent runtime va local JSON store cho memory. Ly do: Jetson can offline-first, de backup/debug, khong can them vector database cho giai doan dau. Neu sau nay can semantic recall nhieu hon, co the thay storage layer bang SQLite/vector store ma van giu UI approval/inspector nay.

Agent settings duoc luu rieng trong:

```text
deepstream-lpr-app/runtime/agent-settings.json
```

Agent skills duoc load tu:

```text
deepstream-lpr-app/agent-skills/*/SKILL.md
```

Hien co cac skill mac dinh cho time core, event analytics, camera health va model build debug. Agent se load skill theo trigger cua cau hoi; rieng cac cau hoi co ngay/thoi gian/so luong se duoc ep dung tool `get_current_time`, `resolve_date_expression` va `count_runtime_events` de tranh doan sai tu chat history.

Mac dinh neu chua set API key, tab Agent van hoat dong o che do local summary de khong lam crash Jetson offline. Co the cau hinh truc tiep tren UI, hoac set truoc trong `.env.product`:

```bash
AGENT_ENABLED=1
AGENT_PROVIDER=openai
AGENT_MODEL=gpt-4.1-mini
AGENT_TEMPERATURE=
AGENT_MAX_TOKENS=
AGENT_TOP_P=
AGENT_REASONING_EFFORT=
AGENT_TIME_ZONE=Asia/Bangkok
AGENT_SKILLS_DIR=agent-skills
OPENAI_API_KEY=...
```

Neu cac tham so LLM de trong, provider se dung default cua chinh provider/model. UI se chi hien cac tham so phu hop voi model dang chon, vi reasoning model va chat model khong dung chung mot bo option.

Sau do restart product:

```bash
deepstream-lpr-app/update-product.sh
```

Neu user hien tai chua co quyen Docker, script se dung `sudo docker compose`.

Update tren Jetson da clone repo:

```bash
chmod +x deepstream-lpr-app/update-product.sh
deepstream-lpr-app/update-product.sh
```

Lenh update product se tu `git pull`, rebuild control Docker image va restart container. Dung lenh nay thay cho `npm install` hay `pm2 restart` tren host Jetson:

```bash
cd ~/camera-monitor-dashboard
bash deepstream-lpr-app/update-product.sh
```

Chi kiem tra moi truong, khong start service:

```bash
bash deepstream-lpr-app/scripts/jetson-preflight.sh
```

Neu can override profile/image, sua `deepstream-lpr-app/.env.product` sau khi file duoc tao.

Xem them checklist product deploy trong `deepstream-lpr-app/PRODUCT_DEPLOYMENT.md`.

## Chay control UI kieu dev

Tu root repo:

```bash
npm install
npm run lpr:control
```

Chay nen bang PM2 local cua project:

```bash
npm run lpr:pm2:start
npm run lpr:pm2:logs
```

Neu da start truoc do va chi muon update/restart:

```bash
npm run lpr:pm2:restart
```

Mo:

```text
http://<ip-jetson>:5190
```

Neu tren Jetson go `pm2` bi `command not found`, van dung cac lenh `npm run lpr:pm2:*` o tren. Project da cai PM2 local trong `node_modules`, khong bat buoc cai PM2 global.

## Camera Monitor trong Jetson Console

Sidebar **Camera Monitor** gom chuc nang monitor RTSP vao Jetson app:

- quan ly danh sach camera monitor rieng trong `data/cameras.json`.
- ping camera theo interval, ghi outage trong `data/state.json`.
- start/stop HLS stream, capture frame vao `data/captures/`.
- ve rectangle, circle, polygon tren frame capture.
- cau hinh Telegram alert trong UI; settings luu vao `data/settings.json`.

Control server mount feature nay tai:

```text
http://<ip-jetson>:5190/camera-monitor/
```

Danh sach camera deploy DeepStream o **Cameras & ROI** van la config runtime rieng. Camera monitor dung de quan sat/capture/alert; camera deploy dung de tao DeepStream pipeline va ROI.

## Multi-camera config

UI co vung **Cameras & ROI** de them nhieu camera. Moi camera gom:

- `Camera ID`
- `Camera name`
- `RTSP URL`
- `Enabled`
- `ROI polygon JSON`
- `Front vehicle class IDs`
- `Cooldown moi xe`

Khi deploy, app tao mot `uridecodebin` cho tung camera enabled, link vao `nvstreammux` theo `sink_0`, `sink_1`, ... va set `batch-size` theo so camera. Event output co them:

- `sourceId`
- `cameraId`
- `cameraName`

Config cu dang single `rtspUrl/roi` van duoc tu dong map ve camera dau tien de tranh mat tuong thich.

## ROI polygon tool

Dashboard co vung **ROI Polygon Tool** de upload mot anh tham chieu va click tren anh de ve polygon. Tool se tra ve toa do theo pixel goc cua anh:

```json
[[100, 100], [900, 100], [900, 700], [100, 700]]
```

Chon camera trong `Target camera`, upload anh, click tung diem polygon, roi bam `Apply to camera`. Polygon se duoc dien vao `ROI polygon JSON` cua camera do. Sau do bam `Save config` de luu config.

Tool cung tu dong doc thu muc capture cua monitor app:

```text
data/captures/
```

Bam `Refresh captures`, chon anh trong `Monitor capture`, roi ve ROI truc tiep tren anh da capture.

## Processor modes

Dashboard tach model flow va business logic thanh 2 lop:

- `LPR`: bat buoc flow co du chuoi `PGIE GIE ID 1 -> SGIE GIE ID 2 -> TGIE GIE ID 3`. Runtime moi chay logic xe -> bien so -> ky tu, sort ky tu va tra `plateText`.
- `Generic Detection`: chay cac GIE stage user config. Runtime tra detection/capture theo label, class id, ROI va cooldown; khong ap logic bien so rieng.

Moi Deploy App va Test Flow deu co processor rieng. Neu chon `LPR` nhung flow chua du 3 stage san sang, buoc validate se fail truoc khi start DeepStream container.

## YOLO model builder

Neu model cua ban den tu YOLO family, control UI co **Model Builder Factory**. User nhap model name/description, upload source `.pt` hoac `.onnx`, build artifact, roi chon artifact do cho PGIE/SGIE/TGIE trong test hoac deploy flow. Cung factory nay co the build model xe, bien so, nguoi, vat the khac.

Factory co `Model profile`, `imgsz`, `opset`, export task, YOLO version, TensorRT/parser toggles, nut upload, nut build va log/checkpoint rieng theo model source. Profile duoc luu cung source model va artifact build de runtime config biet parser/network type nao can dung.

Pipeline hien tai:

- `YOLO Detection` -> export/parser theo `marcoslucianops/DeepStream-Yolo`.
- `YOLO Face` -> export/parser theo `marcoslucianops/DeepStream-Yolo-Face`.
- `YOLO Segmentation` -> export/parser theo `marcoslucianops/DeepStream-Yolo-Seg`.
- `YOLO Pose` -> export/parser theo `marcoslucianops/DeepStream-Yolo-Pose`.
- `YOLO Classification` -> export `.pt` bang `ultralytics`, build classifier engine, khong build YOLO detection parser.
- `Custom ONNX` -> chi nhan `.onnx`; user upload `labels.txt` neu can label tren UI/runtime.
- `.pt` profile co export repo rieng -> export ONNX bang export script cua profile do.
- `.pt` profile khong co export repo rieng -> export ONNX bang `ultralytics`.
- `.onnx` -> copy vao thu muc build.
- ONNX -> TensorRT `.engine` bang `trtexec`.
  - `Auto` va `Runtime-matched trtexec` chay `trtexec` trong image DeepStream runtime da detect theo Jetson profile. Day la mode mac dinh.
  - `Builder trtexec - advanced` chi dung `trtexec` trong model-builder image khi TensorRT major/minor trung voi profile runtime; neu lech version UI se fail som.
  - `DeepStream nvinfer` van de lai cho DeepStream tu build engine neu can debug mot model/parser dac thu.
- Profile co parser repo -> clone profile repo, compile parser `.so` neu bat `Build DeepStream-Yolo parser`.
- Tu dong cap nhat `runtime/config.json` va generated DeepStream config.

Lan build model dau tien co the lau vi dashboard se build Docker image:

```text
deepstream-lpr-model-builder:local
```

Base image mac dinh:

```text
ultralytics/ultralytics:latest-jetson-jetpack6
```

Base image model-builder can co san `torch`, `ultralytics`, va `cv2`. Co the doi trong `deepstream-lpr-app/.env.product` bang `MODEL_BUILDER_BASE_IMAGE`. TensorRT cua image nay khong duoc coi la runtime target neu dung mode mac dinh.

Thu muc build se nam trong:

```text
deepstream-lpr-app/models/<model_group>/build/
```

Log build co the xem trong UI bang nut `View build log`.

## Checkpoints

Khi bam `Build model` hoac `Deploy / Update`, UI hien danh sach checkpoint de biet dang fail o dau.

Build model checkpoints:

- Validate source model
- Prepare build workspace
- Prepare model-builder container
- Sync DeepStream-Yolo repo
- Export ONNX
- Build TensorRT engine
- Build DeepStream parser
- Write runtime config

Deploy checkpoints:

- Validate deploy config
- Generate DeepStream runtime files
- Start DeepStream container
- Verify container is running
- Save deploy state

Moi checkpoint co status `pending`, `running`, `success`, `failed`, hoac `skipped`. Neu fail, response API van tra ve `checkpoints` va UI se danh dau buoc fail.

## Test flows

UI co them 2 luong test rieng de kiem tra model truoc khi deploy RTSP:

- **Test by Image**: upload anh `.jpg`, `.jpeg`, `.png`, `.bmp`, hoac `.webp`, sau do bam `Run image test`.
- **Test by Video**: upload video `.mp4`, `.mov`, `.mkv`, `.avi`, hoac `.m4v`, sau do bam `Run video test`.

File test duoc luu trong:

```text
deepstream-lpr-app/runtime/test-media/
```

Khi chay test, control server se generate runtime config hien tai, chay DeepStream container bang `docker run --rm`, truyen input file qua `--input-uri file:///workspace/...`, roi load events moi nhat tu `runtime/events.jsonl`. Luong test nay khong restart service RTSP dang deploy.

## Yeu cau tren Jetson

Product Docker can:

- JetPack 6.x da flash dung BSP/L4T cho Jetson.
- Docker va Docker Compose plugin.
- NVIDIA Container Runtime tren Jetson (`nvidia-container`/`nvidia-container-toolkit`).
- Internet lan dau de pull/build image.
- NGC access neu image DeepStream yeu cau login:

```bash
docker login nvcr.io
```

Khong cai `torch`, `onnx`, `ultralytics` truc tiep tren host Jetson. Cac package nay nam trong model-builder image.

Khong cai `pyds` truc tiep tren host Jetson. Runtime image mac dinh duoc build tu:

Khong can cai `node`, `npm`, hay `pm2` tren host Jetson cho product Docker. Control UI chay trong container `deepstream-lpr-control`; cac dependency Node/LangChain/Agent se duoc cai bang `npm ci` trong Docker image khi chay `install.sh` hoac `update-product.sh`.

```text
nvcr.io/nvidia/deepstream:7.0-triton-multiarch
```

va cai wheel:

```text
https://github.com/NVIDIA-AI-IOT/deepstream_python_apps/releases/download/v1.1.11/pyds-1.1.11-py3-none-linux_aarch64.whl
```

Co the doi trong `deepstream-lpr-app/.env.product` bang `DEEPSTREAM_BASE_IMAGE` hoac `PYDS_WHEEL_URL` neu JetPack/DeepStream khac.

Preflight se tu set cac bien quan trong:

```text
DEEPSTREAM_PROFILE
JETPACK_VERSION
L4T_VERSION
CUDA_VER
TENSORRT_VERSION
DEEPSTREAM_VERSION
DEEPSTREAM_BASE_IMAGE
PYDS_WHEEL_URL
MODEL_BUILDER_BASE_IMAGE
```

Khong nen sua cac bien version nay neu khong doi ca JetPack/DeepStream image tuong ung.

Mode mac dinh khong dung `trtexec` cua model-builder. App export ONNX trong model-builder, sau do goi `trtexec` trong `DEEPSTREAM_IMAGE` de engine khop TensorRT cua DeepStream runtime da chon. Viec nay van la build bang `trtexec`, khong phai cho `nvinfer` tu optimize engine.

Neu co ly do phai chon `Builder trtexec - advanced`, model-builder image can co `trtexec` va TensorRT major/minor phai trung `TENSORRT_VERSION` ma preflight detect. Mac dinh app goi:

```text
/usr/src/tensorrt/bin/trtexec
```

Neu `trtexec` trong builder image o path khac:

```bash
export TRTEXEC_PATH_IN_BUILDER=/duong/dan/toi/trtexec
```

Nen build TensorRT engine truc tiep tren chinh Jetson se deploy, vi engine phu thuoc CUDA, TensorRT, GPU va precision.

De auto build parser `.so`, may Jetson can chay duoc Docker DeepStream image da chon trong UI. Detection profile se clone/pin repo:

```text
https://github.com/marcoslucianops/DeepStream-Yolo
ref: 2894babce8e75c49115dbe0c7b516289ed853565
```

Repo se nam trong runtime ignored folder:

```text
deepstream-lpr-app/runtime/third_party/DeepStream-Yolo
```

Va compile thanh:

```text
deepstream-lpr-app/models/<model_group>/build/libnvdsinfer_custom_impl_Yolo.so
```

Mac dinh detection profile dung export script cua DeepStream-Yolo cho YOLOv8, YOLOv9, YOLOv10, YOLO11, YOLOv12, YOLOv13. Face/Seg/Pose chi ho tro nhung YOLO version co export script trong repo profile tuong ung; neu chon version khong duoc ho tro buoc `Export ONNX` se fail ro rang. Neu muon override repo/ref:

```bash
export DEEPSTREAM_YOLO_REPO=https://github.com/marcoslucianops/DeepStream-Yolo.git
export DEEPSTREAM_YOLO_REF=2894babce8e75c49115dbe0c7b516289ed853565
export DEEPSTREAM_YOLO_FACE_REPO=https://github.com/marcoslucianops/DeepStream-Yolo-Face.git
export DEEPSTREAM_YOLO_FACE_REF=master
export DEEPSTREAM_YOLO_SEG_REPO=https://github.com/marcoslucianops/DeepStream-Yolo-Seg.git
export DEEPSTREAM_YOLO_SEG_REF=master
export DEEPSTREAM_YOLO_POSE_REPO=https://github.com/marcoslucianops/DeepStream-Yolo-Pose.git
export DEEPSTREAM_YOLO_POSE_REF=master
npm run lpr:control
```

## Model groups

Cac nhom model:

- `vehicle_front`: model phat hien dau xe. Nen train class `0` la `vehicle_front` hoac `car_front`.
- `plate_detector`: model phat hien bien so tren object dau xe.
- `plate_ocr`: model OCR bien so/classifier tra label.

Voi YOLOv8+ detection model, UI co the tu build parser `.so` theo chuan DeepStream-Yolo va gan vao config:

```text
custom-lib-path=/workspace/deepstream-lpr-app/models/<model_group>/build/libnvdsinfer_custom_impl_Yolo.so
parse-bbox-func-name=NvDsInferParseYolo
engine-create-func-name=NvDsInferYoloCudaEngineGet
```

Neu model cua ban export ra format dac biet hoac khong nam trong nhom YOLOv8+, YOLOv9, YOLOv10, YOLO11, YOLOv12, YOLOv13, can bo sung parser rieng vao runtime config/model config truoc khi deploy.

DeepStream-Yolo dung MIT license. Neu vendor source repo nay vao san pham, can giu license notice cua ho.

Tham khao NVIDIA docs: https://docs.nvidia.com/metropolis/deepstream/8.0/text/DS_using_custom_model.html

## Front-only logic

DeepStream khong tu biet dau xe/duoi xe neu ban dung generic `car` detector. App loc theo `frontVehicleClassIds`, mac dinh `[0]`. Vi vay model vehicle nen detect rieng class dau xe.

## ROI

ROI nhap dang JSON:

```json
[[100, 100], [900, 100], [900, 700], [100, 700]]
```

App lay tam bbox cua object dau xe. Neu tam bbox nam trong polygon thi moi xu ly/capture.

## Tracking cooldown

Pipeline co `nvtracker`. Runtime luu `object_id` da capture va chi capture lai sau `captureCooldownSec`.

## Deploy

Bam `Deploy / Update` trong UI. Control server se:

1. Luu `runtime/config.json`.
2. Generate `runtime/generated/config_infer_*.txt`.
3. Generate `runtime/docker-compose.generated.yml`.
4. Chay Docker Compose de restart DeepStream container.

Default image:

```text
camera-monitor-deepstream-runtime:local
```

Doi image trong UI neu JetPack/DeepStream cua Jetson khac.

## Luu y

Runtime Python dung `gi`, `Gst`, `pyds`, `numpy`, `cv2`. Image `camera-monitor-deepstream-runtime:local` da dong goi `pyds`; neu doi sang image khac thi image do cung phai co DeepStream Python bindings. Day la scaffold san sang tich hop model that, nhung OCR output parsing va YOLO parser van phu thuoc model thuc te.
