// src/pages/GerarFormularioCelular.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  function gerarPDF() {
    if (!celular) return;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");

    doc.text("FORMULÁRIO DE APREENSÃO DE APARELHO CELULAR", 105, 15, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 25);

    autoTable(doc, {
      startY: 35,
      theme: "grid",
      styles: {
        fontSize: 10,
      },
      body: [
        ["Operação", celular.nome_operacao || ""],
        ["Alvo", celular.nome_alvo || ""],
        ["Número do Alvo", celular.numero_alvo || ""],
        ["Número do Item", celular.numero_item || ""],

        ["Marca", celular.marca || ""],
        ["Modelo", celular.modelo || ""],
        ["IMEI 1", celular.imei1 || ""],
        ["IMEI 2", celular.imei2 || ""],

        ["Linha 1", celular.linha1 || ""],
        ["Operadora 1", celular.operadora1 || ""],
        ["SIM 1", celular.numero_sim1 || ""],

        ["Linha 2", celular.linha2 || ""],
        ["Operadora 2", celular.operadora2 || ""],
        ["SIM 2", celular.numero_sim2 || ""],

        ["Cartão de Memória", celular.cartao_memoria || ""],
        ["Marca do Cartão", celular.marca_memoria || ""],
        ["Capacidade", celular.capacidade_memoria || ""],

        ["Estado do Aparelho", celular.estado_aparelho || ""],

        ["Senha Numérica", valorOuNaoFornecido(celular.senha_numerica)],

        ["Senha Gestual", valorOuNaoFornecido(celular.senha_gestual)],

        ["Observações", celular.observacoes || ""],
      ],
    });

    const paginas = doc.internal.getNumberOfPages();

    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);

      doc.setFontSize(9);

      doc.text(`Página ${i} de ${paginas}`, 105, 290, { align: "center" });
    }

    doc.save(`Formulario_Celular_${celular.numero_item || "sem_numero"}.pdf`);
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
