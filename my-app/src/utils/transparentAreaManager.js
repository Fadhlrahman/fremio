// Deprecated transparent area manager. The transparent feature was removed,
// so keep these stubs to avoid breaking historical imports if any remain.

export const AUTO_TRANSPARENT_LABEL = "Area Transparan Foto";

export const createAutoTransparentAreaId = () => "auto-transparent";

export const isAutoTransparentAreaActive = () => false;

const passthrough = (elements = []) =>
  Array.isArray(elements) ? elements : [];

export default passthrough;
