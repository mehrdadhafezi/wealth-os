export const COLORS = {
  cream: "#FAF6F0",
  beige: "#F2EBDF",
  beigeDeep: "#EAE0CC",
  olive: "#9CA583",
  oliveDeep: "#6F7A57",
  rose: "#D9A79C",
  roseDeep: "#A9705F",
  blue: "#ADC5D6",
  blueDeep: "#5C7F98",
  line: "#E4DFD2",
  ink: "#34302B",
  inkSoft: "#8B8579",
  inkFaint: "#B2AC9E",
};

export const fmt = (n, digits = 0) =>
  "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
