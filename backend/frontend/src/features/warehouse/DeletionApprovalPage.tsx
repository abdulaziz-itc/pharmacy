import { useState, useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { Button } from '../../components/ui/button';
import { Check, X, ClipboardList, RefreshCcw, AlertTriangle, Trash2 } from 'lucide-react';
import { warehouseApi, type DeletionRequest } from '../../api/warehouse';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

export default function DeletionApprovalPage() {
  const [data, setData] = useState<DeletionRequest>({ reservations: [], invoices: [], return_requests: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await warehouseApi.getDeletionRequests();
      // Force refresh data-table if needed by ensuring state is truly new
      setData({ ...result });
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

  const handleApprove = async (e: React.MouseEvent, type: 'reservation' | 'invoice', id: number) => {
    e.stopPropagation();
    try {
      await warehouseApi.approveDeletion(type, id);
      toast.success('Удаление одобрено');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при одобрении';
      toast.error(msg);
      if (error?.response?.status === 404) loadData();
    }
  };

  const handleReject = async (e: React.MouseEvent, type: 'reservation' | 'invoice', id: number) => {
    e.stopPropagation();
    try {
      await warehouseApi.rejectDeletion(type, id);
      toast.success('Запрос отклонен, данные восстановлены');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при отклонении';
      toast.error(msg);
      if (error?.response?.status === 404) loadData();
    }
  };

  const handleApproveReturn = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await warehouseApi.approveReturn(id);
      toast.success('Возврат одобрен');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при одобрении возврата';
      toast.error(msg);
      if (error?.response?.status === 404) loadData();
    }
  };

  const handleRejectReturn = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await warehouseApi.rejectReturn(id);
      toast.success('Возврат отклонен');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Ошибка при отклонении возврата';
      toast.error(msg);
      if (error?.response?.status === 404) loadData();
    }
  };

  const handleForceCleanup = async () => {
    if (!window.confirm('ВНИМАНИЕ: Bu barcha tasdiqlanishi kutilayotgan malumotlarni oʻchirib tashlaydi. Faqat texnik xatoliklarda foydalaning. Davom etamizmi?')) return;
    
    setIsLoading(true);
    try {
      await warehouseApi.forceCleanup();
      toast.success('Barcha maʼlumotlar oʻchirildi');
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'Xatolik yuz berdi';
      toast.error(msg);
    } finally {
      setIsLoading(false);
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
        <div className="flex gap-4">
          <Button
            onClick={handleForceCleanup}
            variant="destructive"
            className="h-12 px-6 rounded-2xl font-bold shadow-lg shadow-rose-200"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Очистить ошибки (Force)
          </Button>
          <Button
            onClick={loadData}
            variant="outline"
            className="h-12 px-4 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
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
                      <tr 
                        key={res.id} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedItem({ type: 'reservation', data: res })}
                      >
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
                              onClick={(e) => handleReject(e, 'reservation', res.id)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 rounded-xl border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold gap-2"
                            >
                              <X className="w-4 h-4" />
                              Отклон.
                            </Button>
                            <Button
                              onClick={(e) => handleApprove(e, 'reservation', res.id)}
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
                      <tr 
                        key={inv.id} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedItem({ type: 'invoice', data: inv })}
                      >
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
                              onClick={(e) => handleReject(e, 'invoice', inv.id)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 rounded-xl border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold gap-2"
                            >
                              <X className="w-4 h-4" />
                              Отклон.
                            </Button>
                            <Button
                              onClick={(e) => handleApprove(e, 'invoice', inv.id)}
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
                      <tr 
                        key={`return-${res.id}`} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedItem({ type: 'return', data: res })}
                      >
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
                              onClick={(e) => handleRejectReturn(e, res.id)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 rounded-xl border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold gap-2"
                            >
                              <X className="w-4 h-4" />
                              Отклон.
                            </Button>
                            <Button
                              onClick={(e) => handleApproveReturn(e, res.id)}
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

      {/* Details Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[32px]">
          <DialogHeader className="bg-slate-800 p-8 text-white">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {selectedItem?.type === 'invoice' ? 'Детали фактуры' : 
               selectedItem?.type === 'return' ? 'Детали возврата' : 'Детали брони'}
              <span className="ml-3 text-slate-400 font-medium">
                #{selectedItem?.type === 'invoice' && selectedItem?.data?.factura_number 
                  ? selectedItem?.data?.factura_number 
                  : selectedItem?.data?.id}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Клиент</p>
                <p className="font-bold text-slate-900">{selectedItem?.data?.customer_name || selectedItem?.data?.reservation?.customer_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Организация</p>
                <p className="font-bold text-slate-900">
                  {selectedItem?.data?.med_org_name || selectedItem?.data?.reservation?.med_org_name || '---'}
                </p>
              </div>
              {selectedItem?.type === 'invoice' && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Номер фактуры</p>
                  <p className="font-bold text-slate-900">{selectedItem?.data?.factura_number || '---'}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Дата</p>
                <p className="font-bold text-slate-900">
                  {new Date(selectedItem?.data?.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Товары</h4>
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Название</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Кол-во</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Цена</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Итого</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedItem?.type === 'invoice' ? selectedItem?.data?.reservation?.items : selectedItem?.data?.items)?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-bold text-slate-700 text-sm">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-blue-600">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-500">
                          {item.price?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {item.total_price?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/50 font-bold border-t border-slate-100">
                      <td colSpan={3} className="px-4 py-3 text-right text-slate-500 uppercase tracking-widest text-[10px]">Всего:</td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {(selectedItem?.data?.total_amount || selectedItem?.data?.reservation?.total_amount)?.toLocaleString()} UZS
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <Button 
                onClick={() => setSelectedItem(null)}
                variant="outline"
                className="rounded-xl px-8 h-12 font-bold bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
