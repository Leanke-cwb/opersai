// src/screens/Cautela.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Cautela() {
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

  useEffect(() => {
    async function buscarDados() {
      try {
        // 🔹 Tenta ler de qualquer chave possível
        let alvoId =
          localStorage.getItem("alvoId") || localStorage.getItem("alvo_id");

        if (!alvoId) {
          console.error("❌ Nenhum alvo selecionado.");
          setCarregando(false);
          return;
        }

        // 🔹 Busca dados do alvo
        const { data: alvo, error: erroAlvo } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .single();

        if (erroAlvo) throw erroAlvo;

        // 🔹 Busca operação vinculada
        const { data: operacao, error: erroOp } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", alvo?.operacao_id)
          .single();

        if (erroOp) throw erroOp;

        // 🔹 Busca cumprimento do mandado (forçando retorno de apenas 2 campos)
        const { data: cumprimentoData, error: erroCumprimento } = await supabase
          .from("cumprimento_mandado")
          .select("comandante, cpf_comandante")
          .eq("alvo_id", alvoId);

        if (erroCumprimento) {
          console.warn(
            "⚠️ Erro ao buscar cumprimento:",
            erroCumprimento.message
          );
        }

        console.log("📋 Resultado cumprimento_mandado:", cumprimentoData);

        const cumprimento = Array.isArray(cumprimentoData)
          ? cumprimentoData[0]
          : cumprimentoData || {};

        // 🔹 Usuário logado
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userEmail = user?.email || null;

        let dadosUser = null;
        if (userEmail) {
          const { data, error: erroUser } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", userEmail)
            .single();

          if (!erroUser) dadosUser = data;
        }

        // 🔹 Busca materiais apreendidos
        const { data: materiais, error: erroMateriais } = await supabase
          .from("materiais_apreendidos")
          .select("*")
          .eq("alvo_id", alvoId);

        if (erroMateriais) throw erroMateriais;

        console.log("✅ Alvo:", alvo);
        console.log("✅ Operação:", operacao);
        console.log("✅ Cumprimento:", cumprimento);
        console.log("✅ Usuário:", dadosUser);
        console.log("✅ Materiais:", materiais);

        // 🔹 Monta estrutura final de dados
        setDados({
          alvo,
          operacao,
          cumprimento: {
            comandante: cumprimento?.comandante || "-",
            cpf_comandante: cumprimento?.cpf_comandante || "-",
          },
          usuario: dadosUser,
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

  // 🔹 Função para formatar a data
  const formatarDataPorExtenso = () => {
    const data = new Date();
    return data.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // 🔹 Gera o PDF
  const gerarPDF = () => {
    if (!dados) return alert("Os dados ainda não foram carregados!");

    const doc = new jsPDF();
    const dataAtual = formatarDataPorExtenso();

    doc.setFontSize(12);
    doc.text("TERMO DE ENTREGA - CAUTELA", 70, 20);
    doc.setFontSize(11);

    const texto = `
Aos ${dataAtual}, faço a entrega dos materiais relacionados e discriminados a seguir, 
apreendidos em decorrência de medida cautelar exarada nos autos nº ${
      dados?.operacao?.numero_autos || "-"
    }.
Os materiais, arrecadados pelo(a) ${
      dados?.cumprimento?.comandante || "-"
    }, CPF ${
      dados?.cumprimento?.cpf_comandante || "-"
    }, se encontravam sob posse do(a) ${dados?.alvo?.nome || "-"}, CPF ${
      dados?.alvo?.cpf || "-"
    }, no endereço sito à ${dados?.alvo?.endereco || "-"}, bairro ${
      dados?.alvo?.bairro || "-"
    }, na cidade de ${
      dados?.alvo?.cidade || "-"
    }, sendo que após a apreensão foram entregues na sede do(a) ${
      form.sede || "-"
    }, sito à ${form.enderecoEntrega || "-"}, bairro ${
      form.bairroEntrega || "-"
    }, na cidade de ${
      form.cidadeEntrega || "-"
    }, Estado do Paraná, a(o) recebedor(a) abaixo identificado:
`;

    doc.text(texto, 15, 35, { maxWidth: 180 });

    // 🔹 Tabela de materiais
    autoTable(doc, {
      startY: 120,
      head: [["Item nº", "Quantidade", "Descrição"]],
      body:
        dados?.materiais?.map((item, index) => [
          index + 1,
          item.quantidade || "-",
          item.descricao || "-",
        ]) || [],
    });

    const yFinal = doc.lastAutoTable?.finalY || 140;
    doc.text(`Nome completo: ${form.nomeRecebedor || "-"}`, 15, yFinal + 20);
    doc.text(`CPF: ${form.cpfRecebedor || "-"}`, 15, yFinal + 30);
    doc.text(
      "Assinatura do Recebedor(a): ___________________________",
      15,
      yFinal + 40
    );

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
        Nenhum dado encontrado. Selecione um alvo na tela anterior.
      </p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded mt-10">
      <h2 className="text-xl font-bold mb-4 text-center">
        Termo de Entrega - Cautela
      </h2>

      <p className="mb-6 text-justify whitespace-pre-line">
        Aos {formatarDataPorExtenso()}, faço a entrega dos materiais
        relacionados e discriminados a seguir, apreendidos em decorrência de
        medida cautelar exarada nos autos nº{" "}
        <b>{dados?.operacao?.numero_autos || "-"}</b>. Os materiais, arrecadados
        pelo(a) <b>{dados?.cumprimento?.comandante || "-"}</b>, CPF{" "}
        <b>{dados?.cumprimento?.cpf_comandante || "-"}</b>, se encontravam sob
        posse do(a) <b>{dados?.alvo?.nome || "-"}</b>, CPF{" "}
        <b>{dados?.alvo?.cpf || "-"}</b>, no endereço sito à{" "}
        <b>{dados?.alvo?.endereco || "-"}</b>, bairro{" "}
        <b>{dados?.alvo?.bairro || "-"}</b>, na cidade de{" "}
        <b>{dados?.alvo?.cidade || "-"}</b>, sendo que após a apreensão foram
        entregues na sede do(a):
      </p>

      {/* Campos editáveis */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Sede"
          value={form.sede}
          onChange={(e) => setForm({ ...form, sede: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Endereço"
          value={form.enderecoEntrega}
          onChange={(e) =>
            setForm({ ...form, enderecoEntrega: e.target.value })
          }
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Bairro"
          value={form.bairroEntrega}
          onChange={(e) => setForm({ ...form, bairroEntrega: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Cidade"
          value={form.cidadeEntrega}
          onChange={(e) => setForm({ ...form, cidadeEntrega: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Nome do Recebedor"
          value={form.nomeRecebedor}
          onChange={(e) => setForm({ ...form, nomeRecebedor: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="CPF do Recebedor"
          value={form.cpfRecebedor}
          onChange={(e) => setForm({ ...form, cpfRecebedor: e.target.value })}
          className="border p-2 rounded"
        />
      </div>

      {/* Lista de materiais */}
      <h3 className="font-semibold mb-2">Materiais Apreendidos:</h3>
      <table className="w-full border mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Item nº</th>
            <th className="border p-2">Quantidade</th>
            <th className="border p-2">Descrição</th>
          </tr>
        </thead>
        <tbody>
          {dados?.materiais?.length > 0 ? (
            dados.materiais.map((item, index) => (
              <tr key={index}>
                <td className="border p-2 text-center">{index + 1}</td>
                <td className="border p-2 text-center">{item.quantidade}</td>
                <td className="border p-2">{item.descricao}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center border p-2">
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
