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
  const [comandante, setComandante] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!alvoId) return;

    async function fetchDados() {
      try {
        setCarregando(true);

        console.log("🔹 Alvo ID: –", alvoId);

        // Alvo
        const { data: alvoData, error: alvoError } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .maybeSingle();
        console.log("🔹 Alvo Data:", alvoData, "Erro:", alvoError);
        setAlvo(alvoData);

        // Operação
        const { data: operacaoData, error: operacaoError } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", alvoData?.operacao_id)
          .maybeSingle();
        console.log("🔹 Operação Data:", operacaoData, "Erro:", operacaoError);
        setOperacao(operacaoData);

        // Encerramento
        const { data: encerramentoData, error: encerramentoError } =
          await supabase
            .from("operacoes_encerramento")
            .select("*")
            .eq("alvo_id", alvoId)
            .eq("encerrado", true)
            .order("encerrado_em", { ascending: false })
            .limit(1);
        console.log(
          "🔹 Encerramento Data:",
          encerramentoData,
          "Erro:",
          encerramentoError
        );
        setEncerramento(encerramentoData?.[0] || null);

        // Comandante
        const { data: comandanteData, error: comandanteError } = await supabase
          .from("cumprimento_mandado")
          .select("comandante_nome, comandante_posto_graduacao")
          .eq("alvo_id", alvoId)
          .maybeSingle();
        console.log(
          "🔹 Comandante Data:",
          comandanteData,
          "Erro:",
          comandanteError
        );
        setComandante(
          comandanteData || {
            comandante_nome: "—",
            comandante_posto_graduacao: "—",
          }
        );

        // Itens
        const { data: itensData, error: itensError } = await supabase
          .from("auto_itens")
          .select("*")
          .eq("alvo_id", alvoId);
        console.log("🔹 Itens Data:", itensData, "Erro:", itensError);
        setItens(itensData || []);
      } catch (err) {
        console.error("❌ Erro ao buscar dados:", err);
      } finally {
        setCarregando(false);
      }
    }

    fetchDados();
  }, [alvoId]);

  async function gerarPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("AUTO CIRCUNSTANCIADO DE BUSCA e APREENSÃO", 14, 20);

    doc.setFontSize(12);
    doc.text(`OPERAÇÃO: ${operacao?.nome_operacao || ""}`, 14, 30);
    doc.text(`ALVO Nº: ${alvo?.numero_alvo || ""}`, 14, 40);
    doc.text(
      `COMANDANTE: ${comandante?.comandante_nome || "—"} - ${
        comandante?.comandante_posto_graduacao || "—"
      }`,
      14,
      50
    );

    const dataCumprimento = encerramento?.encerrado_em
      ? new Date(encerramento.encerrado_em).toLocaleString("pt-BR")
      : "—";

    const justificativaTexto = encerramento?.justificativa?.trim() || "—";

    const texto = `INVESTIGADO: ${alvo?.nome || ""}
Aos ${dataCumprimento}, em cumprimento ao MANDADO DE BUSCA E APREENSÃO expedido junto aos Autos nº ${
      operacao?.numero_autos || ""
    }, da Vara ${operacao?.vara || ""} /PR, compareceu no imóvel, situado à ${
      alvo?.endereco || ""
    }, ${alvo?.cidade || ""}, na presença das testemunhas.

CERTIFICO AINDA QUE:
${justificativaTexto}
`;

    doc.text(texto, 14, 60, { maxWidth: 180 });

    // Tabela de itens
    if (itens.length > 0) {
      let startY = 120;
      doc.text("Itens Apreendidos:", 14, startY);
      startY += 10;

      autoTable(doc, {
        startY,
        head: [
          ["Item nº", "Quantidade", "Lacre nº", "Descrição", "Local", "Fotos"],
        ],
        body: itens.map((item, index) => {
          const fotos = (() => {
            try {
              return JSON.parse(item.fotos);
            } catch {
              return [];
            }
          })();
          return [
            index + 1,
            item.quantidade_item || "",
            item.lacre || "",
            item.descricao || "",
            item.local_encontrado || "",
            fotos.length > 0 ? "—" : "—",
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: [200, 200, 200] },
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`AutoCircunstanciado_${alvo?.numero_alvo || "000"}.pdf`);
  }

  if (carregando) return <p>Carregando dados...</p>;
  if (!alvo || !operacao)
    return (
      <p className="text-red-600 p-4">
        ❌ Não foi possível carregar os dados do alvo ou operação.
      </p>
    );

  const textoAuto = `
INVESTIGADO: ${alvo.nome}
Aos ${
    encerramento?.encerrado_em
      ? new Date(encerramento.encerrado_em).toLocaleString("pt-BR")
      : "—"
  }, em cumprimento ao MANDADO DE BUSCA E APREENSÃO expedido junto aos Autos nº ${
    operacao.numero_autos
  }, da Vara ${operacao.vara} /PR, compareceu no imóvel, situado à ${
    alvo.endereco
  }, ${alvo.cidade}, na presença das testemunhas.

CERTIFICO AINDA QUE:
${encerramento?.justificativa?.trim() || "—"}
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
        <strong>Comandante:</strong> {comandante?.comandante_nome || "—"} -{" "}
        <strong>Posto/Graduação:</strong>{" "}
        {comandante?.comandante_posto_graduacao || "—"}
      </p>
      <p>
        <strong>Data do Cumprimento:</strong>{" "}
        {encerramento?.encerrado_em
          ? new Date(encerramento.encerrado_em).toLocaleString("pt-BR")
          : "—"}
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
                <th className="border border-gray-300 px-2 py-1">Fotos</th>
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
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={gerarPDF}
      >
        Gerar PDF
      </button>
    </div>
  );
}
