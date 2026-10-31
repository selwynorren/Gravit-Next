export class JpegDpi {
  _buffer: ArrayBuffer;

  constructor(buffer: ArrayBuffer) {
    this._buffer = buffer;
  }

  setDPI(dpi: number): void {
    const view = new DataView(this._buffer);
    if (
      255 === view.getUint8(0) &&
      216 === view.getUint8(1) &&
      255 === view.getUint8(2) &&
      224 === view.getUint8(3)
    ) {
      // Density unit "dots per inch", then the same density on both axes.
      view.setUint8(13, 1);
      view.setUint16(14, dpi);
      view.setUint16(16, dpi);
    }
  }

  getBlob(): Blob {
    return new Blob([this._buffer], { type: "image/jpeg" });
  }
}
