'use client';

import { useEffect, useState, useCallback } from 'react';
import { SpendingTable } from '@/components/spending/spending-table';
import { SpendingBarChart } from '@/components/spending/spending-chart';
import { StatCard } from '@/components/ui/stat-card';
import { GoogleSearchLink } from '@/components/ui/google-search-link';
import { formatCompactCurrency, formatCurrency, formatDate } from '@/lib/utils';
import { Search, Filter, Download, DollarSign, FileText, Building2, AlertTriangle, ExternalLink, Flag, Landmark, ChevronDown, ChevronUp } from 'lucide-react';

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

interface FederalGrant {
  recipientName: string;
  amount: number;
  agency: string;
  description: string;
  startDate: string;
  cfda: string;
}

interface FederalProgram {
  name: string;
  amount: number;
}

export default function MassachusettsSpending() {
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Federal data
  const [federalGrants, setFederalGrants] = useState<FederalGrant[]>([]);
  const [federalPrograms, setFederalPrograms] = useState<FederalProgram[]>([]);
  const [federalTotal, setFederalTotal] = useState(0);
  const [federalLoading, setFederalLoading] = useState(true);
  const [federalExpanded, setFederalExpanded] = useState(false);

  // Filters
  const [searchVendor, setSearchVendor] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'state' | 'federal'>('state');

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

    async function fetchFederalData() {
      try {
        const [grantsRes, programsRes] = await Promise.all([
          fetch('/api/federal/spending?type=grants&limit=100&fy=2024'),
          fetch('/api/federal/spending?type=cfda&fy=2024'),
        ]);

        const grantsData = await grantsRes.json();
        const programsData = await programsRes.json();

        if (grantsData.success && grantsData.data.grants) {
          const grants = grantsData.data.grants.map((g: Record<string, unknown>) => ({
            recipientName: g['Recipient Name'] || 'Unknown',
            amount: g['Award Amount'] || 0,
            agency: g['Awarding Agency'] || 'Federal Agency',
            description: g['Description'] || '',
            startDate: g['Start Date'] || '',
            cfda: g['CFDA Number'] || '',
          }));
          setFederalGrants(grants);
          const total = grants.reduce((sum: number, g: FederalGrant) => sum + g.amount, 0);
          setFederalTotal(total);
        }

        if (programsData.success && programsData.data.programs) {
          setFederalPrograms(programsData.data.programs.map((p: { name: string; amount: number }) => ({
            name: p.name,
            amount: p.amount,
          })));
        }
      } catch (err) {
        console.error('Error fetching federal data:', err);
      } finally {
        setFederalLoading(false);
      }
    }

    fetchInitialData();
    fetchFederalData();
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

  const exportFederalToCSV = () => {
    if (federalGrants.length === 0) return;

    const headers = ['Recipient', 'Amount', 'Agency', 'Program', 'Start Date', 'Description'];
    const rows = federalGrants.map((g) => [
      g.recipientName,
      g.amount.toString(),
      g.agency,
      g.cfda,
      g.startDate,
      g.description,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ma-federal-grants-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading Massachusetts spending data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Massachusetts Spending</h1>
        <p className="mt-2 text-slate-600">
          Explore state-level expenditures and federal grants flowing to Massachusetts.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('state')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'state'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Landmark className="h-4 w-4" />
          State Spending
        </button>
        <button
          onClick={() => setActiveTab('federal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'federal'
              ? 'bg-green-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Flag className="h-4 w-4" />
          Federal Grants
          {!federalLoading && federalTotal > 0 && (
            <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded">
              {formatCompactCurrency(federalTotal)}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'state' ? (
        <>
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
                    title="State Spending"
                    value={formatCompactCurrency(summary.totalSpending)}
                    description="In dataset"
                    icon={DollarSign}
                    iconColor="text-purple-600"
                  />
                  <StatCard
                    title="Transactions"
                    value={summary.totalTransactions.toLocaleString()}
                    description="Records loaded"
                    icon={FileText}
                    iconColor="text-slate-600"
                  />
                  <StatCard
                    title="Top Agency"
                    value={summary.topAgencies[0]?.name.slice(0, 20) || 'N/A'}
                    description={summary.topAgencies[0] ? formatCompactCurrency(summary.topAgencies[0].value) : ''}
                    icon={Building2}
                    iconColor="text-purple-600"
                  />
                  <StatCard
                    title="Federal to MA"
                    value={formatCompactCurrency(federalTotal)}
                    description="FY24 federal grants"
                    icon={Flag}
                    iconColor="text-green-600"
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
                  <h2 className="font-semibold text-slate-900">Filter State Transactions</h2>
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
                        className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={exportToCSV}
                      disabled={transactions.length === 0}
                      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
        </>
      ) : (
        /* Federal Tab */
        <>
          <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <Flag className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800">Federal Grants to Massachusetts</h3>
                <p className="mt-1 text-sm text-green-700">
                  Federal funding flowing to MA organizations, municipalities, and state agencies via USASpending.gov.
                  This is where large amounts of fraud can occur - grants to nonprofits, healthcare providers, and contractors.
                </p>
              </div>
            </div>
          </div>

          {federalLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
                <p className="mt-4 text-slate-600">Loading federal grants data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Federal Stats */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Total Federal Grants"
                  value={formatCompactCurrency(federalTotal)}
                  description="FY2024 grants to MA"
                  icon={Flag}
                  iconColor="text-green-600"
                />
                <StatCard
                  title="Grant Records"
                  value={federalGrants.length.toLocaleString()}
                  description="Individual awards"
                  icon={FileText}
                  iconColor="text-green-600"
                />
                <StatCard
                  title="Federal Programs"
                  value={federalPrograms.length.toString()}
                  description="CFDA programs funding MA"
                  icon={Building2}
                  iconColor="text-green-600"
                />
              </div>

              {/* Federal Programs Chart */}
              {federalPrograms.length > 0 && (
                <div className="mb-8">
                  <SpendingBarChart
                    data={federalPrograms.slice(0, 10).map(p => ({ name: p.name.slice(0, 40), value: p.amount }))}
                    title="Top Federal Programs Funding MA"
                  />
                </div>
              )}

              {/* Federal Grants Table */}
              <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Flag className="h-5 w-5 text-green-600" />
                    Federal Grant Recipients
                  </h2>
                  <button
                    onClick={exportFederalToCSV}
                    disabled={federalGrants.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-slate-300"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Recipient</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Agency</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-700">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {federalGrants.slice(0, federalExpanded ? 100 : 20).map((grant, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <GoogleSearchLink name={grant.recipientName} truncateAt={30} />
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">{grant.agency}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(grant.amount)}</td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            {grant.startDate ? formatDate(grant.startDate) : '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate">
                            {grant.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {federalGrants.length > 20 && (
                  <button
                    onClick={() => setFederalExpanded(!federalExpanded)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    {federalExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show More ({federalGrants.length - 20} more)
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Additional Resources */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Data Sources</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            href="https://www.usaspending.gov/search/?hash=4f5b9e8c8d8e0e1e2e3e4e5e6e7e8e9e"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            USASpending.gov MA Awards
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
