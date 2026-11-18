import type { RevealKind } from "./stations";

export const FULL = "inset(0% 0% 0% 0% round 0px)";

// clip-path shapes for opening and closing a scene. Both ends use the same function and the same
// number of values so GSAP can interpolate between them.
export const CLIPS: Record<
  RevealKind,
  { from: string; full: string; exit: string; enter: string; leave: string }
> = {
  // the book opens from the centre line
  split: {
    from: "inset(0% 50% 0% 50% round 0px)",
    full: FULL,
    exit: "inset(0% 50% 0% 50% round 0px)",
    enter: "power2.inOut",
    leave: "power2.inOut",
  },
  // a circle grows from the pin
  circle: {
    from: "circle(0% at 50% 50%)",
    full: "circle(75% at 50% 50%)",
    exit: "circle(0% at 50% 50%)",
    enter: "power2.in",
    leave: "power2.out",
  },
  // rises from the bottom like the balloons, then lifts away
  curtain: {
    from: "inset(100% 0% 0% 0% round 0px)",
    full: FULL,
    exit: "inset(0% 0% 100% 0% round 0px)",
    enter: "power2.out",
    leave: "power2.in",
  },
  // sweeps left to right like the river, and leaves the same way
  wipe: {
    from: "inset(0% 100% 0% 0% round 0px)",
    full: FULL,
    exit: "inset(0% 0% 0% 100% round 0px)",
    enter: "power1.inOut",
    leave: "power1.inOut",
  },
  // a window opens from the centre
  window: {
    from: "inset(50% 50% 50% 50% round 18px)",
    full: FULL,
    exit: "inset(50% 50% 50% 50% round 18px)",
    enter: "power3.out",
    leave: "power3.in",
  },
};
