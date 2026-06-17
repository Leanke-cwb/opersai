import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function cleanUUID(uuidString) {
  if (!uuidString) return null;
  return uuidString.replace(/"/g, "");
}

function formatarNomeArquivo(texto) {
  if (!texto) return "SemOperacao";

  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
async function gerarHashPDF(blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function gerarCertidao(hash, alvo, operacao, comandante) {
  const nomeOperacao = formatarNomeArquivo(operacao?.nome_operacao);
  const numeroAlvo = alvo?.numero_alvo || "000";
  const certDoc = new jsPDF();
  const pageWidth = certDoc.internal.pageSize.getWidth();

  const logoPMPR =
    "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";
  const logoCOGER =
    "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/brasao.png";

  certDoc.addImage(logoPMPR, "PNG", pageWidth - 40, 10, 25, 25);
  certDoc.addImage(logoCOGER, "PNG", 15, 10, 25, 25);

  certDoc.setFont("times", "bold");
  certDoc.setFontSize(13);
  certDoc.text("POLÍCIA MILITAR DO PARANÁ", pageWidth / 2, 20, {
    align: "center",
  });
  certDoc.text("CORREGEDORIA-GERAL", pageWidth / 2, 27, {
    align: "center",
  });
  

  certDoc.line(15, 40, pageWidth - 15, 40);

  certDoc.setFontSize(12);
  certDoc.text("CERTIDÃO DE INTEGRIDADE DOCUMENTAL", pageWidth / 2, 50, {
    align: "center",
  });

  certDoc.setFont("times", "normal");
  certDoc.setFontSize(11);

  const dataAtual = new Date().toLocaleString("pt-BR");

  const texto = `
  CERTIFICO, para os devidos fins, que o documento digital denominado AUTO CIRCUNSTANCIADO DE
BUSCA E APREENSÃO, referente à operação abaixo identificada, foi gerado eletronicamente e possui
o seguinte código HASH SHA-256 para verificação de integridade:

OPERAÇÃO: ${operacao?.nome_operacao || "—"}

ALVO Nº: ${alvo?.numero_alvo || "—"}

INVESTIGADO: ${alvo?.nome || "—"}

DATA/HORA DA GERAÇÃO: ${dataAtual}

HASH SHA-256:

${hash}

  A autenticidade e integridade do arquivo poderão ser verificadas mediante conferência do hash acima,
sendo que qualquer alteração posterior invalidará esta certidão.
`;

  certDoc.text(texto, 14, 70, {
    maxWidth: pageWidth - 28,
    align: "left",
  });
  certDoc.line(60, 250, 150, 250);

  certDoc.setFont("times", "bold");
  certDoc.text(comandante?.comandante_nome || "—", 105, 257, {
    align: "center",
  });

  certDoc.setFont("times", "normal");
  certDoc.text(`${comandante?.comandante_posto_graduacao || "—"}`, 105, 263, {
    align: "center",
  });

  certDoc.save(`CertidaoHash_${nomeOperacao}_Alvo_${numeroAlvo}.pdf`);
}
export default function GerarAutoCircunstanciado() {
  const alvoIdRaw = localStorage.getItem("alvoId");
  const alvoId = cleanUUID(alvoIdRaw);
  const navigate = useNavigate();

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

        const { data: cumprimentoData } = await supabase
          .from("cumprimento_mandado")
          .select(
            "comandante_nome, comandante_posto_graduacao, comandante_cpf, integrantes",
          )
          .eq("alvo_id", alvoId)
          .maybeSingle();

        if (cumprimentoData) {
          setComandante(cumprimentoData);
        }

        let policiaisLista = [];
        if (cumprimentoData) {
          policiaisLista.push({
            id: 1,
            posto: cumprimentoData.comandante_posto_graduacao || "—",
            nome_completo: cumprimentoData.comandante_nome || "—",
            cpf: cumprimentoData.comandante_cpf || "—",
          });

          const integrantes = cumprimentoData.integrantes || [];
          for (let i = 0; i < integrantes.length; i++) {
            const integranteId = cleanUUID(integrantes[i]);
            if (!integranteId) continue;
            const { data: userData } = await supabase
              .from("usuarios")
              .select("posto_graduacao, nome, cpf, id, user_id")
              .eq("user_id", integranteId)
              .maybeSingle();
            policiaisLista.push({
              id: i + 2,
              posto: userData?.posto_graduacao || "—",
              nome_completo: userData?.nome || "—",
              cpf: userData?.cpf || "—",
            });
          }
        }
        setPoliciais(policiaisLista);

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
              }),
            );
            return { ...item, signedFotos: signedFotos.filter(Boolean) };
          }),
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
    const nomeOperacao = formatarNomeArquivo(operacao?.nome_operacao);
    const numeroAlvo = alvo?.numero_alvo || "000";
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableMargin = 14;
    const photoHeight = 35;

    const logoPMPR =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png";
    const logoCOGER =
      "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/brasao.png";

    doc.addImage(logoPMPR, "PNG", pageWidth - 40, 10, 25, 25);
    doc.addImage(logoCOGER, "PNG", 15, 10, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("POLÍCIA MILITAR DO PARANÁ", pageWidth / 2, 20, {
      align: "center",
    });
    doc.text("CORREGEDORIA-GERAL", pageWidth / 2, 27, { align: "center" });
    
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
      yPos,
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
${justificativaTexto}`;
    doc.text(texto, 14, yPos, { maxWidth: pageWidth - 28 });

    if (itens.length > 0) {
      let startY = yPos + 50;
      doc.text("Itens Apreendidos:", 14, startY);
      startY += 8;

      // Fotos em base64
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
            }),
          );
          return { ...item, base64Fotos: base64Fotos.filter(Boolean) };
        }),
      );

      // tabela
      const photoSize = 25; // tamanho fixo das fotos
      const photoPadding = 2; // espaçamento interno

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
        columnStyles: { 3: { cellWidth: 40 }, 5: { cellWidth: 60 } },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            // ✅ GUARDA NECESSÁRIA (SÓ ISSO)
            if (
              !data.row ||
              data.row.index == null ||
              !itensComBase64[data.row.index] ||
              !Array.isArray(itensComBase64[data.row.index].base64Fotos)
            ) {
              return;
            }

            const fotos = itensComBase64[data.row.index].base64Fotos;

            if (fotos.length) {
              fotos.slice(0, 2).forEach((img, idx) => {
                const imgX =
                  data.cell.x + photoPadding + idx * (photoSize + photoPadding);
                const imgY = data.cell.y + photoPadding;

                doc.addImage(img, "JPEG", imgX, imgY, photoSize, photoSize);
              });
            }
          }
        },

        // aumenta a altura das células para acomodar as fotos
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            data.cell.styles.minCellHeight = photoSize + photoPadding * 2;
          }
        },
      });

      let finalY = doc.lastAutoTable.finalY || startY + 20;
      const totalItens = itens.length;
      doc.text(
        `E sendo o que havia para relacionar, totalizando ${totalItens} ${
          totalItens === 1 ? "item" : "itens"
        }, deu-se por encerrada a presente busca.`,
        14,
        finalY + 10,
      );

      // tabela policiais
      const posTabela = finalY + 30;
      doc.setFont("times", "bold");
      doc.text("Policiais Executores do Mandado de Busca", 14, posTabela);
      autoTable(doc, {
        startY: posTabela + 8,
        head: [["ID", "Posto", "Nome Completo", "CPF"]],
        body: policiais.map((p) => [p.id, p.posto, p.nome_completo, p.cpf]),
        theme: "grid",
        headStyles: { fillColor: [230, 230, 230] },
      });
    }

    const pdfArrayBuffer = doc.output("arraybuffer");
    const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

    const hash = await gerarHashPDF(blob);

    // primeiro baixa o Auto Circunstanciado
    doc.save(`AutoCircunstanciado_${nomeOperacao}_Alvo_${numeroAlvo}.pdf`);

    // espera o navegador processar
    setTimeout(async () => {
      await gerarCertidao(hash, alvo, operacao, comandante);
    }, 1500);
  }
  if (carregando) return <p>Carregando dados...</p>;

  const textoAuto = `INVESTIGADO: ${alvo?.nome}
Aos ${
    encerramento?.encerrado_em
      ? new Date(encerramento.encerrado_em).toLocaleString("pt-BR")
      : "—"
  }, em cumprimento ao MANDADO DE BUSCA E APREENSÃO expedido junto aos Autos nº ${
    operacao?.numero_autos
  }, da Vara ${operacao?.vara} /PR, compareceu no imóvel, situado à ${
    alvo?.endereco
  }, ${alvo?.cidade}, na presença das testemunhas.

CERTIFICO AINDA QUE:
${encerramento?.justificativa?.trim() || "—"}`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6 font-bold">
        AUTO CIRCUNSTANCIADO DE BUSCA e APREENSÃO
      </h1>

      <p>
        <strong>Operação:</strong> {operacao?.nome_operacao}
      </p>
      <p>
        <strong>Alvo Nº:</strong> {alvo?.numero_alvo} - <strong>Nome:</strong>{" "}
        {alvo?.nome}
      </p>
      <p>
        <strong>Endereço:</strong> {alvo?.endereco} - <strong>Cidade:</strong>{" "}
        {alvo?.cidade}
      </p>
      <p>
        <strong>Vara:</strong> {operacao?.vara} - <strong>Autos nº:</strong>{" "}
        {operacao?.numero_autos}
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

          {/* 🔹 Corrigido: bordas visíveis em todas as células */}
          <table className="table-auto border-collapse border border-gray-400 w-full">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-2 py-1">Item nº</th>
                <th className="border border-gray-400 px-2 py-1">Quantidade</th>
                <th className="border border-gray-400 px-2 py-1">Lacre nº</th>
                <th className="border border-gray-400 px-2 py-1">Descrição</th>
                <th className="border border-gray-400 px-2 py-1">Local</th>
                <th className="border border-gray-400 px-2 py-1">Fotos</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-400 px-2 py-1">
                    {index + 1}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {item.quantidade_item}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {item.lacre}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {item.descricao}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {item.local_encontrado}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {item.signedFotos?.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {item.signedFotos.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Foto"
                            className="w-24 h-24 object-cover border border-gray-300"
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

          <p className="mt-4">{`E sendo o que havia para relacionar, totalizando ${
            itens.length
          } ${
            itens.length === 1 ? "item" : "itens"
          }, deu-se por encerrada a presente busca.`}</p>

          {/* 🔹 Tabela Policiais (mantida igual) */}
          <table className="table-auto border-collapse border border-gray-400 w-full mt-6">
            <thead>
              <tr>
                <th
                  colSpan={4}
                  className="text-center bg-gray-200 py-2 border border-gray-400"
                >
                  Policiais Executores do Mandado de Busca
                </th>
              </tr>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-2 py-1">ID</th>
                <th className="border border-gray-400 px-2 py-1">Posto</th>
                <th className="border border-gray-400 px-2 py-1">
                  Nome Completo
                </th>
                <th className="border border-gray-400 px-2 py-1">CPF</th>
              </tr>
            </thead>
            <tbody>
              {policiais.map((p) => (
                <tr key={p.id}>
                  <td className="border border-gray-400 px-2 py-1">{p.id}</td>
                  <td className="border border-gray-400 px-2 py-1">
                    {p.posto}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {p.nome_completo}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">{p.cpf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          onClick={() => navigate(-1)}
        >
          Retornar
        </button>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={gerarPDF}
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}
