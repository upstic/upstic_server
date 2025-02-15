import { Schema } from 'mongoose';

export type BranchStatus = 
  | 'active'
  | 'inactive'
  | 'pending'
  | 'suspended'
  | 'closed';

export type BranchType = 
  | 'headquarters'
  | 'regional-office'
  | 'local-office'
  | 'warehouse'
  | 'retail'
  | 'service-center';

export interface BranchLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  operatingHours: Array<{
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }>;
}

export interface BranchContact {
  primary: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  emergency: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  departments: Array<{
    name: string;
    email: string;
    phone: string;
    manager: string;
  }>;
}

export interface BranchFacilities {
  totalArea: number;
  capacity: number;
  amenities: string[];
  parking: {
    available: boolean;
    capacity?: number;
    restrictions?: string[];
  };
  security: {
    type: string[];
    accessControl: boolean;
    cctv: boolean;
    guardedHours?: string;
  };
  maintenance: {
    company: string;
    contact: string;
    schedule: string;
    lastInspection: Date;
    nextInspection: Date;
  };
}

export interface BranchCompliance {
  licenses: Array<{
    type: string;
    number: string;
    issuedBy: string;
    issuedDate: Date;
    expiryDate: Date;
    status: 'active' | 'expired' | 'pending';
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    validFrom: Date;
    validUntil: Date;
    status: 'active' | 'expired' | 'pending';
  }>;
  inspections: Array<{
    type: string;
    date: Date;
    inspector: string;
    result: 'pass' | 'fail' | 'conditional';
    findings: string[];
    nextInspectionDue: Date;
  }>;
}

export interface BranchMetrics {
  employees: {
    total: number;
    active: number;
    onLeave: number;
    contractors: number;
  };
  operations: {
    dailyAverage: number;
    monthlyAverage: number;
    peakHours: string[];
    efficiency: number;
  };
  financial: {
    revenue: number;
    expenses: number;
    profit: number;
    budget: number;
    currency: string;
    period: 'monthly' | 'quarterly' | 'yearly';
  };
}

export interface BranchInventory {
  items: Array<{
    category: string;
    name: string;
    quantity: number;
    unit: string;
    lastUpdated: Date;
    minimumRequired: number;
    reorderPoint: number;
  }>;
  equipment: Array<{
    type: string;
    serialNumber: string;
    status: 'operational' | 'maintenance' | 'broken';
    lastMaintenance: Date;
    nextMaintenance: Date;
  }>;
}

export interface BranchSearchParams {
  status?: BranchStatus[];
  type?: BranchType[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  services?: string[];
  capacity?: {
    min?: number;
    max?: number;
  };
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface BranchStats {
  totalBranches: number;
  statusDistribution: Record<BranchStatus, number>;
  typeDistribution: Record<BranchType, number>;
  averageMetrics: {
    employees: number;
    operations: number;
    revenue: number;
    efficiency: number;
  };
  complianceStatus: {
    compliant: number;
    nonCompliant: number;
    pending: number;
  };
  geographicDistribution: Array<{
    region: string;
    count: number;
    performance: number;
  }>;
} 