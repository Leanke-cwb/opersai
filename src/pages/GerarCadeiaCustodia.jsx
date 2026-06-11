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

        // CABEÇALHO
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");

        doc.text(
          "FORMULÁRIO DE CADEIA DE CUSTÓDIA",
          105,
          15,
          { align: "center" }
        );

        doc.setFont(undefined, "normal");

        // BORDA
        doc.rect(10, 20, 190, 255);

        let y = 30;

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
        y += 6;

        doc.text(
          `Coordenadas: ${alvo.latitude || "-"} / ${
            alvo.longitude || "-"
          }`,
          14,
          y
        );
        y += 6;

        doc.text(
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
        doc.text(
          "4. CADEIA DE CUSTÓDIA",
          14,
          y
        );

        y += 8;

        doc.setFont(undefined, "normal");

        doc.text(
          "1º CUSTODIANTE",
          14,
          y
        );

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
          `CPF: ${
            cumprimento?.comandante_cpf || ""
          }`,
          14,
          y
        );

        y += 6;

        doc.text(
          "Motivo: Apreensão e arrecadação do vestígio.",
          14,
          y
        );

        y += 12;

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
          `CPF: ${
            custodiante?.cpf || ""
          }`,
          14,
          y
        );

        y += 6;

        doc.text(
          "Motivo: Recebimento para guarda e custódia do vestígio.",
          14,
          y
        );

        // ASSINATURAS
        y += 30;

        doc.line(20, y, 90, y);
        doc.line(120, y, 190, y);

        doc.text(
          "1º CUSTODIANTE",
          55,
          y + 6,
          { align: "center" }
        );

        doc.text(
          "2º CUSTODIANTE",
          155,
          y + 6,
          { align: "center" }
        );

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