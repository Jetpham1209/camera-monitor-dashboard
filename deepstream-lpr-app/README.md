# DeepStream LPR App

Scaffold deploy trên Jetson cho bài toán nhận diện đầu xe và đọc biển số trong ROI.

## Mục tiêu

- Input RTSP.
- Phát hiện **đầu xe** trong vùng polygon xác định.
- Detect/OCR biển số.
- Tracking object id để tránh capture quá nhiều lần cho cùng một xe.
- Control UI để nhập RTSP, ROI, upload YOLO/ONNX/TensorRT/custom parser, rồi bấm Deploy.

## Chạy control UI

Từ root repo:

```bash
npm install
npm run lpr:control
```

Mở:

```text
http://<ip-jetson>:5190
```

## Model placeholders

Các slot upload:

- `vehicle_front`: model phát hiện đầu xe. Nên train class `0` là `vehicle_front` hoặc `car_front`.
- `plate_detector`: model phát hiện biển số trên object đầu xe.
- `plate_ocr`: model OCR biển số/classifier trả label.
- `custom_parser`: file `.so` cho YOLO parser nếu cần.
- `labels`: file labels.

DeepStream custom model thường cần `onnx-file`, `model-engine-file`, `custom-lib-path`, `parse-bbox-func-name`, `network-type`, `gie-unique-id`. Tham khảo NVIDIA docs: https://docs.nvidia.com/metropolis/deepstream/8.0/text/DS_using_custom_model.html

## Front-only logic

DeepStream không tự biết đầu xe/đuôi xe nếu bạn dùng generic `car` detector. App lọc theo `frontVehicleClassIds`, mặc định `[0]`. Vì vậy model vehicle nên detect riêng class đầu xe.

## ROI

ROI nhập dạng JSON:

```json
[[100, 100], [900, 100], [900, 700], [100, 700]]
```

App lấy tâm bbox của object đầu xe, nếu nằm trong polygon thì mới xử lý/capture.

## Tracking cooldown

Pipeline có `nvtracker`. Runtime lưu `object_id` đã capture và chỉ capture lại sau `captureCooldownSec`.

## Deploy

Bấm `Deploy` trong UI. Control server sẽ:

1. Lưu `runtime/config.json`.
2. Generate `runtime/generated/config_infer_*.txt`.
3. Generate `runtime/docker-compose.generated.yml`.
4. Chạy Docker Compose để restart DeepStream container.

Default image:

```text
nvcr.io/nvidia/deepstream-l4t:7.1-samples
```

Đổi image trong UI nếu JetPack/DeepStream của Jetson khác.

## Lưu ý

Runtime Python dùng `gi`, `Gst`, `pyds`, `numpy`, `cv2`. DeepStream image bạn chọn phải có Python bindings hoặc cần build thêm. Đây là scaffold sẵn sàng tích hợp model thật, nhưng OCR output parsing và YOLO parser phụ thuộc model thực tế.
