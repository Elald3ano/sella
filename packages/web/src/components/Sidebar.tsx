import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/panel', label: 'Dashboard', icon: '📊' },
  { path: '/panel/programas', label: 'Programas', icon: '⭐' },
  { path: '/panel/clientes', label: 'Clientes', icon: '👥' },
  { path: '/panel/campanas', label: 'Campañas', icon: '💬' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('sella_business');
    navigate('/');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen hidden lg:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <span className="text-xl font-bold text-primary-600">Sella</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
