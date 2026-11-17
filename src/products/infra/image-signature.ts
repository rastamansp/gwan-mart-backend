/** Teto da foto de produto. O multer recusa acima disso com 413. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageExtension = 'jpg' | 'png' | 'webp';

/**
 * Identifica a foto pelos primeiros bytes, não pelo nome nem pelo mimetype
 * (os dois vêm do cliente). Devolve `null` para o que não for JPG, PNG ou WebP.
 */
export function detectImageExtension(buffer: Buffer | undefined): ImageExtension | null {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => buffer[i] === byte)) return 'png';

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}
