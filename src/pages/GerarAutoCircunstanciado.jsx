import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ESTILO_TABELA_IMPRESSAO,
  adicionarRodapePaginas,
  escreverCampoQuebravel,
  escreverParagrafoFormal,
  garantirEspaco,
  tituloSecao,
} from "../utils/pdfFormal";

function textoPDF(valor, padrao = "-") {
  const texto =
    valor === null || valor === undefined || String(valor).trim() === ""
      ? padrao
      : String(valor).trim();

  return texto.toLocaleUpperCase("pt-BR");
}

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
  const pageHeight = certDoc.internal.pageSize.getHeight();

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
  certDoc.setLineWidth(0.25);
  certDoc.line(15, 40, pageWidth - 15, 40);

  certDoc.setFontSize(12);
  certDoc.text("CERTIDÃO DE INTEGRIDADE DOCUMENTAL", pageWidth / 2, 50, {
    align: "center",
  });

  let y = 64;
  y = escreverParagrafoFormal(
    certDoc,
    "Certifico, para os devidos fins, que o documento digital denominado AUTO CIRCUNSTANCIADO DE BUSCA E APREENSÃO, abaixo identificado, foi gerado eletronicamente e possui código HASH SHA-256 para verificação de sua integridade.",
    y,
  );

  y = tituloSecao(certDoc, "Identificação do Documento", y + 2, {
    alturaReserva: 40,
  });
  y = escreverCampoQuebravel(
    certDoc,
    "OPERAÇÃO",
    textoPDF(operacao?.nome_operacao, "—"),
    y,
  );
  y = escreverCampoQuebravel(
    certDoc,
    "ALVO Nº",
    textoPDF(alvo?.numero_alvo, "—"),
    y,
  );
  y = escreverCampoQuebravel(
    certDoc,
    "INVESTIGADO",
    textoPDF(alvo?.nome, "—"),
    y,
  );
  y = escreverCampoQuebravel(
    certDoc,
    "DATA/HORA DA GERAÇÃO",
    textoPDF(new Date().toLocaleString("pt-BR"), "—"),
    y,
  );

  y = tituloSecao(certDoc, "Hash SHA-256", y + 4, { alturaReserva: 28 });
  certDoc.setFont("courier", "normal");
  certDoc.setFontSize(9.5);
  const linhasHash = certDoc.splitTextToSize(String(hash || "").toUpperCase(), pageWidth - 30);
  certDoc.text(linhasHash, 15, y + 2);
  y += linhasHash.length * 5 + 8;

  y = escreverParagrafoFormal(
    certDoc,
    "A autenticidade e a integridade do arquivo poderão ser verificadas mediante conferência do hash acima, sendo que qualquer alteração posterior no arquivo resultará em código distinto e invalidará a correspondência com esta certidão.",
    y,
  );

  const assinaturaY = Math.max(y + 22, Math.min(pageHeight - 55, 235));
  certDoc.setFont("times", "normal");
  certDoc.line(60, assinaturaY, 150, assinaturaY);
  certDoc.setFont("times", "bold");
  certDoc.setFontSize(10);
  certDoc.text(textoPDF(comandante?.comandante_nome, "—"), 105, assinaturaY + 7, {
    align: "center",
  });
  certDoc.setFont("times", "normal");
  certDoc.text(
    textoPDF(comandante?.comandante_posto_graduacao, "—"),
    105,
    assinaturaY + 13,
    { align: "center" },
  );

  adicionarRodapePaginas(certDoc, "CERTIDÃO DE INTEGRIDADE DOCUMENTAL");
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
  const [testemunhas, setTestemunhas] = useState([]);
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
            "comandante_nome, comandante_posto_graduacao, comandante_cpf, integrantes, policiais_apoio",
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
            identificacao: cumprimentoData.comandante_cpf || "—",
            unidade: "—",
            funcao: "Comandante",
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
              identificacao: userData?.cpf || "—",
              unidade: "—",
              funcao: "Integrante",
            });
          }

          const apoios = Array.isArray(cumprimentoData.policiais_apoio)
            ? cumprimentoData.policiais_apoio
            : [];

          apoios.forEach((apoio) => {
            policiaisLista.push({
              id: policiaisLista.length + 1,
              posto: apoio?.posto_graduacao || "—",
              nome_completo: apoio?.nome || "—",
              identificacao: apoio?.cpf || apoio?.rg_matricula || "—",
              unidade: apoio?.unidade || "—",
              funcao: "Apoio",
            });
          });
        }
        setPoliciais(policiaisLista);
        // ===============================
