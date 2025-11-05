const toFiniteNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeZIndex = (value, fallback) => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const parsed = toFiniteNumber(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
};

const buildPlanSignature = ({
  version,
  sourceFrameId,
  sourceSignature,
  slotCount,
  slotOrder,
  minZIndex,
  maxZIndex,
}) => {
  const parts = [
    `v${version}`,
    sourceFrameId ?? "unknown",
    sourceSignature ?? "",
    slotCount ?? 0,
    Array.isArray(slotOrder) ? slotOrder.join(",") : "",
    Number.isFinite(minZIndex) ? minZIndex : "",
    Number.isFinite(maxZIndex) ? maxZIndex : "",
  ];
  return parts.join("|");
};

export const deriveFrameLayerPlan = (frameConfig) => {
  if (!frameConfig || typeof frameConfig !== "object") {
    return null;
  }

  const slots = Array.isArray(frameConfig.slots) ? frameConfig.slots : [];
  if (slots.length === 0) {
    return null;
  }

  const version = 1;
  const slotEntries = slots.map((slot, slotIndex) => {
    const zIndex = normalizeZIndex(slot?.zIndex, slotIndex);
    return {
      slotIndex,
      slotId: slot?.id ?? `slot-${slotIndex}`,
      zIndex,
    };
  });

  const sortedEntries = [...slotEntries].sort((a, b) => {
    if (a.zIndex === b.zIndex) {
      return a.slotIndex - b.slotIndex;
    }
    return a.zIndex - b.zIndex;
  });

  const slotOrder = sortedEntries.map((entry) => entry.slotIndex);
  const zIndexLookup = sortedEntries.reduce((acc, entry) => {
    acc[entry.slotIndex] = entry.zIndex;
    return acc;
  }, {});

  const zValues = sortedEntries.map((entry) => entry.zIndex);
  const minZIndex = zValues.reduce(
    (min, value) => (value < min ? value : min),
    Number.POSITIVE_INFINITY
  );
  const maxZIndex = zValues.reduce(
    (max, value) => (value > max ? value : max),
    Number.NEGATIVE_INFINITY
  );

  const safeMinZ = Number.isFinite(minZIndex) ? minZIndex : null;
  const safeMaxZ = Number.isFinite(maxZIndex) ? maxZIndex : null;

  const metadataSignature =
    typeof frameConfig?.metadata?.signature === "string"
      ? frameConfig.metadata.signature
      : null;
  const sourceFrameId = frameConfig?.id ?? null;

  const plan = {
    version,
    sourceFrameId,
    sourceSignature: metadataSignature,
    slotCount: slots.length,
    slotOrder,
    slots: sortedEntries,
    zIndexLookup,
    minZIndex: safeMinZ,
    maxZIndex: safeMaxZ,
    photoBaseZIndex: safeMinZ,
    signature: null,
  };

  plan.signature = buildPlanSignature({
    version,
    sourceFrameId,
    sourceSignature: metadataSignature,
    slotCount: slots.length,
    slotOrder,
    minZIndex: safeMinZ,
    maxZIndex: safeMaxZ,
  });

  return plan;
};

export default deriveFrameLayerPlan;
