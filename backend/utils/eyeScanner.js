import crypto from 'crypto';

const TEMPLATE_FORMAT = 'eye-scan-v1';
const STRUCTURED_MATCH_THRESHOLD = 78;
const MIN_QUALITY_FOR_MATCH = 50;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const normalizedHash = (value = '') =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

const similarityScore = (a = '', b = '') => {
  if (!a || !b) return 0;
  if (a === b) return 100;

  const left = String(a);
  const right = String(b);
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 0;

  let matches = 0;
  const minLength = Math.min(left.length, right.length);
  for (let index = 0; index < minLength; index += 1) {
    if (left[index] === right[index]) {
      matches += 1;
    }
  }

  return Math.round((matches / maxLength) * 100);
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));
const toNumber = (value, fallback = 0) => (isFiniteNumber(value) ? Number(value) : fallback);

const sanitizeHistogram = (histogram) => {
  if (!Array.isArray(histogram) || histogram.length < 4) return [];

  const values = histogram
    .map((value) => toNumber(value, NaN))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (values.length !== histogram.length) return [];

  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  return values.map((value) => Number((value / total).toFixed(6)));
};

const sanitizeStats = (stats) => {
  if (!stats || typeof stats !== 'object') return null;

  const brightness = toNumber(stats.brightness, NaN);
  const contrast = toNumber(stats.contrast, NaN);
  const sharpness = toNumber(stats.sharpness, NaN);

  if (![brightness, contrast, sharpness].every(Number.isFinite)) {
    return null;
  }

  return {
    brightness: Number(brightness.toFixed(2)),
    contrast: Number(contrast.toFixed(2)),
    sharpness: Number(sharpness.toFixed(2)),
  };
};

const isBitString = (value) => typeof value === 'string' && /^[01]+$/.test(value);

const parseStructuredScan = (input) => {
  let raw = input;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;

    try {
      raw = JSON.parse(trimmed);
    } catch (error) {
      return null;
    }
  }

  if (!raw || typeof raw !== 'object') return null;
  if (raw.format !== TEMPLATE_FORMAT) return null;

  const hash = String(raw.hash || '');
  const diffHash = String(raw.diffHash || '');
  if (!isBitString(hash) || !isBitString(diffHash)) return null;

  const hist = sanitizeHistogram(raw.hist);
  const stats = sanitizeStats(raw.stats);
  if (hist.length === 0 || !stats) return null;

  const quality = clamp(Math.round(toNumber(raw.quality, 0)), 0, 100);

  return {
    format: TEMPLATE_FORMAT,
    version: 1,
    hash,
    diffHash,
    hist,
    quality,
    stats,
  };
};

const hashSimilarity = (leftHash, rightHash) => {
  if (!leftHash || !rightHash) return 0;

  const maxLength = Math.max(leftHash.length, rightHash.length);
  if (!maxLength) return 0;

  const minLength = Math.min(leftHash.length, rightHash.length);
  let matches = 0;

  for (let index = 0; index < minLength; index += 1) {
    if (leftHash[index] === rightHash[index]) {
      matches += 1;
    }
  }

  return Math.round((matches / maxLength) * 100);
};

const histogramSimilarity = (leftHist, rightHist) => {
  if (!Array.isArray(leftHist) || !Array.isArray(rightHist) || !leftHist.length || !rightHist.length) {
    return 0;
  }

  const length = Math.min(leftHist.length, rightHist.length);
  let overlap = 0;

  for (let index = 0; index < length; index += 1) {
    overlap += Math.min(leftHist[index], rightHist[index]);
  }

  return Math.round(clamp(overlap, 0, 1) * 100);
};

const statSimilarity = (liveStats, storedStats) => {
  if (!liveStats || !storedStats) return 0;

  const brightnessScore = 100 - clamp(Math.abs(liveStats.brightness - storedStats.brightness) * 1.1, 0, 100);
  const contrastScore = 100 - clamp(Math.abs(liveStats.contrast - storedStats.contrast) * 2.1, 0, 100);
  const sharpnessScore = 100 - clamp(Math.abs(liveStats.sharpness - storedStats.sharpness) * 2.4, 0, 100);

  return Math.round((brightnessScore * 0.35) + (contrastScore * 0.35) + (sharpnessScore * 0.3));
};

const structuredConfidence = (live, stored) => {
  const primaryHashScore = hashSimilarity(live.hash, stored.hash);
  const diffHashScore = hashSimilarity(live.diffHash, stored.diffHash);
  const histogramScore = histogramSimilarity(live.hist, stored.hist);
  const statsScore = statSimilarity(live.stats, stored.stats);

  const base = (
    (primaryHashScore * 0.45)
    + (diffHashScore * 0.35)
    + (histogramScore * 0.15)
    + (statsScore * 0.05)
  );

  const qualityFloor = Math.min(live.quality, stored.quality);
  const qualityPenalty = qualityFloor < MIN_QUALITY_FOR_MATCH ? (MIN_QUALITY_FOR_MATCH - qualityFloor) * 0.8 : 0;

  return Math.round(clamp(base - qualityPenalty, 0, 100));
};

export const EyeScannerService = {
  parseScanPayload(scanData) {
    return parseStructuredScan(scanData);
  },

  getScanQuality(scanData) {
    const parsed = parseStructuredScan(scanData);
    return parsed ? parsed.quality : null;
  },

  async createTemplate(scanData) {
    if (!scanData) {
      throw new Error('Scan data is required');
    }

    const structured = parseStructuredScan(scanData);
    if (structured) {
      return JSON.stringify(structured);
    }

    return normalizedHash(scanData);
  },

  async verifyScan(scanData, storedTemplate) {
    if (!scanData || !storedTemplate) {
      return { verified: false, confidence: 0 };
    }

    const liveStructured = parseStructuredScan(scanData);
    const storedStructured = parseStructuredScan(storedTemplate);

    if (liveStructured && storedStructured) {
      const confidence = structuredConfidence(liveStructured, storedStructured);
      return {
        verified: confidence >= STRUCTURED_MATCH_THRESHOLD && liveStructured.quality >= MIN_QUALITY_FOR_MATCH,
        confidence,
      };
    }

    const liveTemplate = normalizedHash(scanData);
    const confidence = similarityScore(liveTemplate, String(storedTemplate));
    return {
      verified: confidence >= 85,
      confidence,
    };
  },
};
