import { useState, useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { Button } from '../../components/ui/button';
import { RefreshCcw, Save, Shield, Check, X } from 'lucide-react';
import { permissionsApi, type PermissionMatrix } from '../../api/permissions';
import { toast } from 'sonner';

export default function RolePermissionsPage() {
  const [data, setData] = useState<PermissionMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await permissionsApi.getAll();
      setData(result);
      setChanges({});
      setHasChanges(false);
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при загрузке прав доступа');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isEnabled = (role: string, sectionKey: string): boolean => {
    // Check local changes first
    if (changes[role]?.[sectionKey] !== undefined) {
      return changes[role][sectionKey];
    }
    // Then check server data
    return data?.permissions?.[role]?.[sectionKey] ?? false;
  };

  const togglePermission = (role: string, sectionKey: string) => {
    const current = isEnabled(role, sectionKey);
    setChanges(prev => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [sectionKey]: !current,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const permissions: { role: string; section_key: string; is_enabled: boolean }[] = [];
      for (const role of Object.keys(changes)) {
        for (const sectionKey of Object.keys(changes[role])) {
          permissions.push({
            role,
            section_key: sectionKey,
            is_enabled: changes[role][sectionKey],
          });
        }
      }
      await permissionsApi.update(permissions);
      toast.success('Права доступа успешно обновлены');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const enableAllForRole = (roleKey: string) => {
    if (!data) return;
    const newChanges = { ...changes };
    newChanges[roleKey] = {};
    for (const section of data.sections) {
      newChanges[roleKey][section.key] = true;
    }
    setChanges(newChanges);
    setHasChanges(true);
  };

  const disableAllForRole = (roleKey: string) => {
    if (!data) return;
    const newChanges = { ...changes };
    newChanges[roleKey] = {};
    for (const section of data.sections) {
      newChanges[roleKey][section.key] = false;
    }
    setChanges(newChanges);
    setHasChanges(true);
  };

  if (isLoading || !data) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Загрузка прав доступа...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Управление доступом</h1>
              <p className="text-slate-500 font-medium mt-0.5">Настройка видимости разделов для каждой роли</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-12 px-6 rounded-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 gap-2"
            >
              <Save className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
              Сохранить изменения
            </Button>
          )}
          <Button
            onClick={loadData}
            variant="outline"
            className="h-12 px-4 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest sticky left-0 bg-slate-800 z-10 min-w-[200px]">
                  Раздел
                </th>
                {data.roles.map(role => (
                  <th key={role.key} className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-widest min-w-[110px]">
                    <div>{role.label}</div>
                    <div className="flex justify-center gap-1 mt-2">
                      <button
                        onClick={() => enableAllForRole(role.key)}
                        className="p-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 transition-colors"
                        title="Включить все"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => disableAllForRole(role.key)}
                        className="p-1 rounded-md bg-rose-600/20 hover:bg-rose-600/40 transition-colors"
                        title="Выключить все"
                      >
                        <X className="w-3 h-3 text-rose-400" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.sections.map((section, idx) => (
                <tr
                  key={section.key}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/50 transition-colors`}
                >
                  <td className="px-5 py-3 sticky left-0 z-10 bg-inherit">
                    <span className="font-bold text-slate-700 text-sm">{section.label}</span>
                  </td>
                  {data.roles.map(role => {
                    const enabled = isEnabled(role.key, section.key);
                    const isChanged = changes[role.key]?.[section.key] !== undefined;
                    return (
                      <td key={role.key} className="px-3 py-3 text-center">
                        <button
                          onClick={() => togglePermission(role.key, section.key)}
                          className={`
                            w-8 h-8 rounded-xl flex items-center justify-center mx-auto
                            transition-all duration-200 
                            ${enabled
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 shadow-sm shadow-emerald-200'
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }
                            ${isChanged ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
                          `}
                        >
                          {enabled ? (
                            <Check className="w-4 h-4" strokeWidth={3} />
                          ) : (
                            <X className="w-4 h-4" strokeWidth={2} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-slate-900/40 flex items-center gap-4 z-50">
          <span className="font-bold text-sm">Есть несохранённые изменения</span>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="rounded-xl bg-indigo-500 hover:bg-indigo-600 font-bold gap-2"
          >
            <Save className="w-4 h-4" />
            Сохранить
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
