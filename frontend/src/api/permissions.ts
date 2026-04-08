import api from './axios';

export interface PermissionMatrix {
  sections: { key: string; label: string }[];
  roles: { key: string; label: string }[];
  permissions: Record<string, Record<string, boolean>>;
}

export interface MyPermissions {
  sections: string[];
}

export const permissionsApi = {
  getAll: async (): Promise<PermissionMatrix> => {
    const response = await api.get<PermissionMatrix>('/domain/settings/role-permissions');
    return response.data;
  },

  update: async (permissions: { role: string; section_key: string; is_enabled: boolean }[]) => {
    const response = await api.put('/domain/settings/role-permissions', { permissions });
    return response.data;
  },

  getMy: async (): Promise<MyPermissions> => {
    const response = await api.get<MyPermissions>('/domain/settings/role-permissions/my');
    return response.data;
  },
};
