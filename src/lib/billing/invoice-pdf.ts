import PDFDocument from "pdfkit"

export async function generateInvoicePDF(subscription: any, userEmail: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", (err) => reject(err))

    doc.fillColor("#0f172a")
       .font("Helvetica-Bold")
       .fontSize(20)
       .text("FATURA / RECIBO", 50, 50)

    doc.font("Helvetica")
       .fontSize(10)
       .fillColor("#64748b")
       .text(`Fatura ID: INV-${subscription.id.substring(0, 8).toUpperCase()}`, 50, 75)
       .text(`Data de Emissao: ${new Date(subscription.createdAt).toLocaleDateString("pt-BR")}`, 50, 90)

    doc.fillColor("#0f172a")
       .font("Helvetica-Bold")
       .fontSize(12)
       .text("EMISSOR", 50, 130)
    doc.font("Helvetica")
       .fontSize(10)
       .fillColor("#334155")
       .text("Boilerplate Template Ltda", 50, 145)
       .text("CNPJ: 00.000.000/0001-00", 50, 160)
       .text("contato@template.com", 50, 175)

    doc.fillColor("#0f172a")
       .font("Helvetica-Bold")
       .fontSize(12)
       .text("CLIENTE", 300, 130)
    doc.font("Helvetica")
       .fontSize(10)
       .fillColor("#334155")
       .text(userEmail, 300, 145)
       .text(`Gateway: ${subscription.gateway.toUpperCase()}`, 300, 160)
       .text(`Sub ID: ${subscription.gatewaySubscriptionId || "N/A"}`, 300, 175)

    doc.moveTo(50, 210).lineTo(550, 210).strokeColor("#e2e8f0").lineWidth(1).stroke()

    doc.fillColor("#0f172a")
       .font("Helvetica-Bold")
       .fontSize(10)
       .text("Descricao do Item", 50, 230)
       .text("Plano", 250, 230)
       .text("Status", 350, 230)
       .text("Preco (Mes)", 450, 230, { align: "right" })

    doc.moveTo(50, 245).lineTo(550, 245).strokeColor("#e2e8f0").stroke()

    const price = subscription.planId.includes("premium") ? "R$ 49,90" : "R$ 29,90"

    doc.font("Helvetica")
       .fillColor("#334155")
       .text("Assinatura de Servicos SaaS", 50, 260)
       .text(subscription.planId.toUpperCase(), 250, 260)
       .text(subscription.status.toUpperCase(), 350, 260)
       .text(price, 450, 260, { align: "right" })

    doc.moveTo(50, 280).lineTo(550, 280).strokeColor("#e2e8f0").stroke()

    doc.fillColor("#0f172a")
       .font("Helvetica-Bold")
       .fontSize(12)
       .text("Total Pago:", 350, 310)
       .text(price, 450, 310, { align: "right" })

    doc.font("Helvetica")
       .fontSize(8)
       .fillColor("#94a3b8")
       .text("Obrigado por sua assinatura! Este documento serve como comprovante de transacao financeira executada.", 50, 400, { align: "center", width: 500 })

    doc.end()
  })
}
