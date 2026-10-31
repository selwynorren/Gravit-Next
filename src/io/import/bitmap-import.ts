import { Platform } from "../../engine/core/platform.ts";

export type BitmapImportCallback = (
  error: string | null,
  url?: string,
  width?: number,
  height?: number,
) => void;

export const BitmapImport = {
  import(data: Blob | Uint8Array, callback: BitmapImportCallback): void {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (url.length > Platform.maxImgDataUrlLength) {
        callback("Size limit exceeded");
        return;
      }
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (
          height > Platform.maxImgLinearDimension ||
          width > Platform.maxImgLinearDimension ||
          width * height > Platform.maxImgAreaDots
        )
          callback("Size limit exceeded");
        else callback(null, url, width, height);
      };
      image.src = url;
    };
    reader.onerror = () => {
      reader.abort();
      console.log("File error");
    };
    const blob = data instanceof Uint8Array ? new Blob([data as Uint8Array<ArrayBuffer>]) : data;
    reader.readAsDataURL(blob);
  },
};
