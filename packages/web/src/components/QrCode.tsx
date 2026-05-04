import { useEffect, useState } from 'react';

interface Props {
  businessId: string;
}

export default function QrCode({ businessId }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const pwaUrl = 'http://localhost:5174';
    fetch(`/api/s/${businessId}?baseUrl=${encodeURIComponent(pwaUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        setQrDataUrl(data.qr);
        setQrUrl(data.url);
      })
      .catch(() => setError('No se pudo generar el QR'));
  }, [businessId]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
      <h3 className="font-semibold text-gray-900 mb-4">Tu código QR</h3>
      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : qrDataUrl ? (
        <>
          <img src={qrDataUrl} alt="QR de tu negocio" className="mx-auto w-48 h-48" />
          <p className="text-sm text-gray-500 mt-4">
            Imprime este QR y pégalo en tu caja o mostrador.
            Tus clientes lo escanean para acumular sellos.
          </p>
          <p className="text-xs text-gray-400 mt-2 font-mono bg-gray-50 rounded px-2 py-1 inline-block">
            ID: {businessId}
          </p>
          <a
            href={qrDataUrl}
            download={`sella-qr-${businessId}.png`}
            className="block mt-3 text-sm text-primary-600 font-medium hover:underline"
          >
            Descargar QR
          </a>
        </>
      ) : (
        <div className="animate-pulse bg-gray-200 w-48 h-48 mx-auto rounded-lg" />
      )}
    </div>
  );
}
