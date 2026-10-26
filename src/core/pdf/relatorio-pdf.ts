// Paleta oficial do app (front-end/tailwind.config.js) — mesmas cores da
// splash screen e dos botões, pra o PDF não parecer de outro produto.
const COR = {
  primaria: '#0B4A2F', // verde escuro — fundo do cabeçalho, títulos de seção
  secundaria: '#E6F4EC', // verde claro — caixas de destaque
  destaque: '#BF6A02', // dourado/laranja — status "submetido"
  texto: '#1F2A24', // corpo do texto
  textoMuted: '#5B6B63', // legendas, rodapé
  borda: '#D7E4DC',
  branco: '#FFFFFF',
};

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  SUBMETIDO: 'Submetido',
  CORRIGIDO: 'Corrigido',
};

const STATUS_COR: Record<string, string> = {
  RASCUNHO: COR.textoMuted,
  SUBMETIDO: COR.destaque,
  CORRIGIDO: COR.primaria,
};

const SECOES: Array<{ titulo: string; campo: string }> = [
  { titulo: 'Introdução', campo: 'introduction' },
  { titulo: 'Objetivo', campo: 'objective' },
  { titulo: 'Desenvolvimento', campo: 'development' },
  { titulo: 'Considerações Finais', campo: 'final_thoughts' },
  { titulo: 'Referências', campo: 'references' },
];

/** Um broto estilizado (duas folhas + caule), desenhado em vetor — sem depender de imagem. */
function desenharBroto(doc: PDFKit.PDFDocument, x: number, y: number, cor: string) {
  doc.save();
  doc.fillColor(cor);

  // Caule
  doc.moveTo(x, y + 22).lineTo(x, y + 6).lineWidth(2).strokeColor(cor).stroke();

  // Folha esquerda
  doc
    .moveTo(x, y + 14)
    .bezierCurveTo(x - 14, y + 10, x - 16, y - 4, x - 2, y - 6)
    .bezierCurveTo(x - 8, y + 4, x - 4, y + 12, x, y + 14)
    .fill();

  // Folha direita (um pouco maior, assimétrica fica mais natural)
  doc
    .moveTo(x, y + 8)
    .bezierCurveTo(x + 16, y + 2, x + 20, y - 14, x + 4, y - 16)
    .bezierCurveTo(x + 12, y - 4, x + 6, y + 4, x, y + 8)
    .fill();

  doc.restore();
}

function cabecalho(doc: PDFKit.PDFDocument) {
  const largura = doc.page.width;
  const alturaFaixa = 100;

  doc.rect(0, 0, largura, alturaFaixa).fill(COR.primaria);
  desenharBroto(doc, 70, 48, COR.destaque);

  doc
    .fillColor(COR.branco)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('DONKEYCODE', 95, 30, { characterSpacing: 1.5 });

  doc
    .fillColor(COR.branco)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('Relatório de Acompanhamento', 95, 48);

  doc
    .fillColor(COR.secundaria)
    .font('Helvetica')
    .fontSize(9)
    .text('Plantas forrageiras — documentação acadêmica do cultivo', 95, 74);

  doc.y = alturaFaixa + 28;
}

function badgeStatus(doc: PDFKit.PDFDocument, status: string, x: number, y: number) {
  const texto = STATUS_LABEL[status] ?? status;
  const cor = STATUS_COR[status] ?? COR.textoMuted;
  doc.font('Helvetica-Bold').fontSize(9);
  const largura = doc.widthOfString(texto) + 18;

  doc.roundedRect(x, y, largura, 18, 9).fill(cor);
  doc
    .fillColor(COR.branco)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(texto, x, y + 5, { width: largura, align: 'center' });

  return largura;
}

