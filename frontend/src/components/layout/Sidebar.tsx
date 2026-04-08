import { Link, useLocation } from 'react-router-dom';
import { Wallet, Briefcase, ChevronRight, LayoutDashboard } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Кредиторка',
      icon: <Wallet className="w-5 h-5" />,
      subItems: [
        { title: 'Баланс контрагентов', path: '/kreditorka' }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col gap-8">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
          P
        </div>
        <span className="font-bold text-lg tracking-tight">Pharma ERP</span>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex items-center gap-3 px-3 py-2 text-slate-400 text-sm font-medium uppercase tracking-wider">
              {item.icon}
              {item.title}
            </div>
            <div className="flex flex-col gap-1 pl-8">
              {item.subItems.map((sub, sIdx) => {
                const isActive = location.pathname === sub.path;
                return (
                  <Link
                    key={sIdx}
                    to={sub.path}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400 font-medium' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{sub.title}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-700/30 rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium">
            BU
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Бухгалтер</span>
            <span className="text-[10px] text-slate-500">Accountant Role</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
