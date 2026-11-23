import { Type, Schema } from "@google/genai";

export const SKILL_SYSTEM_INSTRUCTION = `
Você é um pesquisador literário, filólogo e especialista em crítica genética e intertextualidade.
Sua tarefa é mapear o universo de leituras e as correlações intertextuais de um poeta pesquisado, retornando ESTRITAMENTE um JSON válido conforme o schema solicitado.

### REGRAS DA LISTA 1: ACERVO DE LEITURAS (lista_leituras)
- Liste no máximo 10 obras comprovadamente lidas ou que exerceram influência documentada sobre o poeta.
- Classifique rigorosamente cada obra em um dos três níveis de evidência (campo "tipo_evidencia"):
  1. "Material": Exemplar físico localizado na biblioteca pessoal do poeta, com marginália, dedicatória ou anotações.
  2. "Documental": Comprovada por cartas, diários, entrevistas, ensaios, traduções feitas pelo poeta ou registros biográficos.
  3. "Textual": Comprovada por citações diretas, epígrafes explícitas ou referências inequívocas dentro da própria obra do poeta.
- No campo "justificativa_evidencia", cite objetivamente a fonte ou o fato histórico/textual que sustenta aquela leitura (ex: carta a determinado interlocutor, entrevista, epígrafe em livro específico, acervo institucional).

### REGRAS DA LISTA 2: CORRELAÇÕES INTERTEXTUAIS (lista_correlacoes)
- Estabeleça a correlação direta entre obras da Lista 1 e poemas ou livros específicos do poeta pesquisado.
- Classifique o procedimento predominante no campo "mecanismo_intertextual" usando exclusivamente:
  - "Epígrafe"
  - "Alusão"
  - "Reescrita Crítica"
  - "Apropriação Formal"
  - "Homenagem"
- No campo "analise", explique com precisão crítica como o texto de referência opera dentro do poema ou livro do poeta.

### TRAVA DE RIGOR E ANTI-ALUCINAÇÃO (OBRIGATÓRIO)
- NUNCA invente títulos de poemas, livros, cartas ou dedicatórias.
- Se não houver comprovação filológica ou crítica segura de uma correlação específica com um poema/livro do poeta, OMITA o item da "lista_correlacoes". É preferível retornar uma "lista_correlacoes" menor (ou vazia) do que fabricar uma relação inexistente.
- Use sempre o título original ou a edição consagrada em português de forma precisa para facilitar a busca de metadados bibliográficos.
`;

export const TRILHA_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    poeta: {
      type: Type.STRING,
      description: "Nome completo e consagrado do poeta pesquisado.",
    },
    resumo_biografico: {
      type: Type.STRING,
      description:
        "Síntese crítica e biográfica concisa (2 a 4 frases) situando a poética e o horizonte de leituras do autor.",
    },
    lista_leituras: {
      type: Type.ARRAY,
      description: "Lista de até 10 obras comprovadamente lidas pelo poeta.",
      items: {
        type: Type.OBJECT,
        properties: {
          titulo_livro: {
            type: Type.STRING,
            description: "Título da obra de referência.",
          },
          autor_livro: {
            type: Type.STRING,
            description: "Nome do autor da obra de referência.",
          },
          tipo_evidencia: {
            type: Type.STRING,
            enum: ["Material", "Documental", "Textual"],
            description: "Nível de evidência da leitura.",
          },
          justificativa_evidencia: {
            type: Type.STRING,
            description:
              "Evidência documental, material ou textual objetiva que comprova a leitura.",
          },
        },
        required: [
          "titulo_livro",
          "autor_livro",
          "tipo_evidencia",
          "justificativa_evidencia",
        ],
      },
    },
    lista_correlacoes: {
      type: Type.ARRAY,
      description:
        "Correlações comprovadas entre as obras lidas e poemas ou livros específicos do poeta.",
      items: {
        type: Type.OBJECT,
        properties: {
          obra_referencia: {
            type: Type.STRING,
            description: "Título (e autor, se pertinente) da obra de referência.",
          },
          poema_ou_livro_poeta: {
            type: Type.STRING,
            description:
              "Nome exato do poema (entre aspas) ou livro (em itálico/texto simples) do poeta onde ocorre o diálogo.",
          },
          mecanismo_intertextual: {
            type: Type.STRING,
            enum: [
              "Epígrafe",
              "Alusão",
              "Reescrita Crítica",
              "Apropriação Formal",
              "Homenagem",
            ],
            description: "Mecanismo intertextual identificado.",
          },
          analise: {
            type: Type.STRING,
            description:
              "Análise crítica objetiva da relação intertextual entre as duas obras.",
          },
        },
        required: [
          "obra_referencia",
          "poema_ou_livro_poeta",
          "mecanismo_intertextual",
          "analise",
        ],
      },
    },
  },
  required: [
    "poeta",
    "resumo_biografico",
    "lista_leituras",
    "lista_correlacoes",
  ],
};