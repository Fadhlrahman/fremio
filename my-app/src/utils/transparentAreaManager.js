import { TRANSPARENT_AREA_BASE_Z, BACKGROUND_PHOTO_Z } from "../constants/layers.js";

export const AUTO_TRANSPARENT_LABEL = "Area Transparan Foto";

export const createAutoTransparentAreaId = (photoId) =>
  `auto-transparent-${photoId}`;

const approxEqual = (a, b, tolerance = 0.5) => {
  const first = Number.isFinite(a) ? a : 0;
  const second = Number.isFinite(b) ? b : 0;
  return Math.abs(first - second) <= tolerance;
};

export const isAutoTransparentAreaActive = (
  area,
  photo,
  backgroundZ,
  tolerance = 0.5
) => {
  if (!area || !photo) {
    return false;
  }

  const baseBackgroundZ = Number.isFinite(backgroundZ)
    ? backgroundZ
    : Number.isFinite(BACKGROUND_PHOTO_Z)
    ? BACKGROUND_PHOTO_Z
    : 0;

  const expectedZ = baseBackgroundZ + 1;

  return (
    approxEqual(area.x, photo.x, tolerance) &&
    approxEqual(area.y, photo.y, tolerance) &&
    approxEqual(area.width, photo.width, tolerance) &&
    approxEqual(area.height, photo.height, tolerance) &&
    approxEqual(area.rotation, photo.rotation, tolerance) &&
    approxEqual(area.zIndex, expectedZ, tolerance)
  );
};

const parseNumericValue = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const computeBackgroundBaseZ = (elements) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return BACKGROUND_PHOTO_Z ?? 0;
  }

  const backgroundElements = elements.filter(
    (element) => element?.type === "background-photo"
  );

  if (backgroundElements.length === 0) {
    return BACKGROUND_PHOTO_Z ?? 0;
  }

  const zValues = backgroundElements
    .map((element) =>
      typeof element?.zIndex === "number" ? element.zIndex : BACKGROUND_PHOTO_Z
    )
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  if (zValues.length === 0) {
    return BACKGROUND_PHOTO_Z ?? 0;
  }

  return Math.min(...zValues);
};

const determineTransparentAreaZ = (elements) => {
  const backgroundZ = computeBackgroundBaseZ(elements);
  const baseLayer = Number.isFinite(backgroundZ) ? backgroundZ + 1 : 1;
  if (Number.isFinite(TRANSPARENT_AREA_BASE_Z)) {
    return Math.max(TRANSPARENT_AREA_BASE_Z, baseLayer);
  }
  return baseLayer;
};

export const syncAutoTransparentAreas = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return elements;
  }

  const transparentAreaZ = determineTransparentAreaZ(elements);
  const backgroundZ = computeBackgroundBaseZ(elements);

  const existingAutoAreas = new Map();
  elements.forEach((element) => {
    if (
      element?.type === "transparent-area" &&
      element?.data?.__autoTransparentArea === true &&
      element?.data?.__linkedPhotoId
    ) {
      existingAutoAreas.set(element.data.__linkedPhotoId, element);
    }
  });

  const nextElements = [];
  let didMutate = false;

  const sanitizeBorderRadius = (value, fallback = 0) =>
    parseNumericValue(value, parseNumericValue(fallback, 0));

  elements.forEach((element) => {
    if (
      element?.type === "transparent-area" &&
      element?.data?.__autoTransparentArea === true
    ) {
      // Skip auto-generated areas; we will reinsert them next to their photo placeholders
      return;
    }

    nextElements.push(element);

    if (element?.type !== "photo" || !element?.id) {
      return;
    }

    const linkedPhotoId = element.id;
    const existingArea = existingAutoAreas.get(linkedPhotoId);

    const targetBorderRadius = sanitizeBorderRadius(
      element?.data?.borderRadius,
      existingArea?.data?.borderRadius
    );

    const targetGeometry = {
      x: element?.x ?? 0,
      y: element?.y ?? 0,
      width: element?.width ?? 0,
      height: element?.height ?? 0,
      rotation: element?.rotation ?? 0,
    };

    const autoActive = isAutoTransparentAreaActive(
      {
        ...targetGeometry,
        zIndex: transparentAreaZ,
      },
      element,
      backgroundZ
    );

    const ensureBaseData = (base = {}, isActive = false) => ({
      ...base,
      label: AUTO_TRANSPARENT_LABEL,
      borderRadius: targetBorderRadius,
      __linkedPhotoId: linkedPhotoId,
      __autoTransparentArea: true,
      __autoTransparentActive: isActive,
    });

    if (!existingArea) {
      didMutate = true;
      nextElements.push({
        id: createAutoTransparentAreaId(linkedPhotoId),
        type: "transparent-area",
        ...targetGeometry,
        zIndex: transparentAreaZ,
        isLocked: true,
        data: ensureBaseData(undefined, autoActive),
      });
      return;
    }

    const needsGeometryUpdate =
      (existingArea.x ?? 0) !== targetGeometry.x ||
      (existingArea.y ?? 0) !== targetGeometry.y ||
      (existingArea.width ?? 0) !== targetGeometry.width ||
      (existingArea.height ?? 0) !== targetGeometry.height ||
      (existingArea.rotation ?? 0) !== targetGeometry.rotation;

    const needsZUpdate =
      typeof existingArea.zIndex !== "number" ||
      existingArea.zIndex !== transparentAreaZ;

    const existingBorderRadius = sanitizeBorderRadius(
      existingArea?.data?.borderRadius
    );

    const needsDataUpdate =
      existingBorderRadius !== targetBorderRadius ||
      existingArea?.data?.__linkedPhotoId !== linkedPhotoId ||
      existingArea?.data?.__autoTransparentArea !== true ||
      existingArea?.data?.__autoTransparentActive !== autoActive ||
      (existingArea?.data?.label ?? AUTO_TRANSPARENT_LABEL) !==
        AUTO_TRANSPARENT_LABEL;

    if (!needsGeometryUpdate && !needsZUpdate && !needsDataUpdate && existingArea.isLocked === true) {
      nextElements.push(existingArea);
      return;
    }

    didMutate = true;
    nextElements.push({
      ...existingArea,
      ...targetGeometry,
      zIndex: transparentAreaZ,
      isLocked: true,
      data: ensureBaseData(existingArea.data, autoActive),
    });
  });

  if (!didMutate && nextElements.length === elements.length) {
    return elements;
  }

  return nextElements;
};

export default syncAutoTransparentAreas;
