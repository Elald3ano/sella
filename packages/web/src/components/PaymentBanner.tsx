interface Props {
  trialEndsAt: string | null;
  plan: string;
  bizName: string;
}

export default function PaymentBanner({ trialEndsAt, plan, bizName }: Props) {
  if (plan !== 'trial') return null;
  if (!trialEndsAt) return null;

  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;

  const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || '573001234567';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'hola@sella.co';
  const waMsg = encodeURIComponent(`Hola Sella, quiero activar mi plan. Mi negocio es ${bizName || '[nombre]'}.`);
  const emailSubject = encodeURIComponent('Activación de plan - Sella');

  return (
    <div className={`text-sm px-4 py-3 text-center font-medium ${
      isExpired ? 'bg-red-50 text-red-700 border-b border-red-200' : 'bg-amber-50 text-amber-700 border-b border-amber-200'
    }`}>
      {isExpired ? (
        <span>
          ⚠️ Tu prueba gratuita de 30 días terminó.{' '}
          <a
            href={`https://wa.me/${supportPhone}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold hover:text-red-800"
          >
            💬 Pagar por WhatsApp
          </a>
          {' · '}
          <a
            href={`mailto:${supportEmail}?subject=${emailSubject}`}
            className="underline font-semibold hover:text-red-800"
          >
            📧 Solicitar por correo
          </a>
        </span>
      ) : daysLeft <= 7 ? (
        <span>⏳ Tu prueba gratuita vence en {daysLeft} días. Considera activar tu plan.</span>
      ) : null}
    </div>
  );
}
