"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Props {
  tipo: "qr" | "comprobante";
  urlActual?: string;
  onSubida: (url: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function SubirImagen({ tipo, urlActual, onSubida, label, placeholder, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(urlActual ?? null);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediato
    setPreview(URL.createObjectURL(file));
    setError(null);
    setSubiendo(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tipo", tipo);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json() as { url?: string; mensaje?: string };

      if (!res.ok) {
        setError(json.mensaje ?? "Error al subir la imagen.");
        setPreview(urlActual ?? null);
        return;
      }

      onSubida(json.url!);
    } catch {
      setError("Error de conexión al subir la imagen.");
      setPreview(urlActual ?? null);
    } finally {
      setSubiendo(false);
      // reset input so same file can be reselected
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold text-gray-700">{label}</p>}

      {/* Zona de drop / click */}
      <div
        onClick={() => !disabled && !subiendo && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden
          ${disabled || subiendo ? "opacity-50 cursor-not-allowed" : "hover:border-[#102463] hover:bg-blue-50/40"}
          ${preview ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-gray-50"}
        `}
        style={{ minHeight: preview ? undefined : 120 }}
      >
        {preview ? (
          <div className="relative flex items-center justify-center p-3">
            <Image
              src={preview}
              alt="Vista previa"
              width={tipo === "qr" ? 180 : 300}
              height={tipo === "qr" ? 180 : 200}
              className="rounded-xl object-contain max-h-52 w-auto"
              unoptimized
            />
            {/* Overlay cambiar */}
            {!disabled && !subiendo && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100">
                <span className="bg-white text-gray-800 font-semibold px-4 py-2 rounded-full text-sm shadow">
                  Cambiar imagen
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
              {tipo === "qr" ? "📷" : "📎"}
            </div>
            <p className="text-sm font-semibold text-gray-600">
              {placeholder ?? "Haz clic para subir una imagen"}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG o WebP · máx 5 MB</p>
          </div>
        )}

        {subiendo && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
            <div className="flex items-center gap-2 text-[#102463] font-semibold text-sm">
              <span className="w-5 h-5 border-2 border-[#102463] border-t-transparent rounded-full animate-spin" />
              Subiendo...
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={manejarArchivo}
        disabled={disabled || subiendo}
      />
    </div>
  );
}
