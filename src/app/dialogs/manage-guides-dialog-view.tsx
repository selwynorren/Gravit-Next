/** The content of the Manage Guides dialog (dialogs/manage-guides-dialog.ts). */
import { useEffect, useState, type ReactNode } from "react";
import { InputBoxView } from "../widgets/input-box-view.tsx";
import {
  evaluatedText,
  guideRows,
  newGuideKey,
  type GuideRow,
  type GuideScene,
} from "./manage-guides.ts";

/** The app's primary button colour, which marks the row that was double clicked. */
const TARGET_OUTLINE = "2px solid #d72e63";

function GuideColumn({
  label,
  scene,
  isVertical,
  rows,
  targetIndex,
  onRows,
}: {
  label: string;
  scene: GuideScene;
  isVertical: boolean;
  rows: readonly GuideRow[];
  targetIndex: number;
  onRows: (rows: GuideRow[]) => void;
}): ReactNode {
  const unit = scene.getProperty("ut") as string;
  const setText = (key: number, text: string): void =>
    onRows(rows.map((row) => (row.key === key ? { ...row, text } : row)));
  return (
    <div className="g-guides-manage-column" style={{ flex: "1 1 0" }} data-vertical={isVertical}>
      <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{label}</div>
      {/* overflow-x is explicit: overflow-y alone makes the browser compute overflow-x as auto too. */}
      <div
        className="g-guides-manage-list"
        style={{ maxHeight: "360px", overflowY: "auto", overflowX: "hidden", paddingRight: "4px" }}
      >
        {rows.map((row) => {
          const isTarget = row.seedIndex !== null && row.seedIndex === targetIndex;
          return (
            <div
              key={row.key}
              className={"g-guides-manage-row" + (isTarget ? " target" : "")}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px",
                ...(isTarget ? { outline: TARGET_OUTLINE, outlineOffset: "-1px" } : {}),
              }}
            >
              <InputBoxView
                options={{ postfix: unit, triggerChangeOnEnter: true, scene: () => scene }}
                value={row.text}
                style={{ flex: "1 1 auto" }}
                onChange={(text, box) => {
                  // The box leaves a typed "87+95" as it is; show what it came to.
                  const evaluated = evaluatedText(scene, text, isVertical);
                  if (evaluated !== null) box.value(evaluated);
                  setText(row.key, evaluated ?? text);
                }}
              />
              <button
                type="button"
                style={{ marginLeft: "4px" }}
                onClick={() => onRows(rows.filter((other) => other.key !== row.key))}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        style={{ marginTop: "6px" }}
        onClick={() => onRows([...rows, { key: newGuideKey(), text: "0", seedIndex: null }])}
      >
        + Add
      </button>
    </div>
  );
}

export function ManageGuidesView({
  scene,
  targetIsVertical,
  targetIndex,
  onRows,
}: {
  scene: GuideScene;
  targetIsVertical: boolean;
  /** The guide that was double clicked, or -1. */
  targetIndex: number;
  /** Called with the current rows of both axes, first on mount, then on every change. */
  onRows: (horizontal: GuideRow[], vertical: GuideRow[]) => void;
}): ReactNode {
  const [horizontal, setHorizontal] = useState(() => guideRows(scene, false));
  const [vertical, setVertical] = useState(() => guideRows(scene, true));
  useEffect(() => onRows(horizontal, vertical), [horizontal, vertical, onRows]);
  return (
    <>
      <div
        className="header"
        style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px" }}
      >
        <span>Manage Guides</span>
      </div>
      <div className="content" style={{ display: "flex", gap: "16px" }}>
        <GuideColumn
          label="Horizontal Guides"
          scene={scene}
          isVertical={false}
          rows={horizontal}
          targetIndex={targetIsVertical ? -1 : targetIndex}
          onRows={setHorizontal}
        />
        <GuideColumn
          label="Vertical Guides"
          scene={scene}
          isVertical={true}
          rows={vertical}
          targetIndex={targetIsVertical ? targetIndex : -1}
          onRows={setVertical}
        />
      </div>
    </>
  );
}
