/**
 * The Gravit Next mark and wordmark (public/brand/mark.svg drawn
 * inline; it has the same colours on light and dark). The wordmark is "Gravit" bold and "Next" in a
 * selection box with four corner handles; next.css styles it.
 */
import { useId, type ReactNode } from "react";

/** The mark: a sphere in the brand colours with facets and a pointer, drawn the same as public/brand/mark.svg. */
export function BrandMark({ className = "gd-mark" }: { className?: string }): ReactNode {
  // The id must be unique in the page (the mark can be on screen twice) and
  // usable inside url(#...), so the React id is reduced to plain characters.
  const gradient = "gdm" + useId().replace(/[^a-zA-Z0-9_-]/g, "") + "-grad";
  return (
    <svg className={className} viewBox="119.8 207.6 180 180" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient
          id={gradient}
          x1="0.65183"
          y1="0.02094"
          x2="0.33508"
          y2="0.97644"
          gradientTransform="matrix(132,0,0,132,129.456,237.814)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#95023F" />
          <stop offset="1" stopColor="#E3136B" />
        </linearGradient>
      </defs>
      <path
        d="M 247.459 263.183 C 235.371 247.745 216.564 237.814 195.456 237.814 C 159.03 237.814 129.456 267.388 129.456 303.814 C 129.456 325.887 140.315 345.443 156.978 357.427 C 167.812 365.222 181.102 369.814 195.456 369.814 C 231.882 369.814 261.456 340.241 261.456 303.814 C 261.456 302.821 261.434 301.834 261.378 300.855 C 242.185 321.007 213.144 340.2 178.314 353.98 C 172.563 356.256 166.826 358.315 161.129 360.169 C 159.704 359.313 158.322 358.395 156.978 357.427 C 156.978 357.427 156.978 357.427 156.978 357.427 C 208.333 334.397 243.555 296.685 247.459 263.183 Z"
        fillRule="evenodd"
        fill={`url(#${gradient})`}
      />
      <path
        d="M 260.078 317.283 C 254.561 343.848 233.055 364.584 206.092 368.96 Q 233.426 335.05 260.078 317.283 Z"
        fill="#C39A1F"
      />
      <path
        d="M 130.098 294.581 C 129.675 297.599 129.456 300.681 129.456 303.814 C 129.456 312.203 131.024 320.228 133.884 327.612 L 182.798 255.552 L 130.098 294.581 Z M 130.136 294.317 C 134.404 264.754 158.296 241.503 188.162 238.213 L 130.136 294.317 Z"
        fillRule="evenodd"
        fill="#FFB700"
      />
      <path
        d="M 129.988 294.581 C 129.637 297.336 129.456 300.965 129.456 303.814 C 129.456 303.95 129.456 304.086 129.457 304.222 Q 138.946 298.417 174.205 262.175 L 129.988 294.581 Z"
        fill="#C39A1F"
      />
      <path
        d="M 261.456 251.608 L 290.071 225.461 L 278.776 267.81 L 274.65 248.752 L 261.456 251.608 Z"
        fill="#E3136B"
      />
      <path
        d="M 261.358 300.876 C 261.434 301.826 261.456 302.817 261.456 303.814 C 261.456 340.241 231.882 369.814 195.456 369.814 C 193.853 369.814 192.262 369.757 190.687 369.644 Q 191.02 358.788 192.139 348.094 L 192.139 348.094 C 192.145 348.087 192.151 348.08 192.157 348.073 C 220.835 334.977 244.772 318.285 261.358 300.876 Z"
        fill="#FFD81F"
      />
      <path
        d="M 193.549 336.781 Q 193.549 336.781 193.549 336.781 Q 200.505 288.771 223.579 244.097 C 232.963 248.528 241.137 255.107 247.456 263.205 Q 247.456 263.206 247.456 263.206 C 244.559 287.977 224.544 315.047 193.549 336.781 Z"
        fill="#FFD81F"
      />
    </svg>
  );
}

/** "Gravit" [Next]: the wordmark, as text (Manrope, next.css). */
export function BrandWordmark(): ReactNode {
  return (
    <span className="gd-word" aria-label="Gravit Next">
      <b>Gravit</b>
      <span className="gd-next">
        Next
        <span className="gd-handle gd-tl" />
        <span className="gd-handle gd-tr" />
        <span className="gd-handle gd-bl" />
        <span className="gd-handle gd-br" />
      </span>
    </span>
  );
}

/** Mark and wordmark side by side. */
export function BrandLockup({ className = "" }: { className?: string }): ReactNode {
  return (
    <div className={"gd-lockup" + (className ? " " + className : "")}>
      <BrandMark />
      <BrandWordmark />
    </div>
  );
}
