// src/pages/GerarCadeiaCustodia.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";

export default function GerarCadeiaCustodia() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gerarPDF();
  }, []);

  async function gerarPDF() {
    try {
      const alvoId = localStorage.getItem("alvoId");

      const selecionados = JSON.parse(
        localStorage.getItem("custodiaSelecionados") || "{}"
      );

      // ALVO
      const { data: alvo } = await supabase
        .from("alvos")
        .select("*")
        .eq("id", alvoId)
        .single();

      if (!alvo) {
        alert("Alvo não encontrado.");
        return;
      }

      // OPERAÇÃO
      const { data: operacao } = await supabase
        .from("operacoes")
        .select("*")
        .eq("id", alvo.operacao_id)
        .single();

      // AUTO
      const { data: auto } = await supabase
        .from("auto_circunstanciado")
        .select("*")
        .eq("alvo_id", alvoId)
        .single();

      if (!auto) {
        alert("Auto Circunstanciado não encontrado.");
        return;
      }

      // ITENS
      const { data: itens } = await supabase
        .from("auto_itens")
        .select("*")
        .eq("auto_id", auto.id)
        .order("numero_item");

      if (!itens || itens.length === 0) {
        alert("Nenhum item encontrado.");
        return;
      }

      // CUMPRIMENTO
      const { data: cumprimento } = await supabase
        .from("cumprimento_mandado")
        .select("*")
        .eq("alvo_id", alvoId)
        .single();

      // USUÁRIOS
      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("*");

      const doc = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];

        if (i > 0) {
          doc.addPage();
        }

        const custodiante = usuarios?.find(
          (u) => u.id === selecionados[item.id]
        );

       // ========================================
// CABEÇALHO PADRÃO COGER
// ========================================

const pageWidth = doc.internal.pageSize.getWidth();

const logoPMPR =
  "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";

const logoCOGER =
  "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/coger.png";

// Logos
doc.addImage(logoCOGER, "PNG", 15, 10, 25, 25);
doc.addImage(logoPMPR, "PNG", pageWidth - 40, 10, 25, 25);

// Texto institucional
doc.setFont("times", "bold");
doc.setFontSize(13);

doc.text(
  "POLÍCIA MILITAR DO PARANÁ",
  pageWidth / 2,
  18,
  { align: "center" }
);

doc.text(
  "CORREGEDORIA-GERAL",
  pageWidth / 2,
  25,
  { align: "center" }
);

doc.text(
  "SEÇÃO DE ASSUNTOS INTERNOS",
  pageWidth / 2,
  32,
  { align: "center" }
);

// Linha divisória
doc.line(15, 40, pageWidth - 15, 40);

// Título do documento
doc.setFontSize(12);

doc.text(
  "FORMULÁRIO DE CADEIA DE CUSTÓDIA",
  pageWidth / 2,
  50,
  { align: "center" }
);

// Moldura
doc.rect(10, 55, 190, 220);

doc.setFont("times", "normal");

let y = 65;

        // PROCEDIMENTO
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("1. PROCEDIMENTO VINCULADO", 14, y);

        y += 8;

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);

        doc.text(
          `Nº Procedimento: ${operacao?.numero_autos || "-"}`,
          14,
          y
        );
        y += 6;

        doc.text(
          `Operação: ${operacao?.nome_operacao || "-"}`,
          14,
          y
        );
        y += 6;

        doc.text(`Alvo: ${alvo.nome || "-"}`, 14, y);
        y += 6;

        doc.text(`CPF: ${alvo.cpf || "-"}`, 14, y);
        y += 6;

        doc.text(`Endereço: ${alvo.endereco || "-"}`, 14, y);
        y += 6;

        doc.text(`Cidade: ${alvo.cidade || "-"}`, 14, y);
        y += 6;            doc.text(
          `Data da Coleta: ${cumprimento?.data || "-"}`,
          14,
          y
        );
        y += 6;

        doc.text(
          `Hora da Coleta: ${cumprimento?.hora || "-"}`,
          14,
          y
        );

        y += 12;

        // VESTÍGIO
        doc.setFont(undefined, "bold");
        doc.text("2. IDENTIFICAÇÃO DO VESTÍGIO", 14, y);

        y += 8;

        doc.setFont(undefined, "normal");

        doc.text(
          `Item: ${item.numero_item || "-"}`,
          14,
          y
        );
        y += 6;

        doc.text(
          `Tipo: ${item.tipo_item || "-"}`,
          14,
          y
        );
        y += 6;

        doc.text(
          `Lacre: ${item.lacre || "-"}`,
          14,
          y
        );
        y += 6;

        doc.text("Descrição:", 14, y);

        y += 6;

        const descricao = doc.splitTextToSize(
          item.descricao || "-",
          170
        );

        doc.text(descricao, 14, y);

        y += descricao.length * 5 + 4;

        doc.text(
          `Localização: ${
            item.local_encontrado || "-"
          }`,
          14,
          y
        );

        y += 12;

        // RESPONSÁVEL PELA ARRECADAÇÃO
        doc.setFont(undefined, "bold");
        doc.text(
          "3. RESPONSÁVEL PELA ARRECADAÇÃO",
          14,
          y
        );

        y += 8;

        doc.setFont(undefined, "normal");

        doc.text(
          `Posto/Graduação: ${
            cumprimento?.comandante_posto_graduacao || "-"
          }`,
          14,
          y
        );

        y += 6;

        doc.text(
          `Nome: ${
            cumprimento?.comandante_nome || "-"
          }`,
          14,
          y
        );

        y += 6;

        doc.text(
          `CPF: ${
            cumprimento?.comandante_cpf || "-"
          }`,
          14,
          y
        );

        y += 12;

       // CADEIA DE CUSTÓDIA
