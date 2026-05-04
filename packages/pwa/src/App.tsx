import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Scan from './pages/Scan';
import MyStamps from './pages/MyStamps';
import Rewards from './pages/Rewards';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/:businessId" element={<Scan />} />
        <Route path="/mis-sellos" element={<MyStamps />} />
        <Route path="/premios" element={<Rewards />} />
      </Routes>
    </div>
  );
}
