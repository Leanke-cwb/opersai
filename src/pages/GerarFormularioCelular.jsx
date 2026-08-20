// src/pages/GerarFormularioCelular.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ESTILO_TABELA_IMPRESSAO,
  adicionarRodapePaginas,
  tituloSecao,
} from "../utils/pdfFormal";

function textoPDF(valor, padrao = "-") {
  const texto =
    valor === null || valor === undefined || String(valor).trim() === ""
      ? padrao
      : String(valor).trim();

  return texto.toLocaleUpperCase("pt-BR");
}

export default function GerarFormularioCelular() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [celular, setCelular] = useState(null);

  useEffect(() => {
    try {
      setLoading(true);

      const celularStorage = localStorage.getItem("celularSelecionado");

      console.log("localStorage celularSelecionado:", celularStorage);

      if (!celularStorage) {
        console.error("Nenhum celular encontrado no localStorage.");
        setLoading(false);
        return;
      }

      const celularData = JSON.parse(celularStorage);

      console.log("Celular carregado:", celularData);

      setCelular(celularData);
    } catch (err) {
      console.error("Erro ao carregar celular:", err);
      alert("Erro ao carregar os dados do celular.");
    } finally {
      setLoading(false);
    }
  }, []);

  function valorOuNaoFornecido(valor) {
    return valor && valor.trim() !== "" ? valor : "Não fornecida";
  }

  function valorOuNaoFornecidoPDF(valor) {
    return textoPDF(valor, "NÃO FORNECIDA");
  }

  function gerarPDF() {
    if (!celular) return;

    const doc = new jsPDF("p", "mm", "a4");
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
    doc.text(
      "FORMULÁRIO DE APREENSÃO DE APARELHO CELULAR",
      pageWidth / 2,
      50,
      { align: "center" },
    );

    let y = 63;
    y = tituloSecao(doc, "Identificação e Dados do Aparelho", y, {
      alturaReserva: 30,
    });

    autoTable(doc, {
      ...ESTILO_TABELA_IMPRESSAO,
      startY: y,
      body: [
        ["OPERAÇÃO", textoPDF(celular.nome_operacao, "")],
        ["ALVO", textoPDF(celular.nome_alvo, "")],
        ["NÚMERO DO ALVO", textoPDF(celular.numero_alvo, "")],
        ["NÚMERO DO ITEM", textoPDF(celular.numero_item, "")],
        ["NÚMERO DO LACRE", textoPDF(celular.lacre)],
        ["MARCA", textoPDF(celular.marca, "")],
        ["MODELO", textoPDF(celular.modelo, "")],
        ["IMEI 1", textoPDF(celular.imei1, "")],
        ["IMEI 2", textoPDF(celular.imei2, "")],
        ["LINHA 1", textoPDF(celular.linha1, "")],
        ["OPERADORA 1", textoPDF(celular.operadora1, "")],
        ["SIM 1", textoPDF(celular.numero_sim1, "")],
        ["LINHA 2", textoPDF(celular.linha2, "")],
        ["OPERADORA 2", textoPDF(celular.operadora2, "")],
        ["SIM 2", textoPDF(celular.numero_sim2, "")],
        ["CARTÃO DE MEMÓRIA", textoPDF(celular.cartao_memoria, "")],
        ["MARCA DO CARTÃO", textoPDF(celular.marca_memoria, "")],
        ["CAPACIDADE", textoPDF(celular.capacidade_memoria, "")],
        ["ESTADO DO APARELHO", textoPDF(celular.estado_aparelho, "")],
        ["SENHA NUMÉRICA", valorOuNaoFornecidoPDF(celular.senha_numerica)],
        ["SENHA GESTUAL", valorOuNaoFornecidoPDF(celular.senha_gestual)],
        ["OBSERVAÇÕES", textoPDF(celular.observacoes, "")],
      ],
      margin: { left: 15, right: 15, bottom: 20 },
      styles: {
        ...ESTILO_TABELA_IMPRESSAO.styles,
        fontSize: 9.2,
        cellPadding: 2.3,
      },
      columnStyles: {
        0: {
          cellWidth: 48,
          fontStyle: "bold",
          halign: "left",
          fillColor: [255, 255, 255],
        },
        1: { cellWidth: 132 },
      },
    });

    adicionarRodapePaginas(doc, "FORMULÁRIO DE APREENSÃO DE APARELHO CELULAR");

    const nomeArquivo =
      `Formulario_Celular_` +
      `${(celular.nome_operacao || "OPERACAO")
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "_")}` +
      `_Alvo_${celular.numero_alvo || "0"}` +
      `_Item_${celular.numero_item || "0"}.pdf`;

    doc.save(nomeArquivo);
  }

  console.log("loading:", loading);
  console.log("celular:", celular);

  if (loading) {
    return (
      <div className="p-6">
        <h2>Carregando...</h2>
      </div>
    );
  }

  if (!celular) {
    return (
      <div className="p-6">
        <h2>Celular não encontrado.</h2>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">
          Formulário de Apreensão de Aparelho Celular
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo titulo="Operação" valor={celular.nome_operacao} />

          <Campo titulo="Alvo" valor={celular.nome_alvo} />

          <Campo titulo="Número do Alvo" valor={celular.numero_alvo} />

          <Campo titulo="Número do Item" valor={celular.numero_item} />

          <Campo titulo="Número do Lacre" valor={celular.lacre || "-"} />

          <Campo titulo="Marca" valor={celular.marca} />

          <Campo titulo="Modelo" valor={celular.modelo} />

          <Campo titulo="IMEI 1" valor={celular.imei1} />

          <Campo titulo="IMEI 2" valor={celular.imei2} />

          <Campo titulo="Linha 1" valor={celular.linha1} />

          <Campo titulo="Operadora 1" valor={celular.operadora1} />

          <Campo titulo="SIM 1" valor={celular.numero_sim1} />

          <Campo titulo="Linha 2" valor={celular.linha2} />

          <Campo titulo="Operadora 2" valor={celular.operadora2} />

          <Campo titulo="SIM 2" valor={celular.numero_sim2} />

          <Campo titulo="Cartão de Memória" valor={celular.cartao_memoria} />

          <Campo titulo="Marca do Cartão" valor={celular.marca_memoria} />

          <Campo titulo="Capacidade" valor={celular.capacidade_memoria} />

          <Campo titulo="Estado do Aparelho" valor={celular.estado_aparelho} />

          <Campo
            titulo="Senha Numérica"
            valor={valorOuNaoFornecido(celular.senha_numerica)}
          />

          <Campo
            titulo="Senha Gestual"
            valor={valorOuNaoFornecido(celular.senha_gestual)}
          />
        </div>

        <div className="mt-6">
          <label className="font-semibold block mb-2">Observações</label>

          <div className="border rounded p-3 bg-gray-50 min-h-[120px]">
            {celular.observacoes || "-"}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={gerarPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            Gerar PDF
          </button>

          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ titulo, valor }) {
  return (
    <div>
      <label className="block font-semibold mb-1">{titulo}</label>

      <div className="border rounded p-2 bg-gray-50">{valor || "-"}</div>
    </div>
  );
}
