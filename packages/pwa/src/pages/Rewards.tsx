import { useNavigate } from 'react-router-dom';

export default function Rewards() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-primary-600 text-white p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
            ← Volver
          </button>
          <span className="font-medium">Premios disponibles</span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-6">
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🎁</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Próximamente</h3>
          <p className="text-sm text-gray-500">
            Aquí verás los premios que puedes canjear con tus sellos acumulados.
          </p>
          <button
            onClick={() => navigate('/mis-sellos')}
            className="mt-6 bg-primary-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors"
          >
            Ver mis sellos
          </button>
        </div>
      </div>
    </div>
  );
}
