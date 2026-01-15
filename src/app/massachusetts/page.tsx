'use client';

import { useEffect, useState, useCallback } from 'react';
import { SpendingTable } from '@/components/spending/spending-table';
import { SpendingBarChart } from '@/components/spending/spending-chart';
import { StatCard } from '@/components/ui/stat-card';
import { formatCompactCurrency } from '@/lib/utils';
import { Search, Filter, Download, DollarSign, FileText, Building2, AlertTriangle, ExternalLink } from 'lucide-react';

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
  topAgencies: { name: string; value: number }[];
  topVendors: { name: string; value: number }[];
  message?: string;
}

export default function MassachusettsSpending() {
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchVendor, setSearchVendor] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [minAmount, setMinAmount] = useState('');

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [summaryRes, agencyRes] = await Promise.all([
          fetch('/api/massachusetts/spending?type=summary'),
          fetch('/api/massachusetts/spending?type=agencies'),
        ]);

        const summaryData = await summaryRes.json();
        const agencyData = await agencyRes.json();

        if (summaryData.success) {
          setSummary(summaryData.data);
        } else {
          setError(summaryData.error);
        }

        if (agencyData.success) {
          setAgencies(agencyData.data.agencies || []);
        }
      } catch (err) {
        setError('Failed to load Massachusetts spending data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      let url = '/api/massachusetts/spending?type=transactions&limit=100';
      if (selectedAgency) {
        url += `&agency=${encodeURIComponent(selectedAgency)}`;
      }
      if (searchVendor) {
        url += `&vendor=${encodeURIComponent(searchVendor)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        let filtered = data.data.transactions.map((t: Record<string, unknown>) => ({
          department: t.agency as string,
          vendor: t.vendor as string,
          amount: t.amount as number,
          date: t.date as string,
          description: t.description as string,
        }));

        // Client-side filtering for min amount
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
  }, [selectedAgency, searchVendor, minAmount]);

  useEffect(() => {
    if (!loading) {
      fetchTransactions();
    }
  }, [fetchTransactions, loading]);

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['Agency', 'Vendor', 'Amount', 'Date', 'Description'];
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
    a.download = `ma-spending-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading Massachusetts spending data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Massachusetts State Spending</h1>
        <p className="mt-2 text-slate-600">
          Explore state-level expenditures, contracts, and grants. Track where your tax dollars go.
        </p>
      </div>

      {/* Info Banner */}
      {summary?.message && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Data Note</h3>
              <p className="mt-1 text-sm text-blue-700">{summary.message}</p>
              <a
                href="https://cthru.data.socrata.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                View MA Open Checkbook directly
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-600" />
          <h3 className="mt-2 font-semibold text-red-800">Error Loading Data</h3>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <a
            href="https://cthru.data.socrata.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm text-red-600 hover:underline"
          >
            Try accessing MA Open Checkbook directly
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : (
        <>
          {/* Stats */}
          {summary && summary.totalTransactions > 0 && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Spending"
                value={formatCompactCurrency(summary.totalSpending)}
                description="In dataset"
                icon={DollarSign}
              />
              <StatCard
                title="Transactions"
                value={summary.totalTransactions.toLocaleString()}
                description="Records loaded"
                icon={FileText}
              />
              <StatCard
                title="Top Agency"
                value={summary.topAgencies[0]?.name.slice(0, 20) || 'N/A'}
                description={summary.topAgencies[0] ? formatCompactCurrency(summary.topAgencies[0].value) : ''}
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
          {summary && summary.topAgencies.length > 0 && (
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <SpendingBarChart data={summary.topAgencies} title="Spending by State Agency" />
              <SpendingBarChart data={summary.topVendors} title="Top Vendors" />
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
                    className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Agency
                </label>
                <select
                  value={selectedAgency}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">All Agencies</option>
                  {agencies.map((agency) => (
                    <option key={agency} value={agency}>
                      {agency}
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
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={exportToCSV}
                  disabled={transactions.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
        </>
      )}

      {/* Additional Resources */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Massachusetts Data Sources</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="https://cthru.data.socrata.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            MA Open Checkbook (CTHRU)
          </a>
          <a
            href="https://www.mass.gov/service-details/open-data"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Mass.gov Open Data Portal
          </a>
          <a
            href="https://malegislature.gov/Budget"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            MA Legislature Budget
          </a>
        </div>
      </div>
    </div>
  );
}
