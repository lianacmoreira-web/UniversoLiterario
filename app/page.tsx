"use client";

import { useState } from "react";
import {
  BookOpen,
  Search,
  Sparkles,
  Library,
  GitCompare,
  Loader2,
  Printer,
} from "lucide-react";

interface LivroLido {
  titulo_livro: string;
  autor_livro: string;
  tipo_evidencia: string;
  justificativa_evidencia: string;
}

interface Correlacao {
  obra_referencia: string;
  poema_ou_livro_poeta: string;
  mecanismo_intertextual: string;
  analise: string;
}

interface ResultadoTrilha {
  poeta: string;
  resumo_biografico: string;
  lista_leituras: LivroLido[];
  lista_correlacoes: Correlacao[];
}

export default function Home() {
  const [busca, setBusca] = useState("Ana Martins Marques");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTrilha | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handlePesquisar(e: React.FormEvent) {
    e.preventDefault();
    if (!busca.trim()) return;

    setCarregando(true);
    setErro(null);

    try {
      const res = await fetch("/api/pesquisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poeta: busca }),
      });

      const rawText = await res.text();
      let data: ResultadoTrilha & { error?: string };

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          rawText.trim() ||
            "A pesquisa demorou mais que o esperado ou retornou uma resposta inválida."
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Erro ao buscar dados.");
      }

      setResultado(data);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  function handleImprimirPDF() {
    window.print();
  }

  function getBadgeEvidenciaEstilo(tipo: string) {
    if (tipo === "Material") {
      return "bg-emerald-50 text-emerald-800 border border-emerald-200";
    }
    if (tipo === "Documental") {
      return "bg-amber-50 text-amber-800 border border-amber-200";
    }
    return "bg-sky-50 text-sky-800 border border-sky-200";
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1C1917] font-sans print:bg-white">
      {/* Cabeçalho Acadêmico */}
      <header className="border-b border-[#E7E5E4] bg-white/80 backdrop-blur-sm sticky top-0 z-10 print:static print:border-b-2">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#7C2D12]" />
            <span className="font-serif text-xl font-semibold tracking-tight">
              Cartografia Poética
            </span>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#78716C] hidden sm:inline">
            Mapeamento de Leituras & Intertextualidade
          </span>
        </div>
      </header>

      {/* Área de Busca (oculta na impressão) */}
      <section className="max-w-3xl mx-auto px-6 pt-14 pb-10 text-center print:hidden">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
          Trilha do Universo Literário
        </h1>
        <p className="text-[#57534E] mb-8 max-w-xl mx-auto leading-relaxed">
          Insira o nome de um poeta para investigar seu acervo de leituras, evidências
          documentais e as ressonâncias intertextuais em sua própria poesia.
        </p>

        <form onSubmit={handlePesquisar} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: Ana Martins Marques, Carlos Drummond, Wisława Szymborska..."
              className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#D6D3D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#7C2D12] text-base"
            />
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="px-6 py-3 rounded-lg bg-[#7C2D12] hover:bg-[#9A3412] text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {carregando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mapeando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar Trilha
              </>
            )}
          </button>
        </form>

        {/* Sugestões rápidas para teste */}
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-[#78716C]">
          <span>Sugestões de teste:</span>
          {[
            "Ana Martins Marques",
            "Carlos Drummond de Andrade",
            "Ana Cristina Cesar",
            "Manuel Bandeira",
          ].map((nome) => (
            <button
              key={nome}
              type="button"
              onClick={() => setBusca(nome)}
              className="underline hover:text-[#7C2D12] cursor-pointer"
            >
              {nome}
            </button>
          ))}
        </div>
      </section>

      {/* Mensagem de Erro */}
      {erro && (
        <div className="max-w-3xl mx-auto px-6 mb-8 print:hidden">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {erro}
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="max-w-5xl mx-auto px-6 pb-20 space-y-14 print:pt-6 print:space-y-8">
          {/* Perfil do Poeta + Botão de PDF */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E7E5E4] shadow-sm print:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
              <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
                {resultado.poeta}
              </h2>
              <button
                type="button"
                onClick={handleImprimirPDF}
                className="px-4 py-2 rounded-lg border border-[#D6D3D1] bg-[#FAF8F5] hover:bg-[#F5F5F4] text-[#1C1917] text-sm font-medium transition flex items-center gap-2 self-start cursor-pointer print:hidden"
              >
                <Printer className="w-4 h-4 text-[#7C2D12]" />
                Imprimir / Salvar em PDF
              </button>
            </div>
            <p className="text-[#44403C] leading-relaxed">{resultado.resumo_biografico}</p>
          </div>

          {/* LISTA 1: Acervo de Leituras */}
          <section>
            <div className="flex items-center gap-2.5 mb-6 border-b border-[#E7E5E4] pb-3">
              <Library className="w-5 h-5 text-[#7C2D12]" />
              <h3 className="font-serif text-xl font-bold">
                1. Acervo de Leitura ({resultado.lista_leituras.length} obras mapeadas)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2">
              {resultado.lista_leituras.map((livro, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-xl border border-[#E7E5E4] shadow-sm break-inside-avoid print:shadow-none"
                >
                  <span
                    className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded mb-1.5 ${getBadgeEvidenciaEstilo(
                      livro.tipo_evidencia
                    )}`}
                  >
                    Evidência {livro.tipo_evidencia}
                  </span>
                  <h4 className="font-serif font-bold text-base text-[#1C1917] leading-snug">
                    {livro.titulo_livro}
                  </h4>
                  <p className="text-sm text-[#78716C] mb-2">{livro.autor_livro}</p>
                  <p className="text-xs text-[#44403C] leading-relaxed">
                    {livro.justificativa_evidencia}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* LISTA 2: Correlações Intertextuais */}
          {resultado.lista_correlacoes.length > 0 ? (
            <section>
              <div className="flex items-center gap-2.5 mb-6 border-b border-[#E7E5E4] pb-3">
                <GitCompare className="w-5 h-5 text-[#7C2D12]" />
                <h3 className="font-serif text-xl font-bold">
                  2. Correlações com a Obra de {resultado.poeta}
                </h3>
              </div>

              <div className="space-y-4">
                {resultado.lista_correlacoes.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-6 rounded-xl border border-[#E7E5E4] shadow-sm break-inside-avoid print:shadow-none"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="text-sm font-medium text-[#7C2D12]">
                        {item.obra_referencia}{" "}
                        <span className="text-[#A8A29E] mx-1.5">→</span>{" "}
                        <span className="text-[#1C1917] font-semibold">
                          {item.poema_ou_livro_poeta}
                        </span>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F5F4] text-[#44403C] border border-[#E7E5E4]">
                        {item.mecanismo_intertextual}
                      </span>
                    </div>
                    <p className="text-sm text-[#44403C] leading-relaxed">{item.analise}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="bg-white p-6 rounded-xl border border-[#E7E5E4] text-sm text-[#78716C]">
              Nenhuma correlação intertextual específica com poemas ou livros individuais foi
              listada para <strong className="text-[#1C1917]">{resultado.poeta}</strong> sob os
              critérios de comprovação filológica estrita.
            </section>
          )}
        </div>
      )}
    </main>
  );
}
