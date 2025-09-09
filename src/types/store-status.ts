/**
 * Store Status Enum and Types
 */

export enum StoreStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BLOCKED = 'blocked'
}

export interface StoreStatusConfig {
  [StoreStatus.PENDING]: {
    verified: false;
    blocked: false;
    label: 'Pendiente';
    description: 'Esperando aprobación';
    color: 'yellow';
  };
  [StoreStatus.APPROVED]: {
    verified: true;
    blocked: false;
    label: 'Aprobada';
    description: 'Tienda activa y verificada';
    color: 'green';
  };
  [StoreStatus.REJECTED]: {
    verified: false;
    blocked: true;
    label: 'Rechazada';
    description: 'Tienda rechazada por el administrador';
    color: 'red';
  };
  [StoreStatus.BLOCKED]: {
    verified: false;
    blocked: true;
    label: 'Bloqueada';
    description: 'Tienda bloqueada por violaciones';
    color: 'gray';
  };
}

export const STORE_STATUS_CONFIG: StoreStatusConfig = {
  [StoreStatus.PENDING]: {
    verified: false,
    blocked: false,
    label: 'Pendiente',
    description: 'Esperando aprobación',
    color: 'yellow'
  },
  [StoreStatus.APPROVED]: {
    verified: true,
    blocked: false,
    label: 'Aprobada',
    description: 'Tienda activa y verificada',
    color: 'green'
  },
  [StoreStatus.REJECTED]: {
    verified: false,
    blocked: true,
    label: 'Rechazada',
    description: 'Tienda rechazada por el administrador',
    color: 'red'
  },
  [StoreStatus.BLOCKED]: {
    verified: false,
    blocked: true,
    label: 'Bloqueada',
    description: 'Tienda bloqueada por violaciones',
    color: 'gray'
  }
};
