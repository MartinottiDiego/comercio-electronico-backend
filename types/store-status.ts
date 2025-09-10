export enum StoreStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BLOCKED = 'blocked'
}

interface StoreStatusConfig {
  label: string;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  description: string;
  verified: boolean;
  blocked: boolean;
}

export const STORE_STATUS_CONFIG: Record<StoreStatus, StoreStatusConfig> = {
  [StoreStatus.PENDING]: {
    label: 'Pendiente',
    badgeColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    icon: '⏳',
    description: 'Tienda pendiente de aprobación',
    verified: false,
    blocked: false
  },
  [StoreStatus.APPROVED]: {
    label: 'Aprobada',
    badgeColor: 'bg-green-50',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: '✅',
    description: 'Tienda aprobada y verificada',
    verified: true,
    blocked: false
  },
  [StoreStatus.REJECTED]: {
    label: 'Rechazada',
    badgeColor: 'bg-red-50',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: '❌',
    description: 'Tienda rechazada',
    verified: false,
    blocked: false
  },
  [StoreStatus.BLOCKED]: {
    label: 'Bloqueada',
    badgeColor: 'bg-gray-50',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
    icon: '🚫',
    description: 'Tienda bloqueada',
    verified: false,
    blocked: true
  }
};


