import { useCallback, useEffect, useRef, useState } from 'react';

const FRAME_SIZE = 240;
const HASH_GRID_SIZE = 16;
const DIFF_HASH_WIDTH = 17;
const DIFF_HASH_HEIGHT = 16;
const HIST_BINS = 16;
const SAMPLE_COUNT = 7;
const SAMPLE_DELAY_MS = 180;

export const MIN_ACCEPTED_SCAN_QUALITY = 55;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const mean = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const standardDeviation = (values) => {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((total, value) => total + ((value - avg) ** 2), 0) / values.length;
  return Math.sqrt(variance);
};

const resizeNearest = (gray, width, height, targetWidth, targetHeight) => {
  const resized = new Float32Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor(((y + 0.5) * height) / targetHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor(((x + 0.5) * width) / targetWidth));
      resized[(y * targetWidth) + x] = gray[(sourceY * width) + sourceX];
    }
  }
  return resized;
};

const buildAverageHash = (gray, width, height) => {
  const reduced = resizeNearest(gray, width, height, HASH_GRID_SIZE, HASH_GRID_SIZE);
  const average = mean(Array.from(reduced));
  let hash = '';
  for (let index = 0; index < reduced.length; index += 1) {
    hash += reduced[index] >= average ? '1' : '0';
  }
  return hash;
};

const buildDifferenceHash = (gray, width, height) => {
  const reduced = resizeNearest(gray, width, height, DIFF_HASH_WIDTH, DIFF_HASH_HEIGHT);
  let hash = '';
  for (let y = 0; y < DIFF_HASH_HEIGHT; y += 1) {
    for (let x = 0; x < DIFF_HASH_WIDTH - 1; x += 1) {
      const left = reduced[(y * DIFF_HASH_WIDTH) + x];
      const right = reduced[(y * DIFF_HASH_WIDTH) + x + 1];
      hash += left > right ? '1' : '0';
    }
  }
  return hash;
};

const buildHistogram = (gray) => {
  const histogram = Array.from({ length: HIST_BINS }, () => 0);
  if (!gray.length) return histogram;

  for (let index = 0; index < gray.length; index += 1) {
    const bucket = Math.min(HIST_BINS - 1, Math.floor((gray[index] / 256) * HIST_BINS));
    histogram[bucket] += 1;
  }

  const total = gray.length;
  return histogram.map((count) => Number((count / total).toFixed(6)));
};

const buildGrayFrame = (imageData) => {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  let total = 0;

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const value = (data[offset] * 0.2126) + (data[offset + 1] * 0.7152) + (data[offset + 2] * 0.0722);
    gray[pixelIndex] = value;
    total += value;
  }

  return {
    gray,
    width,
    height,
    brightness: total / (width * height),
  };
};

const calculateContrast = (gray, brightness) => {
  if (!gray.length) return 0;
  let variance = 0;
  for (let index = 0; index < gray.length; index += 1) {
    variance += (gray[index] - brightness) ** 2;
  }
  return Math.sqrt(variance / gray.length);
};

const calculateSharpness = (gray, width, height) => {
  if (!gray.length || width < 2 || height < 2) return 0;

  let gradientSum = 0;
  let samples = 0;

  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = (y * width) + x;
      const gx = Math.abs(gray[index] - gray[index + 1]);
      const gy = Math.abs(gray[index] - gray[index + width]);
      gradientSum += gx + gy;
      samples += 2;
    }
  }

  return samples ? gradientSum / samples : 0;
};

const calculateQuality = ({ brightness, contrast, sharpness }) => {
  const brightnessScore = clamp(100 - (Math.abs(brightness - 125) * 1.2), 0, 100);
  const contrastScore = clamp((contrast / 50) * 100, 0, 100);
  const sharpnessScore = clamp((sharpness / 20) * 100, 0, 100);
  return Math.round((brightnessScore * 0.3) + (contrastScore * 0.35) + (sharpnessScore * 0.35));
};

const extractEyeFeatures = (videoElement) => {
  if (!videoElement?.videoWidth || !videoElement?.videoHeight) {
    throw new Error('Camera is not ready yet');
  }

  const canvas = document.createElement('canvas');
  canvas.width = FRAME_SIZE;
  canvas.height = FRAME_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Unable to analyze camera frame');
  }

  const sourceWidth = videoElement.videoWidth;
  const sourceHeight = videoElement.videoHeight;
  const sourceSize = Math.floor(Math.min(sourceWidth, sourceHeight) * 0.68);
  const sourceX = Math.floor((sourceWidth - sourceSize) / 2);
  const sourceY = Math.floor((sourceHeight - sourceSize) / 2);

  context.drawImage(
    videoElement,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
  );

  const roiSize = Math.floor(FRAME_SIZE * 0.72);
  const roiOffset = Math.floor((FRAME_SIZE - roiSize) / 2);
  const imageData = context.getImageData(roiOffset, roiOffset, roiSize, roiSize);
  const { gray, width, height, brightness } = buildGrayFrame(imageData);
  const contrast = calculateContrast(gray, brightness);
  const sharpness = calculateSharpness(gray, width, height);
  const quality = calculateQuality({ brightness, contrast, sharpness });

  return {
    hash: buildAverageHash(gray, width, height),
    diffHash: buildDifferenceHash(gray, width, height),
    hist: buildHistogram(gray),
    stats: {
      brightness: Number(brightness.toFixed(2)),
      contrast: Number(contrast.toFixed(2)),
      sharpness: Number(sharpness.toFixed(2)),
    },
    quality,
  };
};

