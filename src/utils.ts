import { parser as markdownParser } from "@lezer/markdown";
import { diagnostics } from "./diagnostics.ts";
import type { CandidateFile, MicaSettings, ScanSummary } from "./types";

export const SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+/g, "/");
}

export function isSupportedPath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_EXTENSIONS.has(extension);
}

export function isWithinFolder(path: string, folder: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedFolder = normalizePath(folder).replace(/\/$/, "");
  return !normalizedFolder || normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`);
}

export function isWatched(path: string, settings: MicaSettings): boolean {
  return settings.watchedFolders.length === 0 || settings.watchedFolders.some((folder) => isWithinFolder(path, folder));
}

export function isAnimatedImage(bytes: ArrayBuffer, extension: string): boolean {
  if (extension.toLowerCase() !== "png") return false;
  const view = new DataView(bytes);
  if (view.byteLength < 8 || view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) return false;
  // Each chunk contains a length, a four-byte type, its payload, and a CRC.
  for (let offset = 8; offset + 12 <= view.byteLength;) {
    const length = view.getUint32(offset);
    if (offset + 12 + length > view.byteLength) return false;
    const type = view.getUint32(offset + 4);
    if (type === 0x6163544c) return length === 8; // acTL
    if (type === 0x49444154 || type === 0x49454e44) return false; // IDAT or IEND
    offset += length + 12;
  }
  return false;
}

export function baseOutputPath(sourcePath: string, outputFolder: string): string {
  const source = normalizePath(sourcePath);
  const folder = normalizePath(outputFolder);
  const directory = source.includes("/") ? source.slice(0, source.lastIndexOf("/")) : "";
  const basename = source.slice(source.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
  return `${folder || directory ? `${folder || directory}/` : ""}${basename}.webp`;
}

export function uniqueOutputPath(basePath: string, existingPaths: Iterable<string>): string {
  const existing = new Set(Array.from(existingPaths, normalizePath));
  const normalized = normalizePath(basePath);
  if (!existing.has(normalized)) return normalized;
  const dot = normalized.lastIndexOf(".");
  const stem = dot >= 0 ? normalized.slice(0, dot) : normalized;
  const ext = dot >= 0 ? normalized.slice(dot) : ".webp";
  let index = 2;
  while (existing.has(`${stem}-${index}${ext}`)) index++;
  return `${stem}-${index}${ext}`;
}

export function relativePath(fromNotePath: string, targetPath: string): string {
  const from = normalizePath(fromNotePath).split("/").slice(0, -1);
  const target = normalizePath(targetPath).split("/");
  while (from.length && target.length && from[0] === target[0]) { from.shift(); target.shift(); }
  return `${"../".repeat(from.length)}${target.join("/")}` || targetPath;
}

export function resolveRelative(notePath: string, linkPath: string): string {
  const raw = linkPath.replace(/\\/g, "/");
  if (!raw.startsWith("./") && !raw.startsWith("../")) return normalizePath(raw);
  const parts = normalizePath(notePath).split("/").slice(0, -1);
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop(); else parts.push(part);
  }
  return parts.join("/");
}

export function decodeLinkPath(value: string): string {
  try { return decodeURIComponent(value); } catch (caughtError1) {
diagnostics.failure("utils.caught_2", caughtError1); return value; }
}

export function splitLinkSuffix(value: string): { path: string; suffix: string } {
  const match = value.match(/^([^#?]*)([?#].*)?$/);
  return { path: match?.[1] ?? value, suffix: match?.[2] ?? "" };
}

export function scanSummary(paths: Array<{ path: string; name: string; extension: string; size: number }>, settings: MicaSettings): ScanSummary {
  const candidates: CandidateFile[] = [];
  const skipped: CandidateFile[] = [];
  for (const file of paths) {
    const candidate = { path: normalizePath(file.path), name: file.name, extension: file.extension, size: file.size };
    if (!isSupportedPath(file.path)) { skipped.push({ ...candidate, reason: "Unsupported file type" }); continue; }
    if (!isWatched(file.path, settings)) { skipped.push({ ...candidate, reason: "Outside watched folders" }); continue; }
    candidates.push(candidate);
  }
  return { candidates, skipped, totalBytes: candidates.reduce((sum, file) => sum + file.size, 0) };
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function stableHash(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let hash = 2166136261;
  for (const byte of view) { hash ^= byte; hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function replaceReferences(content: string, sourcePath: string, outputPath: string, notePath: string, resolveLink?: (path: string) => string | undefined): { content: string; changed: boolean } {
  const source = normalizePath(sourcePath);
  const replacement = relativePath(notePath, outputPath);
  let changed = false;
  const matchesSource = (raw: string): boolean => {
    const path = decodeLinkPath(raw.trim());
    const relative = /^\.{1,2}[\\/]/.test(path);
    const link = relative ? path : normalizePath(path);
    if (resolveLink) return resolveLink(link) === source;
    return resolveRelative(notePath, link) === source;
  };
  const markdownPath = replacement.split("/").map(part =>
    encodeURIComponent(part).replace(/\(/g, "%28").replace(/\)/g, "%29")
  ).join("/");
  const rewrite = (prose: string): string => {
    let updated = prose.replace(/(!?\[\[)([^\]|#?]+)((?:[#?][^\]|]*)?)(\|[^\]]*)?(\]\])/g, (full, open: string, rawPath: string, suffix: string, alias: string, close: string) => {
      if (!matchesSource(rawPath)) return full;
      changed = true;
      return `${open}${replacement}${suffix}${alias ?? ""}${close}`;
    });
    updated = updated.replace(/((?:src|href)\s*=\s*["'])([^"']+)(["'])/gi, (full, open: string, rawPath: string, close: string) => {
      const split = splitLinkSuffix(rawPath);
      if (!matchesSource(split.path)) return full;
      changed = true;
      return `${open}${replacement}${split.suffix}${close}`;
    });
    return updated;
  };

  const pieces: string[] = [];
  let start = 0;
  markdownParser.parse(content).iterate({
    enter(node) {
      const markdownUrl = node.name === "URL" &&
        ["Image", "Link", "LinkReference"].includes(node.node.parent?.name ?? "");
      if (!markdownUrl && !["InlineCode", "FencedCode", "CodeBlock", "LinkTitle"].includes(node.name)) return;
      const original = content.slice(node.from, node.to);
      let updated = original;
      if (markdownUrl) {
        const wrapped = original.startsWith("<");
        const { path, suffix } = splitLinkSuffix(wrapped ? original.slice(1, -1) : original);
        const unescapedPath = path.replace(/\\([!-/:-@[-`{-~])/g, "$1");
        if (matchesSource(unescapedPath)) {
          changed = true;
          updated = wrapped ? "<" + markdownPath + suffix + ">" : markdownPath + suffix;
        }
      }
      pieces.push(rewrite(content.slice(start, node.from)), updated);
      start = node.to;
      return false;
    }
  });
  pieces.push(rewrite(content.slice(start)));
  return { content: pieces.join(""), changed };
}
