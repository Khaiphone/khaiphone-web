const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXT = /\.(jpg|jpeg|png|webp|heic|heif)$/i;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageFile(file: File): { valid: true } | { valid: false; error: string } {
  const typeOk = ALLOWED_TYPES.has(file.type) || ALLOWED_EXT.test(file.name);
  if (!typeOk) return { valid: false, error: "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP, HEIC)" };
  if (file.size > MAX_BYTES) return { valid: false, error: "ไฟล์ต้องไม่เกิน 10 MB" };
  return { valid: true };
}

export function validateImageFiles(files: File[]): { valid: true } | { valid: false; error: string } {
  for (const f of files) {
    const result = validateImageFile(f);
    if (!result.valid) return result;
  }
  return { valid: true };
}
