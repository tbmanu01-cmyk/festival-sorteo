export const AVATAR_PRESETS = [
  { id: "/avatars/man_01.png",   label: "Hombre 1" },
  { id: "/avatars/man_02.png",   label: "Hombre 2" },
  { id: "/avatars/man_03.png",   label: "Hombre 3" },
  { id: "/avatars/woman_01.png", label: "Mujer 1"  },
  { id: "/avatars/woman_02.png", label: "Mujer 2"  },
  { id: "/avatars/woman_03.png", label: "Mujer 3"  },
] as const;

export function esPreset(avatar: string | null | undefined): boolean {
  return AVATAR_PRESETS.some((p) => p.id === avatar);
}

export function esCustom(avatar: string | null | undefined): boolean {
  return typeof avatar === "string" && avatar.startsWith("data:");
}

export function esImagen(avatar: string | null | undefined): boolean {
  return esPreset(avatar) || esCustom(avatar);
}
