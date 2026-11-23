import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SKILL_SYSTEM_INSTRUCTION, TRILHA_RESPONSE_SCHEMA } from "@/lib/skill";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function buscarCapaLivro(titulo: string, autor: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`intitle:${titulo} inauthor:${autor}`);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`,
      { next: { revalidate: 86400 } } // Cacheia capas por 24h no Next.js
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

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `Mapeie a trilha de leitura (até 10 obras) e as correlações intertextuais comprovadas do(a) poeta: ${poeta}`,
      config: {
        systemInstruction: SKILL_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: TRILHA_RESPONSE_SCHEMA,
        temperature: 0.1, // Temperatura mínima para máximo rigor filológico
      },
    });

    const textoResposta = response.text;
    if (!textoResposta) {
      throw new Error("Resposta vazia da IA.");
    }

    const dados = JSON.parse(textoResposta);

    // Garante no máximo 10 obras e busca as capas em paralelo
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
