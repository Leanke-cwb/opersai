import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatarData(data) {
  if (!data) return "-";

  const partes = String(data).split("-");
  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataPorExtenso(data) {
  if (!data) {
    return new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const partes = String(data).split("-");
  if (partes.length !== 3) return data;

  const [ano, mes, dia] = partes.map(Number);
  const dataLocal = new Date(ano, mes - 1, dia);

  return dataLocal.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatarHora(hora) {
  if (!hora) return "-";
  return String(hora).slice(0, 5);
}

function formatarDataHora(data, hora) {
  const dataFormatada = formatarData(data);
  const horaFormatada = formatarHora(hora);

  if (dataFormatada === "-" && horaFormatada === "-") return "-";
  if (horaFormatada === "-") return dataFormatada;
  if (dataFormatada === "-") return horaFormatada;

  return `${dataFormatada} às ${horaFormatada}`;
}

function normalizarIntegrantes(valor) {
  if (Array.isArray(valor)) return valor;

  if (typeof valor === "string") {
    try {
      const convertido = JSON.parse(valor);
      return Array.isArray(convertido) ? convertido : [];
    } catch {
      return [];
    }
  }

  return [];
}

function sanitizarNomeArquivo(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function Campo({ titulo, valor }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-600">{titulo}</p>
      <p className="mt-1 text-gray-900 whitespace-pre-wrap">{valor || "-"}</p>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <section className="border rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h2 className="text-lg font-bold text-gray-800">{titulo}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function DetalhesApoioExterno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [apoio, setApoio] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    carregarDetalhes();
  }, [id]);

  async function carregarDetalhes() {
    try {
      setLoading(true);
      setErro("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/", { replace: true });
        return;
      }

      const { data: apoioData, error: apoioError } = await supabase
        .from("apoios_externos")
        .select("*")
        .eq("id", id)
        .single();

      if (apoioError) {
        throw apoioError;
      }

      const { data: itensData, error: itensError } = await supabase
        .from("apoio_itens")
        .select("*")
        .eq("apoio_id", id)
        .eq("deleted", false)
        .order("numero_item", { ascending: true });

      if (itensError) {
        throw itensError;
      }

      setApoio(apoioData);
      setItens(Array.isArray(itensData) ? itensData : []);
    } catch (error) {
      console.error("Erro ao carregar detalhes do apoio:", error);
      setErro(error?.message || "Não foi possível carregar este apoio.");
      setApoio(null);
      setItens([]);
    } finally {
      setLoading(false);
    }
  }

  async function excluirApoio() {
    if (!apoio?.id || excluindo) return;

    const confirmado = window.confirm(
      "Confirma a exclusão definitiva deste apoio?\n\n" +
        "O registro e seus materiais serão excluídos do Supabase. Esta ação não pode ser desfeita."
    );

    if (!confirmado) return;

    try {
      setExcluindo(true);

      const { error } = await supabase
        .from("apoios_externos")
        .delete()
        .eq("id", apoio.id);

      if (error) throw error;

      alert("Apoio excluído do Supabase com sucesso.");
      navigate("/apoios-externos", { replace: true });
    } catch (error) {
      console.error("Erro ao excluir apoio externo:", error);
      alert(error?.message || "Não foi possível excluir o apoio.");
    } finally {
      setExcluindo(false);
    }
  }

  function gerarPDF() {
    if (!apoio) {
      alert("Os dados do apoio ainda não foram carregados.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const logoPMPR =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";
    const logoCOGER =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/brasao.png";

    const dataEntrega = formatarDataPorExtenso(
      apoio.entrega_data || apoio.data
    );
    const horaEntrega = formatarHora(apoio.entrega_hora);

    // Cabeçalho - mesmo padrão do PDF da Cautela
    doc.addImage(logoPMPR, "PNG", pageWidth - 40, 10, 25, 25);
    doc.addImage(logoCOGER, "PNG", 15, 10, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("POLÍCIA MILITAR DO PARANÁ", pageWidth / 2, 20, {
      align: "center",
    });
    doc.text("CORREGEDORIA-GERAL", pageWidth / 2, 27, {
      align: "center",
    });

    doc.line(15, 40, pageWidth - 15, 40);

    // Título - mesmo padrão do PDF da Cautela
    doc.setFontSize(12);
    doc.text("TERMO DE ENTREGA DE MATERIAL", pageWidth / 2, 50, {
      align: "center",
    });

    doc.setFont("times", "normal");
    doc.setFontSize(12);

    const referenciaOperacao = apoio.nome_operacao
      ? `, no contexto da operação ${apoio.nome_operacao}`
      : "";

    const referenciaProcedimento = apoio.numero_procedimento
      ? `, referente ao procedimento nº ${apoio.numero_procedimento}`
      : "";

    const referenciaUnidade = apoio.unidade
      ? `, unidade ${apoio.unidade}`
      : "";

    const referenciaLocal = [apoio.local, apoio.cidade]
      .filter(Boolean)
      .join(", na cidade de ");

    const referenciaEntregaUnidade = apoio.entrega_unidade
      ? `, unidade ${apoio.entrega_unidade}`
      : "";

    const texto = `Aos ${dataEntrega}${
      horaEntrega !== "-" ? `, às ${horaEntrega}` : ""
    }, faço a entrega dos materiais relacionados e discriminados a seguir, apreendidos durante apoio prestado ao(à) ${
      apoio.orgao || "-"
    }${referenciaUnidade}${referenciaOperacao}${referenciaProcedimento}. Os materiais foram arrecadados pela equipe da Polícia Militar do Paraná, sob comando do(a) ${
      apoio.comandante_posto_graduacao || ""
    } ${apoio.comandante_nome || "-"}, CPF ${
      apoio.comandante_cpf || "-"
    }${
      referenciaLocal ? `, durante atuação realizada em ${referenciaLocal}` : ""
    }, sendo que após a apreensão foram entregues ao(à) ${
      apoio.entrega_orgao || apoio.orgao || "-"
    }${referenciaEntregaUnidade}, ao(à) recebedor(a) abaixo identificado(a):`;

    const marginLeft = 15;
    const marginRight = 15;
    const indent = 10;
    const maxWidth = pageWidth - marginLeft - marginRight;
    let currentY = 60;
    const lineHeight = 7;

    const linhas = doc.splitTextToSize(texto, maxWidth - indent);

    linhas.forEach((linha, idx) => {
      const isFirstLine = idx === 0;
      const isLastLine = idx === linhas.length - 1;
      const words = linha.split(" ");
      const lineWidth = doc.getTextWidth(linha);
      const spaceCount = words.length - 1;
      const extraSpace = maxWidth - lineWidth;
      const spacing =
        isLastLine || spaceCount === 0 ? 0 : extraSpace / spaceCount;

      let cursorX = marginLeft + (isFirstLine ? indent : 0);

      words.forEach((word) => {
        doc.text(word, cursorX, currentY);
        const wordWidth = doc.getTextWidth(word);
        cursorX += wordWidth + doc.getTextWidth(" ") + spacing;
      });

      currentY += lineHeight;
    });

    const tabelaStartY = currentY + 6;

    autoTable(doc, {
      startY: tabelaStartY,
      head: [
        [
          "Item nº",
          "Quantidade",
          "Grupo",
          "Descrição",
          "Nº Série",
          "Patrimônio",
          "Observação",
        ],
      ],
      body: itens.map((item, index) => [
        item.numero_item ?? index + 1,
        item.quantidade || "-",
        item.item_nome || item.tipo_categoria || "-",
        item.descricao || "-",
        item.numero_serie || "-",
        item.patrimonio || "-",
        item.observacao || "-",
      ]),
      styles: {
        font: "times",
        fontSize: 9,
        cellPadding: 3,
        lineHeight: 1.35,
      },
      headStyles: { fillColor: [220, 220, 220] },
      theme: "grid",
      margin: { left: 15, right: 15 },
    });

    let yFinal = doc.lastAutoTable?.finalY || tabelaStartY + 50;

    // Se a tabela terminar muito perto do rodapé, abre uma nova página
    // para manter os dados do recebedor legíveis.
    if (yFinal + 62 > pageHeight - 15) {
      doc.addPage();
      yFinal = 25;
    }

    const gapAfterTable = 16;
    doc.setFontSize(11);
    doc.text(
      `Nome completo: ${apoio.responsavel_nome || "-"}`,
      15,
      yFinal + gapAfterTable
    );
    doc.text(
      `Função/Cargo: ${apoio.responsavel_funcao || "-"}`,
      15,
      yFinal + gapAfterTable + 10
    );
    doc.text(
      `Documento/Matrícula: ${apoio.responsavel_documento || "-"}`,
      15,
      yFinal + gapAfterTable + 20
    );

    if (apoio.observacoes_entrega) {
      const linhasObs = doc.splitTextToSize(
        `Observações: ${apoio.observacoes_entrega}`,
        pageWidth - 30
      );
      doc.text(linhasObs, 15, yFinal + gapAfterTable + 30);
      doc.text(
        "Assinatura do Recebedor(a): ___________________________",
        15,
        yFinal + gapAfterTable + 30 + linhasObs.length * 6 + 8
      );
    } else {
      doc.text(
        "Assinatura do Recebedor(a): ___________________________",
        15,
        yFinal + gapAfterTable + 30
      );
    }

    // Rodapé em todas as páginas
    const totalPaginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      doc.setPage(pagina);
      doc.setFontSize(9);
      doc.text(
        "Documento gerado eletronicamente.",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    const orgaoArquivo = sanitizarNomeArquivo(apoio.orgao || "APOIO");
    const dataArquivo = String(apoio.data || apoio.entrega_data || "")
      .replace(/-/g, "")
      .trim();

    doc.save(
      `termo_apoio_${orgaoArquivo}${dataArquivo ? `_${dataArquivo}` : ""}.pdf`
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Carregando apoio...</div>
      </div>
    );
  }

  if (erro || !apoio) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
          <button
            onClick={() => navigate("/apoios-externos")}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Voltar
          </button>
          <div className="border border-red-300 bg-red-50 text-red-700 rounded p-4">
            {erro || "Apoio não encontrado."}
          </div>
        </div>
      </div>
    );
  }

  const integrantes = normalizarIntegrantes(apoio.nome_integrantes);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Detalhes do Apoio</h1>
            <p className="text-gray-600 mt-1">
              {apoio.orgao || "Órgão não informado"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={`px-3 py-2 rounded-full text-sm font-semibold ${
                apoio.status === "finalizado"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {apoio.status === "finalizado" ? "Finalizado" : "Rascunho"}
            </span>
            <button
              onClick={gerarPDF}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Gerar PDF
            </button>
            <button
              onClick={excluirApoio}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded"
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </button>
            <button
              onClick={() => navigate("/apoios-externos")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <Secao titulo="Dados do Apoio">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Campo titulo="Órgão apoiado" valor={apoio.orgao} />
              <Campo titulo="Unidade" valor={apoio.unidade} />
              <Campo titulo="Nome da operação" valor={apoio.nome_operacao} />
              <Campo titulo="Número do procedimento" valor={apoio.numero_procedimento} />
              <Campo titulo="Data e hora" valor={formatarDataHora(apoio.data, apoio.hora)} />
              <Campo
                titulo="Local"
                valor={[apoio.local, apoio.cidade].filter(Boolean).join(" - ")}
              />
              <div className="md:col-span-2">
                <Campo titulo="Observações" valor={apoio.observacoes} />
              </div>
            </div>
          </Secao>

          <Secao titulo="Equipe PM">
            <div className="mb-4">
              <Campo
                titulo="Comandante"
                valor={[
                  apoio.comandante_posto_graduacao,
                  apoio.comandante_nome,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>

            <p className="text-sm font-semibold text-gray-600 mb-2">Integrantes</p>

            {integrantes.length === 0 ? (
              <p className="text-gray-500">Nenhum integrante informado.</p>
            ) : (
              <div className="overflow-x-auto border rounded">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="border-b px-3 py-2">Posto/Graduação</th>
                      <th className="border-b px-3 py-2">Nome</th>
                      <th className="border-b px-3 py-2">CPF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrantes.map((integrante, index) => (
                      <tr key={integrante.user_id || index}>
                        <td className="border-b px-3 py-2">
                          {integrante.posto_graduacao || "-"}
                        </td>
                        <td className="border-b px-3 py-2">
                          {integrante.nome || "-"}
                        </td>
                        <td className="border-b px-3 py-2">
                          {integrante.cpf || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>

          <Secao titulo="Materiais Apreendidos">
            {itens.length === 0 ? (
              <p className="text-gray-500">Nenhum material registrado.</p>
            ) : (
              <div className="overflow-x-auto border rounded">
                <table className="w-full border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="border-b px-3 py-2">Item</th>
                      <th className="border-b px-3 py-2">Tipo / Material</th>
                      <th className="border-b px-3 py-2">Qtd.</th>
                      <th className="border-b px-3 py-2">Nº Série</th>
                      <th className="border-b px-3 py-2">Patrimônio</th>
                      <th className="border-b px-3 py-2">Descrição</th>
                      <th className="border-b px-3 py-2">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, index) => (
                      <tr key={item.id}>
                        <td className="border-b px-3 py-2">
                          {item.numero_item ?? index + 1}
                        </td>
                        <td className="border-b px-3 py-2">
                          <div className="font-medium">{item.item_nome || "-"}</div>
                          <div className="text-xs text-gray-500">
                            {item.tipo_categoria || "-"}
                          </div>
                        </td>
                        <td className="border-b px-3 py-2">{item.quantidade || "-"}</td>
                        <td className="border-b px-3 py-2">{item.numero_serie || "-"}</td>
                        <td className="border-b px-3 py-2">{item.patrimonio || "-"}</td>
                        <td className="border-b px-3 py-2 whitespace-pre-wrap">
                          {item.descricao || "-"}
                        </td>
                        <td className="border-b px-3 py-2 whitespace-pre-wrap">
                          {item.observacao || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>

          <Secao titulo="Entrega dos Materiais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Campo titulo="Órgão recebedor" valor={apoio.entrega_orgao} />
              <Campo titulo="Unidade recebedora" valor={apoio.entrega_unidade} />
              <Campo titulo="Responsável pelo recebimento" valor={apoio.responsavel_nome} />
              <Campo titulo="Função/Cargo" valor={apoio.responsavel_funcao} />
              <Campo titulo="Documento/Matrícula" valor={apoio.responsavel_documento} />
              <Campo
                titulo="Data e hora da entrega"
                valor={formatarDataHora(apoio.entrega_data, apoio.entrega_hora)}
              />
              <div className="md:col-span-2">
                <Campo titulo="Observações da entrega" valor={apoio.observacoes_entrega} />
              </div>
            </div>
          </Secao>
        </div>
      </div>
    </div>
  );
}
