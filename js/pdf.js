// ============================================================================
// js/pdf.js
// ----------------------------------------------------------------------------
// Geração do PDF de recibo/Ordem de Serviço — RECURSO PREMIUM (com isca para
// o plano grátis).
//
//   - Plano GRÁTIS:   o PDF é gerado normalmente, mas sai com uma marca
//                      d'água convidando para o Premium (ainda é um recurso
//                      útil/funcional, serve de "degustação" do recurso).
//   - Plano PREMIUM:  PDF limpo, sem marca d'água.
//
// Depende da lib jsPDF (carregada via CDN apenas em lista-os.html, que é a
// única página que usa este módulo):
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// ============================================================================

// ----------------------------------------------------------------------------
// Gera e baixa o PDF de recibo de uma Ordem de Serviço.
//
// @param {object}  os               dados da OS (cliente, titulo, descricao, execucao, valor, status, createdAt...)
// @param {object}  dadosUsuario     documento usuarios/{uid} do prestador de serviço (nome, email...)
// @param {boolean} usuarioPremium   true = remove marca d'água
// ----------------------------------------------------------------------------
export function gerarReciboPDF(os, dadosUsuario, usuarioPremium) {
  if (!window.jspdf) {
    alert("Não foi possível carregar o gerador de PDF. Verifique sua conexão e tente novamente.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const nomePrestador = (dadosUsuario && dadosUsuario.nome) || "Prestador de Serviço";

  // Cabeçalho
  pdf.setFontSize(16);
  pdf.text(nomePrestador, 14, 20);

  pdf.setFontSize(12);
  pdf.setTextColor(100);
  pdf.text("Recibo de Ordem de Serviço", 14, 28);

  pdf.setDrawColor(200);
  pdf.line(14, 32, 196, 32);

  // Corpo (rótulo + valor, uma linha por campo)
  const dataCriacao = os.createdAt?.toDate ? os.createdAt.toDate() : null;

  const linhas = [
    ["Cliente", os.cliente || "-"],
    ["Título", os.titulo || "-"],
    ["Problema relatado", os.descricao || "-"],
    ["Serviço realizado", os.execucao || "-"],
    ["Valor", `R$ ${Number(os.valor || 0).toFixed(2)}`],
    ["Status", os.status || "-"],
    ["Criada em", dataCriacao ? dataCriacao.toLocaleString("pt-BR") : "-"]
  ];

  let y = 44;
  pdf.setFontSize(11);

  linhas.forEach(([rotulo, valor]) => {
    pdf.setTextColor(30);
    pdf.setFont(undefined, "bold");
    pdf.text(`${rotulo}:`, 14, y);

    pdf.setFont(undefined, "normal");
    // quebra o texto em várias linhas se for muito longo (ex: descrição grande)
    const textoQuebrado = pdf.splitTextToSize(String(valor), 125);
    pdf.text(textoQuebrado, 60, y);

    y += 8 * Math.max(textoQuebrado.length, 1);
  });

  // Marca d'água apenas no plano grátis (isca de upgrade)
  if (!usuarioPremium) {
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text(
      "Gerado gratuitamente com App OS — assine o Premium e remova esta marca.",
      14,
      285
    );
  }

  const nomeArquivo = `recibo-${(os.cliente || "cliente").replace(/\s+/g, "_")}.pdf`;
  pdf.save(nomeArquivo);
}
