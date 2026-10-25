/**
 * Client-side Image Compression Utility for HUIT DRL Proofs
 * Automatically optimizes camera/gallery photos before local caching or cloud upload.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  mimeType: string;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: "image/webp" | "image/jpeg";
}

export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    format = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Tệp không phải là hình ảnh hợp lệ"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Không thể khởi tạo Canvas 2D context"));
          return;
        }

        // Draw image with smooth resampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Export compressed image
        let targetFormat = format;
        let dataUrl = canvas.toDataURL(targetFormat, quality);

        // Fallback to JPEG if browser doesn't support WebP encoding
        if (targetFormat === "image/webp" && !dataUrl.startsWith("data:image/webp")) {
          targetFormat = "image/jpeg";
          dataUrl = canvas.toDataURL(targetFormat, quality);
        }

        // Calculate approximate byte size from base64
        const stringLength = dataUrl.length - "data:image/webp;base64,".length;
        const compressedSize = Math.round((stringLength * 3) / 4);
        const originalSize = file.size;
        const reduction = originalSize > 0 
          ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
          : 0;

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          reductionPercentage: reduction,
          mimeType: targetFormat,
          width,
          height,
        });
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to readable string (e.g. 1.2 MB, 340 KB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

