import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SKILL_SYSTEM_INSTRUCTION, TRILHA_RESPONSE_SCHEMA } from "@/lib/skill";

export const maxDuration = 30;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELOS_CANDIDATOS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

// Encerra tentativas de fallback antes do timeout da função serverless na Vercel
const ORCAMENTO_MAXIMO_MS = 16000;

function extrairStatusErro(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { status?: number; code?: number; error?: { code?: number } };
  return e.status ?? e.code ?? e.error?.code;
}

async function gerarConteudoComOrcamento(prompt: string) {
  const inicio = Date.now();
  let ultimoErro: unknown;

  for (let i = 0; i < MODELOS_CANDIDATOS.length; i++) {
    const tempoDecorrido = Date.now() - inicio;
    if (i > 0 && tempoDecorrido > ORCAMENTO_MAXIMO_MS) {
      break;
    }

    const modelo = MODELOS_CANDIDATOS[i];
    const restanteMs = Math.max(4000, ORCAMENTO_MAXIMO_MS - (Date.now() - inicio));

    try {
      const chamadaIA = ai.models.generateContent({
        model: modelo,
        contents: prompt,
        config: {
          systemInstruction: SKILL_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: TRILHA_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout ao consultar o modelo ${modelo}`));
        }, restanteMs);
      });

      return await Promise.race([chamadaIA, timeoutPromise]);
    } catch (err) {
      ultimoErro = err;
      const status = extrairStatusErro(err);

      if (status === 503 || status === 429 || status === 404 || err instanceof Error) {
        continue;
      }

      throw err;
    }
  }

  throw ultimoErro ?? new Error("Tempo limite excedido ao consultar os modelos.");
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
    const response = await gerarConteudoComOrcamento(prompt);

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
            "Limite de quota da API atingido no momento. Aguarde alguns instantes e tente novamente.",
        },
        { status: 429 }
      );
    }

    if (status === 503) {
      return NextResponse.json(
        {
          error:
            "Os servidores dos modelos estão com sobrecarga temporária no momento. Aguarde alguns segundos e clique em Gerar Trilha novamente.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          "A pesquisa demorou mais que o esperado ou encontrou instabilidade temporária. Tente novamente em instantes.",
      },
      { status: 500 }
    );
  }
}
