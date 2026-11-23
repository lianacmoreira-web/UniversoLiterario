import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SKILL_SYSTEM_INSTRUCTION, TRILHA_RESPONSE_SCHEMA } from "@/lib/skill";

export const maxDuration = 30;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Ajuste a ordem conforme os modelos ativos no seu projeto / Google AI Studio
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
    // Até 3 tentativas por modelo para absorver picos temporários (503)
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
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

        // Em 503 (sobrecarga temporária), aguarda antes de tentar novamente
        if (status === 503 && tentativa < 3) {
          await aguardar(600 * tentativa);
          continue;
        }

        // Em 503 esgotado ou 404 (modelo indisponível), passa ao próximo modelo candidato
        if (status === 503 || status === 404) {
          break;
        }

        throw err;
      }
    }
  }

  throw ultimoErro;
}

async function buscarCapaLivro(titulo: string, autor: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`intitle:${titulo} inauthor:${autor}`);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const imageLinks = data.items?.[0]?.volumeInfo?.imageLinks;

    if (imageLinks) {
      const url = imageLinks.thumbnail || imageLinks.smallThumbnail;
      return url ? url.replace("http://", "https://") : null;
    }
    return null;
  } catch {
    return null;
  }
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
