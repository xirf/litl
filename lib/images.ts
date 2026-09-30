/** Embed a bounded raster image so projects and OBS exports work offline. */
export async function embedImage(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 10_000_000) throw Error('Image exceeds 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height) throw Error('Image has no pixels.');
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let src = canvas.toDataURL('image/webp', 0.9);
    if (src.length > 2_000_000) src = canvas.toDataURL('image/webp', 0.65);
    if (src.length > 2_000_000)
      throw Error('Image is too detailed. Resize it before importing (2 MB embedded limit).');
    return { src, width: canvas.width, height: canvas.height, name: file.name };
  } finally {
    bitmap.close();
  }
}
