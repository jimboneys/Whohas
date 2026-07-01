// WhoHas design tokens — Tactile / Playful LIGHT personality.
export const colors = {
  surface: "#FDFBF7",
  onSurface: "#1A1B20",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#F2EFEB",
  onSurfaceTertiary: "#4A4D55",
  surfaceInverse: "#1A1B20",
  onSurfaceInverse: "#FFFFFF",
  brand: "#FF5A5F",
  onBrand: "#FFFFFF",
  brandTertiary: "#FFEDEE",
  onBrandTertiary: "#FF5A5F",
  success: "#06D6A0",
  onSuccess: "#0A3D31",
  successSoft: "#DEF8F0",
  warning: "#FFD166",
  onWarning: "#1A1B20",
  border: "#EAE6DF",
  borderStrong: "#D1CCC2",
  divider: "#F0ECE5",
};

export const fonts = {
  display: "Fredoka_600",
  displayMedium: "Fredoka_500",
  body: "Quicksand_500",
  bodyBold: "Quicksand_600",
  bodyExtra: "Quicksand_700",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#1A1B20",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  soft: {
    shadowColor: "#1A1B20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
};

export const money = (n: number) => `$${n.toFixed(2)}`;
