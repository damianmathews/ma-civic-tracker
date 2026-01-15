'use client';

import { useEffect, useState } from 'react';
import { GoogleSearchLink } from '@/components/ui/google-search-link';
import { formatCurrency, formatCompactCurrency, formatDate } from '@/lib/utils';
import {
  Search,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Building2,
  Landmark,
  Flag,
} from 'lucide-react';

interface Transaction {
  department: string;
  vendor: string;
  amount: number;
  date: string;
  description?: string;
  source: 'boston' | 'massachusetts' | 'federal';
}

interface CategoryResult {
  category: string;
  keywords: string[];
  transactions: Transaction[];
  totalAmount: number;
  count: number;
  bySource: {
    boston: number;
    massachusetts: number;
    federal: number;
  };
}

// Categories of spending to audit
const AUDIT_CATEGORIES = [
  {
    id: 'dei_diversity',
    name: 'DEI / Diversity Programs',
    keywords: ['diversity', 'equity', 'inclusion', 'DEI', 'DEIB', 'racial equity', 'racial justice', 'antiracism', 'anti-racism'],
    description: 'Diversity, equity, and inclusion programs and initiatives',
  },
  {
    id: 'lgbtq',
    name: 'LGBTQ+ Programs',
    keywords: ['LGBTQ', 'LGBT', 'transgender', 'trans health', 'gender affirming', 'pride', 'queer'],
    description: 'LGBTQ-related services and programs',
  },
  {
    id: 'immigrant',
    name: 'Immigrant / Migrant Services',
    keywords: ['immigrant', 'immigration', 'migrant', 'refugee', 'asylum', 'newcomer', 'undocumented', 'sanctuary', 'resettlement'],
    description: 'Services for immigrants, refugees, and migrants',
  },
  {
    id: 'homeless',
    name: 'Homeless Services',
    keywords: ['homeless', 'unhoused', 'shelter', 'housing first', 'encampment', 'street outreach', 'transitional housing', 'emergency shelter'],
    description: 'Homeless services, shelters, and housing programs',
  },
  {
    id: 'climate',
    name: 'Climate / Environmental Justice',
    keywords: ['climate', 'environmental justice', 'green new', 'carbon', 'sustainability', 'renewable', 'clean energy'],
    description: 'Climate change and environmental justice initiatives',
  },
  {
    id: 'consulting',
    name: 'Consulting / Studies',
    keywords: ['consulting', 'consultant', 'study', 'assessment', 'analysis', 'survey', 'research'],
    description: 'Consulting fees, studies, and assessments',
  },
  {
    id: 'nonprofit',
    name: 'Nonprofit Grants',
    keywords: ['grant', 'nonprofit', 'non-profit', 'foundation', 'community organization', 'community-based'],
    description: 'Grants to nonprofits and community organizations',
  },
  {
    id: 'legal_settlement',
    name: 'Legal Settlements',
    keywords: ['settlement', 'legal', 'lawsuit', 'litigation', 'judgment', 'attorney'],
    description: 'Legal fees, settlements, and judgments',
  },
];

const SOURCE_ICONS = {
  boston: Building2,
  massachusetts: Landmark,
  federal: Flag,
};

const SOURCE_LABELS = {
  boston: 'Boston City',
  massachusetts: 'MA State',
  federal: 'Federal',
};

const SOURCE_COLORS = {
  boston: 'bg-blue-100 text-blue-800',
  massachusetts: 'bg-purple-100 text-purple-800',
  federal: 'bg-green-100 text-green-800',
};

