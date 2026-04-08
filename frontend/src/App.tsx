import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import BalanceManagement from './pages/BalanceManagement';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-900 text-white">
        <Sidebar />
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/kreditorka" replace />} />
            <Route path="/kreditorka" element={<BalanceManagement />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
