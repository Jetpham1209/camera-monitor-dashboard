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

- `.pt` -> export ONNX bang `ultralytics`.
- `.onnx` -> copy vao thu muc build.
- ONNX -> TensorRT `.engine` bang `trtexec` neu bat `Build TensorRT engine`.
- Tu dong cap nhat `runtime/config.json` va generated DeepStream config.

Thu muc build se nam trong:

```text
deepstream-lpr-app/models/<model_group>/build/
```

Log build co the xem trong UI bang nut `View build log`.

## Yeu cau tren Jetson

De build tu `.pt`:

```bash
python3 -m pip install ultralytics onnx onnxsim
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

Voi YOLO detection model trong DeepStream, ban van can custom parser `.so` phu hop, vi app nay khong tu bien Python YOLO model thanh DeepStream parser. Generated config dang dung:

```text
parse-bbox-func-name=NvDsInferParseYolo
engine-create-func-name=NvDsInferYoloCudaEngineGet
```

Hay upload file parser vao slot `vehicle_front_custom_lib` va `plate_detector_custom_lib` neu detection model cua ban can parser do.

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
