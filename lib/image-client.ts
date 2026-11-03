/**
 * 브라우저에서 사진을 줄인다 — 서버로 올리기 전에.
 * 폰 사진 5MB → 긴 변 1800px JPEG ≈ 300~500KB. HEIC도 Safari가 풀어준다.
 * 회전 정보(EXIF)는 그리면서 반영되고, 위치 정보 같은 메타는 떨어져 나간다.
 */

const LONG_EDGE = 1800;
const THUMB_EDGE = 480;
const QUALITY = 0.82;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // createImageBitmap이 못 여는 포맷은 <img>로 한 번 더
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("decode-failed"));
      };
      img.src = url;
    });
  }
}

function draw(src: ImageBitmap | HTMLImageElement, maxEdge: number): Promise<Blob | null> {
  const w = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h = "naturalHeight" in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
}

export type ShrunkPhoto = { photo: File; thumb: File };

/** 실패하면 원본을 그대로 돌려준다 — 못 줄여도 못 올리진 않게. */
export async function shrinkPhoto(file: File): Promise<ShrunkPhoto> {
  if (!file.type.startsWith("image/")) return { photo: file, thumb: file };
  try {
    const src = await decode(file);
    const [big, small] = await Promise.all([draw(src, LONG_EDGE), draw(src, THUMB_EDGE)]);
    if ("close" in src) src.close();
    if (!big || !small) return { photo: file, thumb: file };
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return {
      photo: new File([big], `${base}.jpg`, { type: "image/jpeg" }),
      thumb: new File([small], `${base}-thumb.jpg`, { type: "image/jpeg" }),
    };
  } catch {
    return { photo: file, thumb: file };
  }
}
