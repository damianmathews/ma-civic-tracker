// Boston spending data types
export interface BostonExpenditure {
  department: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
}

export interface BostonBudget {
  department: string;
  program: string;
  appropriation: number;
  expenditure: number;
  fiscalYear: number;
}

export interface BostonContract {
  id: string;
  vendor: string;
  department: string;
  amount: number;
  startDate: string;
  endDate: string;
  description: string;
}

// Massachusetts state spending types
export interface MAExpenditure {
  agency: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  fundCode?: string;
}

export interface MABudget {
  agency: string;
  appropriation: number;
  expenditure: number;
  fiscalYear: number;
}

// Representative types
export interface Representative {
  name: string;
  title: string;
  party: string;
  district: string;
  chamber: 'house' | 'senate' | 'city_council';
  photoUrl?: string;
  email?: string;
  phone?: string;
  website?: string;
  office?: string;
}

export interface Bill {
  id: string;
  title: string;
  summary: string;
  status: string;
  introducedDate: string;
  sponsors: string[];
  chamber: 'house' | 'senate';
  lastAction?: string;
  lastActionDate?: string;
}

export interface VoteRecord {
  billId: string;
  billTitle: string;
  date: string;
  vote: 'yes' | 'no' | 'abstain' | 'absent';
  representativeName: string;
}

// Public meetings
export interface PublicMeeting {
  id: string;
  title: string;
  body: string;
  date: string;
  time: string;
  location: string;
  virtualLink?: string;
  agenda?: string;
  publicCommentEnabled: boolean;
}

// Alert types
export interface SpendingAlert {
  id: string;
  type: 'new_contract' | 'large_expenditure' | 'budget_change';
  title: string;
  description: string;
  amount?: number;
  date: string;
  source: 'boston' | 'massachusetts';
  read: boolean;
}

// Dashboard summary types
export interface SpendingSummary {
  totalBudget: number;
  totalExpenditure: number;
  topDepartments: { name: string; amount: number }[];
  topVendors: { name: string; amount: number }[];
  byCategory: { category: string; amount: number }[];
  monthlyTrend: { month: string; amount: number }[];
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    perPage: number;
  };
}
