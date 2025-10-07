import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useParams } from "react-router-dom";

export default function CautelaScreen() {
  const { alvoId, operacaoId } = useParams(); // pegamos ids da URL
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

    async function fetchDados() {
      try {
        // 1️⃣ Pegar dados do alvo
        const { data: alvoData, error: alvoError } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .single();
        if (alvoError) throw alvoError;
        setDadosAlvo(alvoData);
        setNomeAlvo(alvoData.nome);
        setCpfAlvo(alvoData.cpf);

        // 2️⃣ Pegar dados da operação
        const { data: operacaoData, error: operacaoError } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", operacaoId)
          .single();
        if (operacaoError) throw operacaoError;
        setNumeroAutos(operacaoData.numero_autos);

        // 3️⃣ Pegar comandante / usuário que cumpriu mandado
        const { data: usuarioData, error: usuarioError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", operacaoData.comandante_id) // ajusta conforme seu banco
          .single();
        if (usuarioError) throw usuarioError;
        setComandante(usuarioData.nome);
        setCpfComandante(usuarioData.cpf);

        // 4️⃣ Pegar itens apreendidos
        const { data: itensData, error: itensError } = await supabase
          .from("materiais_apreendidos")
          .select("*")
          .eq("alvo_id", alvoId);
        if (itensError) throw itensError;
        setItens(itensData || []);
      } catch (err) {
        console.error("Erro ao buscar dados da cautela:", err);
      }
    }

    fetchDados();
  }, [alvoId, operacaoId]);

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

      {/* Pré-visualização do termo com dados do Supabase */}
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
