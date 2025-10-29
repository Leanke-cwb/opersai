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
  const [policiais, setPoliciais] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!alvoId) return;
    async function fetchDados() {
      try {
        setCarregando(true);
        const { data: alvoData } = await supabase
          .from("alvos")
          .select("*")
          .eq("id", alvoId)
          .maybeSingle();
        setAlvo(alvoData);

        const { data: operacaoData } = await supabase
          .from("operacoes")
          .select("*")
          .eq("id", alvoData?.operacao_id)
          .maybeSingle();
        setOperacao(operacaoData);

        const { data: encerramentoData } = await supabase
          .from("operacoes_encerramento")
          .select("*")
          .eq("alvo_id", alvoId)
          .eq("encerrado", true)
          .order("encerrado_em", { ascending: false })
          .limit(1)
          .maybeSingle();
        setEncerramento(encerramentoData || null);

        const { data: comandanteData } = await supabase
          .from("cumprimento_mandado")
          .select("comandante_nome, comandante_posto_graduacao")
          .eq("alvo_id", alvoId)
          .maybeSingle();
        setComandante(
          comandanteData || {
            comandante_nome: "—",
            comandante_posto_graduacao: "—",
          }
        );

        const { data: itensData } = await supabase
          .from("auto_itens")
          .select("*")
          .eq("alvo_id", alvoId);

        const itensComUrls = await Promise.all(
          (itensData || []).map(async (item) => {
            let fotos = [];
            if (item.fotos) {
              try {
                fotos = Array.isArray(item.fotos)
                  ? item.fotos
                  : JSON.parse(item.fotos);
                if (!Array.isArray(fotos)) fotos = [fotos];
              } catch {
                fotos = item.fotos.split(",").map((f) => f.trim());
              }
            }
            const signedFotos = await Promise.all(
              fotos.map(async (fileName) => {
                try {
                  const { data } = await supabase.storage
                    .from("auto_itens_fotos")
                    .createSignedUrl(fileName, 31536000);
                  return data?.signedUrl || null;
                } catch {
                  return null;
                }
              })
            );
            return { ...item, signedFotos: signedFotos.filter(Boolean) };
          })
        );
        setItens(itensComUrls);

        // 🔹 Buscar policiais executores
        const { data: policiaisData } = await supabase
          .from("policiais")
          .select("id, posto, nome_completo, cpf");
        setPoliciais(policiaisData || []);
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

      // Convertemos as fotos para base64 para poder usar doc.addImage
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
          // aumenta a altura da linha quando for coluna de fotos
          if (data.section === "body" && data.column.index === 5) {
            if (data.row.height < photoHeight + 2 * photoPadding) {
              data.row.height = photoHeight + 2 * photoPadding;
            }
          }
        },
        didDrawCell: (data) => {
          // desenha imagens na coluna "Fotos"
          if (data.section === "body" && data.column.index === 5) {
            const item = itensComBase64[data.row.index];
            if (!item || !item.base64Fotos?.length) return;

            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellWidth = data.cell.width;
            const cellHeight = data.row.height;

            const photos = item.base64Fotos.slice(0, 2); // desenha até 2 imagens por célula
            const photoAvailableWidth =
              cellWidth - photoPadding * (photos.length + 1);
            const photoWidthAdjusted = photoAvailableWidth / photos.length;

            photos.forEach((img, idx) => {
              try {
                const x =
                  cellX +
                  photoPadding +
                  idx * (photoWidthAdjusted + photoPadding);
                const y = cellY + photoPadding;
                // detecta tipo de imagem base64 (jpeg/png)
                const imgType = img.startsWith("data:image/png")
                  ? "PNG"
                  : "JPEG";
                doc.addImage(
                  img,
                  imgType,
                  x,
                  y,
                  photoWidthAdjusted,
                  photoHeight
                );
              } catch (e) {
                // se falhar, ignora a imagem (para não quebrar o PDF)
                console.warn("Erro ao adicionar imagem no PDF:", e);
              }
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

      // 🔹 Tabela Policiais no PDF
      const tabelaPoliciais = (policiais || []).map((p) => [
        p.id,
        p.posto,
        p.nome_completo,
        p.cpf,
      ]);

      const posTabela = finalY + 30;
      doc.setFontSize(12);
      doc.setFont("times", "bold");
      doc.text("Policiais Executores da Busca e Apreensão", 14, posTabela);

      autoTable(doc, {
        startY: posTabela + 8,
        head: [["Id", "Posto", "Nome Completo", "CPF"]],
        body: tabelaPoliciais,
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
${encerramento?.justificativa?.trim() || "—"}`;

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
                <th>Item nº</th>
                <th>Quantidade</th>
                <th>Lacre nº</th>
                <th>Descrição</th>
                <th>Local</th>
                <th>Fotos</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.quantidade_item}</td>
                  <td>{item.lacre}</td>
                  <td>{item.descricao}</td>
                  <td>{item.local_encontrado}</td>
                  <td>
                    {item.signedFotos?.length ? (
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

          <p className="mt-4">{`E sendo o que havia para relacionar, totalizando a arrecadação de ${
            itens.length
          } ${
            itens.length === 1 ? "item" : "itens"
          }, deu-se por encerrada a presente busca.`}</p>

          {/* 🔹 Tabela Policiais (na tela) */}
          <table className="table-auto border-collapse border border-gray-300 w-full mt-6">
            <thead>
              <h1>Policiais Executores do Mandado de Busca</h1>
              <tr className="bg-gray-200">
                <th>Id</th>
                <th>Posto</th>
                <th>Nome Completo</th>
                <th>CPF</th>
              </tr>
            </thead>
            <tbody>
              {policiais.map((p) => (
                <tr key={p.id}>
                  <td className="border border-gray-300 px-3 py-1">{p.id}</td>
                  <td className="border border-gray-300 px-3 py-1">
                    {p.posto}
                  </td>
                  <td className="border border-gray-300 px-3 py-1">
                    {p.nome_completo}
                  </td>
                  <td className="border border-gray-300 px-3 py-1">{p.cpf}</td>
                </tr>
              ))}
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
