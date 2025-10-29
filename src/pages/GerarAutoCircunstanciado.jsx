import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function cleanUUID(uuidString) {
  if (!uuidString) return null;
  return uuidString.replace(/"/g, "");
}

export default function GerarAutoCircunstanciado() {
  const alvoIdRaw = localStorage.getItem("alvoId");
  const alvoId = cleanUUID(alvoIdRaw);

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
        const { data: alvoData, error: alvoError } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .maybeSingle();
        if (alvoError) throw alvoError;
        setAlvo(alvoData);

        const { data: operacaoData, error: operacaoError } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", alvoData?.operacao_id)
          .maybeSingle();
        if (operacaoError) throw operacaoError;
        setOperacao(operacaoData);

        const { data: encerramentoData, error: encerramentoError } =
          await supabase
            .from("operacoes_encerramento")
            .select("*")
            .eq("alvo_id", alvoId)
            .eq("encerrado", true)
            .order("encerrado_em", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (encerramentoError) throw encerramentoError;
        setEncerramento(encerramentoData || null);

        const { data: comandanteData, error: comandanteError } = await supabase
          .from("cumprimento_mandado")
          .select("comandante_nome, comandante_posto_graduacao")
          .eq("alvo_id", alvoId)
          .maybeSingle();
        if (comandanteError) throw comandanteError;
        setComandante(
          comandanteData || {
            comandante_nome: "—",
            comandante_posto_graduacao: "—",
          }
        );

        const { data: itensData, error: itensError } = await supabase
          .from("auto_itens")
          .select("*")
          .eq("alvo_id", alvoId);
        if (itensError) throw itensError;

        const itensComUrls = await Promise.all(
          (itensData || []).map(async (item) => {
            let fotos = [];
            if (item.fotos) {
              if (Array.isArray(item.fotos)) fotos = item.fotos;
              else if (typeof item.fotos === "string") {
                try {
                  fotos = JSON.parse(item.fotos);
                  if (!Array.isArray(fotos)) fotos = [fotos];
                } catch {
                  fotos = item.fotos.split(",").map((f) => f.trim());
                }
              }
            }
            const signedFotos = await Promise.all(
              fotos.map(async (fileName) => {
                try {
                  const { data, error } = await supabase.storage
                    .from("auto_itens_fotos")
                    .createSignedUrl(fileName, 31536000);
                  if (error) return null;
                  return data.signedUrl;
                } catch {
                  return null;
                }
              })
            );
            return { ...item, signedFotos: signedFotos.filter(Boolean) };
          })
        );
        setItens(itensComUrls);
      } catch (error) {
        console.error("❌ Erro ao buscar dados:", error);
      } finally {
        setCarregando(false);
      }
    }
    fetchDados();
  }, [alvoId]);

  async function gerarPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableMargin = 14;
    const photoPadding = 2;
    const photoHeight = 35;
    const logoPMPR =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";
    const logoCOGER =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/coger.png";

    doc.addImage(logoPMPR, "PNG", 15, 10, 25, 25);
    doc.addImage(logoCOGER, "PNG", pageWidth - 40, 10, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("POLÍCIA MILITAR DO PARANÁ", pageWidth / 2, 20, {
      align: "center",
    });
    doc.text("CORREGEDORIA-GERAL", pageWidth / 2, 27, { align: "center" });
    doc.text("SEÇÃO DE ASSUNTOS INTERNOS", pageWidth / 2, 34, {
      align: "center",
    });
    doc.line(15, 40, pageWidth - 15, 40);

    doc.setFontSize(12);
    doc.text("AUTO CIRCUNSTANCIADO DE BUSCA E APREENSÃO", pageWidth / 2, 50, {
      align: "center",
    });

    let yPos = 60;
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(`OPERAÇÃO: ${operacao?.nome_operacao || "—"}`, 14, yPos);
    yPos += 7;
    doc.text(`ALVO Nº: ${alvo?.numero_alvo || "—"}`, 14, yPos);
    yPos += 7;
    doc.text(
      `COMANDANTE: ${comandante?.comandante_nome || "—"} - ${
        comandante?.comandante_posto_graduacao || "—"
      }`,
      14,
      yPos
    );
    yPos += 10;

    const dataCumprimento = encerramento?.encerrado_em
      ? new Date(encerramento.encerrado_em).toLocaleString("pt-BR")
      : "—";

    const justificativaTexto = encerramento?.justificativa?.trim() || "—";

    const texto = `INVESTIGADO: ${alvo?.nome || "—"}
Aos ${dataCumprimento}, em cumprimento ao MANDADO DE BUSCA E APREENSÃO expedido junto aos Autos nº ${
      operacao?.numero_autos || "—"
    }, da Vara ${operacao?.vara || "—"} /PR, compareceu no imóvel, situado à ${
      alvo?.endereco || "—"
    }, ${alvo?.cidade || "—"}, na presença das testemunhas.

CERTIFICO AINDA QUE:
${justificativaTexto}
`;
    doc.text(texto, 14, yPos, { maxWidth: pageWidth - 28 });

    if (itens.length > 0) {
      let startY = yPos + 50;
      doc.text("Itens Apreendidos:", 14, startY);
      startY += 8;

      const itensComBase64 = await Promise.all(
        itens.map(async (item) => {
          const base64Fotos = await Promise.all(
            (item.signedFotos || []).map(async (url) => {
              try {
                const blob = await fetch(url).then((res) => res.blob());
                return await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
              } catch {
                return null;
              }
            })
          );
          return { ...item, base64Fotos: base64Fotos.filter(Boolean) };
        })
      );

      autoTable(doc, {
        startY,
        head: [
          ["Item nº", "Quantidade", "Lacre nº", "Descrição", "Local", "Fotos"],
        ],
        body: itensComBase64.map((item, i) => [
          i + 1,
          item.quantidade_item || "",
          item.lacre || "",
          item.descricao || "",
          item.local_encontrado || "",
          item.base64Fotos.length > 0 ? "" : "—",
        ]),
        theme: "grid",
        headStyles: { fillColor: [230, 230, 230] },
        margin: { left: tableMargin, right: tableMargin },
        columnStyles: {
          3: { cellWidth: 40 },
          5: { cellWidth: 55 },
        },
        rowPageBreak: "avoid",
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            if (data.row.height < photoHeight + 2 * photoPadding) {
              data.row.height = photoHeight + 2 * photoPadding;
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            const item = itensComBase64[data.row.index];
            if (!item.base64Fotos?.length) return;

            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellWidth = data.cell.width;
            const cellHeight = data.row.height;

            const photos = item.base64Fotos.slice(0, 2);
            const photoAvailableWidth =
              cellWidth - photoPadding * (photos.length + 1);
            const photoWidthAdjusted = photoAvailableWidth / photos.length;

            photos.forEach((img, idx) => {
              const x =
                cellX +
                photoPadding +
                idx * (photoWidthAdjusted + photoPadding);
              const y = cellY + photoPadding;
              doc.addImage(img, "JPEG", x, y, photoWidthAdjusted, photoHeight);
            });

            if (item.base64Fotos.length > 2) {
              const more = `+${item.base64Fotos.length - 2} mais`;
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(more, cellX + photoPadding, cellY + cellHeight - 3);
              doc.setFontSize(11);
              doc.setTextColor(0);
            }
          }
        },
      });

      let finalY = doc.lastAutoTable.finalY || startY + 20;
      const totalItens = itens.length;
      const pluralItem = totalItens === 1 ? "item" : "itens";
      const textoResumo = `E sendo o que havia para relacionar, totalizando a arrecadação de ${totalItens} ${pluralItem}, deu-se por encerrada a presente busca.`;

      doc.setFontSize(11);
      doc.setFont("times", "normal");
      doc.text(textoResumo, 14, finalY + 10);

      // Tabela 4x4 no PDF
      const tabela4x4Body = [
        [
          "Linha 1, Cel 1",
          "Linha 1, Cel 2",
          "Linha 1, Cel 3",
          "Linha 1, Cel 4",
        ],
        [
          "Linha 2, Cel 1",
          "Linha 2, Cel 2",
          "Linha 2, Cel 3",
          "Linha 2, Cel 4",
        ],
        [
          "Linha 3, Cel 1",
          "Linha 3, Cel 2",
          "Linha 3, Cel 3",
          "Linha 3, Cel 4",
        ],
        [
          "Linha 4, Cel 1",
          "Linha 4, Cel 2",
          "Linha 4, Cel 3",
          "Linha 4, Cel 4",
        ],
      ];

      const posTabela4x4 = finalY + 30;

      doc.setFontSize(12);
      doc.setFont("times", "bold");
      doc.text("Policiais Executores da Busca e Apreensão", 14, posTabela4x4);

      autoTable(doc, {
        startY: posTabela4x4 + 8,
        head: [["Id", "Posto", "Nome Completo", "CPF"]],
        body: tabela4x4Body,
        theme: "grid",
        margin: { left: tableMargin, right: tableMargin },
        headStyles: { fillColor: [230, 230, 230] },
        styles: { fontSize: 10 },
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

  const textoAuto = `INVESTIGADO: ${alvo.nome}
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
              {itens.map((item, index) => (
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
                    {item.signedFotos && item.signedFotos.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {item.signedFotos.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Foto"
                            className="w-24 h-24 object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Texto abaixo da tabela */}
          {itens.length > 0 && (
            <p className="mt-4 font-normal text-base">
              {`E sendo o que havia para relacionar, totalizando a arrecadação de ${
                itens.length
              } ${
                itens.length === 1 ? "item" : "itens"
              }, deu-se por encerrada a presente busca.`}
            </p>
          )}
          {/* Tabela 4x4 abaixo do texto */}
          <table className="table-auto border-collapse border border-gray-300 w-full mt-6">
            <thead>
              <h1 className="">Policiais Executores do Mandado de Busca</h1>

              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-3 py-1">Id</th>
                <th className="border border-gray-300 px-3 py-1">Posto</th>
                <th className="border border-gray-300 px-3 py-1">
                  Nome Completo 3
                </th>
                <th className="border border-gray-300 px-3 py-1">CPF 4</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 1, Cel 1
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 1, Cel 2
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 1, Cel 3
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 1, Cel 4
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 2, Cel 1
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 2, Cel 2
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 2, Cel 3
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 2, Cel 4
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 3, Cel 1
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 3, Cel 2
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 3, Cel 3
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 3, Cel 4
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 4, Cel 1
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 4, Cel 2
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 4, Cel 3
                </td>
                <td className="border border-gray-300 px-3 py-1">
                  Linha 4, Cel 4
                </td>
              </tr>
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
