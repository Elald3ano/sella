import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-2xl font-bold text-primary-600">Sella</span>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
            <a href="#como-funciona" className="hover:text-primary-600">Cómo funciona</a>
            <a href="#beneficios" className="hover:text-primary-600">Beneficios</a>
            <a href="#precios" className="hover:text-primary-600">Precios</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="hidden md:block text-sm font-medium text-gray-600 hover:text-primary-600">
              Iniciar sesión
            </button>
            <button onClick={() => navigate('/registro')} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              Crear cuenta gratis
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              Fideliza a tus clientes <span className="text-primary-600">sin tarjetas de cartón</span>
            </h1>
            <p className="text-lg text-gray-500 mb-8 max-w-md">
              Reemplaza la tarjeta de sellos por un QR. Tus clientes escanean, acumulan y tú los reactivas por WhatsApp cuando se enfrían.
            </p>
            <div className="flex gap-4">
              <button onClick={() => navigate('/registro')} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                Empezar ahora
              </button>
              <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                Ver demo
              </button>
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8 text-center">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-xs mx-auto">
              <div className="text-sm text-gray-400 mb-2">Cafetería La Esperanza</div>
              <div className="flex justify-center gap-1 mb-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={`w-6 h-6 rounded-full border-2 ${i < 7 ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`} />
                ))}
              </div>
              <div className="text-sm font-medium text-gray-700">7 de 10 cafés</div>
              <div className="text-xs text-primary-600 font-medium mt-1">¡3 más y llevas uno gratis!</div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">En 3 pasos</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Crea tu programa', desc: 'Define cuántos sellos necesita el cliente y qué premio se lleva. Sin complicaciones.' },
              { step: '2', title: 'Pega tu QR', desc: 'Descarga e imprime un código QR único. Ponlo en la caja o mostrador.' },
              { step: '3', title: 'Tus clientes escanean', desc: 'Cada visita suma un sello digital. Tú ves quién vuelve, quién no, y reactivas con un clic.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="beneficios" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">¿Por qué Sella?</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            Sin hardware, sin app que instalar. Solo un QR y resultados medibles desde el día uno.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📊', title: 'Dashboard simple', desc: 'Clientes, sellos y canjes de un vistazo.' },
              { icon: '💬', title: 'Reactiva por WhatsApp', desc: 'Clientes inactivos reciben un mensaje automático.' },
              { icon: '📱', title: 'Sin app para el cliente', desc: 'Escanea el QR y listo. Cero fricción.' },
              { icon: '💰', title: 'Desde $0', desc: 'Plan gratuito para empezar. Crece cuando quieras.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Planes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Gratuito', price: '$0', features: ['Hasta 50 clientes', 'QR básico', 'Dashboard simple', 'Sin WhatsApp'] },
              { name: 'Básico', price: '$25.000/mes', features: ['Clientes ilimitados', 'QR personalizado', 'Dashboard completo', '50 WhatsApp/mes'], highlight: true },
              { name: 'Pro', price: '$45.000/mes', features: ['Todo lo de Básico', 'Multi-sucursal', 'Analytics avanzados', 'WhatsApp ilimitado'] },
            ].map((plan) => (
              <div key={plan.name} className={`bg-white rounded-xl p-6 border-2 ${plan.highlight ? 'border-primary-500 shadow-lg relative' : 'border-gray-100'}`}>
                {plan.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Más popular</span>}
                <h3 className="font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="text-3xl font-extrabold text-gray-900 mb-4">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/registro')} className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${plan.highlight ? 'bg-primary-600 text-white hover:bg-primary-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  Empezar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Sella — Fidelización digital para negocios locales. Cali, Colombia.
        </div>
      </footer>
    </div>
  );
}
