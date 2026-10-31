/** Something that holds canvases or GL resources and must be released. */
export interface Destroyable {
  destroy(): void;
}
