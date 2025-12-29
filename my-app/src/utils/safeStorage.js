import { compressToUTF16, decompressFromUTF16 } from "lz-string";

// Minimal, robust safeStorage wrapper around localStorage with optional compression
const COMPRESSION_PREFIX = "__cmp__:";
const COMPRESSION_THRESHOLD = 30000; // characters

const isStorageAvailable = () => {
  if (typeof window === "undefined") return false;
  try {
    const k = "__storage_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
};

const storageAvailable = isStorageAvailable();
const DEBUG = !!import.meta?.env?.DEV;

const getStorageByteSize = (s) => (typeof s === "string" ? s.length * 2 : 0);

const decompressValueIfNeeded = (value) => {
  if (typeof value !== "string") return value;
  if (!value.startsWith(COMPRESSION_PREFIX)) return value;
  try {
    const payload = value.slice(COMPRESSION_PREFIX.length);
    const dec = decompressFromUTF16(payload);
    return typeof dec === "string" ? dec : value;
  } catch (e) {
    console.warn("⚠️ Failed to decompress storage value:", e);
    return value;
  }
};

const prepareJsonForStorage = (val) => {
  const out = { storageString: "", bytes: 0, compressed: false };
  let s;
  try {
    s = JSON.stringify(val ?? null);
  } catch (e) {
    return out;
  }
  if (typeof s !== "string") return out;
  let storageString = s;
  let compressed = false;
  if (s.length >= COMPRESSION_THRESHOLD) {
    try {
      const payload = compressToUTF16(s);
      if (payload && payload.length > 0) {
        const prefixed = `${COMPRESSION_PREFIX}${payload}`;
        if (prefixed.length < s.length) {
          storageString = prefixed;
          compressed = true;
        }
      }
    } catch (e) {
      // ignore compression errors
    }
  }
  out.storageString = storageString;
  out.bytes = getStorageByteSize(storageString);
  out.compressed = compressed;
  return out;
};

const withStorage = (op) => {
  if (!storageAvailable) return { ok: false };
  try {
    return op(window.localStorage);
  } catch (e) {
    console.warn("⚠️ LocalStorage op failed", e);
    return { ok: false, error: e };
  }
};

const safeStorage = {
  getItem(key, defaultValue = null) {
    const result = withStorage((s) => ({ ok: true, value: s.getItem(key) }));
    if (!result?.ok) return defaultValue;
    const raw = result.value;
    if (raw === null || raw === undefined) return defaultValue;
    const dec = decompressValueIfNeeded(raw);
    return dec !== undefined && dec !== null ? dec : defaultValue;
  },

  setItem(key, value) {
    const result = withStorage((s) => {
      s.setItem(key, value);
      return { ok: true };
    });
    return Boolean(result?.ok);
  },

  removeItem(key) {
    const result = withStorage((s) => {
      s.removeItem(key);
      return { ok: true };
    });
    return Boolean(result?.ok);
  },

  getJSON(key, defaultValue = null) {
    const result = withStorage((s) => ({ ok: true, value: s.getItem(key) }));
    if (!result?.ok) return defaultValue;
    const raw = result.value;
    if (raw === null || raw === undefined) return defaultValue;
    const dec = decompressValueIfNeeded(raw);
    if (typeof dec !== "string") return defaultValue;
    try {
      return JSON.parse(dec);
    } catch (e) {
      return defaultValue;
    }
  },

  setJSON(key, value) {
    const prepared = prepareJsonForStorage(value);
    
    if (DEBUG) {
      console.log('💾 [setJSON] Prepared data:', {
        key,
        bytes: prepared.bytes,
        kb: Math.round(prepared.bytes / 1024),
        compressed: prepared.compressed,
        hasString: Boolean(prepared.storageString),
        stringLength: prepared.storageString?.length,
      });
    }

    if (!prepared.storageString) {
      if (DEBUG) console.error('❌ [setJSON] No storage string prepared');
      return false;
    }

    try {
      const result = this.setItem(key, prepared.storageString);
      if (DEBUG) console.log('✅ [setJSON] setItem result:', result);
      return result;
    } catch (error) {
      if (DEBUG) {
        console.error('❌ [setJSON] Exception during save:', {
          message: error.message,
          name: error.name,
          isQuotaExceeded: error.name === 'QuotaExceededError' ||
                           /quota|storage/i.test(error.message),
        });
      }
      throw error; // Re-throw so caller knows it failed
    }
  },

  isAvailable() {
    return storageAvailable;
  },

  estimateJSONBytes(value) {
    const prepared = prepareJsonForStorage(value);
    return prepared.bytes;
  },
};

export default safeStorage;
