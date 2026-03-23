import { useState, useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { Button } from '../../components/ui/button';
import { Check, X, ClipboardList, RefreshCcw, AlertTriangle } from 'lucide-react';
import { warehouseApi, type DeletionRequest } from '../../api/warehouse';
import { toast } from 'sonner';

export default function DeletionApprovalPage() {
  const [data, setData] = useState<DeletionRequest>({ reservations: [], invoices: [], return_requests: [] });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await warehouseApi.getDeletionRequests();
      setData(result);
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при загрузке запросов на удаление');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (type: 'reservation' | 'invoice', id: number) => {
    try {
      await warehouseApi.approveDeletion(type, id);
      toast.success('Удаление одобрено');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при одобрении';
      toast.error(msg);
    }
  };

  const handleReject = async (type: 'reservation' | 'invoice', id: number) => {
    try {
      await warehouseApi.rejectDeletion(type, id);
      toast.success('Запрос отклонен, данные восстановлены');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при отклонении';
      toast.error(msg);
    }
  };

  const handleApproveReturn = async (id: number) => {
    try {
      await warehouseApi.approveReturn(id);
      toast.success('Возврат одобрен');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при одобрении возврата';
      toast.error(msg);
    }
  };

  const handleRejectReturn = async (id: number) => {
    try {
      await warehouseApi.rejectReturn(id);
      toast.success('Возврат отклонен');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при отклонении возврата';
      toast.error(msg);
    }
  };

  const hasRequests = data.reservations.length > 0 || data.invoices.length > 0 || (data.return_requests && data.return_requests.length > 0);

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Запросы на подтверждение</h1>
          <p className="text-slate-500 font-medium mt-1">Одобрение запросов на удаление и возврат товаров.</p>
        </div>
        <Button
          onClick={loadData}
          variant="outline"
          className="h-12 px-4 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
        >
          <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading && !hasRequests ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Проверка запросов...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Reservations Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Бронирования ({data.reservations.length})</h2>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID / Дата</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Клиент / Мед.Орг</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Сумма</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.reservations.length > 0 ? (
                    data.reservations.map((res: any) => (
                      <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">#{res.id}</div>
                          <div className="text-[10px] font-medium text-slate-500">{new Date(res.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">{res.customer_name}</div>
                          <div className="text-xs text-slate-500">{res.med_org?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">{res.total_amount?.toLocaleString()} UZS</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleReject('reservation', res.id)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 rounded-xl border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold gap-2"
                            >
                              <X className="w-4 h-4" />
                              Отклон.
                            </Button>
                            <Button
                              onClick={() => handleApprove('reservation', res.id)}
                              size="sm"
                              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20"
                            >
                              <Check className="w-4 h-4" />
                              Одобрить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-slate-400 font-medium italic">Нет активных запросов на удаление броней</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Invoices Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Счет-фактуры ({data.invoices.length})</h2>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID / Номер</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Бронь / Клиент</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Статус</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.invoices.length > 0 ? (
                    data.invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">#{inv.id}</div>
                          <div className="text-[10px] font-medium text-slate-500">Документ: {inv.factura_number || 'Б/Н'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">Бронь #{inv.reservation_id}</div>
                          <div className="text-xs text-slate-500">{inv.reservation?.customer_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleReject('invoice', inv.id)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 rounded-xl border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold gap-2"
                            >
                              <X className="w-4 h-4" />
                              Отклон.
                            </Button>
                            <Button
                              onClick={() => handleApprove('invoice', inv.id)}
                              size="sm"
                              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20"
                            >
                              <Check className="w-4 h-4" />
                              Одобрить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-slate-400 font-medium italic">Нет активных запросов на удаление фактур</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Returns Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Возвраты товаров ({data.return_requests?.length || 0})</h2>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID / Дата</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Клиент / Мед.Орг</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Сумма Брони</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.return_requests && data.return_requests.length > 0 ? (
                    data.return_requests.map((res: any) => (
                      <tr key={`return-${res.id}`} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">#{res.id}</div>
                          <div className="text-[10px] font-medium text-slate-500">{new Date(res.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">{res.customer_name}</div>
                          <div className="text-xs text-slate-500">{res.med_org?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">{res.total_amount?.toLocaleString()} UZS</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleRejectReturn(res.id)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 rounded-xl border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold gap-2"
                            >
                              <X className="w-4 h-4" />
                              Отклон.
                            </Button>
                            <Button
                              onClick={() => handleApproveReturn(res.id)}
                              size="sm"
                              className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-lg shadow-purple-500/20"
                            >
                              <Check className="w-4 h-4" />
                              Одобрить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-slate-400 font-medium italic">Нет активных запросов на возврат товаров</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {!hasRequests && !isLoading && (
            <div className="bg-blue-50/50 rounded-[32px] p-8 flex items-center gap-6 border border-blue-100/50">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <ClipboardList className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 italic">Активных запросов нет</h3>
                <p className="text-slate-500 font-medium">Все операции подтверждены или в системе нет ожидающих запросов.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
