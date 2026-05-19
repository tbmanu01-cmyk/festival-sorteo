export const AVATAR_PRESETS = [
  { id: "p1", label: "Azul", bg: "linear-gradient(135deg, #102463, #1a3f9e)", text: "#ffbd1f" },
  { id: "p2", label: "Morado", bg: "linear-gradient(135deg, #5b21b6, #8b5cf6)", text: "#fde68a" },
  { id: "p3", label: "Verde", bg: "linear-gradient(135deg, #064e3b, #10b981)", text: "#d1fae5" },
  { id: "p4", label: "Rojo", bg: "linear-gradient(135deg, #7f1d1d, #ef4444)", text: "#fee2e2" },
  { id: "p5", label: "Naranja", bg: "linear-gradient(135deg, #92400e, #f59e0b)", text: "#fffbeb" },
] as const;

export type PresetId = (typeof AVATAR_PRESETS)[number]["id"];

export function esPreset(avatar: string | null | undefined): boolean {
  return AVATAR_PRESETS.some((p) => p.id === avatar);
}

export function esCustom(avatar: string | null | undefined): boolean {
  return typeof avatar === "string" && avatar.startsWith("data:");
}

export function estiloPreset(avatar: string | null | undefined) {
  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);
  return preset
    ? { background: preset.bg, color: preset.text }
    : { background: "#ffbd1f", color: "#102463" };
}
