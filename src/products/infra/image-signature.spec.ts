import { detectImageExtension } from './image-signature';

const pad = (bytes: number[]) => Buffer.from([...bytes, ...new Array(16).fill(0)]);

describe('detectImageExtension', () => {
  it('reconhece JPG, PNG e WebP pela assinatura', () => {
    expect(detectImageExtension(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(
      detectImageExtension(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('png');
    const webp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WEBPVP8 '),
    ]);
    expect(detectImageExtension(webp)).toBe('webp');
  });

  it('recusa PDF, GIF, texto e buffer curto ou ausente', () => {
    expect(detectImageExtension(pad([...Buffer.from('%PDF-1.7')]))).toBeNull();
    expect(detectImageExtension(pad([...Buffer.from('GIF89a')]))).toBeNull();
    expect(detectImageExtension(Buffer.from('não sou uma foto, só texto'))).toBeNull();
    expect(detectImageExtension(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageExtension(undefined)).toBeNull();
  });
});
