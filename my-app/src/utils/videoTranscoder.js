import { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

const loadFfmpeg = async () => {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  ffmpegLoadingPromise = (async () => {
    if (!ffmpegInstance.loaded) await ffmpegInstance.load();
    return ffmpegInstance;
  })();

  try {
    await ffmpegLoadingPromise;
    return ffmpegInstance;
  } finally {
    ffmpegLoadingPromise = null;
  }
};

const generateUniqueName = (prefix, extension) => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${uniqueSuffix}.${extension}`;
};

const toUint8Array = async (input) => {
  if (!input) return null;
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer);
  if (input instanceof Blob) return new Uint8Array(await input.arrayBuffer());

  if (typeof input === 'string') {
    const response = await fetch(input);
    if (!response.ok) throw new Error(`Failed to fetch resource: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  throw new Error('Unsupported input type for toUint8Array');
};

export const convertBlobToMp4 = async (inputBlob, options = {}) => {
  if (!inputBlob) {
    console.warn('⚠️ convertBlobToMp4 called without input blob');
    return null;
  }

  const ffmpeg = await loadFfmpeg();
  const inputName = generateUniqueName(options.inputPrefix || 'input', 'webm');
  const outputName = generateUniqueName(options.outputPrefix || 'output', 'mp4');

  try {
    const inputData = await toUint8Array(inputBlob);
    if (!inputData) {
      console.warn('⚠️ Failed to translate input blob to Uint8Array');
      return null;
    }

    await ffmpeg.writeFile(inputName, inputData);

    const ffmpegArgs = options.ffmpegArgs || [
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-movflags', 'faststart',
      '-an',
      outputName
    ];

    await ffmpeg.exec(ffmpegArgs);

    const outputData = await ffmpeg.readFile(outputName);
    if (!outputData) {
      console.warn('⚠️ FFmpeg returned empty output data');
      return null;
    }

    const outputArray = outputData instanceof Uint8Array
      ? outputData
      : new Uint8Array(outputData);

    return new Blob([outputArray], { type: 'video/mp4' });
  } catch (error) {
    console.error('❌ Failed to convert video to mp4:', error);
    return null;
  } finally {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch (err) {
      // ignore missing file
    }

    try {
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      // ignore missing file
    }
  }
};

export default convertBlobToMp4;
