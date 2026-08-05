"use client";

interface Props {
  titulo: string;
  mensaje: string;
  detalle?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ModalConfirmar({
  titulo,
  mensaje,
  detalle,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  peligroso = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-2">{titulo}</h2>
        <p className="text-sm text-gray-600 mb-1">{mensaje}</p>
        {detalle && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mt-3 text-sm text-gray-700 space-y-1">
            {detalle}
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm disabled:opacity-50"
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirmar}
            disabled={cargando}
            className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60 ${
              peligroso ? "bg-red-600 hover:bg-red-700" : "bg-[#102463] hover:bg-[#173592]"
            }`}
          >
            {cargando ? "Procesando..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
