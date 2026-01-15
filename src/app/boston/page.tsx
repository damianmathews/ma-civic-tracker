'use client';

import { useEffect, useState, useCallback } from 'react';
import { SpendingTable } from '@/components/spending/spending-table';
import { SpendingBarChart, SpendingPieChart } from '@/components/spending/spending-chart';
import { StatCard } from '@/components/ui/stat-card';
import { formatCompactCurrency } from '@/lib/utils';
import { Search, Filter, Download, DollarSign, FileText, Building2, AlertTriangle, Calendar } from 'lucide-react';

interface Transaction {
  department: string;
  vendor: string;
  amount: number;
  date: string;
  description?: string;
}

interface SpendingSummary {
  totalSpending: number;
  totalTransactions: number;
  topDepartments: { name: string; value: number }[];
  topVendors: { name: string; value: number }[];
  fiscalYear: number;
}

const FISCAL_YEARS = [
  { value: 'fy26', label: 'FY2026 (Current - Partial)', year: 2026 },
  { value: 'fy25', label: 'FY2025 (Complete)', year: 2025 },
  { value: 'fy24', label: 'FY2024 (Complete)', year: 2024 },
  { value: 'fy23', label: 'FY2023 (Complete)', year: 2023 },
];

export default function BostonSpending() {
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fiscal year selection
  const [selectedFY, setSelectedFY] = useState('fy25'); // Default to complete year

  // Filters
  const [searchVendor, setSearchVendor] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [minAmount, setMinAmount] = useState('');

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, deptRes] = await Promise.all([
          fetch(`/api/boston/spending?type=summary&fy=${selectedFY}`),
          fetch(`/api/boston/spending?type=departments&fy=${selectedFY}`),
        ]);

        const summaryData = await summaryRes.json();
        const deptData = await deptRes.json();

        if (summaryData.success) {
          setSummary(summaryData.data);
        } else {
          setError(summaryData.error);
        }

        if (deptData.success) {
          setDepartments(deptData.data.departments);
        }
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [selectedFY]);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      let url = `/api/boston/spending?type=transactions&limit=100&fy=${selectedFY}`;
      if (selectedDepartment) {
        url += `&department=${encodeURIComponent(selectedDepartment)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        let filtered = data.data.transactions;

        // Client-side filtering for vendor search and min amount
        if (searchVendor) {
          filtered = filtered.filter((t: Transaction) =>
            t.vendor.toLowerCase().includes(searchVendor.toLowerCase())
          );
        }

        if (minAmount) {
          const min = parseFloat(minAmount);
          if (!isNaN(min)) {
            filtered = filtered.filter((t: Transaction) => t.amount >= min);
          }
        }

        // Sort by amount descending
        filtered.sort((a: Transaction, b: Transaction) => b.amount - a.amount);

        setTransactions(filtered);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  }, [selectedFY, selectedDepartment, searchVendor, minAmount]);

  useEffect(() => {
    if (!loading) {
      fetchTransactions();
    }
  }, [fetchTransactions, loading]);

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['Department', 'Vendor', 'Amount', 'Date', 'Description'];
    const rows = transactions.map((t) => [
      t.department,
      t.vendor,
      t.amount.toString(),
      t.date,
      t.description || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boston-spending-${selectedFY}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedFYInfo = FISCAL_YEARS.find(fy => fy.value === selectedFY);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading Boston spending data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-600" />
          <h3 className="mt-2 font-semibold text-red-800">Error Loading Data</h3>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Boston City Spending</h1>
          <p className="mt-2 text-slate-600">
            Explore Boston&apos;s city checkbook data. Search vendors, filter by department, and identify spending patterns.
          </p>
        </div>

        {/* Fiscal Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-500" />
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white py-2 px-4 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FISCAL_YEARS.map((fy) => (
              <option key={fy.value} value={fy.value}>
                {fy.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FY Info Banner */}
      {selectedFY === 'fy26' && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> FY2026 is the current fiscal year (July 2025 - June 2026).
            Data shown is year-to-date and not complete. Select FY2025 for complete annual data.
          </p>
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Spending"
            value={formatCompactCurrency(summary.totalSpending)}
            description={`FY${summary.fiscalYear}${selectedFY === 'fy26' ? ' YTD' : ' complete'}`}
            icon={DollarSign}
          />
          <StatCard
            title="Transactions"
            value={summary.totalTransactions.toLocaleString()}
            description="Records in dataset"
            icon={FileText}
          />
          <StatCard
            title="Largest Department"
            value={summary.topDepartments[0]?.name || 'N/A'}
            description={summary.topDepartments[0] ? formatCompactCurrency(summary.topDepartments[0].value) : ''}
            icon={Building2}
          />
          <StatCard
            title="Top Vendor"
            value={summary.topVendors[0]?.name.slice(0, 20) || 'N/A'}
            description={summary.topVendors[0] ? formatCompactCurrency(summary.topVendors[0].value) : ''}
            icon={DollarSign}
          />
        </div>
      )}

      {/* Charts */}
      {summary && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <SpendingBarChart data={summary.topDepartments} title={`Spending by Department (FY${summary.fiscalYear})`} />
          <SpendingPieChart data={summary.topVendors.slice(0, 8)} title="Top Vendors Distribution" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filter Transactions</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search Vendor
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchVendor}
                onChange={(e) => setSearchVendor(e.target.value)}
                placeholder="Enter vendor name..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Minimum Amount
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="$0"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <SpendingTable
        data={transactions}
        title={`Transactions ${transactions.length > 0 ? `(${transactions.length} results)` : ''}`}
        isLoading={transactionsLoading}
      />

      {/* Data Source Note */}
      <div className="mt-8 text-sm text-slate-500">
        <p>
          Data source:{' '}
          <a
            href="https://data.boston.gov/dataset/checkbook-explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Boston Checkbook Explorer
          </a>{' '}
          - Does not include payroll (see Employee Earnings Report) or independent agencies.
        </p>
      </div>
    </div>
  );
}
