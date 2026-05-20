#!/usr/bin/env python3
import argparse
import shutil
from pathlib import Path


def write_labels(model, labels_output):
    if not labels_output:
        return
    names = getattr(model, "names", None) or getattr(getattr(model, "model", None), "names", None)
    if not names:
        return
    if isinstance(names, dict):
        labels = [str(names[key]) for key in sorted(names, key=lambda item: int(item))]
    else:
        labels = [str(item) for item in names]
    output = Path(labels_output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(labels) + "\n", encoding="utf-8")
    print(f"Exported labels: {output}")


def export_pt_to_onnx(source, output, imgsz, opset, simplify, dynamic, task, labels_output, batch):
    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise SystemExit(
            "Missing Python package 'ultralytics'. Install it on Jetson with: "
            "python3 -m pip install ultralytics. "
            f"Original error: {exc}"
        )

    model = YOLO(str(source), task=task if task != "auto" else None)
    write_labels(model, labels_output)
    exported = model.export(
        format="onnx",
        imgsz=imgsz,
        opset=opset,
        simplify=simplify,
        dynamic=dynamic,
        batch=batch,
        nms=False,
    )
    exported_path = Path(exported)
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(exported_path, output)
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--opset", type=int, default=17)
    parser.add_argument("--task", default="detect", choices=["auto", "detect", "segment", "classify", "pose", "obb"])
    parser.add_argument("--simplify", action="store_true")
    parser.add_argument("--dynamic", action="store_true")
    parser.add_argument("--batch", type=int, default=1)
    parser.add_argument("--labels-output", default="")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    output = Path(args.output).resolve()
    if not source.exists():
        raise SystemExit(f"Source model not found: {source}")

    if source.suffix.lower() == ".onnx":
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, output)
        print(f"Copied ONNX: {output}")
        return

    if source.suffix.lower() != ".pt":
        raise SystemExit("Supported source formats are .pt and .onnx")

    export_pt_to_onnx(source, output, args.imgsz, args.opset, args.simplify, args.dynamic, args.task, args.labels_output, max(1, args.batch))
    print(f"Exported ONNX: {output}")


if __name__ == "__main__":
    main()
