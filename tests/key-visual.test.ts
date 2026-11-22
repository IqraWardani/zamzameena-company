import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedKeyVisualMetadata,
  MAX_KEY_VISUAL_BYTES,
  MAX_KEY_VISUAL_DIMENSION,
  MAX_KEY_VISUAL_PIXELS,
  sanitizeKeyVisualFilename,
  validateKeyVisual,
} from "../lib/key-visual/validation";
import { authorizeAdmin } from "../lib/admin/access-policy";

function jpegBytes(width = 1, height = 1): Uint8Array {
  const bytes = Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x11, 0xff, 0xd9, 0x00, 0x01,
  ]);
  bytes[7] = height >> 8;
  bytes[8] = height & 0xff;
  bytes[9] = width >> 8;
  bytes[10] = width & 0xff;
  return bytes;
}

function pngBytes(width = 1, height = 1): Uint8Array {
  const bytes = new Uint8Array(45);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  bytes.set(new TextEncoder().encode("IEND"), 37);
  return bytes;
}

function webpBytes(width = 1, height = 1): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  bytes.set(new TextEncoder().encode("VP8X"), 12);
  new DataView(bytes.buffer).setUint32(16, 10, true);
  bytes[24] = (width - 1) & 0xff;
  bytes[25] = ((width - 1) >> 8) & 0xff;
  bytes[26] = ((width - 1) >> 16) & 0xff;
  bytes[27] = (height - 1) & 0xff;
  bytes[28] = ((height - 1) >> 8) & 0xff;
  bytes[29] = ((height - 1) >> 16) & 0xff;
  return bytes;
}

test("Key Visual validation recognizes the allowed raster formats", () => {
  for (const [type, bytes, name] of [
    ["image/png", pngBytes(), "poster.png"],
    ["image/jpeg", jpegBytes(), "poster.jpg"],
    ["image/jpeg", jpegBytes(), "poster.jpeg"],
    ["image/webp", webpBytes(), "poster.webp"],
  ] as const) {
    assert.deepEqual(
      validateKeyVisual({ type, size: bytes.byteLength, name }, bytes),
      {
        success: true,
        contentType: type,
        originalFilename: name,
      },
    );
  }
});

test("Key Visual validation uses original filename when Server Action FormData serializes a File as Blob", () => {
  const png = pngBytes();
  const serializedFile = new File([Uint8Array.from(png)], "blob", { type: "image/png" });

  assert.deepEqual(
    validateKeyVisual(serializedFile, png, "poster.png"),
    {
      success: true,
      contentType: "image/png",
      originalFilename: "poster.png",
    },
  );
});

test("Key Visual metadata requires matching allowed extension and MIME type", () => {
  assert.equal(isSupportedKeyVisualMetadata("poster.JPG", "image/jpeg"), true);
  assert.equal(isSupportedKeyVisualMetadata("poster.jpeg", "image/jpeg"), true);
  assert.equal(isSupportedKeyVisualMetadata("poster.jpg", "image/jpg"), false);
  assert.equal(isSupportedKeyVisualMetadata("poster.png", "image/jpeg"), false);
  assert.equal(isSupportedKeyVisualMetadata("poster.gif", "image/gif"), false);
});

test("Key Visual validation rejects mismatched types, malformed bytes, and oversized files", () => {
  const jpeg = jpegBytes();
  assert.equal(
    validateKeyVisual(
      { type: "image/png", size: jpeg.byteLength, name: "fake.png" },
      jpeg,
    ).success,
    false,
  );
  const png = pngBytes();
  assert.equal(
    validateKeyVisual(
      { type: "image/png", size: png.byteLength, name: "wrong-extension.jpg" },
      png,
    ).success,
    false,
  );
  assert.equal(
    validateKeyVisual(
      { type: "image/jpeg", size: jpeg.byteLength - 2, name: "wrong-size.jpg" },
      jpeg,
    ).success,
    false,
  );
  assert.equal(
    validateKeyVisual(
      {
        type: "image/jpeg",
        size: 6,
        name: "fake.jpg",
      },
      Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]),
    ).success,
    false,
  );
  assert.equal(
    validateKeyVisual(
      { type: "image/jpeg", size: jpeg.byteLength, name: "empty.jpg" },
      new Uint8Array(),
    ).success,
    false,
  );
  assert.equal(
    validateKeyVisual(
      {
        type: "image/jpeg",
        size: MAX_KEY_VISUAL_BYTES + 1,
        name: "large.jpg",
      },
      new Uint8Array(MAX_KEY_VISUAL_BYTES + 1),
    ).success,
    false,
  );
});

test("Key Visual validation enforces maximum dimensions and pixel count", () => {
  assert.equal(6000, MAX_KEY_VISUAL_DIMENSION);
  assert.equal(6000 * 4000, MAX_KEY_VISUAL_PIXELS);
  const imageTypes = [
    { type: "image/png", name: "kv.png", atLimit: pngBytes(6000, 4000), tooMany: pngBytes(6000, 4001), tooWide: pngBytes(6001, 1) },
    { type: "image/jpeg", name: "kv.jpg", atLimit: jpegBytes(6000, 4000), tooMany: jpegBytes(6000, 4001), tooWide: jpegBytes(6001, 1) },
    { type: "image/webp", name: "kv.webp", atLimit: webpBytes(6000, 4000), tooMany: webpBytes(6000, 4001), tooWide: webpBytes(6001, 1) },
  ];
  for (const image of imageTypes) {
    assert.equal(
      validateKeyVisual({
        type: image.type,
        size: image.atLimit.byteLength,
        name: image.name,
      }, image.atLimit).success,
      true,
      `${image.type} should accept a 24 MP image`,
    );

    const overPixelLimit = validateKeyVisual({
      type: image.type,
      size: image.tooMany.byteLength,
      name: image.name,
    }, image.tooMany);
    assert.equal(overPixelLimit.success, false, `${image.type} should reject over 24 MP`);
    if (!overPixelLimit.success) {
      assert.match(overPixelLimit.error, /24 MP/);
    }

    assert.equal(
      validateKeyVisual({
        type: image.type,
        size: image.tooWide.byteLength,
        name: image.name,
      }, image.tooWide).success,
      false,
      `${image.type} should reject a side longer than 6000 px`,
    );
  }
});

test("Key Visual filenames are reduced to safe basenames", () => {
  assert.equal(sanitizeKeyVisualFilename("../../poster<script>.png"), "poster_script_.png");
});

test("Key Visual permission requires update access and the requested event assignment", () => {
  const eventId = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin", permissions: ["events.update"], eventIds: [eventId] },
      "events.update",
      eventId,
    ),
    { allowed: true },
  );
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin", permissions: ["events.update"], eventIds: [] },
      "events.update",
      eventId,
    ),
    { allowed: false, reason: "event_scope_denied" },
  );
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin", permissions: [], eventIds: [eventId] },
      "events.update",
      eventId,
    ),
    { allowed: false, reason: "permission_denied" },
  );
});
