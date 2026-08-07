// Reconocimiento de intención simple por coincidencia de palabras clave —
// nada de IA generativa: el bot solo puede devolver respuestas ya escritas
// en FaqItem (administrables desde /admin/chats/faqs).

export interface FaqLike {
  id: string;
  categoria: string;
  pregunta: string;
  palabrasClave: string[];
  respuesta: string;
  orden: number;
}

const STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "del", "que", "y", "o", "a", "en", "un", "una", "es",
  "como", "por", "para", "mi", "me", "se", "al", "con", "su", "sus", "le", "lo", "si",
  "no", "puedo", "quiero", "necesito", "hola", "buenas", "tengo", "tener", "hacer",
]);

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
}

function tokenizar(s: string): string[] {
  return normalizar(s)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function tokensDeFaq(faq: FaqLike): Set<string> {
  const texto = [...faq.palabrasClave, faq.pregunta].join(" ");
  return new Set(tokenizar(texto));
}

function puntaje(consultaTokens: string[], faqTokens: Set<string>): number {
  let coincidencias = 0;
  for (const t of consultaTokens) {
    if (faqTokens.has(t)) coincidencias++;
  }
  return coincidencias;
}

export type ResultadoBusqueda =
  | { tipo: "respuesta"; item: FaqLike }
  | { tipo: "sugerencias"; items: FaqLike[] }
  | { tipo: "sin_resultados" };

// Umbral de confianza: si al menos la mitad de las palabras relevantes de la
// consulta aparecen en el FAQ, se considera un match directo (respuesta
// automática). Si hay coincidencia parcial, se sugieren los más cercanos —
// igual que el fallback de Bolbot ("puede que no haya entendido todo...").
export function buscarRespuesta(consulta: string, faqs: FaqLike[]): ResultadoBusqueda {
  const activos = faqs;
  const consultaTokens = tokenizar(consulta);
  if (consultaTokens.length === 0) return { tipo: "sin_resultados" };

  const puntuados = activos
    .map((faq) => ({ faq, score: puntaje(consultaTokens, tokensDeFaq(faq)) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);

  if (puntuados.length === 0) return { tipo: "sin_resultados" };

  const mejor = puntuados[0];
  const confianza = mejor.score / consultaTokens.length;

  if (confianza >= 0.5) {
    return { tipo: "respuesta", item: mejor.faq };
  }

  return { tipo: "sugerencias", items: puntuados.slice(0, 3).map((p) => p.faq) };
}

export interface CategoriaAgrupada {
  categoria: string;
  items: FaqLike[];
}

export function agruparPorCategoria(faqs: FaqLike[]): CategoriaAgrupada[] {
  const porCategoria = new Map<string, FaqLike[]>();
  for (const faq of [...faqs].sort((a, b) => a.orden - b.orden)) {
    if (!porCategoria.has(faq.categoria)) porCategoria.set(faq.categoria, []);
    porCategoria.get(faq.categoria)!.push(faq);
  }
  return Array.from(porCategoria.entries()).map(([categoria, items]) => ({ categoria, items }));
}
