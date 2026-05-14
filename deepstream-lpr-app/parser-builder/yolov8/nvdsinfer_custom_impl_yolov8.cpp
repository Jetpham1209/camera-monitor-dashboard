#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <vector>

#include "nvdsinfer_custom_impl.h"

static float clampFloat(float value, float low, float high) {
  return std::max(low, std::min(value, high));
}

static float normalizeScore(float value) {
  if (value >= 0.0F && value <= 1.0F) {
    return value;
  }
  return 1.0F / (1.0F + std::exp(-value));
}

static int64_t dimsVolume(const NvDsInferDims& dims) {
  int64_t volume = 1;
  for (int i = 0; i < dims.numDims; ++i) {
    volume *= dims.d[i];
  }
  return volume;
}

extern "C" bool NvDsInferParseYoloV8(
    std::vector<NvDsInferLayerInfo> const& outputLayersInfo,
    NvDsInferNetworkInfo const& networkInfo,
    NvDsInferParseDetectionParams const& detectionParams,
    std::vector<NvDsInferObjectDetectionInfo>& objectList) {
  if (outputLayersInfo.empty()) {
    std::cerr << "NvDsInferParseYoloV8: no output layers\n";
    return false;
  }

  const NvDsInferLayerInfo& layer = outputLayersInfo[0];
  const NvDsInferDims& dims = layer.inferDims;
  const int numClasses = static_cast<int>(detectionParams.numClassesConfigured);
  const int attributes = numClasses + 4;
  const int64_t total = dimsVolume(dims);

  if (!layer.buffer || numClasses <= 0 || attributes <= 4 || total <= 0 || total % attributes != 0) {
    std::cerr << "NvDsInferParseYoloV8: invalid output shape or class count\n";
    return false;
  }

  std::vector<int> shape;
  for (int i = 0; i < dims.numDims; ++i) {
    if (dims.d[i] != 1 || dims.numDims <= 2) {
      shape.push_back(dims.d[i]);
    }
  }
  if (shape.size() < 2) {
    std::cerr << "NvDsInferParseYoloV8: unsupported output rank\n";
    return false;
  }

  const int first = shape.front();
  const int last = shape.back();
  const int anchors = static_cast<int>(total / attributes);
  const bool channelFirst = first == attributes;
  const bool rowMajor = last == attributes;
  if (!channelFirst && !rowMajor) {
    std::cerr << "NvDsInferParseYoloV8: expected attributes dimension " << attributes << "\n";
    return false;
  }

  const float* data = static_cast<const float*>(layer.buffer);
  auto valueAt = [&](int anchor, int channel) {
    if (channelFirst) {
      return data[channel * anchors + anchor];
    }
    return data[anchor * attributes + channel];
  };

  const float netWidth = static_cast<float>(networkInfo.width);
  const float netHeight = static_cast<float>(networkInfo.height);
  for (int anchor = 0; anchor < anchors; ++anchor) {
    int bestClass = -1;
    float bestScore = 0.0F;
    for (int classId = 0; classId < numClasses; ++classId) {
      const float score = normalizeScore(valueAt(anchor, 4 + classId));
      if (score > bestScore) {
        bestScore = score;
        bestClass = classId;
      }
    }

    if (bestClass < 0 || bestScore < detectionParams.perClassPreclusterThreshold[bestClass]) {
      continue;
    }

    const float cx = valueAt(anchor, 0);
    const float cy = valueAt(anchor, 1);
    const float width = std::max(0.0F, valueAt(anchor, 2));
    const float height = std::max(0.0F, valueAt(anchor, 3));
    const float left = clampFloat(cx - width * 0.5F, 0.0F, netWidth - 1.0F);
    const float top = clampFloat(cy - height * 0.5F, 0.0F, netHeight - 1.0F);
    const float right = clampFloat(cx + width * 0.5F, 0.0F, netWidth - 1.0F);
    const float bottom = clampFloat(cy + height * 0.5F, 0.0F, netHeight - 1.0F);

    if (right <= left || bottom <= top) {
      continue;
    }

    NvDsInferObjectDetectionInfo object;
    object.classId = bestClass;
    object.detectionConfidence = bestScore;
    object.left = left;
    object.top = top;
    object.width = right - left;
    object.height = bottom - top;
    objectList.push_back(object);
  }

  return true;
}

CHECK_CUSTOM_PARSE_FUNC_PROTOTYPE(NvDsInferParseYoloV8);
