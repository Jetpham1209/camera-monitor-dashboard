# Product Deployment Notes

This app is designed so a fresh Jetson clone can bootstrap itself with one command:

```bash
chmod +x deepstream-lpr-app/install.sh
deepstream-lpr-app/install.sh
```

## Deployment contract

The host Jetson should provide only the hardware/BSP layer:

- JetPack/L4T for the Jetson device.
- Docker and Docker Compose plugin.
- NVIDIA container runtime.
- Internet access for first image pulls/builds.

The app containers provide the application layer:

- Control dashboard: Node.js, ffmpeg, Docker CLI.
- DeepStream runtime: DeepStream image plus `pyds`.
- Model builder: YOLO/ONNX tooling.

Do not install `torch`, `ultralytics`, `onnx`, `pyds`, or Python DeepStream packages directly on the host for product deployment.

## Supported profiles

| Profile | L4T | JetPack | CUDA | TensorRT | DeepStream | Runtime image | pyds |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `jp61-ds71` | 36.4.x | 6.1 GA | 12.6 | 10.3 | 7.1 | `nvcr.io/nvidia/deepstream:7.1-triton-multiarch` | 1.2.0 |
| `jp60-ds70` | 36.3.x | 6.0 GA | 12.2 | 8.6 | 7.0 | `nvcr.io/nvidia/deepstream:7.0-triton-multiarch` | 1.1.11 |
| `jp60dp-ds64` | 36.2.x | 6.0 DP | 12.2 | 8.6 | 6.4 | `nvcr.io/nvidia/deepstream:6.4-triton-multiarch` | 1.1.10 |

JetPack 5.x is intentionally blocked by default. It needs a separate image set because Ubuntu, Python, DeepStream, and pyds versions differ from the JetPack 6 product path.

## Why the profile is strict

TensorRT engines are not portable build artifacts. They depend on:

- Jetson GPU architecture.
- TensorRT version.
- CUDA version.
- DeepStream/nvinfer version.
- Precision and parser configuration.

Upload model sources to the target Jetson and build the engine on that same Jetson.

## Preflight

Run:

```bash
bash deepstream-lpr-app/scripts/jetson-preflight.sh
```

The script detects `nvidia-l4t-core`, maps it to a supported profile, verifies Docker/Compose access, and warns if NVIDIA runtime is not visible to Docker.

It can generate a product env file:

```bash
bash deepstream-lpr-app/scripts/jetson-preflight.sh --write-env deepstream-lpr-app/.env.product
```

## Update

On a deployed Jetson:

```bash
deepstream-lpr-app/update-product.sh
```

This pulls the latest repo changes, reruns preflight, rebuilds changed images, and restarts the control dashboard. Runtime data, uploaded models, build outputs, ROI config, and events stay under `deepstream-lpr-app/runtime/` and `deepstream-lpr-app/models/`.
