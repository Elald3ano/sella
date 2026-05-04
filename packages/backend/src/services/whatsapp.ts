interface SendMessageParams {
  to: string;
  templateName: string;
  parameters?: string[];
}

export async function sendWhatsAppMessage({ to, templateName, parameters = [] }: SendMessageParams) {
  const mockMessage = parameters.length > 0
    ? parameters.join(' | ')
    : templateName;

  console.log(`\n[MOCK WhatsApp]`);
  console.log(`  Para: ${to}`);
  console.log(`  Plantilla: ${templateName}`);
  if (parameters.length > 0) {
    console.log(`  Parámetros: ${parameters.join(', ')}`);
  }
  console.log(`  Estado: ✅ Enviado (mock)\n`);

  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    success: true,
    data: {
      messaging_product: 'whatsapp',
      contacts: [{ input: to, wa_id: to.replace(/\D/g, '') }],
      messages: [{ id: `wamid.mock.${Date.now()}` }],
    },
  };
}

export async function sendReactivationMessage(phone: string, customerName: string, businessName: string) {
  return sendWhatsAppMessage({
    to: phone,
    templateName: 'reactivacion_cliente',
    parameters: [customerName, businessName],
  });
}