export default function SpendingAuditPage() {
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [customSearch, setCustomSearch] = useState('');
  const [customResults, setCustomResults] = useState<Transaction[]>([]);
  const [searching, setSearching] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'boston' | 'massachusetts' | 'federal'>('all');

  useEffect(() => {
    async function fetchAllSources() {
      const allTx: Transaction[] = [];

      try {
        // Fetch from all three sources in parallel
        setLoadingStatus('Fetching Boston city spending...');
        const bostonPromise = fetch('/api/boston/spending?type=transactions&limit=10000')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.transactions) {
              return data.data.transactions.map((t: { vendor: string; department: string; amount: number; date?: string; description?: string }) => ({
                ...t,
                source: 'boston' as const,
              }));
            }
            return [];
          })
          .catch(() => []);

        setLoadingStatus('Fetching MA state spending...');
        const maPromise = fetch('/api/massachusetts/spending?type=transactions&limit=5000')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.transactions) {
              return data.data.transactions.map((t: { vendor: string; department: string; amount: number; date?: string; description?: string }) => ({
                vendor: t.vendor,
                department: t.department,
                amount: t.amount,
                date: t.date || '',
                description: t.description || '',
                source: 'massachusetts' as const,
              }));
            }
            return [];
          })
          .catch(() => []);

        setLoadingStatus('Fetching federal grants to MA...');
        const federalPromise = fetch('/api/federal/spending?type=grants&limit=500')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.grants) {
              return data.data.grants.map((g: { 'Recipient Name'?: string; 'Award Amount'?: number; 'Awarding Agency'?: string; Description?: string; 'Start Date'?: string }) => ({
                vendor: g['Recipient Name'] || 'Unknown',
                department: g['Awarding Agency'] || 'Federal Agency',
                amount: g['Award Amount'] || 0,
                date: g['Start Date'] || '',
                description: g['Description'] || '',
                source: 'federal' as const,
              }));
            }
            return [];
          })
          .catch(() => []);

        const [bostonTx, maTx, federalTx] = await Promise.all([bostonPromise, maPromise, federalPromise]);

        allTx.push(...bostonTx, ...maTx, ...federalTx);
        setAllTransactions(allTx);

        setLoadingStatus('Analyzing spending categories...');

        // Analyze each category
        const categoryResults: CategoryResult[] = [];

        for (const category of AUDIT_CATEGORIES) {
          const matches = allTx.filter((t) => {
            const searchText = `${t.vendor} ${t.description || ''} ${t.department}`.toLowerCase();
            return category.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));
          });

          if (matches.length > 0) {
            const totalAmount = matches.reduce((sum, t) => sum + t.amount, 0);
            const bySource = {
              boston: matches.filter(t => t.source === 'boston').reduce((s, t) => s + t.amount, 0),
              massachusetts: matches.filter(t => t.source === 'massachusetts').reduce((s, t) => s + t.amount, 0),
              federal: matches.filter(t => t.source === 'federal').reduce((s, t) => s + t.amount, 0),
            };
            categoryResults.push({
              category: category.name,
              keywords: category.keywords,
              transactions: matches.sort((a, b) => b.amount - a.amount),
              totalAmount,
              count: matches.length,
              bySource,
            });
          }
        }

        // Sort by total amount
        categoryResults.sort((a, b) => b.totalAmount - a.totalAmount);
        setResults(categoryResults);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllSources();
  }, []);

  const handleCustomSearch = () => {
    if (!customSearch.trim()) return;
    setSearching(true);

    const searchTerms = customSearch.toLowerCase().split(',').map((s) => s.trim());
    let txToSearch = allTransactions;

    if (sourceFilter !== 'all') {
      txToSearch = allTransactions.filter(t => t.source === sourceFilter);
    }

    const matches = txToSearch.filter((t) => {
      const searchText = `${t.vendor} ${t.description || ''} ${t.department}`.toLowerCase();
      return searchTerms.some((term) => searchText.includes(term));
    });

    setCustomResults(matches.sort((a, b) => b.amount - a.amount));
    setSearching(false);
  };

  const exportToCSV = (transactions: Transaction[], filename: string) => {
    const headers = ['Source', 'Vendor', 'Department', 'Amount', 'Date', 'Description'];
    const rows = transactions.map((t) => [
      SOURCE_LABELS[t.source],
      t.vendor,
      t.department,
      t.amount.toString(),
      t.date,
      t.description || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredTransactions = (transactions: Transaction[]) => {
    if (sourceFilter === 'all') return transactions;
    return transactions.filter(t => t.source === sourceFilter);
  };

  const totalFlagged = results.reduce((sum, r) => sum + r.totalAmount, 0);
  const bostonTotal = results.reduce((sum, r) => sum + r.bySource.boston, 0);
  const maTotal = results.reduce((sum, r) => sum + r.bySource.massachusetts, 0);
  const federalTotal = results.reduce((sum, r) => sum + r.bySource.federal, 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">{loadingStatus}</p>
          <p className="mt-2 text-xs text-slate-400">Scanning Boston, MA State, and Federal data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Multi-Source Spending Audit</h1>
        <p className="mt-2 text-slate-600">
          Search government spending across Boston city, Massachusetts state, and Federal grants.
        </p>
      </div>

      {/* Summary Banner */}
      <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">
              {formatCompactCurrency(totalFlagged)} Found Across {results.length} Categories
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Combined spending from all government sources matching audit keywords.
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <span className="font-medium text-blue-800">Boston:</span>{' '}
                  {formatCompactCurrency(bostonTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-purple-600" />
                <span className="text-sm">
                  <span className="font-medium text-purple-800">MA State:</span>{' '}
                  {formatCompactCurrency(maTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <span className="font-medium text-green-800">Federal:</span>{' '}
                  {formatCompactCurrency(federalTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="text-sm text-slate-600 mr-2 self-center">Filter by source:</span>
        {(['all', 'boston', 'massachusetts', 'federal'] as const).map((source) => (
          <button
            key={source}
            onClick={() => setSourceFilter(source)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sourceFilter === source
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {source === 'all' ? 'All Sources' : SOURCE_LABELS[source]}
          </button>
        ))}
      </div>

      {/* Custom Search */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Custom Keyword Search
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Search for any terms in vendor names, descriptions, or departments across all sources. Separate multiple terms with commas.
        </p>
        <div className="flex gap-4">
          <input
            type="text"
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
            placeholder="e.g., equity, transgender, immigrant, homeless, consulting, resettlement"
            className="flex-1 rounded-lg border border-slate-300 py-2 px-4 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            onClick={handleCustomSearch}
            disabled={searching || !customSearch.trim()}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-slate-300"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>

        {customResults.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900">
                Found {customResults.length} transactions totaling{' '}
                {formatCompactCurrency(customResults.reduce((sum, t) => sum + t.amount, 0))}
              </h3>
              <button
                onClick={() => exportToCSV(customResults, 'custom-search')}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Source</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Vendor</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Department</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-700">Amount</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Date</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customResults.slice(0, 100).map((t, idx) => {
                    const SourceIcon = SOURCE_ICONS[t.source];
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[t.source]}`}>
                            <SourceIcon className="h-3 w-3" />
                            {SOURCE_LABELS[t.source]}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <GoogleSearchLink name={t.vendor} truncateAt={25} />
                        </td>
                        <td className="py-2 px-4 text-slate-600 text-xs">{t.department}</td>
                        <td className="py-2 px-4 text-right font-medium">{formatCurrency(t.amount)}</td>
                        <td className="py-2 px-4 text-slate-600 text-xs">{t.date ? formatDate(t.date) : '-'}</td>
                        <td className="py-2 px-4 text-slate-600 text-xs max-w-xs truncate">{t.description || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pre-defined Categories */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Spending Categories</h2>
        <div className="space-y-3">
          {results.map((result) => {
            const filteredTransactions = getFilteredTransactions(result.transactions);
            const filteredTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

            if (sourceFilter !== 'all' && filteredTransactions.length === 0) return null;

            return (
              <div
                key={result.category}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCategory(expandedCategory === result.category ? null : result.category)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{result.category}</h3>
                      <p className="text-sm text-slate-500">
                        Keywords: {result.keywords.slice(0, 5).join(', ')}
                        {result.keywords.length > 5 && '...'}
                      </p>
                      {sourceFilter === 'all' && (
                        <div className="flex gap-3 mt-1">
                          {result.bySource.boston > 0 && (
                            <span className="text-xs text-blue-600">
                              Boston: {formatCompactCurrency(result.bySource.boston)}
                            </span>
                          )}
                          {result.bySource.massachusetts > 0 && (
                            <span className="text-xs text-purple-600">
                              MA: {formatCompactCurrency(result.bySource.massachusetts)}
                            </span>
                          )}
                          {result.bySource.federal > 0 && (
                            <span className="text-xs text-green-600">
                              Federal: {formatCompactCurrency(result.bySource.federal)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCompactCurrency(sourceFilter === 'all' ? result.totalAmount : filteredTotal)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {sourceFilter === 'all' ? result.count : filteredTransactions.length} transactions
                      </p>
                    </div>
                    {expandedCategory === result.category ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedCategory === result.category && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-slate-600">
                        Showing top transactions by amount. All vendors are clickable to research.
                      </p>
                      <button
                        onClick={() => exportToCSV(filteredTransactions, result.category.toLowerCase().replace(/\s+/g, '-'))}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        Export All ({filteredTransactions.length})
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left py-2 px-4 font-medium text-slate-700">Source</th>
                            <th className="text-left py-2 px-4 font-medium text-slate-700">Vendor</th>
                            <th className="text-left py-2 px-4 font-medium text-slate-700">Department</th>
                            <th className="text-right py-2 px-4 font-medium text-slate-700">Amount</th>
                            <th className="text-left py-2 px-4 font-medium text-slate-700">Date</th>
                            <th className="text-left py-2 px-4 font-medium text-slate-700">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredTransactions.slice(0, 50).map((t, idx) => {
                            const SourceIcon = SOURCE_ICONS[t.source];
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[t.source]}`}>
                                    <SourceIcon className="h-3 w-3" />
                                    {SOURCE_LABELS[t.source]}
                                  </span>
                                </td>
                                <td className="py-2 px-4">
                                  <GoogleSearchLink name={t.vendor} truncateAt={25} />
                                </td>
                                <td className="py-2 px-4 text-slate-600 text-xs">{t.department}</td>
                                <td className="py-2 px-4 text-right font-medium">{formatCurrency(t.amount)}</td>
                                <td className="py-2 px-4 text-slate-600 text-xs">{t.date ? formatDate(t.date) : '-'}</td>
                                <td className="py-2 px-4 text-slate-600 text-xs max-w-xs truncate">
                                  {t.description || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* No Results */}
      {results.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-slate-400" />
          <h3 className="mt-4 font-semibold text-slate-900">No Matches Found</h3>
          <p className="mt-2 text-sm text-slate-500">
            No spending matched the predefined categories. Try a custom search above.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Data Context</h3>
            <p className="mt-1 text-sm text-amber-700">
              This search scans vendor names, departments, and descriptions for keywords across multiple data sources.
              Some matches may be legitimate services misidentified by keyword matching.
              Always verify the actual purpose of spending before drawing conclusions. Click vendor names to research further.
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="mt-8 text-sm text-slate-500">
        <p className="font-medium text-slate-700 mb-2">Data Sources:</p>
        <ul className="space-y-1">
          <li>
            <Building2 className="inline h-4 w-4 text-blue-600 mr-1" />
            <a
              href="https://data.boston.gov/dataset/checkbook-explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Boston Checkbook Explorer
            </a>
            {' '}— City of Boston spending
          </li>
          <li>
            <Landmark className="inline h-4 w-4 text-purple-600 mr-1" />
            <a
              href="https://cthru.mass.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Massachusetts CTHRU
            </a>
            {' '}— State of Massachusetts spending
          </li>
          <li>
            <Flag className="inline h-4 w-4 text-green-600 mr-1" />
            <a
              href="https://www.usaspending.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              USASpending.gov
            </a>
            {' '}— Federal grants and awards to Massachusetts
          </li>
        </ul>
      </div>
    </div>
  );
}
