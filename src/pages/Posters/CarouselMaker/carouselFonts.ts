export interface CarouselFont {
  id: string;
  label: string;
  family: string;
  category: "Sans" | "Serif" | "Display";
}

// Loaded via @fontsource(-variable) imports in src/index.css.
export const CAROUSEL_FONTS: CarouselFont[] = [
  { id: "inter", label: "Inter", family: '"Inter Variable", sans-serif', category: "Sans" },
  { id: "poppins", label: "Poppins", family: '"Poppins", sans-serif', category: "Sans" },
  { id: "montserrat", label: "Montserrat", family: '"Montserrat Variable", sans-serif', category: "Sans" },
  { id: "dm-sans", label: "DM Sans", family: '"DM Sans Variable", sans-serif', category: "Sans" },
  { id: "space-grotesk", label: "Space Grotesk", family: '"Space Grotesk Variable", sans-serif', category: "Display" },
  { id: "playfair", label: "Playfair Display", family: '"Playfair Display Variable", serif', category: "Serif" },
  { id: "lora", label: "Lora", family: '"Lora Variable", serif', category: "Serif" },
];

export function fontById(id: string): CarouselFont {
  return CAROUSEL_FONTS.find((f) => f.id === id) ?? CAROUSEL_FONTS[0];
}