function caixaInfo(doc: PDFKit.PDFDocument, relatorio: any) {
  const margem = doc.page.margins.left;
  const largura = doc.page.width - margem * 2;
  const x = margem;
  const y = doc.y;
  const altura = 72;

  doc.roundedRect(x, y, largura, altura, 6).fill(COR.secundaria);

  const planta = relatorio.list?.plant?.name ?? '—';
  const canteiro = relatorio.canteiro?.name ?? '—';
  const geradoEm = new Date(relatorio.createdAt).toLocaleString('pt-BR');

  const colEsq = x + 16;
  const colDir = x + largura / 2 + 8;
  let linhaY = y + 12;

  const rotulo = (texto: string, px: number, py: number) =>
    doc.fillColor(COR.textoMuted).font('Helvetica-Bold').fontSize(8).text(texto, px, py, {
      characterSpacing: 0.5,
    });
  const valor = (texto: string, px: number, py: number) =>
    doc.fillColor(COR.texto).font('Helvetica').fontSize(11).text(texto, px, py + 11, {
      width: largura / 2 - 24,
    });

  rotulo('PLANTA', colEsq, linhaY);
  valor(planta, colEsq, linhaY);

  rotulo('CANTEIRO', colDir, linhaY);
  valor(canteiro, colDir, linhaY);

  linhaY += 38;
  rotulo('STATUS', colEsq, linhaY);
  badgeStatus(doc, relatorio.status, colEsq, linhaY + 10);

  rotulo('GERADO EM', colDir, linhaY);
  doc.fillColor(COR.texto).font('Helvetica').fontSize(10).text(geradoEm, colDir, linhaY + 11);

  doc.y = y + altura + 24;
}

function caixaAvaliacao(doc: PDFKit.PDFDocument, relatorio: any) {
  if (relatorio.status !== 'CORRIGIDO') return;

  const margem = doc.page.margins.left;
  const largura = doc.page.width - margem * 2;
  const x = margem;
  const y = doc.y;

  doc
    .roundedRect(x, y, largura, 4, 2)
    .fill(COR.destaque);

  doc.y = y + 12;
  doc.fillColor(COR.primaria).font('Helvetica-Bold').fontSize(12).text('Avaliação do professor');
  doc.moveDown(0.3);
  doc
    .fillColor(COR.texto)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`Nota: ${relatorio.grade ?? '—'}`);

  if (relatorio.feedback) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).text(relatorio.feedback, { align: 'justify' });
  }

  doc.moveDown(1.2);
}

function secao(doc: PDFKit.PDFDocument, titulo: string, texto: string) {
  const margem = doc.page.margins.left;

  // Garante que o título não fica "órfão" sozinho no fim da página.
  if (doc.y > doc.page.height - doc.page.margins.bottom - 80) {
    doc.addPage();
  }

  const yInicio = doc.y;

  doc.font('Helvetica-Bold').fontSize(13);
  const alturaTitulo = doc.heightOfString(titulo, { width: doc.page.width - margem * 2 - 12 });

  // Barrinha vertical de destaque à esquerda do título.
  doc.rect(margem, yInicio + 1, 4, alturaTitulo).fill(COR.destaque);

  doc.fillColor(COR.primaria).text(titulo, margem + 12, yInicio);

  doc.moveDown(0.4);

  const corpo = texto?.trim() ? texto.trim() : '(não preenchido)';
  doc
    .fillColor(texto?.trim() ? COR.texto : COR.textoMuted)
    .font(texto?.trim() ? 'Helvetica' : 'Helvetica-Oblique')
    .fontSize(10.5)
    .text(corpo, margem + 12, doc.y, {
      width: doc.page.width - margem * 2 - 12,
      align: 'justify',
    });

  doc.moveDown(1.1);
}

function rodape(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Desenhar abaixo da margem inferior dispara uma nova página automática
    // (pdfkit acha que o conteúdo "estourou"). Zera a margem só durante o
    // rodapé e restaura em seguida.
    const margemInferiorOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const margem = doc.page.margins.left;
    const y = doc.page.height - margemInferiorOriginal + 18;

    doc
      .moveTo(margem, y)
      .lineTo(doc.page.width - margem, y)
      .lineWidth(0.5)
      .strokeColor(COR.borda)
      .stroke();

    doc
      .fillColor(COR.textoMuted)
      .font('Helvetica')
      .fontSize(8)
      .text('DonkeyCode · Acompanhamento de plantas forrageiras', margem, y + 6, {
        width: doc.page.width - margem * 2 - 60,
      });

    doc
      .fillColor(COR.textoMuted)
      .font('Helvetica')
      .fontSize(8)
      .text(`${i - range.start + 1} / ${range.count}`, doc.page.width - margem - 60, y + 6, {
        width: 60,
        align: 'right',
      });

    doc.page.margins.bottom = margemInferiorOriginal;
  }
}

/** Monta o PDF do relatório, com o tema visual do app, no documento já criado. */
export function montarRelatorioPdf(doc: PDFKit.PDFDocument, relatorio: any) {
  cabecalho(doc);
  caixaInfo(doc, relatorio);
  caixaAvaliacao(doc, relatorio);

  for (const { titulo, campo } of SECOES) {
    secao(doc, titulo, relatorio[campo]);
  }

  rodape(doc);
}
