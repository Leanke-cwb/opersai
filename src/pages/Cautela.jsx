// src/screens/CautelaScreen.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CautelaScreen() {
  const [itens, setItens] = useState([]);
  const [numeroAutos, setNumeroAutos] = useState("");
  const [comandante, setComandante] = useState("");
  const [cpfComandante, setCpfComandante] = useState("");
  const [nomeAlvo, setNomeAlvo] = useState("");
  const [cpfAlvo, setCpfAlvo] = useState("");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [bairroEntrega, setBairroEntrega] = useState("");
  const [cidadeEntrega, setCidadeEntrega] = useState("");
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [cpfRecebedor, setCpfRecebedor] = useState("");
  const [dadosAlvo, setDadosAlvo] = useState({});
  const [dataAtual, setDataAtual] = useState("");

  useEffect(() => {
    const hoje = new Date();
    setDataAtual(hoje.toLocaleDateString("pt-BR"));

    // Dados vindos do localStorage (salvos no clique do botão Cautela)
    const dadosItens = JSON.parse(
      localStorage.getItem("itensApreendidos") || "[]"
    );
    const dadosAlvoLS = JSON.parse(localStorage.getItem("dadosAlvo") || "{}");
    const dadosOperacao = JSON.parse(
      localStorage.getItem("dadosOperacao") || "{}"
    );
    const dadosUsuario = JSON.parse(
      localStorage.getItem("dadosUsuario") || "{}"
    );

    setItens(dadosItens);
    setDadosAlvo(dadosAlvoLS);
    setNumeroAutos(dadosOperacao.numero_autos || "");
    setComandante(dadosUsuario.nome || "");
    setCpfComandante(dadosUsuario.cpf || "");
    setNomeAlvo(dadosAlvoLS.nome || "");
    setCpfAlvo(dadosAlvoLS.cpf || "");
  }, []);

  const gerarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("TERMO DE ENTREGA", 105, 20, { align: "center" });

    doc.setFontSize(11);
    doc.text(
      `Aos ${dataAtual}, faço a entrega dos materiais relacionados e discriminados a seguir, apreendidos em decorrência de medida cautelar exarada nos autos nº ${numeroAutos}. 
Os materiais, arrecadados pelo(a) ${comandante}, CPF ${cpfComandante}, se encontravam sob posse do(a) ${nomeAlvo}, CPF ${cpfAlvo}, 
no endereço sito à ${dadosAlvo.endereco || ""}, bairro ${
        dadosAlvo.bairro || ""
      }, na cidade de ${dadosAlvo.cidade || ""}, 
sendo que após a apreensão foram entregues na sede do(a) ${enderecoEntrega}, bairro ${bairroEntrega}, na cidade de ${cidadeEntrega}, Estado do Paraná, a(o) recebedor(a) abaixo identificado:`,
      15,
      35,
      { maxWidth: 180 }
    );

    // tabela dos itens
    autoTable(doc, {
      startY: 115,
      head: [["Item nº", "Quant.", "Descrição do item"]],
      body: itens.map((item, index) => [
        index + 1,
        item.quantidade || "-",
        item.descricao || item.nome || "-",
      ]),
    });

    doc.text(
      `Nome completo: ${nomeRecebedor}`,
      15,
      doc.lastAutoTable.finalY + 20
    );
    doc.text(`CPF: ${cpfRecebedor}`, 15, doc.lastAutoTable.finalY + 30);
    doc.text(
      "Assinatura do Recebedor(a): ___________________________",
      15,
      doc.lastAutoTable.finalY + 40
    );

    doc.save("termo_de_entrega.pdf");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Termo de Entrega - Cautela</h1>

      {/* Pré-visualização do termo */}
      <div className="border p-4 mb-4 bg-gray-50 text-gray-800 whitespace-pre-wrap">
        Aos {dataAtual}, faço a entrega dos materiais relacionados e
        discriminados a seguir, apreendidos em decorrência de medida cautelar
        exarada nos autos nº <strong>{numeroAutos}</strong>. Os materiais,
        arrecadados pelo(a) <strong>{comandante}</strong>, CPF{" "}
        <strong>{cpfComandante}</strong>, se encontravam sob posse do(a){" "}
        <strong>{nomeAlvo}</strong>, CPF <strong>{cpfAlvo}</strong>, no endereço
        sito à <strong>{dadosAlvo.endereco}</strong>, bairro{" "}
        <strong>{dadosAlvo.bairro}</strong>, na cidade de{" "}
        <strong>{dadosAlvo.cidade}</strong>, sendo que após a apreensão foram
        entregues na sede do(a){" "}
        <strong>
          {enderecoEntrega} / {bairroEntrega} / {cidadeEntrega}
        </strong>
        , Estado do Paraná, a(o) recebedor(a) abaixo identificado:
      </div>

      {/* Campos editáveis */}
      <div className="mb-4">
        <label className="block text-sm">Endereço de entrega:</label>
        <input
          type="text"
          value={enderecoEntrega}
          onChange={(e) => setEnderecoEntrega(e.target.value)}
          className="border p-2 w-full"
        />
        <label className="block text-sm mt-2">Bairro:</label>
        <input
          type="text"
          value={bairroEntrega}
          onChange={(e) => setBairroEntrega(e.target.value)}
          className="border p-2 w-full"
        />
        <label className="block text-sm mt-2">Cidade:</label>
        <input
          type="text"
          value={cidadeEntrega}
          onChange={(e) => setCidadeEntrega(e.target.value)}
          className="border p-2 w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm">Nome do Recebedor(a):</label>
        <input
          type="text"
          value={nomeRecebedor}
          onChange={(e) => setNomeRecebedor(e.target.value)}
          className="border p-2 w-full"
        />
        <label className="block text-sm mt-2">CPF do Recebedor(a):</label>
        <input
          type="text"
          value={cpfRecebedor}
          onChange={(e) => setCpfRecebedor(e.target.value)}
          className="border p-2 w-full"
        />
      </div>

      {/* Botão gerar PDF */}
      <button
        onClick={gerarPDF}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
      >
        Gerar PDF
      </button>
    </div>
  );
}
