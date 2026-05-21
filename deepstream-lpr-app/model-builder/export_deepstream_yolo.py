#!/usr/bin/env python3
import argparse
import inspect
import os
import runpy
import shutil
import sys
from pathlib import Path


EXPORT_SCRIPTS = {
    "yolov8": "export_yoloV8.py",
    "yolov9": "export_yoloV9.py",
    "yolov10": "export_yoloV10.py",
    "yolo11": "export_yolo11.py",
    "yolov11": "export_yolo11.py",
    "yolov12": "export_yolov12.py",
    "yolov13": "export_yoloV13.py",
}

def run_export_script(script, argv, cwd):
    old_argv = sys.argv[:]
    old_cwd = Path.cwd()
    torch_export = None
    original_export = None
    try:
        import torch

        torch_export = torch.onnx
        original_export = torch_export.export
        if "dynamo" in inspect.signature(original_export).parameters:
            def legacy_export(*args, **kwargs):
                kwargs.setdefault("dynamo", False)
                return original_export(*args, **kwargs)

            torch_export.export = legacy_export
            print("Using TorchScript ONNX exporter (dynamo=False) for DeepStream-Yolo compatibility")
    except Exception as exc:
        print(f"Could not force legacy Torch ONNX exporter: {exc}")

    try:
        os.chdir(cwd)
        sys.argv = [str(script), *argv]
        runpy.run_path(str(script), run_name="__main__")
    finally:
        if torch_export is not None and original_export is not None:
            torch_export.export = original_export
        sys.argv = old_argv
        os.chdir(old_cwd)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--repo-dir", required=True)
    parser.add_argument("--version", default="yolov8")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--opset", type=int, default=17)
    parser.add_argument("--simplify", action="store_true")
    parser.add_argument("--dynamic", action="store_true")
    parser.add_argument("--batch", type=int, default=1)
    parser.add_argument("--labels-output", default="")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    output = Path(args.output).resolve()
    repo_dir = Path(args.repo_dir).resolve()
    version = args.version.lower()

    if not source.exists():
        raise SystemExit(f"Source model not found: {source}")

    if source.suffix.lower() == ".onnx":
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, output)
        print(f"Copied ONNX: {output}")
        return

    if source.suffix.lower() != ".pt":
        raise SystemExit("DeepStream-Yolo export supports .pt and .onnx sources")

    script_name = EXPORT_SCRIPTS.get(version)
    if not script_name:
        raise SystemExit(f"Unsupported DeepStream-Yolo version '{args.version}'")

    script = repo_dir / "utils" / script_name
    if not script.exists():
        raise SystemExit(f"DeepStream-Yolo export script not found: {script}")

    output.parent.mkdir(parents=True, exist_ok=True)
    work_source = output.parent / f"deepstream_yolo_export{source.suffix.lower()}"
    shutil.copy2(source, work_source)

    script_argv = [
        "-w",
        str(work_source),
        "-s",
        str(args.imgsz),
        "--opset",
        str(args.opset),
        "--batch",
        str(max(1, args.batch)),
    ]
    if args.simplify:
        script_argv.append("--simplify")
    if args.dynamic:
        script_argv.append("--dynamic")

    run_export_script(script, script_argv, cwd=output.parent)

    exported = work_source.with_suffix(".onnx")
    if not exported.exists():
        raise SystemExit(f"Expected exported ONNX not found: {exported}")

    shutil.copy2(exported, output)
    print(f"Exported DeepStream-Yolo ONNX: {output}")

    labels_file = output.parent / "labels.txt"
    if args.labels_output and labels_file.exists():
        labels_output = Path(args.labels_output).resolve()
        labels_output.parent.mkdir(parents=True, exist_ok=True)
        if labels_file != labels_output:
            shutil.copy2(labels_file, labels_output)
        print(f"Exported labels: {labels_output}")


if __name__ == "__main__":
    main()