doc.setFont(undefined, "bold");
doc.text("4. CADEIA DE CUSTÓDIA", 14, y);

y += 8;

doc.setFont(undefined, "normal");
// 1º CUSTODIANTE
doc.text("1º CUSTODIANTE", 14, y);

y += 6;

doc.text(
  `${cumprimento?.comandante_posto_graduacao || ""} ${
    cumprimento?.comandante_nome || ""
  }`,
  14,
  y
);

y += 6;

doc.text(
  `CPF: ${cumprimento?.comandante_cpf || ""}`,
  14,
  y
);

y += 8;

// Linha da assinatura abaixo
doc.line(14, y, 90, y);

y += 5;

doc.setFontSize(8);

doc.text(
  "Assinatura",
  52,
  y,
  { align: "center" }
);

y += 8;

// ========================================
// 2º CUSTODIANTE
// ========================================

doc.setFontSize(10);

doc.text(
  "2º CUSTODIANTE",
  14,
  y
);

y += 6;

doc.text(
  `${custodiante?.posto_graduacao || ""} ${
    custodiante?.nome || ""
  }`,
  14,
  y
);

y += 6;

doc.text(
  `CPF: ${custodiante?.cpf || ""}`,
  14,
  y
);

y += 6;

// Linha da assinatura abaixo
doc.line(14, y, 90, y);

y += 3;

doc.setFontSize(8);

doc.text(
  "Assinatura",
  52,
  y,
  { align: "center" }
);

y += 6;
  
        // RODAPÉ
        doc.setFontSize(8);

        doc.text(
          `Item ${item.numero_item}`,
          14,
          290
        );

        doc.text(
          `Página ${i + 1} de ${itens.length}`,
          196,
          290,
          { align: "right" }
        );
      }

      doc.save(
        `Cadeia_Custodia_${alvo.nome
          .replace(/\s+/g, "_")
          .toUpperCase()}.pdf`
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
        {loading
          ? "Gerando PDF..."
          : "PDF gerado com sucesso"}
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