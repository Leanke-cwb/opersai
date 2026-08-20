export const ESTILO_TABELA_IMPRESSAO = {
  theme: "grid",
  styles: {
    font: "times",
    fontSize: 9,
    textColor: [0, 0, 0],
    lineColor: [0, 0, 0],
    lineWidth: 0.15,
    cellPadding: 2.4,
    valign: "middle",
    overflow: "linebreak",
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
    lineColor: [0, 0, 0],
    lineWidth: 0.25,
    fontStyle: "bold",
    halign: "center",
    valign: "middle",
  },
};

export function garantirEspaco(doc, y, alturaNecessaria = 30, topo = 20, rodape = 18) {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + alturaNecessaria > pageHeight - rodape) {
    doc.addPage();
    return topo;
  }

  return y;
}

function escreverLinhaJustificada(doc, linha, x, y, largura, ultimaLinha) {
  const palavras = String(linha || "").trim().split(/\s+/).filter(Boolean);

  if (ultimaLinha || palavras.length <= 1) {
    doc.text(String(linha || ""), x, y);
    return;
  }

  const larguraTexto = doc.getTextWidth(palavras.join(" "));
  const quantidadeEspacos = palavras.length - 1;
  const espacoExtra = Math.max(0, largura - larguraTexto);
  const incremento = quantidadeEspacos > 0 ? espacoExtra / quantidadeEspacos : 0;

  let cursorX = x;

  palavras.forEach((palavra, indice) => {
    doc.text(palavra, cursorX, y);
    cursorX += doc.getTextWidth(palavra);

    if (indice < palavras.length - 1) {
      cursorX += doc.getTextWidth(" ") + incremento;
    }
  });
}

export function escreverParagrafoFormal(
  doc,
  texto,
  yInicial,
  {
    margemEsquerda = 15,
    margemDireita = 15,
    recuoPrimeiraLinha = 8,
    lineHeight = 6,
    fontSize = 11,
    topoNovaPagina = 20,
    rodape = 18,
    espacoDepois = 5,
  } = {},
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const largura = pageWidth - margemEsquerda - margemDireita;
  const textoNormalizado = String(texto || "").replace(/\s+/g, " ").trim();

  if (!textoNormalizado) return yInicial;

  doc.setFont("times", "normal");
  doc.setFontSize(fontSize);

  // O recuo é incorporado apenas na primeira linha para manter o parágrafo formal.
  const linhas = doc.splitTextToSize(`     ${textoNormalizado}`, largura);
  let y = yInicial;

  linhas.forEach((linha, indice) => {
    if (y > pageHeight - rodape) {
      doc.addPage();
      y = topoNovaPagina;
    }

    const primeiraLinha = indice === 0;
    const ultimaLinha = indice === linhas.length - 1;
    const linhaSemRecuo = primeiraLinha ? String(linha).trimStart() : String(linha);
    const x = margemEsquerda + (primeiraLinha ? recuoPrimeiraLinha : 0);
    const larguraLinha = largura - (primeiraLinha ? recuoPrimeiraLinha : 0);

    escreverLinhaJustificada(doc, linhaSemRecuo, x, y, larguraLinha, ultimaLinha);
    y += lineHeight;
  });

  return y + espacoDepois;
}

export function tituloSecao(doc, titulo, yInicial, { margem = 15, alturaReserva = 18 } = {}) {
  const y = garantirEspaco(doc, yInicial, alturaReserva);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(String(titulo || "").toLocaleUpperCase("pt-BR"), margem, y);
  doc.setLineWidth(0.2);
  doc.line(margem, y + 2, pageWidth - margem, y + 2);

  return y + 7;
}

export function escreverCampoQuebravel(
  doc,
  rotulo,
  valor,
  yInicial,
  { margem = 15, largura = 180, lineHeight = 5.5, fontSize = 10, espacoDepois = 1.5 } = {},
) {
  let y = garantirEspaco(doc, yInicial, 12);
  doc.setFontSize(fontSize);
  doc.setFont("times", "bold");

  const rotuloTexto = `${rotulo}: `;
  doc.text(rotuloTexto, margem, y);

  const xValor = margem + doc.getTextWidth(rotuloTexto);
  const larguraValor = Math.max(30, largura - doc.getTextWidth(rotuloTexto));
  const linhas = doc.splitTextToSize(String(valor ?? "-"), larguraValor);

  doc.setFont("times", "normal");
  doc.text(linhas, xValor, y);

  y += Math.max(1, linhas.length) * lineHeight + espacoDepois;
  return y;
}

export function adicionarRodapePaginas(doc, textoEsquerda = "DOCUMENTO GERADO ELETRONICAMENTE") {
  const total = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina);
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.15);
    doc.line(15, pageHeight - 14, pageWidth - 15, pageHeight - 14);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(textoEsquerda, 15, pageHeight - 9);
    doc.text(`PÁGINA ${pagina} DE ${total}`, pageWidth - 15, pageHeight - 9, {
      align: "right",
    });
  }
}
