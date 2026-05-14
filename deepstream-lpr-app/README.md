# DeepStream LPR App

Scaffold deploy tren Jetson cho bai toan nhan dien dau xe va doc bien so trong ROI.

## Muc tieu

- Input RTSP.
- Phat hien dau xe trong vung polygon xac dinh.
- Detect/OCR bien so.
- Tracking object id de tranh capture qua nhieu lan cho cung mot xe.
- Control UI de nhap RTSP, ROI, upload model YOLO, build ONNX/TensorRT engine, upload labels/custom parser, roi bam Deploy.

## Chay control UI

Tu root repo:

```bash
npm install
npm run lpr:control
```

Mo:

```text
http://<ip-jetson>:5190
```

## YOLO model builder

Neu model cua ban den tu YOLO family, control UI co them vung **YOLO Model Builder**:

1. Chon `Model group`: `vehicle_front`, `plate_detector`, hoac `plate_ocr`.
2. Upload source model `.pt` hoac `.onnx`.
3. Chon `imgsz`, `opset`, `task`.
4. Bam `Build model`.

Pipeline hien tai:

- `.pt` detection model -> export ONNX bang export script cua `marcoslucianops/DeepStream-Yolo`.
- `.pt` non-detection model -> export ONNX bang `ultralytics`.
- `.onnx` -> copy vao thu muc build.
- ONNX -> TensorRT `.engine` bang `trtexec` neu bat `Build TensorRT engine`.
- YOLOv8+ detect -> clone/pin `DeepStream-Yolo`, compile `libnvdsinfer_custom_impl_Yolo.so` neu bat `Build DeepStream-Yolo parser`.
- Tu dong cap nhat `runtime/config.json` va generated DeepStream config.

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

## Yeu cau tren Jetson

De build tu `.pt`:

```bash
python3 -m pip install ultralytics onnx onnxslim onnxsim
```

De build TensorRT engine, Jetson/DeepStream image can co `trtexec`. Thuong nam o:

```text
/usr/src/tensorrt/bin/trtexec
```

Neu `trtexec` o path khac:

```bash
export TRTEXEC_PATH=/duong/dan/toi/trtexec
npm run lpr:control
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

## Model placeholders

Cac nhom model:

- `vehicle_front`: model phat hien dau xe. Nen train class `0` la `vehicle_front` hoac `car_front`.
- `plate_detector`: model phat hien bien so tren object dau xe.
- `plate_ocr`: model OCR bien so/classifier tra label.

Cac slot upload thu cong van duoc giu lai:

- `*_onnx`
- `*_engine`
- `*_labels`
- `*_custom_lib`

Voi YOLOv8+ detection model, UI co the tu build parser `.so` theo chuan DeepStream-Yolo va gan vao config:

```text
custom-lib-path=/workspace/deepstream-lpr-app/models/<model_group>/build/libnvdsinfer_custom_impl_Yolo.so
parse-bbox-func-name=NvDsInferParseYolo
engine-create-func-name=NvDsInferYoloCudaEngineGet
```

Neu model cua ban export ra format dac biet hoac khong nam trong nhom YOLOv8+, YOLOv9, YOLOv10, YOLO11, YOLOv12, YOLOv13, hay upload parser rieng vao slot `vehicle_front_custom_lib` va `plate_detector_custom_lib`.

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
nvcr.io/nvidia/deepstream-l4t:7.1-samples
```

Doi image trong UI neu JetPack/DeepStream cua Jetson khac.

## Luu y

Runtime Python dung `gi`, `Gst`, `pyds`, `numpy`, `cv2`. DeepStream image ban chon phai co Python bindings hoac can build them. Day la scaffold san sang tich hop model that, nhung OCR output parsing va YOLO parser van phu thuoc model thuc te.
