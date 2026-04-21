import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/api/axios';
import { 
  Search, 
  Plus, 
  History, 
  Wallet, 
  Building2, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  FilterX,
  ArrowUpDown,
  ChevronRight,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { deleteBalanceTransaction } from '@/api/sales';
import { toast } from 'sonner';
import { formatMoney } from '@/components/ui/MoneyInput';
import { PageContainer } from '@/components/PageContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { ReservationDetailsModal } from '../features/reservations/ReservationDetailsModal';

interface MedicalOrganization {
  id: number;
  name: string;
  region_name: string;
  credit_balance: number;
  current_surplus: number;
  current_debt: number;
}

interface BalanceTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  date: string;
  comment: string;
  created_at?: string;
  related_invoice_id?: number;
  factura_number?: string;
}


const BalanceManagement = () => {
  const navigate = useNavigate();
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('none');
  
  // New state for reservation details
  const [selectedResDetails, setSelectedResDetails] = useState<any | null>(null);
  const [showResDetail, setShowResDetail] = useState(false);
   const [isFetchingRes, setIsFetchingRes] = useState(false);
   
   const user = useAuthStore(state => state.user);
   const [isDeleting, setIsDeleting] = useState<number | null>(null);
   const canManage = user?.role && ['accountant', 'investor', 'admin', 'director'].includes(user.role.toLowerCase());

   const handleDeleteHistory = async (e: React.MouseEvent, txId: number) => {
     e.stopPropagation();
     if (!window.confirm('Haqiqatan ham ushbu amalni bekor qilmoqchimisiz? Bu moliyaviy hisobotlarga ta’sir qiladi.')) return;

     setIsDeleting(txId);
     try {
       await deleteBalanceTransaction(txId);
       toast.success("Amal muvaffaqiyatli bekor qilindi");
       if (selectedOrg) fetchHistory(selectedOrg.id);
       fetchOrgs(); // Refresh main list balance
     } catch (error: any) {
       console.error("Failed to delete transaction", error);
       const detail = error.response?.data?.detail || "Xatolik yuz berdi";
       toast.error(detail);
     } finally {
       setIsDeleting(null);
     }
   };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const resp = await axiosInstance.get('/crm/med-orgs?limit=500');
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
      credit += (o.current_surplus || 0);
      debt += (o.current_debt || 0);
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

  const handleViewInvoice = async (reservationId: number) => {
    setIsFetchingRes(true);
    try {
      const resp = await axiosInstance.get(`/sales/reservations/${reservationId}`);
      setSelectedResDetails(resp.data);
      setShowResDetail(true);
    } catch (err) {
      console.error('Failed to fetch reservation details', err);
      toast.error('Не удалось загрузить детали бронирования');
    } finally {
      setIsFetchingRes(false);
    }
  };

  const handleTopUp = async () => {
    if (!selectedOrg || !topUpAmount) return;
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/crm/med-orgs/${selectedOrg.id}/top-up-balance`, {
        med_org_id: selectedOrg.id,
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

  const filteredOrgs = useMemo(() => {
    let result = orgs.filter(o => 
      (o.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortDirection !== 'none') {
      result = [...result].sort((a, b) => {
        const balA = (a.current_surplus || 0) - (a.current_debt || 0);
        const balB = (b.current_surplus || 0) - (b.current_debt || 0);
        return sortDirection === 'asc' ? balA - balB : balB - balA;
      });
    }
    return result;
  }, [orgs, searchTerm, sortDirection]);

  const toggleSort = () => {
    if (sortDirection === 'none') setSortDirection('desc');
    else if (sortDirection === 'desc') setSortDirection('asc');
    else setSortDirection('none');
  };

  return (
    <PageContainer>
      <div className="space-y-8 animate-in fade-in duration-700 pb-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-indigo-100 border border-indigo-700/10">
                <Wallet className="w-7 h-7" />
              </div>
              Баланс контрагентов
            </h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider ml-1">Мониторинг дебиторской и кредиторской задолженности</p>
          </div>
          
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск по названию..." 
              className="w-full h-14 bg-white border border-slate-200 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* KPI Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Credit Card (Kreditorka) */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 transform group-hover:scale-110 transition-transform duration-700">
                    <ArrowUpRight className="w-32 h-32 text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Всего Кредиторка</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tight text-slate-900 tabular-nums">
                        {formatMoney(totals.credit)}
                        <span className="text-lg font-bold text-slate-300 ml-2 uppercase tracking-widest">UZS</span>
                    </h2>
                    <p className="mt-6 text-emerald-600 font-bold text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Сумма всех переплат и авансов
                    </p>
                </div>
            </div>

            {/* Debt Card (Debitorka) */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 transform group-hover:scale-110 transition-transform duration-700">
                    <ArrowDownRight className="w-32 h-32 text-rose-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
                            <TrendingDown className="w-5 h-5 text-rose-600" />
                        </div>
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Всего Дебиторка</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tight text-slate-900 tabular-nums">
                        {formatMoney(totals.debt)}
                        <span className="text-lg font-bold text-slate-300 ml-2 uppercase tracking-widest">UZS</span>
                    </h2>
                    <p className="mt-6 text-rose-600 font-bold text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Сумма текущих задолженностей
                    </p>
                </div>
            </div>
        </div>

        {/* Main Table Section */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Загрузка данных...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="pl-10 pr-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Контрагент</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Регион</th>
                    <th 
                      className="px-6 py-6 text-right group cursor-pointer hover:bg-slate-100/50 transition-colors"
                      onClick={toggleSort}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Баланс / Долг</span>
                        <ArrowUpDown className={`w-3 h-3 transition-colors ${sortDirection !== 'none' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                      </div>
                    </th>
                    <th className="pl-6 pr-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="pl-10 pr-6 py-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            org.credit_balance > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                            org.current_debt > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                          }`}>
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-base group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{org.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.1em] mt-0.5 block">Медицинское учреждение</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2.5 text-slate-500 font-bold text-xs">
                          <MapPin className="w-4 h-4 opacity-30" />
                          {org.region_name || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="space-y-1">
                            {org.current_surplus > 0 && (
                                <div className="text-emerald-600 font-black text-lg tabular-nums">
                                    +{formatMoney(org.current_surplus)}
                                    <span className="text-[10px] ml-1 opacity-40 font-bold uppercase">UZS</span>
                                </div>
                            )}
                            {org.current_debt > 0 && (
                                <div className="text-rose-500 font-black text-lg tabular-nums">
                                    -{formatMoney(org.current_debt)}
                                    <span className="text-[10px] ml-1 opacity-40 font-bold uppercase">UZS</span>
                                </div>
                            )}
                            {org.current_surplus === 0 && org.current_debt === 0 && (
                                <div className="text-slate-300 font-black text-lg tabular-nums">0</div>
                            )}
                            <div className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                                {org.current_surplus > 0 ? 'Кредиторка' : org.current_debt > 0 ? 'Дебиторка' : 'Баланс пуст'}
                            </div>
                        </div>
                      </td>
                      <td className="pl-6 pr-10 py-6">
                        <div className="flex items-center justify-center gap-4">
                          <button 
                            onClick={() => {
                              setSelectedOrg(org);
                              setShowTopUp(true);
                            }}
                            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-widest flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Платеж
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedOrg(org);
                              fetchHistory(org.id);
                              setShowHistory(true);
                            }}
                            className="h-10 px-5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-black transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
                          >
                            <History className="w-4 h-4 text-slate-400" /> История
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrgs.length === 0 && (
                  <div className="py-24 text-center">
                      <FilterX className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Контрагенты не найдены</p>
                  </div>
              )}
            </div>
          )}
        </div>

        {/* TopUp Modal */}
        <AnimatePresence>
          {showTopUp && selectedOrg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl border border-white/50 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                  <Wallet className="w-48 h-48 rotate-12" />
                </div>

                <button 
                  onClick={() => setShowTopUp(false)}
                  className="absolute top-8 right-8 w-12 h-12 hover:bg-slate-50 rounded-2xl transition-all flex items-center justify-center text-slate-300 hover:text-rose-500 hover:rotate-90 group z-20"
                >
                  <Plus className="w-8 h-8 rotate-45" />
                </button>
                
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mb-8 border border-indigo-100 mx-auto">
                    <Wallet className="text-indigo-600 w-10 h-10" />
                  </div>
                  
                    <p className="text-slate-500 mt-3 font-bold text-sm">
                      Пополнение баланса для <span className="text-indigo-600">{selectedOrg.name}</span>
                    </p>
                    
                    <div className="flex items-center justify-center mt-6">
                      <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 inline-block">
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1">Текущий баланс (Tekushiy balans)</p>
                        <div className={`text-base font-black tabular-nums transition-colors ${
                          selectedOrg.current_surplus > 0 ? 'text-emerald-600' : 
                          selectedOrg.current_debt > 0 ? 'text-rose-500' : 'text-slate-300'
                        }`}>
                          {selectedOrg.current_surplus > 0 ? `+${formatMoney(selectedOrg.current_surplus)} UZS` : 
                           selectedOrg.current_debt > 0 ? `-${formatMoney(selectedOrg.current_debt)} UZS` : '0 UZS'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Сумма платежа (UZS)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="0" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-6 px-8 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-mono text-3xl font-black text-slate-900"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                        />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase tracking-widest">UZS</div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Комментарий / Цель</label>
                      <textarea 
                        rows={3}
                        placeholder="Например: Банковский перевод или наличная оплата..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-8 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all text-base font-bold text-slate-700 resize-none"
                        value={topUpComment}
                        onChange={(e) => setTopUpComment(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-12 space-y-4">
                    <button 
                      onClick={handleTopUp}
                      disabled={isSubmitting || !topUpAmount}
                      className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black tracking-widest uppercase transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] flex items-center justify-center text-sm"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full" />
                      ) : 'Подтвердить платеж'}
                    </button>
                    <button 
                      onClick={() => setShowTopUp(false)}
                      className="w-full h-12 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all"
                    >
                      Отмена
                    </button>
                  </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* History Modal */}
        <AnimatePresence>
          {showHistory && selectedOrg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
              >
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                      <History className="text-indigo-600 w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">История транзакций</h2>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">{selectedOrg.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="w-12 h-12 hover:bg-white rounded-2xl transition-all flex items-center justify-center text-slate-300 hover:text-rose-500 hover:rotate-90 group"
                  >
                    <Plus className="w-8 h-8 rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-6">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-200">
                      <Wallet className="w-20 h-20 opacity-10 mb-6" />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">История пуста</p>
                    </div>
                  ) : (
                    history.map((tx) => (
                      <div key={tx.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 flex items-start gap-8 hover:shadow-xl hover:shadow-slate-100 transition-all group">
                        <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-sm ${
                            tx.amount > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                            'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                          {tx.amount > 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-900 text-lg uppercase tracking-tight">
                              {tx.transaction_type === 'topup' ? 'Пополнение' :
                               tx.transaction_type === 'application' ? 'Оплата счета' :
                               tx.transaction_type === 'overpayment' ? 'Сдача (Hauna)' :
                               tx.transaction_type === 'invoice' ? 'Фактура (Qarz)' :
                               tx.transaction_type}
                            </span>
                            <span className={`text-2xl font-black tabular-nums ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                              <span className="text-[10px] ml-1 opacity-40 font-bold uppercase tracking-widest font-sans text-slate-400">UZS</span>
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-3 font-bold leading-relaxed max-w-md">
                            {tx.comment || 'Комментарии отсутствуют'}
                          </p>
                          <div className="mt-6 flex flex-wrap items-center gap-4">
                             <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    {new Date(tx.created_at || tx.date).toLocaleString('ru-RU')}
                                </span>
                             </div>

                             {tx.related_invoice_id && (
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => handleViewInvoice(tx.related_invoice_id!)}
                                    disabled={isFetchingRes}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors group/card shadow-sm disabled:opacity-50"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                      {isFetchingRes ? 'Загрузка...' : 'Карточка'}
                                    </span>
                                    <ChevronRight className="w-3 h-3 group-hover/card:translate-x-0.5 transition-transform" />
                                  </button>

                                   <button 
                                     onClick={() => navigate(`/invoices?inv_num=${tx.factura_number}`)}
                                     className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors group/link border border-slate-100"
                                   >
                                     <span className="text-[10px] font-black uppercase tracking-widest">
                                       Счёт: {tx.factura_number}
                                     </span>
                                     <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-all -translate-x-1 group-hover/link:translate-x-0" />
                                   </button>
                                 </div>
                              )}

                              {canManage && (
                                <button 
                                  onClick={(e) => handleDeleteHistory(e, tx.id)}
                                  disabled={isDeleting === tx.id}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                  title="Bekor qilish"
                                >
                                  {isDeleting === tx.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  <span className="text-[10px] font-black uppercase tracking-widest">Bekor qilish</span>
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reservation Details Card */}
        <ReservationDetailsModal 
          isOpen={showResDetail}
          onClose={() => setShowResDetail(false)}
          reservation={selectedResDetails}
        />
      </div>
    </PageContainer>
  );
};

export default BalanceManagement;
