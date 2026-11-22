export const MAX_KEY_VISUAL_BYTES = 8 * 1024 * 1024;
export const MAX_KEY_VISUAL_DIMENSION = 6000;
export const MAX_KEY_VISUAL_PIXELS = 24_000_000;
export const MAX_KEY_VISUAL_RESOLUTION_LABEL = "6.000 px per sisi dan 24 MP total";

export type KeyVisualContentType = "image/png" | "image/jpeg" | "image/webp";

export type KeyVisualValidation =
  | {
      success: true;
      contentType: KeyVisualContentType;
      originalFilename: string;
    }
  | { success: false; error: string };

export function isSupportedKeyVisualMetadata(name: string, type: string): boolean {
  const extension = name.split(".").pop()?.toLowerCase();
  return (
    (type === "image/png" && extension === "png") ||
    (type === "image/jpeg" && (extension === "jpg" || extension === "jpeg")) ||
    (type === "image/webp" && extension === "webp")
  );
}

export function sanitizeKeyVisualFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? "key-visual";
  const safe = basename
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 255);
  return safe || "key-visual";
}

type ImageMetadata = {
  contentType: KeyVisualContentType;
  width: number;
  height: number;
};

function detectedImageMetadata(bytes: Uint8Array): ImageMetadata | null {
  const isPng =
    bytes.length >= 45 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, false) === 13 &&
    new TextDecoder().decode(bytes.subarray(12, 16)) === "IHDR";
  if (isPng && new TextDecoder().decode(bytes.subarray(-8, -4)) === "IEND") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width > 0 && height > 0) return { contentType: "image/png", width, height };
  }

  const jpeg = jpegDimensions(bytes);
  if (jpeg) return { contentType: "image/jpeg", ...jpeg };

  const isWebp =
    bytes.length >= 30 &&
    new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP" &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) ===
      bytes.byteLength - 8;
  if (isWebp) {
    const chunkType = new TextDecoder().decode(bytes.subarray(12, 16));
    let width: number;
    let height: number;
    if (
      chunkType === "VP8X" &&
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16, true) >= 10
    ) {
      width = readUint24LE(bytes, 24) + 1;
      height = readUint24LE(bytes, 27) + 1;
    } else if (
      chunkType === "VP8L" &&
      bytes[20] === 0x2f &&
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16, true) >= 5
    ) {
      width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
      height = 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10));
    } else if (
      chunkType === "VP8 " &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      width = ((bytes[27] & 0x3f) << 8) | bytes[26];
      height = ((bytes[29] & 0x3f) << 8) | bytes[28];
    } else {
      return null;
    }
    if (width > 0 && height > 0) return { contentType: "image/webp", width, height };
  }

  return null;
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  let dimensions: { width: number; height: number } | null = null;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (marker === 0xda) {
      if (!dimensions || segmentLength < 6) return null;
      const scan = bytes.subarray(offset + segmentLength);
      return scan.some((byte, index) => byte === 0xff && scan[index + 1] === 0xd9)
        ? dimensions
        : null;
    }

    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
        .includes(marker)
    ) {
      if (segmentLength < 8) return null;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      if (!width || !height) return null;
      dimensions = { width, height };
    }
    offset += segmentLength;
  }
  return null;
}

export function validateKeyVisual(
  file: Pick<File, "name" | "size" | "type">,
  bytes: Uint8Array,
  originalFilename = file.name,
): KeyVisualValidation {
  if (
    !file.size ||
    file.size > MAX_KEY_VISUAL_BYTES ||
    bytes.byteLength !== file.size
  ) {
    return {
      success: false,
      error: "File Key Visual harus berukuran 1 byte hingga 8 MB.",
    };
  }

  if (!isSupportedKeyVisualMetadata(originalFilename, file.type)) {
    return {
      success: false,
      error: "Pilih file PNG, JPG, atau WEBP yang valid.",
    };
  }

  const detected = detectedImageMetadata(bytes);
  if (!detected || detected.contentType !== file.type) {
    return {
      success: false,
      error: "Pilih file PNG, JPG, atau WEBP yang valid.",
    };
  }

  if (
    detected.width > MAX_KEY_VISUAL_DIMENSION ||
    detected.height > MAX_KEY_VISUAL_DIMENSION ||
    detected.width * detected.height > MAX_KEY_VISUAL_PIXELS
  ) {
    return {
      success: false,
      error: `Resolusi Key Visual maksimal ${MAX_KEY_VISUAL_RESOLUTION_LABEL}.`,
    };
  }

  return {
    success: true,
    contentType: detected.contentType,
    originalFilename: sanitizeKeyVisualFilename(originalFilename),
  };
}
