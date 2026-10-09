export async function normalizePhoto(src: string): Promise<string> {
  const image = new Image();
  if (!src.startsWith('data:') && !src.startsWith('blob:')) image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve(); image.onerror = () => reject(new Error('사진을 읽을 수 없습니다. PNG·JPEG·WebP 사진을 다시 선택해주세요.'));
    image.src = src;
  });
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#f4f4f4'; context.fillRect(0, 0, 1024, 1024);
  const scale = Math.min(1024 / image.naturalWidth, 1024 / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  context.drawImage(image, (1024 - w) / 2, (1024 - h) / 2, w, h);
  try {
    const result = canvas.toDataURL('image/png');
    if (result.length > 8_000_000) throw new Error('사진 용량이 너무 큽니다. 더 작은 사진을 선택해주세요.');
    return result;
  } catch (e) {
    if (e instanceof DOMException) throw new Error('참고 사진을 읽을 수 없습니다. 사진 파일로 다시 등록해주세요.');
    throw e;
  }
}
export async function photoFromFile(file: File): Promise<string> {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 15_000_000) throw new Error('15MB 이하 PNG·JPEG·WebP 사진을 선택해주세요.');
  const url = URL.createObjectURL(file);
  try { return await normalizePhoto(url); } finally { URL.revokeObjectURL(url); }
}
