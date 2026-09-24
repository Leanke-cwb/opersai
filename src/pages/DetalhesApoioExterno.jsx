import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ESTILO_TABELA_IMPRESSAO,
  adicionarRodapePaginas,
  escreverParagrafoFormal,
  garantirEspaco,
  tituloSecao,
} from "../utils/pdfFormal";

function textoPDF(valor, padrao = "-") {
  const texto =
    valor === null || valor === undefined || String(valor).trim() === ""
      ? padrao
      : String(valor).trim();

  return texto.toLocaleUpperCase("pt-BR");
}

function formatarCPF(valor) {
  if (!valor) return "-";

  const digitos = String(valor).replace(/\D/g, "");
  if (digitos.length !== 11) return String(valor);

  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(
    6,
    9,
  )}-${digitos.slice(9, 11)}`;
}

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

const ITEM_VAZIO = {
  numero_item: "",
  tipo_categoria: "",
  item_nome: "",
  quantidade: "",
  numero_serie: "",
  patrimonio: "",
  descricao: "",
  observacao: "",
};

function textoOuNull(valor) {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

export default function DetalhesApoioExterno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [apoio, setApoio] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  // Edição dos materiais do apoio
  const [itemEditandoId, setItemEditandoId] = useState(null);
  const [mostrarFormularioItem, setMostrarFormularioItem] = useState(false);
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [excluindoItemId, setExcluindoItemId] = useState(null);
  const [formItem, setFormItem] = useState(ITEM_VAZIO);

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

  function cancelarEdicaoItem() {
    setItemEditandoId(null);
    setMostrarFormularioItem(false);
    setFormItem(ITEM_VAZIO);
  }

  function abrirNovoItem() {
    const maiorNumero = itens.reduce((maior, item) => {
      const numero = Number(item?.numero_item);
      return Number.isFinite(numero) ? Math.max(maior, numero) : maior;
    }, 0);

    setItemEditandoId(null);
    setFormItem({
      ...ITEM_VAZIO,
      numero_item: String(maiorNumero + 1),
      quantidade: "1",
    });
    setMostrarFormularioItem(true);
  }

  function abrirEdicaoItem(item) {
    setItemEditandoId(item.id);
    setFormItem({
      numero_item: item.numero_item ?? "",
      tipo_categoria: item.tipo_categoria ?? "",
      item_nome: item.item_nome ?? "",
      quantidade: item.quantidade ?? "",
      numero_serie: item.numero_serie ?? "",
      patrimonio: item.patrimonio ?? "",
      descricao: item.descricao ?? "",
      observacao: item.observacao ?? "",
    });
    setMostrarFormularioItem(true);
  }

  function atualizarCampoItem(campo, valor) {
    setFormItem((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function salvarItem(event) {
    event.preventDefault();
    if (salvandoItem) return;

    const numeroItem =
      String(formItem.numero_item ?? "").trim() === ""
        ? null
        : Number(formItem.numero_item);

    if (numeroItem !== null && (!Number.isInteger(numeroItem) || numeroItem < 1)) {
      alert("Informe um número de item válido.");
      return;
    }

    const agora = new Date().toISOString();
    const dadosItem = {
      numero_item: numeroItem,
      tipo_categoria: textoOuNull(formItem.tipo_categoria),
      item_nome: textoOuNull(formItem.item_nome),
      quantidade: textoOuNull(formItem.quantidade),
      numero_serie: textoOuNull(formItem.numero_serie),
      patrimonio: textoOuNull(formItem.patrimonio),
      descricao: textoOuNull(formItem.descricao),
      observacao: textoOuNull(formItem.observacao),
      updated_at: agora,
    };

    try {
      setSalvandoItem(true);

      if (itemEditandoId) {
        const { error } = await supabase
          .from("apoio_itens")
          .update(dadosItem)
          .eq("id", itemEditandoId)
          .eq("apoio_id", id)
          .eq("deleted", false);

        if (error) throw error;
        alert("Material atualizado com sucesso.");
      } else {
        if (!window.crypto?.randomUUID) {
          throw new Error(
            "Este navegador não conseguiu gerar o identificador do novo material.",
          );
        }

        const { error } = await supabase.from("apoio_itens").insert({
          id: window.crypto.randomUUID(),
          apoio_id: id,
          ...dadosItem,
          created_at: agora,
          deleted: false,
        });

        if (error) throw error;
        alert("Material adicionado com sucesso.");
      }

      cancelarEdicaoItem();
      await carregarDetalhes();
    } catch (error) {
      console.error("Erro ao salvar material do apoio:", error);
      alert(error?.message || "Não foi possível salvar o material.");
    } finally {
      setSalvandoItem(false);
    }
  }

  async function excluirItem(item) {
    if (!item?.id || excluindoItemId) return;

    const confirmado = window.confirm(
      `Confirma a exclusão do item ${item.numero_item ?? ""} - ${
        item.item_nome || "material"
      }?`,
    );

    if (!confirmado) return;

    try {
      setExcluindoItemId(item.id);

      // Exclusão lógica: o histórico permanece no banco, mas o item deixa de
      // aparecer nesta tela porque a consulta usa deleted = false.
      const { error } = await supabase
        .from("apoio_itens")
        .update({
          deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("apoio_id", id)
        .eq("deleted", false);

      if (error) throw error;

      if (itemEditandoId === item.id) {
        cancelarEdicaoItem();
      }

      alert("Material excluído com sucesso.");
      await carregarDetalhes();
    } catch (error) {
      console.error("Erro ao excluir material do apoio:", error);
      alert(error?.message || "Não foi possível excluir o material.");
    } finally {
      setExcluindoItemId(null);
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

    const logoPMPR =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";
    const logoCOGER =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/brasao.png";

    const dataEntrega = textoPDF(
      formatarDataPorExtenso(apoio.entrega_data || apoio.data),
    );
    const horaEntrega = formatarHora(apoio.entrega_hora);

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
    doc.setLineWidth(0.25);
    doc.line(15, 40, pageWidth - 15, 40);

    doc.setFontSize(12);
    doc.text("TERMO DE ENTREGA DE MATERIAL", pageWidth / 2, 50, {
      align: "center",
    });

    const referenciaUnidade = apoio.unidade
      ? `, unidade ${textoPDF(apoio.unidade)}`
      : "";
    const referenciaOperacao = apoio.nome_operacao
      ? `, no contexto da operação ${textoPDF(apoio.nome_operacao)}`
      : "";
    const referenciaProcedimento = apoio.numero_procedimento
      ? `, referente ao procedimento nº ${textoPDF(apoio.numero_procedimento)}`
      : "";
    const referenciaLocal = [apoio.local, apoio.cidade]
      .filter(Boolean)
      .map((valor) => textoPDF(valor))
      .join(", município de ");
    const referenciaEntregaUnidade = apoio.entrega_unidade
      ? `, unidade ${textoPDF(apoio.entrega_unidade)}`
      : "";

    let y = 62;

    y = escreverParagrafoFormal(
      doc,
      `Aos ${dataEntrega}${
        horaEntrega !== "-" ? `, às ${horaEntrega}` : ""
      }, faço a entrega dos materiais relacionados e discriminados a seguir, apreendidos durante apoio prestado ao(à) ${textoPDF(
        apoio.orgao,
      )}${referenciaUnidade}${referenciaOperacao}${referenciaProcedimento}.`,
      y,
    );

    y = escreverParagrafoFormal(
      doc,
      `Os materiais foram arrecadados pela equipe da Polícia Militar do Paraná, sob comando do(a) ${textoPDF(
        apoio.comandante_posto_graduacao,
        "",
      )} ${textoPDF(apoio.comandante_nome)}, CPF ${textoPDF(
        apoio.comandante_cpf,
      )}${
        referenciaLocal ? `, durante atuação realizada em ${referenciaLocal}` : ""
      }.`,
      y,
    );

    y = escreverParagrafoFormal(
      doc,
      `Após a apreensão, os materiais foram entregues ao(à) ${textoPDF(
        apoio.entrega_orgao || apoio.orgao,
      )}${referenciaEntregaUnidade}, ao(à) responsável abaixo identificado(a).`,
      y,
    );

    y = tituloSecao(doc, "Materiais Entregues", y + 2, { alturaReserva: 24 });

    autoTable(doc, {
      ...ESTILO_TABELA_IMPRESSAO,
      startY: y,
      head: [
        [
          "ITEM Nº",
          "QUANTIDADE",
          "GRUPO",
          "DESCRIÇÃO",
          "Nº SÉRIE",
          "PATRIMÔNIO",
          "OBSERVAÇÃO",
        ],
      ],
      body: itens.map((item, index) => [
        item.numero_item ?? index + 1,
        textoPDF(item.quantidade),
        textoPDF(item.item_nome || item.tipo_categoria),
        textoPDF(item.descricao),
        textoPDF(item.numero_serie),
        textoPDF(item.patrimonio),
        textoPDF(item.observacao),
      ]),
      margin: { left: 15, right: 15, bottom: 20 },
      styles: {
        ...ESTILO_TABELA_IMPRESSAO.styles,
        fontSize: 8.5,
        cellPadding: 2.2,
      },
    });

    let yFinal = doc.lastAutoTable?.finalY || y + 30;
    yFinal = garantirEspaco(doc, yFinal + 12, apoio.observacoes_entrega ? 66 : 52);
    yFinal = tituloSecao(doc, "Identificação do Recebedor", yFinal, {
      alturaReserva: 45,
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(`NOME COMPLETO: ${textoPDF(apoio.responsavel_nome)}`, 15, yFinal + 3);
    doc.text(`FUNÇÃO/CARGO: ${textoPDF(apoio.responsavel_funcao)}`, 15, yFinal + 12);
    doc.text(
      `CPF: ${textoPDF(formatarCPF(apoio.responsavel_documento))}`,
      15,
      yFinal + 21,
    );

    let yAssinatura = yFinal + 31;

    if (apoio.observacoes_entrega) {
      const linhasObs = doc.splitTextToSize(
        `OBSERVAÇÕES: ${textoPDF(apoio.observacoes_entrega)}`,
        pageWidth - 30,
      );
      doc.text(linhasObs, 15, yAssinatura);
      yAssinatura += linhasObs.length * 5.5 + 8;
    }

    yAssinatura = garantirEspaco(doc, yAssinatura, 24);
    doc.line(55, yAssinatura + 10, 155, yAssinatura + 10);
    doc.setFontSize(9);
    doc.text("ASSINATURA DO(A) RECEBEDOR(A)", 105, yAssinatura + 16, {
      align: "center",
    });

    adicionarRodapePaginas(doc);

    const orgaoArquivo = sanitizarNomeArquivo(apoio.orgao || "APOIO");
    const dataArquivo = String(apoio.data || apoio.entrega_data || "")
      .replace(/-/g, "")
      .trim();

    doc.save(
      `termo_apoio_${orgaoArquivo}${dataArquivo ? `_${dataArquivo}` : ""}.pdf`,
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
      <div className="gecor-work-page min-h-screen bg-gray-100 py-8 px-4">
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
      <div className="gecor-work-panel max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6">
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
            <div className="flex flex-wrap justify-end gap-2 mb-4">
              <button
                type="button"
                onClick={abrirNovoItem}
                disabled={salvandoItem}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded"
              >
                + Adicionar Material
              </button>
            </div>

            {mostrarFormularioItem && (
              <form
                onSubmit={salvarItem}
                className="mb-5 border border-blue-200 bg-blue-50 rounded-lg p-4"
              >
                <h3 className="font-bold text-gray-800 mb-4">
                  {itemEditandoId ? "Editar material" : "Adicionar material"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Item nº</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formItem.numero_item}
                      onChange={(e) => atualizarCampoItem("numero_item", e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Categoria</span>
                    <input
                      type="text"
                      value={formItem.tipo_categoria}
                      onChange={(e) =>
                        atualizarCampoItem("tipo_categoria", e.target.value)
                      }
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Material</span>
                    <input
                      type="text"
                      value={formItem.item_nome}
                      onChange={(e) => atualizarCampoItem("item_nome", e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Quantidade</span>
                    <input
                      type="text"
                      value={formItem.quantidade}
                      onChange={(e) => atualizarCampoItem("quantidade", e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Nº Série</span>
                    <input
                      type="text"
                      value={formItem.numero_serie}
                      onChange={(e) => atualizarCampoItem("numero_serie", e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Patrimônio</span>
                    <input
                      type="text"
                      value={formItem.patrimonio}
                      onChange={(e) => atualizarCampoItem("patrimonio", e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>

                  <label className="block md:col-span-3">
                    <span className="text-sm font-semibold text-gray-700">Descrição</span>
                    <textarea
                      rows="3"
                      value={formItem.descricao}
                      onChange={(e) => atualizarCampoItem("descricao", e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>

                  <label className="block md:col-span-3">
                    <span className="text-sm font-semibold text-gray-700">Observação</span>
                    <textarea
                      rows="3"
                      value={formItem.observacao}
                      onChange={(e) => atualizarCampoItem("observacao", e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-full bg-white"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="submit"
                    disabled={salvandoItem}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded"
                  >
                    {salvandoItem
                      ? "Salvando..."
                      : itemEditandoId
                        ? "Salvar Alterações"
                        : "Adicionar Material"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelarEdicaoItem}
                    disabled={salvandoItem}
                    className="bg-gray-500 hover:bg-gray-600 disabled:opacity-60 text-white px-4 py-2 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {itens.length === 0 ? (
              <p className="text-gray-500">Nenhum material registrado.</p>
            ) : (
              <div className="overflow-x-auto border rounded">
                <table className="w-full border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="border-b px-3 py-2">Item</th>
                      <th className="border-b px-3 py-2">Tipo / Material</th>
                      <th className="border-b px-3 py-2">Qtd.</th>
                      <th className="border-b px-3 py-2">Nº Série</th>
                      <th className="border-b px-3 py-2">Patrimônio</th>
                      <th className="border-b px-3 py-2">Descrição</th>
                      <th className="border-b px-3 py-2">Observação</th>
                      <th className="border-b px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, index) => (
                      <tr key={item.id} className="align-top">
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
                        <td className="border-b px-3 py-2">
                          <div className="flex flex-col gap-2 min-w-[105px]">
                            <button
                              type="button"
                              onClick={() => abrirEdicaoItem(item)}
                              disabled={salvandoItem || excluindoItemId === item.id}
                              className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white px-3 py-1.5 rounded text-sm"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirItem(item)}
                              disabled={salvandoItem || excluindoItemId === item.id}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-sm"
                            >
                              {excluindoItemId === item.id ? "Excluindo..." : "Excluir"}
                            </button>
                          </div>
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
              <Campo titulo="CPF" valor={formatarCPF(apoio.responsavel_documento)} />
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
