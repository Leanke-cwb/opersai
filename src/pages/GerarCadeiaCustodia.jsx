// src/pages/GerarCadeiaCustodia.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import {
  adicionarRodapePaginas,
  escreverCampoQuebravel,
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

export default function GerarCadeiaCustodia() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gerarPDF();
  }, []);

  function desenharCabecalho(doc) {
    const pageWidth = doc.internal.pageSize.getWidth();

    const logoPMPR =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";
    const logoCOGER =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/brasao.png";

    doc.addImage(logoCOGER, "PNG", 15, 10, 25, 25);
    doc.addImage(logoPMPR, "PNG", pageWidth - 40, 10, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("POLÍCIA MILITAR DO PARANÁ", pageWidth / 2, 18, {
      align: "center",
    });
    doc.text("CORREGEDORIA-GERAL", pageWidth / 2, 25, {
      align: "center",
    });
    doc.text("SEÇÃO DE ASSUNTOS INTERNOS", pageWidth / 2, 32, {
      align: "center",
    });

    doc.setLineWidth(0.25);
    doc.line(15, 40, pageWidth - 15, 40);

    doc.setFontSize(12);
    doc.text("FORMULÁRIO DE CADEIA DE CUSTÓDIA", pageWidth / 2, 50, {
      align: "center",
    });
  }

  function desenharAssinatura(doc, titulo, nome, cpf, yInicial) {
    let y = garantirEspaco(doc, yInicial, 35, 20, 18);

    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text(titulo, 15, y);
    y += 7;

    doc.setFont("times", "normal");
    doc.text(textoPDF(nome, "—"), 15, y);
    y += 6;
    doc.text(`CPF: ${textoPDF(cpf, "—")}`, 15, y);
    y += 11;

    doc.line(15, y, 95, y);
    doc.setFontSize(8);
    doc.text("ASSINATURA", 55, y + 5, { align: "center" });

    return y + 12;
  }

  async function gerarPDF() {
    try {
      const alvoId = localStorage.getItem("alvoId");
      const selecionados = JSON.parse(
        localStorage.getItem("custodiaSelecionados") || "{}",
      );

      const { data: alvo } = await supabase
        .from("alvos")
        .select("*")
        .eq("id", alvoId)
        .single();

      if (!alvo) {
        alert("Alvo não encontrado.");
        return;
      }

      const { data: operacao } = await supabase
        .from("operacoes")
        .select("*")
        .eq("id", alvo.operacao_id)
        .single();

      const { data: auto } = await supabase
        .from("auto_circunstanciado")
        .select("*")
        .eq("alvo_id", alvoId)
        .maybeSingle();

      if (!auto) {
        alert("Auto Circunstanciado não encontrado.");
        return;
      }

      const { data: itens } = await supabase
        .from("auto_itens")
        .select("*")
        .eq("auto_id", auto.id)
        .order("numero_item");

      if (!itens || itens.length === 0) {
        alert("Nenhum item encontrado.");
        return;
      }

      const { data: cumprimento } = await supabase
        .from("cumprimento_mandado")
        .select("*")
        .eq("alvo_id", alvoId)
        .single();

      const { data: usuarios } = await supabase.from("usuarios").select("*");

      const doc = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < itens.length; i += 1) {
        const item = itens[i];

        if (i > 0) {
          doc.addPage();
        }

        desenharCabecalho(doc);

        const custodiante = usuarios?.find((u) => u.id === selecionados[item.id]);
        let y = 63;

        y = tituloSecao(doc, "1. Procedimento Vinculado", y, {
          alturaReserva: 48,
        });
        y = escreverCampoQuebravel(
          doc,
          "Nº PROCEDIMENTO",
          textoPDF(operacao?.numero_autos),
          y,
        );
        y = escreverCampoQuebravel(
          doc,
          "OPERAÇÃO",
          textoPDF(operacao?.nome_operacao),
          y,
        );
        y = escreverCampoQuebravel(doc, "ALVO", textoPDF(alvo.nome), y);
        y = escreverCampoQuebravel(doc, "CPF", textoPDF(alvo.cpf), y);
        y = escreverCampoQuebravel(
          doc,
          "ENDEREÇO",
          textoPDF(alvo.endereco),
          y,
        );
        y = escreverCampoQuebravel(doc, "CIDADE", textoPDF(alvo.cidade), y);
        y = escreverCampoQuebravel(
          doc,
          "DATA DA COLETA",
          textoPDF(cumprimento?.data),
          y,
        );
        y = escreverCampoQuebravel(
          doc,
          "HORA DA COLETA",
          textoPDF(cumprimento?.hora),
          y,
        );

        y = tituloSecao(doc, "2. Identificação do Vestígio", y + 4, {
          alturaReserva: 42,
        });
        y = escreverCampoQuebravel(doc, "ITEM", textoPDF(item.numero_item), y);
        y = escreverCampoQuebravel(doc, "TIPO", textoPDF(item.tipo_item), y);
        y = escreverCampoQuebravel(doc, "LACRE", textoPDF(item.lacre), y);
        y = escreverCampoQuebravel(
          doc,
          "DESCRIÇÃO",
          textoPDF(item.descricao),
          y,
          { largura: 180 },
        );
        y = escreverCampoQuebravel(
          doc,
          "LOCALIZAÇÃO",
          textoPDF(item.local_encontrado),
          y,
          { largura: 180 },
        );

        y = tituloSecao(doc, "3. Responsável pela Arrecadação", y + 4, {
          alturaReserva: 30,
        });
        y = escreverCampoQuebravel(
          doc,
          "POSTO/GRADUAÇÃO",
          textoPDF(cumprimento?.comandante_posto_graduacao),
          y,
        );
        y = escreverCampoQuebravel(
          doc,
          "NOME",
          textoPDF(cumprimento?.comandante_nome),
          y,
        );
        y = escreverCampoQuebravel(
          doc,
          "CPF",
          textoPDF(cumprimento?.comandante_cpf),
          y,
        );

        y = tituloSecao(doc, "4. Cadeia de Custódia", y + 4, {
          alturaReserva: 70,
        });

        y = desenharAssinatura(
          doc,
          "1º CUSTODIANTE",
          `${textoPDF(cumprimento?.comandante_posto_graduacao, "")} ${textoPDF(
            cumprimento?.comandante_nome,
            "",
          )}`.trim(),
          cumprimento?.comandante_cpf,
          y,
        );

        desenharAssinatura(
          doc,
          "2º CUSTODIANTE",
          `${textoPDF(custodiante?.posto_graduacao, "")} ${textoPDF(
            custodiante?.nome,
            "",
          )}`.trim(),
          custodiante?.cpf,
          y,
        );
      }

      adicionarRodapePaginas(doc, "FORMULÁRIO DE CADEIA DE CUSTÓDIA");

      doc.save(
        `Cadeia_Custodia_${String(alvo.nome || "ALVO")
          .replace(/\s+/g, "_")
          .toUpperCase()}.pdf`,
      );
    } catch (erro) {
      console.error(erro);
      alert("Erro ao gerar PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">
        {loading ? "Gerando PDF..." : "PDF gerado com sucesso"}
      </h2>

      <button
        onClick={() => navigate(-1)}
        className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
      >
        Voltar
      </button>
    </div>
  );
}
