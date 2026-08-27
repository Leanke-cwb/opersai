// src/pages/GerarCadeiaCustodia.jsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import {
  adicionarRodapePaginas,
  escreverCampoQuebravel,
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
  const geracaoIniciada = useRef(false);

  useEffect(() => {
    if (geracaoIniciada.current) return;

    geracaoIniciada.current = true;
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

  function escreverCampoCompacto(doc, rotulo, valor, yInicial, opcoes = {}) {
    return escreverCampoQuebravel(doc, rotulo, valor, yInicial, {
      largura: 180,
      lineHeight: 4.8,
      fontSize: 9.3,
      espacoDepois: 0.8,
      ...opcoes,
    });
  }

  function desenharCadeiaCustodia(doc, cumprimento, segundoCustodiante, yInicial) {
    const margemX = 15;
    const larguraAssinatura = 82;

    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.text("RESPONSÁVEL PELA ARRECADAÇÃO:", margemX, yInicial);

    doc.setFont("times", "normal");
    doc.setFontSize(9.2);
    doc.text(
      `POSTO/GRADUAÇÃO: ${textoPDF(cumprimento?.comandante_posto_graduacao)}`,
      margemX,
      yInicial + 5,
    );
    doc.text(
      `NOME: ${textoPDF(cumprimento?.comandante_nome)}`,
      margemX,
      yInicial + 10,
    );
    doc.text(
      `CPF: ${textoPDF(cumprimento?.comandante_cpf)}`,
      margemX,
      yInicial + 15,
    );

    const yAssinaturaPrimeiro = yInicial + 23;
    doc.line(
      margemX,
      yAssinaturaPrimeiro,
      margemX + larguraAssinatura,
      yAssinaturaPrimeiro,
    );
    doc.setFontSize(7.5);
    doc.text(
      "ASSINATURA",
      margemX + larguraAssinatura / 2,
      yAssinaturaPrimeiro + 4,
      { align: "center" },
    );

    const ySegundo = yAssinaturaPrimeiro + 12;
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.text("2º CUSTODIANTE:", margemX, ySegundo);

    doc.setFont("times", "normal");
    doc.setFontSize(9.2);
    doc.text(
      `POSTO/GRADUAÇÃO: ${textoPDF(segundoCustodiante?.posto_graduacao)}`,
      margemX,
      ySegundo + 5,
    );
    doc.text(
      `NOME: ${textoPDF(segundoCustodiante?.nome)}`,
      margemX,
      ySegundo + 10,
    );
    doc.text(
      `CPF: ${textoPDF(segundoCustodiante?.cpf)}`,
      margemX,
      ySegundo + 15,
    );

    const yAssinaturaSegundo = ySegundo + 23;
    doc.line(
      margemX,
      yAssinaturaSegundo,
      margemX + larguraAssinatura,
      yAssinaturaSegundo,
    );
    doc.setFontSize(7.5);
    doc.text(
      "ASSINATURA",
      margemX + larguraAssinatura / 2,
      yAssinaturaSegundo + 4,
      { align: "center" },
    );

    return yAssinaturaSegundo + 5;
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
        y = escreverCampoCompacto(
          doc,
          "Nº PROCEDIMENTO",
          textoPDF(operacao?.numero_autos),
          y,
        );
        y = escreverCampoCompacto(
          doc,
          "OPERAÇÃO",
          textoPDF(operacao?.nome_operacao),
          y,
        );
        y = escreverCampoCompacto(doc, "ALVO", textoPDF(alvo.nome), y);
        y = escreverCampoCompacto(doc, "CPF", textoPDF(alvo.cpf), y);
        y = escreverCampoCompacto(
          doc,
          "ENDEREÇO",
          textoPDF(alvo.endereco),
          y,
        );
        y = escreverCampoCompacto(doc, "CIDADE", textoPDF(alvo.cidade), y);
        y = escreverCampoCompacto(
          doc,
          "DATA DA COLETA",
          textoPDF(cumprimento?.data),
          y,
        );
        y = escreverCampoCompacto(
          doc,
          "HORA DA COLETA",
          textoPDF(cumprimento?.hora),
          y,
        );

        y = tituloSecao(doc, "2. Identificação do Vestígio", y + 4, {
          alturaReserva: 42,
        });
        y = escreverCampoCompacto(doc, "ITEM", textoPDF(item.numero_item), y);
        y = escreverCampoCompacto(doc, "TIPO", textoPDF(item.tipo_item), y);
        y = escreverCampoCompacto(doc, "LACRE", textoPDF(item.lacre), y);
        y = escreverCampoCompacto(
          doc,
          "DESCRIÇÃO",
          textoPDF(item.descricao),
          y,
          { largura: 180 },
        );
        y = escreverCampoCompacto(
          doc,
          "LOCALIZAÇÃO",
          textoPDF(item.local_encontrado),
          y,
          { largura: 180 },
        );

        y = tituloSecao(doc, "3. Cadeia de Custódia", y + 3, {
          alturaReserva: 62,
        });

        desenharCadeiaCustodia(
          doc,
          cumprimento,
          {
            posto_graduacao: custodiante?.posto_graduacao,
            nome: custodiante?.nome,
            cpf: custodiante?.cpf,
          },
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
    <div className="gecor-work-panel p-6">
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
