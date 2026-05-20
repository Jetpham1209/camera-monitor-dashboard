# DeepStream LPR App

Scaffold deploy tren Jetson cho bai toan nhan dien dau xe va doc bien so trong ROI.

## Muc tieu

- Input nhieu RTSP camera.
- Moi camera co config rieng: ten camera, RTSP URL, ROI polygon, class id dau xe, cooldown capture.
- Phat hien dau xe trong vung polygon xac dinh cua tung camera.
- Detect/OCR bien so.
- Tracking object id de tranh capture qua nhieu lan cho cung mot xe.
- Control UI de nhap RTSP, ve ROI polygon tren anh mau, upload/build model YOLO, build ONNX/TensorRT engine, roi bam Deploy.

## Chay dang product Docker

Day la cach khuyen nghi tren Jetson de isolate moi truong. Control UI chay trong container, runtime DeepStream chay trong image `camera-monitor-deepstream-runtime:local` co san Python binding `pyds`, con build model YOLO/ONNX/TensorRT chay trong image `deepstream-lpr-model-builder:local`. Host Jetson khong can cai `torch`, `onnx`, `ultralytics`, hay `pyds` bang pip.

### Compatibility target

Product deploy path hien tai target JetPack 6.x tren Jetson Orin. Script install se tu detect L4T va chon profile:

| Jetson L4T | JetPack | CUDA | TensorRT | DeepStream | pyds | Profile |
| --- | --- | --- | --- | --- | --- | --- |
| 36.4.x | 6.1 GA | 12.6 | 10.3 | 7.1 | 1.2.0 | `jp61-ds71` |
| 36.3.x | 6.0 GA | 12.2 | 8.6 | 7.0 | 1.1.11 | `jp60-ds70` |
| 36.2.x | 6.0 DP | 12.2 | 8.6 | 6.4 | 1.1.10 | `jp60dp-ds64` experimental |

JetPack 5.x hien khong duoc dong goi mac dinh cho product Docker path nay vi khac Ubuntu/Python/DeepStream stack. Neu preflight detect JetPack 5.x, script se dung som va yeu cau upgrade len JetPack 6.x hoac tao image set rieng cho JetPack 5.

Ly do phai strict version: TensorRT engine phu thuoc GPU + TensorRT + CUDA + DeepStream image. Clone repo sang Jetson khac thi nen build lai engine tren chinh Jetson do, khong copy engine tu may khac.

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

Neu user hien tai chua co quyen Docker, script se dung `sudo docker compose`.

Update tren Jetson da clone repo:

```bash
chmod +x deepstream-lpr-app/update-product.sh
deepstream-lpr-app/update-product.sh
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

## YOLO model builder

Neu model cua ban den tu YOLO family, control UI co them vung **LPR Model Builders** voi 3 card rieng:

- `vehicle_front`: upload/build model phat hien dau xe.
- `plate_detector`: upload/build model phat hien bien so.
- `plate_ocr`: upload/build model doc bien so/OCR.

Moi card co source model `.pt/.onnx`, `imgsz`, `opset`, `task`, YOLO version, class count, TensorRT/parser toggles, nut upload, nut build, va nut xem log rieng. Vi vay build loi model nao thi checkpoint/log cua model do se hien rieng, khong bi lan voi model khac.

Pipeline hien tai:

- `.pt` detection model -> export ONNX bang export script cua `marcoslucianops/DeepStream-Yolo`.
- `.pt` non-detection model -> export ONNX bang `ultralytics`.
- `.onnx` -> copy vao thu muc build.
- ONNX -> TensorRT `.engine` bang `trtexec` trong model-builder container neu bat `Build TensorRT engine`.
- YOLOv8+ detect -> clone/pin `DeepStream-Yolo`, compile `libnvdsinfer_custom_impl_Yolo.so` neu bat `Build DeepStream-Yolo parser`.
- Tu dong cap nhat `runtime/config.json` va generated DeepStream config.

Lan build model dau tien co the lau vi dashboard se build Docker image:

```text
deepstream-lpr-model-builder:local
```

Base image mac dinh:

```text
ultralytics/ultralytics:latest-jetson-jetpack6
```

Base image model-builder can co san `torch`, `ultralytics`, `cv2`, va `trtexec`. Co the doi trong `deepstream-lpr-app/.env.product` bang `MODEL_BUILDER_BASE_IMAGE`.

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

De build TensorRT engine, model-builder image can co `trtexec`. Mac dinh app goi:

```text
/usr/src/tensorrt/bin/trtexec
```

Neu `trtexec` trong builder image o path khac:

```bash
export TRTEXEC_PATH_IN_BUILDER=/duong/dan/toi/trtexec
```

Nen build TensorRT engine truc tiep tren chinh Jetson se deploy, vi engine phu thuoc CUDA, TensorRT, GPU va precision.

De auto build parser `.so`, may Jetson can chay duoc Docker DeepStream image da chon trong UI. Builder se clone/pin repo:

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

Mac dinh builder dung export script cua DeepStream-Yolo cho YOLOv8, YOLOv9, YOLOv10, YOLO11, YOLOv12, YOLOv13. Neu muon override repo/ref:

```bash
export DEEPSTREAM_YOLO_REPO=https://github.com/marcoslucianops/DeepStream-Yolo.git
export DEEPSTREAM_YOLO_REF=2894babce8e75c49115dbe0c7b516289ed853565
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
