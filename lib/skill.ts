import { Type, Schema } from "@google/genai";

export const SKILL_SYSTEM_INSTRUCTION = `
Você é um pesquisador literário, filólogo e especialista em crítica genética, literatura comparada e intertextualidade.
Sua tarefa é mapear de forma abrangente, aprofundada e rigorosa o universo de leituras e as correlações intertextuais de um poeta pesquisado, retornando ESTRITAMENTE um JSON válido conforme o schema solicitado.

### REGRAS DA LISTA 1: ACERVO DE LEITURAS (lista_leituras)
- Busque mapear entre 7 e 10 obras (até o teto de 10) comprovadamente lidas ou que exerceram influência documentada e relevante na formação poética do autor pesquisado.
- Priorize variedade representativa da constelação literária do poeta (tradição nacional, poesia estrangeira, ensaística/crítica ou prosa de referência, quando pertinentes e comprovadas).
- Classifique rigorosamente cada obra em um dos três níveis de evidência (campo "tipo_evidencia"), garantindo total coerência com o conteúdo de "justificativa_evidencia":
  1. "Material": Exclusivamente quando houver exemplar físico localizado na biblioteca pessoal ou acervo institucional do poeta, com marginália, dedicatória, grifos ou anotações.
  2. "Documental": Exclusivamente quando a leitura for comprovada por fontes externas à poesia em si — como entrevistas, ensaios, cartas, diários, teses, traduções assinadas pelo poeta ou registros biográficos e críticos consolidados. A justificativa deve indicar qual tipo de documento ou registro sustenta a leitura.
  3. "Textual": Exclusivamente quando a leitura se comprovar dentro da própria obra literária do poeta — por meio de citações diretas, epígrafes explícitas, títulos/homenagens ou referências intertextuais inequívocas nos poemas ou livros. A justificativa deve apontar onde ou como essa marca textual aparece na obra do poeta.
- No campo "justificativa_evidencia", apresente em 2 a 3 frases objetivas e densas o fato, documento ou marca textual que comprova a leitura e sua relevância na poética do autor. Não classifique afinidades temáticas genéricas como "Textual" ou "Documental" sem apontar a base correspondente.

### REGRAS DA LISTA 2: CORRELAÇÕES INTERTEXTUAIS (lista_correlacoes)
- Desenvolva um mapeamento rico (idealmente entre 5 e 8 correlações, sempre que houver respaldo crítico ou textual) conectando diretamente obras da Lista 1 a livros ou poemas específicos do poeta pesquisado.
- Explore diferentes livros e fases da produção do poeta, mostrando como as leituras se desdobram em procedimentos concretos em sua escrita.
- Classifique o procedimento predominante no campo "mecanismo_intertextual" usando exclusivamente:
  - "Epígrafe"
  - "Alusão"
  - "Reescrita Crítica"
  - "Apropriação Formal"
  - "Homenagem"
- No campo "analise", redija uma análise crítica substantiva (2 a 4 frases) explicando **como** a obra de referência opera dentro do poema ou livro do poeta — detalhando temas compartilhados, dicção, tratamento de objetos/imagens, sintaxe, metalinguagem ou deslocamentos estéticos.

### TRAVA DE RIGOR E ANTI-ALUCINAÇÃO (OBRIGATÓRIO)
- NUNCA invente títulos de poemas, livros, cartas, entrevistas ou dedicatórias.
- Use apenas títulos reais e consagrados das obras do poeta e dos autores de referência.
- Se um poeta tiver pouca fortuna crítica documentada e não houver respaldo seguro para atingir o mínimo sugerido, inclua apenas os itens filologicamente sustentáveis — nunca fabrique relações inexistentes.
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
        "Síntese crítica e biográfica substancial (3 a 5 frases) situando a poética, os eixos estéticos e o horizonte de leituras do autor.",
    },
    lista_leituras: {
      type: Type.ARRAY,
      description:
        "Lista de 7 a 10 obras comprovadamente lidas ou influentes na formação do poeta.",
      items: {
        type: Type.OBJECT,
        properties: {
          titulo_livro: {
            type: Type.STRING,
            description: "Título consagrado da obra de referência.",
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
              "Evidência documental, material ou textual detalhada (2 a 3 frases) coerente com o tipo_evidencia selecionado.",
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
        "Correlações intertextuais comprovadas (idealmente 5 a 8) entre as obras lidas e poemas ou livros específicos do poeta.",
      items: {
        type: Type.OBJECT,
        properties: {
          obra_referencia: {
            type: Type.STRING,
            description: "Título e autor da obra de referência.",
          },
          poema_ou_livro_poeta: {
            type: Type.STRING,
            description:
              "Nome exato do poema (entre aspas) ou livro do poeta onde ocorre o diálogo.",
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
              "Análise crítica aprofundada (2 a 4 frases) da relação estética, formal ou temática entre as duas obras.",
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
