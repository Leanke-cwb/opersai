import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

export default function Cautela() {
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
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

        // Busca o alvo
        const { data: alvo, error: erroAlvo } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .single();
        if (erroAlvo) throw erroAlvo;

        // Busca a operação vinculada
        const { data: operacao, error: erroOp } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", alvo?.operacao_id)
          .single();
        if (erroOp) throw erroOp;

        // Busca o cumprimento de mandado (para obter o comandante)
        const { data: cumprimento, error: erroCumpr } = await supabase
          .from("cumprimento_mandado")
          .select("comandante_nome, comandante_cpf, comandante_posto_graduacao")
          .eq("operacao_id", alvo?.operacao_id)
          .single();

        console.log("📋 cumprimento_mandado retornado:", cumprimento);

        if (erroCumpr) {
          console.warn("⚠️ Nenhum comandante encontrado para esta operação.");
        }

        // Usar os nomes corretos das colunas
        const comandante = cumprimento?.comandante_nome || "-";
        const cpf_comandante = cumprimento?.comandante_cpf || "-";
        const posto_graduacao = cumprimento?.comandante_posto_graduacao || "-";

        // Itens apreendidos do localStorage
        const itensLocal = localStorage.getItem("itensApreendidos");
        const materiais = itensLocal ? JSON.parse(itensLocal) : [];

        setDados({
          alvo,
          operacao,
          comandante,
          cpf_comandante,
          posto_graduacao,
          materiais,
        });
      } catch (err) {
        console.error("❌ Erro ao carregar dados:", err.message);
      } finally {
        setCarregando(false);
      }
    }

    buscarDados();
  }, []);

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
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/coger.png";

    doc.addImage(logoPMPR, "PNG", 15, 10, 25, 25);
    doc.addImage(logoCOGER, "PNG", pageWidth - 40, 10, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("POLÍCIA MILITAR DO PARANÁ", pageWidth / 2, 20, {
      align: "center",
    });
    doc.text("CORREGEDORIA-GERAL", pageWidth / 2, 27, { align: "center" });
    doc.text("SEÇÃO DE ASSUNTOS INTERNOS", pageWidth / 2, 34, {
      align: "center",
    });

    doc.line(15, 40, pageWidth - 15, 40);

    doc.setFontSize(12);
    doc.text("TERMO DE ENTREGA DE MATERIAL", pageWidth / 2, 50, {
      align: "center",
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    const texto = `
Aos ${dataAtual}, faço a entrega dos materiais relacionados e discriminados a seguir,
apreendidos em decorrência de medida cautelar exarada nos autos nº ${
      dados?.operacao?.numero_autos || "-"
    }.
Os materiais, arrecadados pelo(a) ${dados?.posto_graduacao || ""} ${
      dados?.comandante || "-"
    }, CPF ${dados?.cpf_comandante || "-"}, se encontravam sob posse do(a) ${
      dados?.alvo?.nome || "-"
    }, CPF ${dados?.alvo?.cpf || "-"}, no endereço sito à ${
      dados?.alvo?.endereco || "-"
    }, bairro ${dados?.alvo?.bairro || "-"}, na cidade de ${
      dados?.alvo?.cidade || "-"
    }, sendo que após a apreensão foram entregues na sede do(a) ${
      form.sede || "-"
    }, sito à ${form.enderecoEntrega || "-"}, bairro ${
      form.bairroEntrega || "-"
    }, na cidade de ${form.cidadeEntrega || "-"}, Estado do Paraná, a(o)
recebedor(a) abaixo identificado:
`;

    doc.text(texto, 15, 60, { maxWidth: 180, align: "justify" });

    // 🔹 ALTERADO: tabela PDF com novos campos
    autoTable(doc, {
      startY: 125,
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
      body:
        dados?.materiais?.map((item, index) => [
          index + 1,
          item.quantidade || "-",
          item.item_nome || "-",
          item.descricao || "-",
          item.numero_serie || "-",
          item.patrimonio || "-",
          item.observacao || "-",
        ]) || [],
      styles: { font: "times", fontSize: 9 },
      headStyles: { fillColor: [220, 220, 220] },
    });

    const yFinal = doc.lastAutoTable?.finalY || 140;
    doc.text(`Nome completo: ${form.nomeRecebedor || "-"}`, 15, yFinal + 20);
    doc.text(`CPF: ${formatarCPF(form.cpfRecebedor) || "-"}`, 15, yFinal + 30);
    doc.text(
      "Assinatura do Recebedor(a): ___________________________",
      15,
      yFinal + 40
    );

    doc.setFontSize(9);
    doc.text("Documento gerado eletronicamente.", pageWidth / 2, 285, {
      align: "center",
    });

    doc.save("termo_cautela.pdf");
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
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded mt-10">
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

      {/* 🔹 ALTERADO: tabela visual com novos campos */}
      <h3 className="font-semibold mb-2">Materiais Apreendidos:</h3>
      <table className="w-full border mb-6 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Item nº</th>
            <th className="border p-2">Quantidade</th>
            <th className="border p-2">Grupo</th>
            <th className="border p-2">Descrição</th>
            <th className="border p-2">Nº Série</th>
            <th className="border p-2">Patrimônio</th>
            <th className="border p-2">Observação</th>
          </tr>
        </thead>
        <tbody>
          {dados?.materiais?.length > 0 ? (
            dados.materiais.map((item, index) => (
              <tr key={index}>
                <td className="border p-2 text-center">{index + 1}</td>
                <td className="border p-2 text-center">{item.quantidade}</td>
                <td className="border p-2">{item.item_nome}</td>
                <td className="border p-2">{item.descricao}</td>
                <td className="border p-2">{item.numero_serie}</td>
                <td className="border p-2">{item.patrimonio}</td>
                <td className="border p-2">{item.observacao}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center border p-2">
                Nenhum material cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <button
        onClick={gerarPDF}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
      >
        Gerar PDF
      </button>
    </div>
  );
}
