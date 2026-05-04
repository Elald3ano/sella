import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!manualCode.trim()) return;

    try {
      const res = await fetch(`/api/s/${manualCode.trim()}`);
      if (!res.ok) throw new Error('Código no encontrado');
      navigate(`/s/${manualCode.trim()}`);
    } catch {
      setError('Negocio no encontrado. Verifica el código.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">⭐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sella</h1>
          <p className="text-gray-500 text-sm">
            Escanea el QR en tu tienda favorita para acumular sellos y ganar premios.
          </p>
        </div>

        <button
          onClick={() => scannerRef.current?.click()}
          className="w-full bg-primary-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-primary-700 transition-colors mb-4 shadow-lg shadow-primary-200"
        >
          <span className="text-2xl mr-2">📷</span>
          Escanear QR
        </button>
        <input
          ref={scannerRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => navigate('/s/demo');
            reader.readAsDataURL(file);
          }}
        />

        <div className="flex items-center gap-3 w-full my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">o escribe un código</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleManualSubmit} className="w-full">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Código del negocio"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-center"
          />
          {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full mt-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Buscar negocio
          </button>
        </form>
      </div>

      <div className="p-6 text-center">
        <button
          onClick={() => navigate('/mis-sellos')}
          className="text-sm text-primary-600 font-medium hover:underline"
        >
          Ver mis sellos acumulados
        </button>
      </div>
    </div>
  );
}
