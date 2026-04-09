import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '@/api/axios';
import { Search, Plus, History, Wallet, Building2, MapPin, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface MedicalOrganization {
  id: number;
  name: string;
  region_name: string;
  credit_balance: number;
  current_debt?: number;
}

interface BalanceTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  date: string;
  comment: string;
  created_at?: string;
}

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('ru-RU').format(Math.abs(amount));
};

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
      const resp = await axiosInstance.get('/crm/med-orgs?limit=100');
      if (resp.data.items) {
        setOrgs(resp.data.items);
      } else {
        setOrgs(resp.data);
      }
    } catch (err) {
      console.error('Failed to fetch orgs', err);
      toast.error('Не удалось загрузить организации');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    let credit = 0;
    let debt = 0;
    orgs.forEach(o => {
      const net = (o.credit_balance || 0) - (o.current_debt || 0);
      if (net > 0) credit += net;
      else if (net < 0) debt += Math.abs(net);
    });
    return { credit, debt };
  }, [orgs]);

  const fetchHistory = async (orgId: number) => {
    try {
      const resp = await axiosInstance.get(`/crm/med-orgs/${orgId}/balance-history`);
      setHistory(resp.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
      toast.error('Не удалось загрузить историю');
    }
  };

  const handleTopUp = async () => {
    if (!selectedOrg || !topUpAmount) return;
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/crm/med-orgs/${selectedOrg.id}/top-up-balance`, {
        amount: parseFloat(topUpAmount),
        comment: topUpComment
      });
      setShowTopUp(false);
      setTopUpAmount('');
      setTopUpComment('');
      fetchOrgs();
      toast.success('Баланс успешно пополнен');
    } catch (err) {
      toast.error('Ошибка при пополнении баланса');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrgs = orgs.filter(o => 
    (o.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-blue-600/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-blue-500/30">
              <Wallet className="w-7 h-7 text-blue-400" />
            </div>
            Баланс контрагентов
          </h1>
          <p className="text-slate-400 mt-1 font-medium">Управление виртуальными балансами и задолженностями</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Поиск организации..." 
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-white placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 backdrop-blur-md rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 transform group-hover:scale-110 transition-transform opacity-10">
            <ArrowUpRight className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-400/80 font-black uppercase tracking-[0.2em] text-[10px] mb-3">Jami Kreditorka</p>
            <h2 className="text-5xl font-black tracking-tighter tabular-nums flex items-baseline gap-2">
              {formatMoney(totals.credit)} 
              <span className="text-sm font-bold opacity-40 uppercase tracking-widest font-sans">UZS</span>
            </h2>
            <div className="mt-6 flex items-center gap-2 text-emerald-400/60 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ortiqcha to'lovlar yig'indisi
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/20 backdrop-blur-md rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 transform group-hover:scale-110 transition-transform opacity-10">
            <ArrowDownRight className="w-24 h-24 text-rose-400" />
          </div>
          <div className="relative z-10">
            <p className="text-rose-400/80 font-black uppercase tracking-[0.2em] text-[10px] mb-3">Jami Debitorka</p>
            <h2 className="text-5xl font-black tracking-tighter tabular-nums flex items-baseline gap-2 text-rose-400">
              {formatMoney(totals.debt)} 
              <span className="text-sm font-bold opacity-40 uppercase tracking-widest font-sans">UZS</span>
            </h2>
            <div className="mt-6 flex items-center gap-2 text-rose-400/60 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Xaridorlar qarzdorligi
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full shadow-lg shadow-blue-500/10" />
        </div>
      ) : (
        <div className="bg-slate-900/30 backdrop-blur-sm rounded-[2.5rem] border border-slate-700/30 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-700/50">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">O'rganizatsiya</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Region</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] text-right">Amaldagi Balans</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filteredOrgs.map((org) => {
                  const netBalance = (org.credit_balance || 0) - (org.current_debt || 0);
                  return (
                    <tr key={org.id} className="hover:bg-slate-800/30 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                            netBalance > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            netBalance < 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}>
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 block text-base group-hover:text-blue-400 transition-colors">{org.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5 block">Med. Tashkilot</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                          <MapPin className="w-4 h-4 opacity-30" />
                          {org.region_name || '—'}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right font-mono">
                        <div className={`text-2xl font-black flex items-center justify-end gap-1 tabular-nums ${
                          netBalance > 0 ? 'text-emerald-400' : 
                          netBalance < 0 ? 'text-rose-400' : 'text-slate-500'
                        }`}>
                          {netBalance > 0 ? '+' : netBalance < 0 ? '-' : ''}
                          {formatMoney(netBalance)} 
                          <span className="text-[10px] opacity-40 font-sans ml-1 font-black">UZS</span>
                        </div>
                        <div className={`text-[9px] uppercase font-black tracking-widest mt-1 ${
                          netBalance > 0 ? 'text-emerald-500/50' : netBalance < 0 ? 'text-rose-500/50' : 'text-slate-600'
                        }`}>
                          {netBalance > 0 ? 'Kreditorka' : netBalance < 0 ? 'Debitorka' : 'Balans bo\'sh'}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center justify-center gap-4">
                          <button 
                            onClick={() => {
                              setSelectedOrg(org);
                              setShowTopUp(true);
                            }}
                            className="flex items-center gap-2.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-widest"
                          >
                            <Plus className="w-4 h-4" />
                            To'lov
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedOrg(org);
                              fetchHistory(org.id);
                              setShowHistory(true);
                            }}
                            className="flex items-center gap-2.5 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[11px] font-black transition-all active:scale-95 border border-slate-700 uppercase tracking-widest"
                          >
                            <History className="w-4 h-4 opacity-40" />
                            Tarix
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TopUp Modal */}
      {showTopUp && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <Wallet className="w-40 h-40 text-white" />
            </div>
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mb-8 mx-auto border border-blue-500/20">
                <Wallet className="text-blue-500 w-10 h-10" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter">Balansni to'ldirish</h2>
              <p className="text-slate-500 mt-4 font-bold text-sm leading-relaxed max-w-xs mx-auto">
                <span className="text-blue-400">{selectedOrg.name}</span> uchun to'lov qabul qilish
              </p>

              <div className="mt-12 space-y-8 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 ml-2">To'lov summasi (UZS)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-[1.5rem] py-5 px-8 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-3xl font-black text-white placeholder:text-slate-800"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                    />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xs tracking-widest">UZS</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 ml-2">Izoh / Maqsad</label>
                  <textarea 
                    rows={3}
                    placeholder="To'lov haqida qo'shimcha ma'lumot..." 
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-[1.5rem] py-5 px-8 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-base font-bold text-white placeholder:text-slate-800 resize-none"
                    value={topUpComment}
                    onChange={(e) => setTopUpComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-12 flex flex-col gap-4">
                <button 
                  onClick={handleTopUp}
                  disabled={isSubmitting || !topUpAmount}
                  className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-[1.5rem] font-black tracking-widest uppercase transition-all shadow-2xl shadow-blue-600/30 active:scale-[0.98] flex items-center justify-center text-sm"
                >
                  {isSubmitting ? (
                    <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full" />
                  ) : 'To\'lovni tasdiqlash'}
                </button>
                <button 
                  onClick={() => setShowTopUp(false)}
                  className="w-full py-4 text-slate-600 hover:text-slate-400 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-3xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh] border border-slate-800">
            <div className="p-12 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-800 rounded-[1.5rem] flex items-center justify-center border border-slate-700">
                  <History className="text-slate-400 w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter">Tranzaksiyalar tarixi</h2>
                  <p className="text-slate-500 font-bold text-sm mt-1">{selectedOrg.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-12 h-12 hover:bg-slate-800 rounded-2xl transition-all flex items-center justify-center text-slate-600 hover:text-white group"
              >
                <Plus className="w-8 h-8 rotate-45 transform group-hover:scale-110" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 pt-6 space-y-5 bg-slate-900/50">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-700 gap-6">
                  <Wallet className="w-24 h-24 opacity-5" />
                  <p className="font-black uppercase tracking-[0.3em] text-[10px]">Ma'lumot topilmadi</p>
                </div>
              ) : (
                history.map((tx) => (
                  <div key={tx.id} className="bg-slate-800/40 border border-slate-800 rounded-[1.5rem] p-8 flex items-start gap-6 hover:border-blue-500/20 transition-all group shadow-sm">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {tx.amount > 0 ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-100 text-lg tracking-tight">{tx.transaction_type}</span>
                        <span className={`text-2xl font-black tabular-nums ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-3 font-bold leading-relaxed max-w-md">
                        {tx.comment || 'Izoh qoldirilmagan'}
                      </p>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mt-5 font-black flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        {new Date(tx.created_at || tx.date).toLocaleString('ru-RU')}
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
