import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SKILL_SYSTEM_INSTRUCTION, TRILHA_RESPONSE_SCHEMA } from "@/lib/skill";

export const maxDuration = 30;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELOS_CANDIDATOS = [
  "gemini-4-hydrogen",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
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

        // Em 429 (quota excedida) ou 404, passa imediatamente para o próximo modelo com cota livre
        if (status === 429 || status === 404) {
          break;
        }

        // Em 503 (sobrecarga temporária), tenta mais uma vez rapidamente antes de trocar de modelo
        if (status === 503 && tentativa < 2) {
          await aguardar(400);
          continue;
        }

        throw err;
      }
    }
  }

  throw ultimoErro;
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
      dados.lista_leituras = dados.lista_leituras.slice(0, 10);
    } else {
      dados.lista_leituras = [];
    }

    if (!Array.isArray(dados.lista_correlacoes)) {
      dados.lista_correlacoes = [];
    }

    return NextResponse.json(dados);
  } catch (error) {
    console.error("Erro na API /api/pesquisar:", error);
    const status = extrairStatusErro(error);

    if (status === 429) {
      return NextResponse.json(
        {
          error:
            "Limite de quota da API atingido no momento. Aguarde alguns instantes e tente novamente, ou verifique a quota da sua chave no Google AI Studio.",
        },
        { status: 429 }
      );
    }

    if (status === 503) {
      return NextResponse.json(
        {
          error:
            "O servidor do modelo está com sobrecarga temporária no momento. Aguarde alguns segundos e clique em Gerar Trilha novamente.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível processar a pesquisa literária no momento." },
      { status: 500 }
    );
  }
}
