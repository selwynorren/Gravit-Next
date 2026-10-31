/** Where a context menu request comes from (the canvas, a panel, the crop mode). */
export const DragSource = {
  Crop: 1,
  Canvas: 2,
  PagePanel: 3,
  LayerPanel: 4,
  FillPropertyPanel: 5,
  BorderPropertyPanel: 6,
  EffectPropertyPanel: 7,
} as const;
