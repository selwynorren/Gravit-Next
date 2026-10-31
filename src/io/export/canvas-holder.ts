export class CanvasHolder {
  private readonly _canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;

  constructor(width: number, height: number) {
    this._canvas = document.createElement("canvas");
    this.width = width;
    this.height = height;
    this.context = null;
  }

  get width(): number {
    return this._canvas.width;
  }

  set width(value: number) {
    this._canvas.width = value;
  }

  get height(): number {
    return this._canvas.height;
  }

  set height(value: number) {
    this._canvas.height = value;
  }

  getHTMLElement(): HTMLCanvasElement {
    return this._canvas;
  }
}
