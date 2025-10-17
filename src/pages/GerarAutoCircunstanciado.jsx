import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function GerarAutoCircunstanciado() {
  const alvoId = localStorage.getItem("alvoId");
  const [alvo, setAlvo] = useState(null);
  const [operacao, setOperacao] = useState(null);
  const [encerramento, setEncerramento] = useState(null);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!alvoId) return;

    async function fetchDados() {
      try {
        setCarregando(true);

        const { data: alvoData, error: alvoError } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .single();
        if (alvoError) throw alvoError;
        setAlvo(alvoData);

        const { data: operacaoData, error: operacaoError } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", alvoData.operacao_id)
          .single();
        if (operacaoError) throw operacaoError;
        setOperacao(operacaoData);

        const { data: encerramentoData } = await supabase
          .from("operacoes_encerramento")
          .select("*")
          .eq("alvo_id", alvoId)
          .order("created_at", { ascending: false })
          .limit(1);

        setEncerramento(encerramentoData?.[0] || null);

        const { data: itensData, error: itensError } = await supabase
          .from("auto_itens")
          .select("*")
          .eq("alvo_id", alvoId);
        if (itensError) throw itensError;
        setItens(itensData || []);
      } catch (err) {
        console.error("❌ Erro ao buscar dados:", err);
      } finally {
        setCarregando(false);
      }
    }

    fetchDados();
  }, [alvoId]);

  // 🔹 APENAS ESTA FUNÇÃO FOI AJUSTADA 🔹
  async function gerarPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("AUTO CIRCUNSTANCIADO DE BUSCA e APREENSÃO", 14, 20);

    doc.setFontSize(12);
    doc.text(`OPERAÇÃO: ${operacao?.nome_operacao || ""}`, 14, 30);
    doc.text(`ALVO Nº: ${alvo?.numero_alvo || ""}`, 14, 40);

    const texto = `INVESTIGADO: ${alvo?.nome || ""}
Aos ${
      encerramento?.encerrado_em || ""
    }, em cumprimento ao MANDADO DE BUSCA E APREENSÃO expedido junto aos Autos nº ${
      operacao?.numero_autos || ""
    }, da Vara ${operacao?.vara || ""} /PR, compareceu no imóvel, situado à ${
      alvo?.endereco || ""
    }, ${alvo?.cidade || ""}, na presença das testemunhas.

CERTIFICO AINDA QUE:
${
  encerramento?.houve_apreensao
  // ? `- Houve a busca e dela resultou apreendido material conforme consta no Auto Circunstanciado de Busca e Apreensão anexo vinculado a este Alvo nº ${alvo?.numero_alvo}`
  //: "- Não houve apreensão."
}
`;

    doc.text(texto, 14, 50, { maxWidth: 180 });

    // 🔸 Itens e fotos
    if (itens.length > 0) {
      let startY = 100;

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        doc.text(`${i + 1}`, 14, startY);
        doc.text(`${item.quantidade_item || ""}`, 25, startY);
        doc.text(`${item.lacre || ""}`, 45, startY);
        doc.text(`${item.descricao || ""}`, 70, startY);
        doc.text(`${item.local_encontrado || ""}`, 130, startY);

        // 🔹 Novo bloco para campo "fotos" (JSON com URLs)
        if (item.fotos) {
          try {
            const fotosArray = JSON.parse(item.fotos); // transforma o texto JSON em array
            if (Array.isArray(fotosArray)) {
              for (const url of fotosArray) {
                try {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  const reader = new FileReader();

                  await new Promise((resolve) => {
                    reader.onloadend = () => {
                      doc.addImage(
                        reader.result,
                        "JPEG",
                        14,
                        startY + 5,
                        40,
                        30
                      );
                      resolve();
                    };
                    reader.readAsDataURL(blob);
                  });

                  startY += 35; // espaço após cada imagem

                  if (startY > 250) {
                    doc.addPage();
                    startY = 20;
                  }
                } catch (err) {
                  console.warn("Erro ao carregar imagem:", err);
                }
              }
            }
          } catch (e) {
            console.error("Erro ao processar JSON de fotos:", e);
          }
        }

        startY += 15; // espaço entre os itens
        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }
      }
    }

    doc.save(`AutoCircunstanciado_${alvo?.numero_alvo || "000"}.pdf`);
  }

  if (carregando) {
    return <p>Carregando dados...</p>;
  }

  if (!alvo || !operacao) {
    return (
      <p className="text-red-600 p-4">
        ❌ Não foi possível carregar os dados do alvo ou operação.
      </p>
    );
  }

  const textoAuto = `
INVESTIGADO: ${alvo.nome}
Aos ${
    encerramento?.encerrado_em || ""
  }, em cumprimento ao MANDADO DE BUSCA E APREENSÃO expedido junto aos Autos nº ${
    operacao.numero_autos
  }, da Vara ${operacao.vara} /PR, compareceu no imóvel, situado à ${
    alvo.endereco
  }, ${alvo.cidade}, na presença das testemunhas.

CERTIFICO AINDA QUE:
${
  encerramento?.houve_apreensao
    ? `- Houve a busca e dela resultou apreendido material conforme consta no Auto Circunstanciado de Busca e Apreensão anexo vinculado a este Alvo nº ${alvo.numero_alvo}`
    : "- Não houve apreensão."
}
`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6 font-bold">
        AUTO CIRCUNSTANCIADO DE BUSCA e APREENSÃO
      </h1>

      <p>
        <strong>Operação:</strong> {operacao.nome_operacao}
      </p>
      <p>
        <strong>Alvo Nº:</strong> {alvo.numero_alvo} - <strong>Nome:</strong>{" "}
        {alvo.nome}
      </p>
      <p>
        <strong>Endereço:</strong> {alvo.endereco} - <strong>Cidade:</strong>{" "}
        {alvo.cidade}
      </p>
      <p>
        <strong>Vara:</strong> {operacao.vara} - <strong>Autos nº:</strong>{" "}
        {operacao.numero_autos}
      </p>
      <p>
        <strong>Comandante:</strong> {encerramento?.comandante_nome || "—"}
      </p>

      <pre className="mt-6 whitespace-pre-line border p-4 bg-gray-50">
        {textoAuto}
      </pre>

      {itens.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Itens Apreendidos:</h2>
          <table className="table-auto border-collapse border border-gray-300 w-full">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-2 py-1">Item nº</th>
                <th className="border border-gray-300 px-2 py-1">Quantidade</th>
                <th className="border border-gray-300 px-2 py-1">Lacre nº</th>
                <th className="border border-gray-300 px-2 py-1">Descrição</th>
                <th className="border border-gray-300 px-2 py-1">Local</th>
                <th className="border border-gray-300 px-2 py-1">Foto</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => {
                const fotos = (() => {
                  try {
                    return JSON.parse(item.fotos);
                  } catch {
                    return [];
                  }
                })();

                return (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-2 py-1">
                      {index + 1}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      {item.quantidade_item || ""}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      {item.lacre || ""}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      {item.descricao || ""}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      {item.local_encontrado || ""}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      {fotos.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {fotos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt="Foto"
                              className="w-20 h-20 object-cover"
                            />
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={gerarPDF}
        className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 mt-4"
      >
        Gerar PDF
      </button>
    </div>
  );
}