// BUSCAR TESTEMUNHAS
// ===============================

const { data: testemunhasData, error: testemunhasError } =
  await supabase
    .from("testemunhas")
    .select("*")
    .eq("alvo_id", alvoId);


if (testemunhasError) {

  console.error(
    "Erro ao buscar testemunhas:",
    testemunhasError
  );

}


// Buscar assinatura no Storage

const testemunhasComAssinatura = await Promise.all(

  (testemunhasData || []).map(async (testemunha) => {


    let assinaturaUrl = null;


    if (testemunha.assinatura_foto) {


      const { data } = await supabase.storage

        .from("assinaturas_testemunhas")

        .createSignedUrl(
          testemunha.assinatura_foto,
          600
        );


      assinaturaUrl = data?.signedUrl || null;

    }


    return {

      ...testemunha,

      assinaturaUrl

    };


  })

);


setTestemunhas(testemunhasComAssinatura);

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
                    .createSignedUrl(fileName, 600);
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
    doc.setLineWidth(0.25);
    doc.line(15, 40, pageWidth - 15, 40);

    doc.setFontSize(12);
    doc.text("AUTO CIRCUNSTANCIADO DE BUSCA E APREENSÃO", pageWidth / 2, 50, {
      align: "center",
    });

    const dataCumprimento = encerramento?.encerrado_em
      ? new Date(encerramento.encerrado_em).toLocaleString("pt-BR")
      : "—";
    const justificativaTexto = textoPDF(encerramento?.justificativa?.trim(), "—");

    let y = 62;
    y = tituloSecao(doc, "Identificação", y, { alturaReserva: 46 });
    y = escreverCampoQuebravel(
      doc,
      "OPERAÇÃO",
      textoPDF(operacao?.nome_operacao, "—"),
      y,
    );
    y = escreverCampoQuebravel(doc, "ALVO Nº", textoPDF(alvo?.numero_alvo, "—"), y);
    y = escreverCampoQuebravel(doc, "INVESTIGADO", textoPDF(alvo?.nome, "—"), y);
    y = escreverCampoQuebravel(
      doc,
      "COMANDANTE",
      `${textoPDF(comandante?.comandante_posto_graduacao, "")} ${textoPDF(
        comandante?.comandante_nome,
        "—",
      )}`.trim(),
      y,
    );
    y = escreverCampoQuebravel(
      doc,
      "DATA/HORA DO CUMPRIMENTO",
      textoPDF(dataCumprimento, "—"),
      y,
    );

    y = tituloSecao(doc, "Cumprimento do Mandado", y + 4, { alturaReserva: 30 });
    y = escreverParagrafoFormal(
      doc,
      `Em cumprimento ao MANDADO DE BUSCA E APREENSÃO expedido nos Autos nº ${textoPDF(
        operacao?.numero_autos,
        "—",
      )}, da ${textoPDF(operacao?.vara, "—")} /PR, a equipe compareceu ao imóvel situado à ${textoPDF(
        alvo?.endereco,
        "—",
      )}, município de ${textoPDF(
        alvo?.cidade,
        "—",
      )}, onde foram adotadas as providências pertinentes, na presença das testemunhas relacionadas neste documento.`,
      y,
    );

    y = tituloSecao(doc, "Certifico Ainda Que", y + 2, { alturaReserva: 25 });
    y = escreverParagrafoFormal(doc, justificativaTexto, y, {
      espacoDepois: 7,
    });

    if (itens.length > 0) {
      y = tituloSecao(doc, "Itens Apreendidos", y + 2, { alturaReserva: 30 });

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

      const photoSize = 25;
      const photoPadding = 2;

      autoTable(doc, {
        ...ESTILO_TABELA_IMPRESSAO,
        startY: y,
        rowPageBreak: "avoid",
        head: [["ITEM Nº", "QUANTIDADE", "LACRE Nº", "DESCRIÇÃO", "LOCAL", "FOTOS"]],
        body: itensComBase64.map((item, i) => [
          i + 1,
          textoPDF(item.quantidade_item, ""),
          textoPDF(item.lacre, ""),
          textoPDF(item.descricao, ""),
          textoPDF(item.local_encontrado, ""),
          item.base64Fotos.length > 0 ? "" : "—",
        ]),
        margin: { left: 14, right: 14, bottom: 20 },
        styles: {
          ...ESTILO_TABELA_IMPRESSAO.styles,
          fontSize: 8,
          cellPadding: 1.8,
        },
        columnStyles: {
          0: { cellWidth: 13, halign: "center" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 22 },
          3: { cellWidth: 42 },
          4: { cellWidth: 35 },
          5: { cellWidth: 55 },
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            if (
              !data.row ||
              data.row.index == null ||
              !itensComBase64[data.row.index] ||
              !Array.isArray(itensComBase64[data.row.index].base64Fotos)
            ) {
              return;
            }

            const fotos = itensComBase64[data.row.index].base64Fotos;
            fotos.slice(0, 2).forEach((img, idx) => {
              const imgX = data.cell.x + photoPadding + idx * (photoSize + photoPadding);
              const imgY = data.cell.y + photoPadding;
              doc.addImage(img, "JPEG", imgX, imgY, photoSize, photoSize);
            });
          }
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            data.cell.styles.minCellHeight = photoSize + photoPadding * 2;
          }
        },
      });

      y = doc.lastAutoTable?.finalY || y + 30;
      y = escreverParagrafoFormal(
        doc,
        `E, sendo o que havia para relacionar, totalizando ${itens.length} ${
          itens.length === 1 ? "item" : "itens"
        }, deu-se por encerrada a presente relação de bens apreendidos.`,
        y + 8,
        { espacoDepois: 6 },
      );
    }

    if (policiais.length > 0) {
      y = garantirEspaco(doc, y + 4, 35);
      y = tituloSecao(doc, "Policiais Executores do Mandado de Busca", y, {
        alturaReserva: 30,
      });

      autoTable(doc, {
        ...ESTILO_TABELA_IMPRESSAO,
        startY: y,
        head: [["ID", "POSTO", "NOME COMPLETO", "CPF", "UNIDADE", "FUNÇÃO"]],
        body: policiais.map((p) => [
          p.id,
          textoPDF(p.posto, "—"),
          textoPDF(p.nome_completo, "—"),
          textoPDF(p.identificacao, "—"),
          textoPDF(p.unidade, "—"),
          textoPDF(p.funcao, "—"),
        ]),
        margin: { left: 14, right: 14, bottom: 20 },
        styles: {
          ...ESTILO_TABELA_IMPRESSAO.styles,
          fontSize: 7.5,
          cellPadding: 1.8,
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 19 },
          2: { cellWidth: 50 },
          3: { cellWidth: 34 },
          4: { cellWidth: 40 },
          5: { cellWidth: 25 },
        },
      });
      y = doc.lastAutoTable?.finalY || y + 30;
    }

    if (testemunhas.length > 0) {
      y = garantirEspaco(doc, y + 10, 45);
      y = tituloSecao(doc, "Testemunhas Presentes no Cumprimento do Mandado de Busca", y, {
        alturaReserva: 38,
      });

      autoTable(doc, {
        ...ESTILO_TABELA_IMPRESSAO,
        startY: y,
        rowPageBreak: "avoid",
        head: [["NOME COMPLETO", "CPF", "ASSINATURA"]],
        body: testemunhas.map((t) => [
          textoPDF(t.nome_completo, "—"),
          textoPDF(t.cpf, "—"),
          "",
        ]),
        margin: { left: 14, right: 14, bottom: 20 },
        styles: {
          ...ESTILO_TABELA_IMPRESSAO.styles,
          fontSize: 8.5,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 45 },
          2: { cellWidth: 60 },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 2) {
            data.cell.styles.minCellHeight = 25;
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 2) {
            const testemunha = testemunhas[data.row.index];
            if (testemunha?.assinaturaUrl) {
              doc.addImage(
                testemunha.assinaturaUrl,
                "PNG",
                data.cell.x + 5,
                data.cell.y + 2,
                35,
                20,
              );
            }
          }
        },
      });
    }

    adicionarRodapePaginas(doc, "AUTO CIRCUNSTANCIADO DE BUSCA E APREENSÃO");

    const pdfArrayBuffer = doc.output("arraybuffer");
    const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
    const hash = await gerarHashPDF(blob);

    doc.save(`AutoCircunstanciado_${nomeOperacao}_Alvo_${numeroAlvo}.pdf`);

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
                  colSpan={6}
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
                <th className="border border-gray-400 px-2 py-1">
                  CPF
                </th>
                <th className="border border-gray-400 px-2 py-1">Unidade</th>
                <th className="border border-gray-400 px-2 py-1">Função</th>
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
                  <td className="border border-gray-400 px-2 py-1">
                    {p.identificacao}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {p.unidade}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 font-semibold">
                    {p.funcao}
                  </td>
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
