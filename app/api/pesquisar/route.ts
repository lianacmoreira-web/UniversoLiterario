import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SKILL_SYSTEM_INSTRUCTION, TRILHA_RESPONSE_SCHEMA } from "@/lib/skill";

export const maxDuration = 30;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELOS_CANDIDATOS = [
  "gemini-4-hydrogen",
  "gemini-flash-latest",
];

function aguardar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extrairStatusErro(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { status?: number; code?: number; error?: { code?: number } };
  return e.status ?? e.code ?? e.error?.code;
}

async function gerarConteudoComResiliencia(prompt: string) {
  let ultimoErro: unknown;

  for (const modelo of MODELOS_CANDIDATOS) {
    // Até 2 tentativas por modelo para não exceder o tempo limite na Vercel
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        return await ai.models.generateContent({
          model: modelo,
          contents: prompt,
          config: {
            systemInstruction: SKILL_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: TRILHA_RESPONSE_SCHEMA,
            temperature: 0.1,
          },
        });
      } catch (err) {
        ultimoErro = err;
        const status = extrairStatusErro(err);

        if (status === 503 && tentativa < 2) {
          await aguardar(500);
          continue;
        }

        if (status === 503 || status === 404) {
          break;
        }

        throw err;
      }
    }
  }

  throw ultimoErro;
}

async function consultarGoogleBooks(termo: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(termo);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`,
      {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      const links = item?.volumeInfo?.imageLinks;
      const rawUrl =
        links?.extraLarge ||
        links?.large ||
        links?.medium ||
        links?.thumbnail ||
        links?.smallThumbnail;

      if (rawUrl) {
        return String(rawUrl)
          .replace("http://", "https://")
          .replace("&edge=curl", "");
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function consultarOpenLibrary(titulo: string, autor: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${titulo} ${autor}`.trim());
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=3`,
      {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const docs = Array.isArray(data.docs) ? data.docs : [];

    for (const doc of docs) {
      if (doc?.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      }
      if (Array.isArray(doc?.isbn) && doc.isbn.length > 0) {
        return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function buscarCapaLivro(titulo: string, autor: string): Promise<string | null> {
  const tituloLimpo = titulo.split(":")[0].trim();

  const gb1 = await consultarGoogleBooks(`${tituloLimpo} ${autor}`);
  if (gb1) return gb1;

  const gb2 = await consultarGoogleBooks(tituloLimpo);
  if (gb2) return gb2;

  const ol = await consultarOpenLibrary(tituloLimpo, autor);
  if (ol) return ol;

  return null;
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Chave GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const poeta = typeof body?.poeta === "string" ? body.poeta.trim() : "";

    if (!poeta) {
      return NextResponse.json(
        { error: "Nome do poeta é obrigatório." },
        { status: 400 }
      );
    }

    const prompt = `Mapeie a trilha de leitura (até 10 obras) e as correlações intertextuais comprovadas do(a) poeta: ${poeta}`;
    const response = await gerarConteudoComResiliencia(prompt);

    const textoResposta = response?.text;
    if (!textoResposta) {
      throw new Error("Resposta vazia da IA.");
    }

    const dados = JSON.parse(textoResposta);

    if (Array.isArray(dados.lista_leituras)) {
      const leiturasLimitadas = dados.lista_leituras.slice(0, 10);
      dados.lista_leituras = await Promise.all(
        leiturasLimitadas.map(
          async (livro: { titulo_livro: string; autor_livro: string }) => {
            const capaUrl = await buscarCapaLivro(
              livro.titulo_livro,
              livro.autor_livro
            );
            return {
              ...livro,
              capa_url: capaUrl,
            };
          }
        )
      );
    } else {
      dados.lista_leituras = [];
    }

    if (!Array.isArray(dados.lista_correlacoes)) {
      dados.lista_correlacoes = [];
    }

    return NextResponse.json(dados);
  } catch (error) {
    console.error("Erro na API /api/pesquisar:", error);
    return NextResponse.json(
      { error: "Não foi possível processar a pesquisa literária no momento." },
      { status: 500 }
    );
  }
}
