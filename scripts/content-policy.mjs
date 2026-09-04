const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
  ".zip"
]);

export function isBinaryPublicFile(relativePath) {
  const dot = relativePath.lastIndexOf(".");
  return dot !== -1 && binaryExtensions.has(relativePath.slice(dot).toLowerCase());
}

export function normalizePublicFile(relativePath, content) {
  if (isBinaryPublicFile(relativePath)) return Buffer.from(content);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    throw new Error(`${relativePath}: public text file is not valid UTF-8`);
  }
  if (text.includes("\0")) throw new Error(`${relativePath}: NUL bytes are not allowed in public text files`);
  return Buffer.from(text.replace(/\r\n?/g, "\n"), "utf8");
}
