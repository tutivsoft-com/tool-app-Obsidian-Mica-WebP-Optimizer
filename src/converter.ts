import type { ConversionResult, ImageInfo, MetadataPolicy, QualityMode } from "./types";
import { isAnimatedImage } from "./utils";

interface MetadataChunk { type: "EXIF" | "ICCP" | "XMP "; data: Uint8Array; }

function readU32(view: DataView, offset: number): number { return view.getUint32(offset, true); }
function chunk(type: string, data: Uint8Array): Uint8Array {
  const result = new Uint8Array(8 + data.length + (data.length % 2));
  result.set(new TextEncoder().encode(type), 0);
  new DataView(result.buffer).setUint32(4, data.length, true);
  result.set(data, 8);
  return result;
}

function extractPngMetadata(bytes: Uint8Array): MetadataChunk[] {
  const chunks: MetadataChunk[] = [];
  if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) return chunks;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const size = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + size);
    if (type === "eXIf") chunks.push({ type: "EXIF", data });
    offset += 12 + size;
    if (type === "IEND") break;
  }
  return chunks;
}

function extractJpegMetadata(bytes: Uint8Array): MetadataChunk[] {
  const chunks: MetadataChunk[] = [];
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return chunks;
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const data = bytes.slice(offset + 4, offset + 2 + size);
    if (marker === 0xe1 && new TextDecoder().decode(data.slice(0, 6)) === "Exif\0\0") chunks.push({ type: "EXIF", data });
    if (marker === 0xe2 && new TextDecoder().decode(data.slice(0, 12)) === "ICC_PROFILE\0") chunks.push({ type: "ICCP", data: data.slice(14) });
    if (marker === 0xe1 && new TextDecoder().decode(data.slice(0, 29)).includes("http://ns.adobe.com/xap/1.0/")) chunks.push({ type: "XMP ", data: data.slice(29) });
    offset += 2 + size;
  }
  return chunks;
}

function sourceMetadata(bytes: ArrayBuffer, extension: string): MetadataChunk[] {
  const view = new Uint8Array(bytes);
  return extension.toLowerCase() === "png" ? extractPngMetadata(view) : extractJpegMetadata(view);
}

function addMetadata(webp: ArrayBuffer, metadata: MetadataChunk[]): { bytes: ArrayBuffer; preserved: boolean } {
  if (!metadata.length) return { bytes: webp, preserved: false };
  const input = new Uint8Array(webp);
  if (input.length < 20 || new TextDecoder().decode(input.slice(0, 4)) !== "RIFF" || new TextDecoder().decode(input.slice(8, 12)) !== "WEBP") return { bytes: webp, preserved: false };
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  let insertAt = 12;
  if (new TextDecoder().decode(input.slice(12, 16)) !== "VP8X") return { bytes: webp, preserved: false };
  insertAt += 8 + readU32(view, 16) + (readU32(view, 16) % 2);
  const additions = metadata.map((item) => chunk(item.type, item.data));
  const additionsLength = additions.reduce((sum, item) => sum + item.length, 0);
  const output = new Uint8Array(input.length + additionsLength);
  output.set(input.slice(0, insertAt), 0);
  let position = insertAt;
  for (const addition of additions) { output.set(addition, position); position += addition.length; }
  output.set(input.slice(insertAt), position);
  const flags = metadata.reduce((value, item) => value | (item.type === "ICCP" ? 0x20 : item.type === "EXIF" ? 0x08 : 0x04), 0);
  output[20] |= flags;
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  return { bytes: output.buffer, preserved: true };
}

async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob, { imageOrientation: "from-image" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable.");
    context.drawImage(image, 0, 0);
    return await createImageBitmap(canvas);
  } finally { URL.revokeObjectURL(url); }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The browser could not encode WebP.")), "image/webp", quality));
}

export async function convertToWebp(bytes: ArrayBuffer, extension: string, quality: number, qualityMode: QualityMode, maxDimension: number, metadataPolicy: MetadataPolicy): Promise<ConversionResult> {
  if (isAnimatedImage(bytes, extension)) throw new Error("Animated PNG is not supported.");
  const sourceBlob = new Blob([bytes], { type: extension.toLowerCase() === "png" ? "image/png" : "image/jpeg" });
  const bitmap = await decodeImage(sourceBlob);
  const info: ImageInfo = { width: bitmap.width, height: bitmap.height, hasAlpha: extension.toLowerCase() === "png", animated: false };
  const scale = maxDimension > 0 ? Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height)) : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) { bitmap.close(); throw new Error("Canvas rendering is unavailable."); }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const outputBlob = await canvasToBlob(canvas, qualityMode === "near-lossless" ? 1 : quality / 100);
  const output = await outputBlob.arrayBuffer();
  const withMetadata = metadataPolicy === "keep" ? addMetadata(output, sourceMetadata(bytes, extension)) : { bytes: output, preserved: false };
  const verified = await decodeImage(new Blob([withMetadata.bytes], { type: "image/webp" }));
  verified.close();
  return { bytes: withMetadata.bytes, info, outputWidth: width, outputHeight: height, metadataPreserved: withMetadata.preserved };
}
