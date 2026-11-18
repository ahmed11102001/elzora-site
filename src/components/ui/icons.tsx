import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// Inline SVG icons (24px grid, stroke follows currentColor). Decorative by default.
const svg = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const ArrowRight = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const ArrowDown = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);
export const Check = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const Clock = (p: IconProps) => (
  <svg {...svg(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const Menu = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const Close = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Plus = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Star = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 3.5l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 10.1l6.2-.9z" />
  </svg>
);
export const Shield = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
export const MapPin = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const Chat = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M21 12a8 8 0 01-11.7 7.1L4 20l1-4.6A8 8 0 1121 12z" />
  </svg>
);

export const icons = {
  ArrowRight,
  ArrowDown,
  Check,
  Clock,
  Menu,
  Close,
  Plus,
  Star,
  Shield,
  MapPin,
  Chat,
};
