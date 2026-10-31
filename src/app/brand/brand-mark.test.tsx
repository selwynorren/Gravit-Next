import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLockup, BrandMark } from "./brand-mark.tsx";

const publicBrand = path.resolve(import.meta.dirname, "../../../public/brand");

describe("brand mark", () => {
  it("draws the sphere in the brand colours", () => {
    const html = renderToStaticMarkup(<BrandMark />);
    for (const color of ["#FFD81F", "#E3136B", "#95023F", "#FFB700"]) expect(html).toContain(color);
  });

  it("gives every copy its own gradient id", () => {
    const html = renderToStaticMarkup(
      <>
        <BrandMark />
        <BrandMark />
      </>,
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] as string);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(html).toContain(`url(#${id})`);
    }
  });

  it("is the same drawing as public/brand/mark.svg", () => {
    const file = fs.readFileSync(path.join(publicBrand, "mark.svg"), "utf8");
    const shapes = (svg: string) =>
      [...svg.matchAll(/<(path|rect|circle|ellipse)\b[^>]*>/g)]
        .map((m) =>
          m[0]
            .replace(/ (id|clip-path|clipPath|mask|stroke-width|strokeWidth)="[^"]*"/g, "")
            .replace(/fill="url\(#[^)]*\)"/, 'fill="url(#)"'),
        )
        .map((tag) => tag.replace(/\s*\/?>$/, ""));
    expect(shapes(renderToStaticMarkup(<BrandMark />))).toEqual(shapes(file));
  });

  it("lays out the wordmark: gravit bold and next light, lower case, no box", () => {
    const html = renderToStaticMarkup(<BrandLockup className="x" />);
    expect(html).toMatch(/^<div class="gd-lockup x"><svg class="gd-mark"/);
    expect(html).toContain(
      '<span class="gd-word" aria-label="Gravit Next"><b>gravit</b><span>next</span></span></div>',
    );
  });
});

describe("brand files", () => {
  it("are plain drawings: no scripts, no external references", () => {
    const svgs = fs.readdirSync(publicBrand).filter((f) => f.endsWith(".svg"));
    for (const name of svgs) {
      const svg = fs.readFileSync(path.join(publicBrand, name), "utf8");
      expect(svg, name).not.toMatch(
        /<script|<foreignObject|<image|javascript:|\son[a-z]+=|href=|@import/i,
      );
      // The only URL is the SVG namespace; url() only points into the file.
      expect(
        [...svg.matchAll(/https?:\/\/[^"]+/g)].map((m) => m[0]),
        name,
      ).toEqual(["http://www.w3.org/2000/svg"]);
      expect(
        [...svg.matchAll(/url\(([^)]*)\)/g)].every((m) => (m[1] as string).startsWith("#")),
        name,
      ).toBe(true);
    }
  });

  it("name the app and its icons in the web manifest", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicBrand, "manifest.json"), "utf8"),
    ) as {
      name: string;
      icons: { src: string; sizes: string }[];
    };
    expect(manifest.name).toBe("Gravit Next");
    for (const icon of manifest.icons) {
      const [w] = icon.sizes.split("x");
      expect(icon.src).toBe(`icons/icon-${w}.png`);
      expect(fs.existsSync(path.join(publicBrand, icon.src)), icon.src).toBe(true);
    }
  });
});
