import { compressToUTF16, decompressFromUTF16 } from "lz-string";

const COMPRESSION_PREFIX = "__cmp__:";
const COMPRESSION_THRESHOLD = 30_000; // characters

const isStorageAvailable = () => {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn("⚠️ LocalStorage unavailable:", error);
    return false;
  }
};

const storageAvailable = isStorageAvailable();

const getStorageByteSize = (value) => {
  if (typeof value !== "string") return 0;
  return value.length * 2; // UTF-16 approximation
};

const decompressValueIfNeeded = (value) => {
  if (typeof value !== "string" || !value.startsWith(COMPRESSION_PREFIX)) {
    return value;
  }

  const compressedPayload = value.slice(COMPRESSION_PREFIX.length);
  try {
    const decompressed = decompressFromUTF16(compressedPayload);
    if (typeof decompressed === "string") {
      return decompressed;
    }
    console.warn("⚠️ Failed to decompress storage value (null result)");
    return value;
  } catch (error) {
    console.warn("⚠️ Failed to decompress storage value:", error);
    return value;
  }
};

const prepareJsonForStorage = (value) => {
  const result = {
    storageString: "",
    bytes: 0,
    compressed: false,
  };

  let serialized;
  try {
    serialized = JSON.stringify(value ?? null);
  } catch (error) {
    console.warn("⚠️ Failed to serialize JSON to storage:", error);
    return result;
  }

  if (typeof serialized !== "string") {
    return result;
  }

  let storageString = serialized;
  let compressed = false;

  if (serialized.length >= COMPRESSION_THRESHOLD) {
    try {
      const compressedPayload = compressToUTF16(serialized);
      if (compressedPayload && compressedPayload.length > 0) {
        const prefixed = `${COMPRESSION_PREFIX}${compressedPayload}`;
        if (prefixed.length < serialized.length) {
          storageString = prefixed;
          compressed = true;
        }
      }
    } catch (error) {
      console.warn("⚠️ Failed to compress JSON for storage:", error);
    }
  }

  result.storageString = storageString;
  result.bytes = getStorageByteSize(storageString);
  result.compressed = compressed;
  return result;
};

const withStorage = (operation) => {
  if (!storageAvailable) return null;
  try {
    return operation(window.localStorage);
  } catch (error) {
    console.warn("⚠️ LocalStorage operation failed:", error);
    return null;
  }
};

const safeStorage = {
  getItem(key, defaultValue = null) {
    const value = withStorage((storage) => storage.getItem(key));
    if (value === null || value === undefined) {
      return defaultValue;
    }
    const decompressed = decompressValueIfNeeded(value);
    return decompressed !== undefined && decompressed !== null ? decompressed : defaultValue;
  },
  setItem(key, value) {
    withStorage((storage) => storage.setItem(key, value));
  },
  removeItem(key) {
    withStorage((storage) => storage.removeItem(key));
  },
  getJSON(key, defaultValue = null) {
    const storedValue = withStorage((storage) => storage.getItem(key));
    if (storedValue === null || storedValue === undefined) {
      return defaultValue;
    }

    const decoded = decompressValueIfNeeded(storedValue);
    if (typeof decoded !== "string") {
      return defaultValue;
    }

    try {
      return JSON.parse(decoded);
    } catch (error) {
      console.warn("⚠️ Failed to parse JSON from storage:", error);
      return defaultValue;
    }
  },
  setJSON(key, value) {
    const prepared = prepareJsonForStorage(value);
    if (!prepared.storageString) {
      return;
    }
    this.setItem(key, prepared.storageString);
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
