import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, History, Wallet, Building2, MapPin, TrendingUp, TrendingDown } from 'lucide-react';

interface MedicalOrganization {
  id: number;
  name: string;
  region_name: string;
  credit_balance: number;
}

interface BalanceTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  date: string;
  comment: string;
}

const BalanceManagement = () => {
  const [orgs, setOrgs] = useState<MedicalOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<MedicalOrganization | null>(null);
  const [history, setHistory] = useState<BalanceTransaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpComment, setTopUpComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const resp = await axios.get('/api/v1/crm/med-orgs?limit=100');
      setOrgs(resp.data);
    } catch (err) {
      console.error('Failed to fetch orgs', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (orgId: number) => {
    try {
      const resp = await axios.get(`/api/v1/crm/med-orgs/${orgId}/balance-history`);
      setHistory(resp.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const handleTopUp = async () => {
    if (!selectedOrg || !topUpAmount) return;
    setIsSubmitting(true);
    try {
      await axios.post(`/api/v1/crm/med-orgs/${selectedOrg.id}/top-up-balance`, {
        amount: parseFloat(topUpAmount),
        comment: topUpComment
      });
      setShowTopUp(false);
      setTopUpAmount('');
      setTopUpComment('');
      fetchOrgs();
      alert('Баланс успешно пополнен');
    } catch (err) {
      alert('Ошибка при пополнении баланса');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Баланс контрагентов</h1>
          <p className="text-slate-400 mt-1">Управление виртуальными балансами медицинских организаций (Кредиторка)</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Поиск организации..." 
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Организация</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Регион</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-right">Баланс (Кредиторка)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-slate-200">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-4 h-4" />
                        {org.region_name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-lg font-bold ${org.credit_balance > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {org.credit_balance?.toLocaleString() || 0} <span className="text-xs font-medium text-slate-500">UZS</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedOrg(org);
                            setShowTopUp(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Пополнить
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedOrg(org);
                            fetchHistory(org.id);
                            setShowHistory(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-all active:scale-95"
                        >
                          <History className="w-3.5 h-3.5" />
                          История
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TopUp Modal */}
      {showTopUp && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Wallet className="text-blue-500 w-7 h-7" />
              Пополнить баланс
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              Пополнение баланса для <span className="text-white font-medium">{selectedOrg.name}</span>. 
              Средства будут автоматически направлены на погашение текущих задолженностей (FIFO).
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Сумма пополнения (UZS)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-lg"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Комментарий / Причина</label>
                <textarea 
                  rows={3}
                  placeholder="Опишите источник или причину пополнения..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                  value={topUpComment}
                  onChange={(e) => setTopUpComment(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-10 flex gap-3">
              <button 
                onClick={() => setShowTopUp(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all active:scale-95"
              >
                Отмена
              </button>
              <button 
                onClick={handleTopUp}
                disabled={isSubmitting || !topUpAmount}
                className="flex-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : 'Подтвердить пополнение'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-slate-700 pb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <History className="text-slate-400 w-7 h-7" />
                  История транзакций
                </h2>
                <p className="text-slate-400 mt-1 text-sm">{selectedOrg.name}</p>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                aria-label="Close"
              >
                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <Wallet className="w-12 h-12 opacity-20" />
                  <p>История транзакций пуста</p>
                </div>
              ) : (
                history.map((tx) => (
                  <div key={tx.id} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 flex items-start gap-4 hover:border-slate-600 transition-colors">
                    <div className={`p-2.5 rounded-xl ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {tx.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">{tx.transaction_type}</span>
                        <span className="text-sm font-bold text-slate-100">{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} UZS</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                        {tx.comment || 'Без комментария'}
                      </p>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-3 font-semibold">
                        {new Date(tx.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceManagement;
