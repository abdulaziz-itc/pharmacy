import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { warehouseApi } from '../../api/warehouse';
import { useProductStore } from '../../store/productStore';
import { toast } from 'sonner';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouseId: number | null;
  warehouseName?: string;
}

export const AddStockModal = ({ isOpen, onClose, onSuccess, warehouseId, warehouseName }: AddStockModalProps) => {
  const { products, fetchProducts } = useProductStore();
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, fetchProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId || !productId || !quantity) return;

    setIsSubmitting(true);
    try {
      await warehouseApi.addStock(warehouseId, {
        product_id: parseInt(productId),
        quantity: parseInt(quantity),
      });
      toast.success('Запас успешно добавлен');
      onSuccess();
      onClose();
      setProductId('');
      setQuantity('');
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при добавлении запаса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
            Поступление на склад
          </DialogTitle>
          {warehouseName && (
            <p className="text-slate-500 font-medium">Склад: {warehouseName}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="product" className="text-slate-700 font-bold ml-1 text-sm uppercase tracking-wider">
              Выберите продукт
            </Label>
            <select
              id="product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-medium px-4 outline-none"
              required
            >
              <option value="">Выберите из списка...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-700 font-bold ml-1 text-sm uppercase tracking-wider">
              Количество
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="1"
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? 'Добавление...' : 'Добавить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