const mergeBitHashes = (hashes) => {
  if (!hashes.length) return '';
  const hashLength = hashes[0].length;
  let merged = '';

  for (let bitIndex = 0; bitIndex < hashLength; bitIndex += 1) {
    let ones = 0;
    for (let hashIndex = 0; hashIndex < hashes.length; hashIndex += 1) {
      if (hashes[hashIndex][bitIndex] === '1') ones += 1;
    }
    merged += ones >= (hashes.length / 2) ? '1' : '0';
  }

  return merged;
};

const mergeHistograms = (histograms) => {
  if (!histograms.length) return [];
  const merged = Array.from({ length: HIST_BINS }, () => 0);

  for (let histogramIndex = 0; histogramIndex < histograms.length; histogramIndex += 1) {
    for (let binIndex = 0; binIndex < HIST_BINS; binIndex += 1) {
      merged[binIndex] += histograms[histogramIndex][binIndex] || 0;
    }
  }

  const normalized = merged.map((value) => value / histograms.length);
  const total = normalized.reduce((accumulator, value) => accumulator + value, 0) || 1;
  return normalized.map((value) => Number((value / total).toFixed(6)));
};

const mergeStats = (statsCollection) => ({
  brightness: Number(mean(statsCollection.map((stats) => stats.brightness)).toFixed(2)),
  contrast: Number(mean(statsCollection.map((stats) => stats.contrast)).toFixed(2)),
  sharpness: Number(mean(statsCollection.map((stats) => stats.sharpness)).toFixed(2)),
});

const mergeSamples = (samples) => {
  const sampleQuality = samples.map((sample) => sample.quality);
  const qualityMean = mean(sampleQuality);
  const qualityStabilityPenalty = Math.min(15, standardDeviation(sampleQuality) * 0.8);
  const quality = Math.round(clamp(qualityMean - qualityStabilityPenalty, 0, 100));

  return {
    hash: mergeBitHashes(samples.map((sample) => sample.hash)),
    diffHash: mergeBitHashes(samples.map((sample) => sample.diffHash)),
    hist: mergeHistograms(samples.map((sample) => sample.hist)),
    stats: mergeStats(samples.map((sample) => sample.stats)),
    quality,
  };
};

const buildScanPayload = (template) => ({
  format: 'eye-scan-v1',
  version: 1,
  ...template,
  samples: SAMPLE_COUNT,
  capturedAt: new Date().toISOString(),
});

export const useEyeScanner = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [scanQuality, setScanQuality] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    streamRef.current = null;
    trackRef.current = null;
    setCameraReady(false);
    setTorchSupported(false);
    setTorchEnabled(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError('');

    if (streamRef.current && videoRef.current?.srcObject) {
      setCameraReady(true);
      return true;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera access.');
      return false;
    }

    const constraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      trackRef.current = stream.getVideoTracks()[0] || null;

      const videoElement = videoRef.current;
      if (!videoElement) {
        stopCamera();
        setCameraError('Camera view could not be created.');
        return false;
      }

      videoElement.srcObject = stream;
      await videoElement.play();

      const capabilities = trackRef.current?.getCapabilities?.() || {};
      setTorchSupported(Boolean(capabilities.torch));
      setTorchEnabled(false);
      setCameraReady(true);
      setStatusMessage('Camera ready. Keep one eye centered in the ring.');
      return true;
    } catch (error) {
      stopCamera();
      setCameraError('Camera access denied or unavailable. Allow access and try again.');
      return false;
    }
  }, [stopCamera]);

  const setTorch = useCallback(async (enabled) => {
    const track = trackRef.current;
    if (!track || !torchSupported) return false;

    try {
      await track.applyConstraints({ advanced: [{ torch: enabled }] });
      setTorchEnabled(enabled);
      return true;
    } catch (error) {
      setCameraError('Torch control is not available on this device/browser.');
      return false;
    }
  }, [torchSupported]);

  const toggleTorch = useCallback(async () => setTorch(!torchEnabled), [setTorch, torchEnabled]);

  const captureScan = useCallback(async () => {
    if (!cameraReady || !videoRef.current) {
      throw new Error('Camera is not ready');
    }

    setIsCapturing(true);
    setCaptureProgress(0);
    setStatusMessage('Capturing iris texture. Keep still for one second.');

    try {
      const samples = [];
      for (let index = 0; index < SAMPLE_COUNT; index += 1) {
        samples.push(extractEyeFeatures(videoRef.current));
        setCaptureProgress(Math.round(((index + 1) / SAMPLE_COUNT) * 100));
        if (index < SAMPLE_COUNT - 1) {
          await sleep(SAMPLE_DELAY_MS);
        }
      }

      const template = mergeSamples(samples);
      const payload = buildScanPayload(template);
      setScanQuality(template.quality);

      if (template.quality >= MIN_ACCEPTED_SCAN_QUALITY) {
        setStatusMessage('Scan captured successfully.');
      } else {
        setStatusMessage('Scan quality is low. Improve light and try again.');
      }

      return {
        scanData: JSON.stringify(payload),
        quality: template.quality,
        payload,
      };
    } finally {
      setIsCapturing(false);
    }
  }, [cameraReady]);

  return {
    videoRef,
    cameraReady,
    cameraError,
    torchSupported,
    torchEnabled,
    isCapturing,
    captureProgress,
    scanQuality,
    statusMessage,
    setStatusMessage,
    startCamera,
    stopCamera,
    setTorch,
    toggleTorch,
    captureScan,
  };
};
