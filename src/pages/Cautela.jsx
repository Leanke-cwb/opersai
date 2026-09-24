import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
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

const MATERIAL_VAZIO = {
  tipo_categoria: "",
  item_nome: "",
  quantidade: "",
  numero_serie: "",
  patrimonio: "",
  descricao: "",
  observacao: "",
};

export default function Cautela() {
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoMaterial, setSalvandoMaterial] = useState(false);
  const [novoMaterial, setNovoMaterial] = useState(MATERIAL_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [materialEdicao, setMaterialEdicao] = useState(MATERIAL_VAZIO);

  const [form, setForm] = useState({
    sede: "",
    enderecoEntrega: "",
    bairroEntrega: "",
    cidadeEntrega: "",
    nomeRecebedor: "",
    cpfRecebedor: "",
  });

  const formatarCPF = (valor) => {
    if (!valor) return "";
    return valor
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  };

  useEffect(() => {
    async function buscarDados() {
      try {
        const alvoId =
          localStorage.getItem("alvoId") || localStorage.getItem("alvo_id");

        if (!alvoId) {
          console.error("❌ Nenhum alvo selecionado.");
          setCarregando(false);
          return;
        }

        const { data: alvo, error: erroAlvo } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .single();

        if (erroAlvo) throw erroAlvo;

        const { data: operacao, error: erroOp } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", alvo?.operacao_id)
          .single();

        if (erroOp) throw erroOp;

        const { data: cumprimento, error: erroCumpr } = await supabase
          .from("cumprimento_mandado")
          .select(
            "id, comandante_nome, comandante_cpf, comandante_posto_graduacao, policiais_apoio",
          )
          .eq("alvo_id", alvo.id)
          .maybeSingle();

        if (erroCumpr) {
          console.warn("⚠️ Nenhum comandante encontrado para esta operação.");
        }

        const { data: materiais, error: erroMateriais } = await supabase
          .from("materiais_apreendidos")
          .select("*")
          .eq("alvo_id", alvo.id)
          .order("created_at", { ascending: true });

        if (erroMateriais) throw erroMateriais;

        const comandante = cumprimento?.comandante_nome || "-";
        const cpf_comandante = cumprimento?.comandante_cpf || "-";
        const posto_graduacao =
          cumprimento?.comandante_posto_graduacao || "-";

        setDados({
          alvo,
          operacao,
          cumprimento_id: cumprimento?.id || null,
          comandante,
          cpf_comandante,
          posto_graduacao,
          policiais_apoio: Array.isArray(cumprimento?.policiais_apoio)
            ? cumprimento.policiais_apoio
            : [],
          materiais: materiais || [],
        });
      } catch (err) {
        console.error("❌ Erro ao carregar dados:", err.message);
      } finally {
        setCarregando(false);
      }
    }

    buscarDados();
  }, []);

  const atualizarCampoNovoMaterial = (campo, valor) => {
    setNovoMaterial((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const atualizarCampoEdicao = (campo, valor) => {
    setMaterialEdicao((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const adicionarMaterial = async () => {
    if (!dados?.alvo?.id) {
      alert("Alvo não identificado.");
      return;
    }

    if (!novoMaterial.tipo_categoria.trim()) {
      alert("Informe a categoria do material.");
      return;
    }

    if (!novoMaterial.item_nome.trim()) {
      alert("Informe o nome/grupo do material.");
      return;
    }

    try {
      setSalvandoMaterial(true);

      const primeiroMaterial = dados?.materiais?.[0] || null;

      const materialParaInserir = {
        cumprimento_id:
          dados?.cumprimento_id || primeiroMaterial?.cumprimento_id || null,
        alvo_id: dados.alvo.id,
        auto_id: primeiroMaterial?.auto_id || null,
        tipo_categoria: novoMaterial.tipo_categoria.trim(),
        item_nome: novoMaterial.item_nome.trim(),
        quantidade: novoMaterial.quantidade.trim() || null,
        numero_serie: novoMaterial.numero_serie.trim() || null,
        patrimonio: novoMaterial.patrimonio.trim() || null,
        descricao: novoMaterial.descricao.trim() || null,
        observacao: novoMaterial.observacao.trim() || null,
      };

      const { data: materialCriado, error } = await supabase
        .from("materiais_apreendidos")
        .insert(materialParaInserir)
        .select("*")
        .single();

      if (error) throw error;

      setDados((anterior) => ({
        ...anterior,
        materiais: [...(anterior?.materiais || []), materialCriado],
      }));

      setNovoMaterial(MATERIAL_VAZIO);
      alert("Material adicionado com sucesso.");
    } catch (err) {
      console.error("❌ Erro ao adicionar material:", err);
      alert(`Erro ao adicionar material: ${err.message}`);
    } finally {
      setSalvandoMaterial(false);
    }
  };

  const iniciarEdicao = (item) => {
    setEditandoId(item.id);
    setMaterialEdicao({
      tipo_categoria: item.tipo_categoria || "",
      item_nome: item.item_nome || "",
      quantidade: item.quantidade || "",
      numero_serie: item.numero_serie || "",
      patrimonio: item.patrimonio || "",
      descricao: item.descricao || "",
      observacao: item.observacao || "",
    });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setMaterialEdicao(MATERIAL_VAZIO);
  };

  const salvarEdicao = async (itemId) => {
    if (!materialEdicao.tipo_categoria.trim()) {
      alert("Informe a categoria do material.");
      return;
    }

    if (!materialEdicao.item_nome.trim()) {
      alert("Informe o nome/grupo do material.");
      return;
    }

    try {
      setSalvandoMaterial(true);

      const atualizacao = {
        tipo_categoria: materialEdicao.tipo_categoria.trim(),
        item_nome: materialEdicao.item_nome.trim(),
        quantidade: materialEdicao.quantidade.trim() || null,
        numero_serie: materialEdicao.numero_serie.trim() || null,
        patrimonio: materialEdicao.patrimonio.trim() || null,
        descricao: materialEdicao.descricao.trim() || null,
        observacao: materialEdicao.observacao.trim() || null,
      };

      const { data: materialAtualizado, error } = await supabase
        .from("materiais_apreendidos")
        .update(atualizacao)
        .eq("id", itemId)
        .select("*")
        .single();

      if (error) throw error;

      setDados((anterior) => ({
        ...anterior,
        materiais: (anterior?.materiais || []).map((item) =>
          item.id === itemId ? materialAtualizado : item,
        ),
      }));

      cancelarEdicao();
      alert("Material atualizado com sucesso.");
    } catch (err) {
      console.error("❌ Erro ao atualizar material:", err);
      alert(`Erro ao atualizar material: ${err.message}`);
    } finally {
      setSalvandoMaterial(false);
    }
  };

  const excluirMaterial = async (item) => {
    const confirmar = window.confirm(
      `Deseja realmente excluir o material "${item.item_nome}"?`,
    );

    if (!confirmar) return;

    try {
      setSalvandoMaterial(true);

      const { error } = await supabase
        .from("materiais_apreendidos")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setDados((anterior) => ({
        ...anterior,
        materiais: (anterior?.materiais || []).filter(
          (material) => material.id !== item.id,
        ),
      }));

      if (editandoId === item.id) {
        cancelarEdicao();
      }

      alert("Material excluído com sucesso.");
    } catch (err) {
      console.error("❌ Erro ao excluir material:", err);
      alert(`Erro ao excluir material: ${err.message}`);
    } finally {
      setSalvandoMaterial(false);
    }
  };

  const formatarDataPorExtenso = () => {
    const data = new Date();
    return data.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const gerarPDF = () => {
    if (!dados) return alert("Os dados ainda não foram carregados!");

    const doc = new jsPDF();
    const dataAtual = formatarDataPorExtenso();
    const pageWidth = doc.internal.pageSize.getWidth();

    const logoPMPR =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";
    const logoCOGER =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/brasao.png";

    doc.addImage(logoPMPR, "PNG", pageWidth - 40, 10, 25, 25);
    doc.addImage(logoCOGER, "PNG", 15, 10, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("POLÍCIA MILITAR DO PARANÁ", pageWidth / 2, 20, {
      align: "center",
    });
    doc.text("CORREGEDORIA-GERAL", pageWidth / 2, 27, { align: "center" });
    doc.setLineWidth(0.25);
    doc.line(15, 40, pageWidth - 15, 40);

    doc.setFontSize(12);
    doc.text("TERMO DE ENTREGA DE MATERIAL", pageWidth / 2, 50, {
      align: "center",
    });

    let y = 62;

    y = escreverParagrafoFormal(
      doc,
      `Aos ${dataAtual}, faço a entrega dos materiais relacionados e discriminados a seguir, apreendidos em decorrência de medida cautelar exarada nos autos nº ${textoPDF(
        dados?.operacao?.numero_autos,
      )}.`,
      y,
    );

    y = escreverParagrafoFormal(
      doc,
      `Os materiais foram arrecadados pelo(a) ${textoPDF(
        dados?.posto_graduacao,
        "",
      )} ${textoPDF(dados?.comandante)}, CPF ${textoPDF(
        dados?.cpf_comandante,
      )}, e encontravam-se sob posse do(a) ${textoPDF(
        dados?.alvo?.nome,
      )}, CPF ${textoPDF(dados?.alvo?.cpf)}, no endereço ${textoPDF(
        dados?.alvo?.endereco,
      )}, bairro ${textoPDF(dados?.alvo?.bairro)}, município de ${textoPDF(
        dados?.alvo?.cidade,
      )}.`,
      y,
    );

    y = escreverParagrafoFormal(
      doc,
      `Após a apreensão, os materiais foram entregues na sede do(a) ${textoPDF(
        form.sede,
      )}, situada à ${textoPDF(form.enderecoEntrega)}, bairro ${textoPDF(
        form.bairroEntrega,
      )}, município de ${textoPDF(
        form.cidadeEntrega,
      )}, Estado do Paraná, ao(à) recebedor(a) abaixo identificado(a).`,
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
      body:
        dados?.materiais?.map((item, index) => [
          index + 1,
          textoPDF(item.quantidade),
          textoPDF(item.item_nome),
          textoPDF(item.descricao),
          textoPDF(item.numero_serie),
          textoPDF(item.patrimonio),
          textoPDF(item.observacao),
        ]) || [],
      margin: { left: 15, right: 15, bottom: 20 },
      styles: {
        ...ESTILO_TABELA_IMPRESSAO.styles,
        fontSize: 8.5,
        cellPadding: 2.2,
      },
    });

    let yFinal = doc.lastAutoTable?.finalY || y + 30;

    if (dados?.policiais_apoio?.length > 0) {
      yFinal = garantirEspaco(doc, yFinal + 10, 35);
      yFinal = tituloSecao(doc, "Policiais de Apoio", yFinal, {
        alturaReserva: 28,
      });

      autoTable(doc, {
        ...ESTILO_TABELA_IMPRESSAO,
        startY: yFinal,
        head: [["POSTO/GRADUAÇÃO", "NOME COMPLETO", "CPF", "UNIDADE"]],
        body: dados.policiais_apoio.map((policial) => [
          textoPDF(policial?.posto_graduacao),
          textoPDF(policial?.nome),
          textoPDF(policial?.cpf || policial?.rg_matricula),
          textoPDF(policial?.unidade),
        ]),
        margin: { left: 15, right: 15, bottom: 20 },
      });

      yFinal = doc.lastAutoTable?.finalY || yFinal + 30;
    }

    yFinal = garantirEspaco(doc, yFinal + 12, 48);
    yFinal = tituloSecao(doc, "Identificação do Recebedor", yFinal, {
      alturaReserva: 42,
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(`NOME COMPLETO: ${textoPDF(form.nomeRecebedor)}`, 15, yFinal + 3);
    doc.text(
      `CPF: ${textoPDF(formatarCPF(form.cpfRecebedor) || "-")}`,
      15,
      yFinal + 12,
    );

    doc.line(55, yFinal + 29, 155, yFinal + 29);
    doc.setFontSize(9);
    doc.text("ASSINATURA DO(A) RECEBEDOR(A)", 105, yFinal + 35, {
      align: "center",
    });

    adicionarRodapePaginas(doc);

    const sanitizarNomeArquivo = (texto) => {
      return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .toUpperCase();
    };

    const nomeOperacao = sanitizarNomeArquivo(dados?.operacao?.nome_operacao);
    const numeroAlvo = dados?.alvo?.numero_alvo || "0";

    doc.save(`termo_cautela_${nomeOperacao}_alvo_${numeroAlvo}.pdf`);
  };

  if (carregando) {
    return (
      <p className="text-center mt-10 text-gray-600">Carregando dados...</p>
    );
  }

  if (!dados) {
    return (
      <p className="text-center mt-10 text-red-600">
        Nenhum dado encontrado. Selecione uma operação na tela anterior.
      </p>
    );
  }

  return (
    <div className="gecor-work-panel max-w-5xl mx-auto p-6 bg-white shadow rounded mt-10">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-2 rounded"
        >
          Voltar
        </button>
        <h2 className="text-xl font-bold text-center flex-1">
          Termo de Entrega - Cautela
        </h2>
      </div>

      <p className="mb-6 text-justify whitespace-pre-line">
        Aos {formatarDataPorExtenso()}, faço a entrega dos materiais
        relacionados e discriminados a seguir, apreendidos em decorrência de
        medida cautelar exarada nos autos nº{" "}
        <b>{dados?.operacao?.numero_autos || "-"}</b>. Os materiais, arrecadados
        pelo(a){" "}
        <b>
          {dados?.posto_graduacao || ""} {dados?.comandante || "-"}
        </b>
        , CPF <b>{dados?.cpf_comandante || "-"}</b>, se encontravam sob posse
        do(a) <b>{dados?.alvo?.nome || "-"}</b>, CPF{" "}
        <b>{dados?.alvo?.cpf || "-"}</b>, no endereço sito à{" "}
        <b>{dados?.alvo?.endereco || "-"}</b>, bairro{" "}
        <b>{dados?.alvo?.bairro || "-"}</b>, na cidade de{" "}
        <b>{dados?.alvo?.cidade || "-"}</b>, sendo que após a apreensão foram
        entregues na sede do(a):
      </p>

      <div className="mb-6 space-y-3">
        <label className="block">
          <span className="font-semibold">Sede:</span>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={form.sede}
            onChange={(e) => setForm({ ...form, sede: e.target.value })}
            placeholder="Ex: 1ª CIPM / COGER"
          />
        </label>

        <label className="block">
          <span className="font-semibold">Endereço de entrega:</span>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={form.enderecoEntrega}
            onChange={(e) =>
              setForm({ ...form, enderecoEntrega: e.target.value })
            }
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label>
            <span className="font-semibold">Bairro:</span>
            <input
              type="text"
              className="border p-2 rounded w-full"
              value={form.bairroEntrega}
              onChange={(e) =>
                setForm({ ...form, bairroEntrega: e.target.value })
              }
            />
          </label>

          <label className="col-span-2">
            <span className="font-semibold">Cidade:</span>
            <input
              type="text"
              className="border p-2 rounded w-full"
              value={form.cidadeEntrega}
              onChange={(e) =>
                setForm({ ...form, cidadeEntrega: e.target.value })
              }
            />
          </label>
        </div>

        <h3 className="mt-4 font-semibold">Dados do Recebedor:</h3>
        <label className="block">
          <span className="font-semibold">Nome completo:</span>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={form.nomeRecebedor}
            onChange={(e) =>
              setForm({ ...form, nomeRecebedor: e.target.value })
            }
          />
        </label>

        <label className="block">
          <span className="font-semibold">CPF do Recebedor:</span>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={form.cpfRecebedor}
            onChange={(e) =>
              setForm({ ...form, cpfRecebedor: formatarCPF(e.target.value) })
            }
            maxLength={14}
          />
        </label>
      </div>

      <div className="mb-8">
        <h3 className="font-semibold mb-2">Materiais Apreendidos:</h3>

        <div className="overflow-x-auto">
          <table className="w-full border mb-4 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Item nº</th>
                <th className="border p-2">Categoria</th>
                <th className="border p-2">Quantidade</th>
                <th className="border p-2">Grupo</th>
                <th className="border p-2">Descrição</th>
                <th className="border p-2">Nº Série</th>
                <th className="border p-2">Patrimônio</th>
                <th className="border p-2">Observação</th>
                <th className="border p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados?.materiais?.length > 0 ? (
                dados.materiais.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{item.tipo_categoria || "-"}</td>
                      <td className="border p-2 text-center">
                        {item.quantidade || "-"}
                      </td>
                      <td className="border p-2">{item.item_nome || "-"}</td>
                      <td className="border p-2">{item.descricao || "-"}</td>
                      <td className="border p-2">{item.numero_serie || "-"}</td>
                      <td className="border p-2">{item.patrimonio || "-"}</td>
                      <td className="border p-2">{item.observacao || "-"}</td>
                      <td className="border p-2">
                        <div className="flex flex-col gap-2 min-w-24">
                          <button
                            type="button"
                            onClick={() => iniciarEdicao(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                            disabled={salvandoMaterial}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirMaterial(item)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                            disabled={salvandoMaterial}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editandoId === item.id && (
                      <tr>
                        <td colSpan="9" className="border p-4 bg-blue-50">
                          <h4 className="font-semibold mb-3">
                            Editar material nº {index + 1}
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label>
                              <span className="font-semibold">Categoria *</span>
                              <input
                                type="text"
                                className="border p-2 rounded w-full"
                                value={materialEdicao.tipo_categoria}
                                onChange={(e) =>
                                  atualizarCampoEdicao(
                                    "tipo_categoria",
                                    e.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span className="font-semibold">Grupo / Item *</span>
                              <input
                                type="text"
                                className="border p-2 rounded w-full"
                                value={materialEdicao.item_nome}
                                onChange={(e) =>
                                  atualizarCampoEdicao("item_nome", e.target.value)
                                }
                              />
                            </label>

                            <label>
                              <span className="font-semibold">Quantidade</span>
                              <input
                                type="text"
                                className="border p-2 rounded w-full"
                                value={materialEdicao.quantidade}
                                onChange={(e) =>
                                  atualizarCampoEdicao("quantidade", e.target.value)
                                }
                              />
                            </label>

                            <label>
                              <span className="font-semibold">Nº Série</span>
                              <input
                                type="text"
                                className="border p-2 rounded w-full"
                                value={materialEdicao.numero_serie}
                                onChange={(e) =>
                                  atualizarCampoEdicao("numero_serie", e.target.value)
                                }
                              />
                            </label>

                            <label>
                              <span className="font-semibold">Patrimônio</span>
                              <input
                                type="text"
                                className="border p-2 rounded w-full"
                                value={materialEdicao.patrimonio}
                                onChange={(e) =>
                                  atualizarCampoEdicao("patrimonio", e.target.value)
                                }
                              />
                            </label>

                            <label>
                              <span className="font-semibold">Descrição</span>
                              <input
                                type="text"
                                className="border p-2 rounded w-full"
                                value={materialEdicao.descricao}
                                onChange={(e) =>
                                  atualizarCampoEdicao("descricao", e.target.value)
                                }
                              />
                            </label>

                            <label className="md:col-span-2">
                              <span className="font-semibold">Observação</span>
                              <textarea
                                className="border p-2 rounded w-full"
                                rows={3}
                                value={materialEdicao.observacao}
                                onChange={(e) =>
                                  atualizarCampoEdicao("observacao", e.target.value)
                                }
                              />
                            </label>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => salvarEdicao(item.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                              disabled={salvandoMaterial}
                            >
                              {salvandoMaterial ? "Salvando..." : "Salvar Alterações"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelarEdicao}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                              disabled={salvandoMaterial}
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center border p-3">
                    Nenhum material cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border rounded p-4 bg-gray-50">
          <h4 className="font-semibold mb-3">Adicionar novo material</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label>
              <span className="font-semibold">Categoria *</span>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={novoMaterial.tipo_categoria}
                onChange={(e) =>
                  atualizarCampoNovoMaterial("tipo_categoria", e.target.value)
                }
              />
            </label>

            <label>
              <span className="font-semibold">Grupo / Item *</span>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={novoMaterial.item_nome}
                onChange={(e) =>
                  atualizarCampoNovoMaterial("item_nome", e.target.value)
                }
              />
            </label>

            <label>
              <span className="font-semibold">Quantidade</span>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={novoMaterial.quantidade}
                onChange={(e) =>
                  atualizarCampoNovoMaterial("quantidade", e.target.value)
                }
              />
            </label>

            <label>
              <span className="font-semibold">Nº Série</span>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={novoMaterial.numero_serie}
                onChange={(e) =>
                  atualizarCampoNovoMaterial("numero_serie", e.target.value)
                }
              />
            </label>

            <label>
              <span className="font-semibold">Patrimônio</span>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={novoMaterial.patrimonio}
                onChange={(e) =>
                  atualizarCampoNovoMaterial("patrimonio", e.target.value)
                }
              />
            </label>

            <label>
              <span className="font-semibold">Descrição</span>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={novoMaterial.descricao}
                onChange={(e) =>
                  atualizarCampoNovoMaterial("descricao", e.target.value)
                }
              />
            </label>

            <label className="md:col-span-2">
              <span className="font-semibold">Observação</span>
              <textarea
                className="border p-2 rounded w-full"
                rows={3}
                value={novoMaterial.observacao}
                onChange={(e) =>
                  atualizarCampoNovoMaterial("observacao", e.target.value)
                }
              />
            </label>
          </div>

          <button
            type="button"
            onClick={adicionarMaterial}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            disabled={salvandoMaterial}
          >
            {salvandoMaterial ? "Salvando..." : "+ Adicionar Material"}
          </button>
        </div>
      </div>

      {dados?.policiais_apoio?.length > 0 && (
        <>
          <h3 className="font-semibold mb-2">Policiais de Apoio:</h3>
          <table className="w-full border mb-6 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Posto/Graduação</th>
                <th className="border p-2">Nome Completo</th>
                <th className="border p-2">CPF</th>
                <th className="border p-2">Unidade</th>
              </tr>
            </thead>
            <tbody>
              {dados.policiais_apoio.map((policial, index) => (
                <tr key={policial?.id || index}>
                  <td className="border p-2">
                    {policial?.posto_graduacao || "-"}
                  </td>
                  <td className="border p-2">{policial?.nome || "-"}</td>
                  <td className="border p-2">
                    {policial?.cpf || policial?.rg_matricula || "-"}
                  </td>
                  <td className="border p-2">{policial?.unidade || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <button
        onClick={gerarPDF}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
      >
        Gerar PDF
      </button>
    </div>
  );
}
