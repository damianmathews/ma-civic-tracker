'use client';

import { useEffect, useState } from 'react';
import { GoogleSearchLink } from '@/components/ui/google-search-link';
import { formatCurrency, formatCompactCurrency, formatDate } from '@/lib/utils';
import {
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  FileText,
} from 'lucide-react';

interface Transaction {
  department: string;
  vendor: string;
  amount: number;
  date: string;
  description?: string;
}

interface CategoryResult {
  category: string;
  keywords: string[];
  transactions: Transaction[];
  totalAmount: number;
  count: number;
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
    keywords: ['immigrant', 'immigration', 'migrant', 'refugee', 'asylum', 'newcomer', 'undocumented', 'sanctuary'],
    description: 'Services for immigrants, refugees, and migrants',
  },
  {
    id: 'homeless',
    name: 'Homeless Services',
    keywords: ['homeless', 'unhoused', 'shelter', 'housing first', 'encampment', 'street outreach'],
    description: 'Homeless services, shelters, and housing programs',
  },
  {
    id: 'climate',
    name: 'Climate / Environmental Justice',
    keywords: ['climate', 'environmental justice', 'green new', 'carbon', 'sustainability', 'renewable'],
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
    keywords: ['grant', 'nonprofit', 'non-profit', 'foundation', 'community organization'],
    description: 'Grants to nonprofits and community organizations',
  },
  {
    id: 'legal_settlement',
    name: 'Legal Settlements',
    keywords: ['settlement', 'legal', 'lawsuit', 'litigation', 'judgment', 'attorney'],
    description: 'Legal fees, settlements, and judgments',
  },
];

export default function SpendingAuditPage() {
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [customSearch, setCustomSearch] = useState('');
  const [customResults, setCustomResults] = useState<Transaction[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function fetchAndAnalyze() {
      try {
        // Fetch transactions with descriptions
        const response = await fetch('/api/boston/spending?type=transactions&limit=10000');
        const data = await response.json();

        if (!data.success) {
          setLoading(false);
          return;
        }

        const transactions: Transaction[] = data.data.transactions;
        setAllTransactions(transactions);

        // Analyze each category
        const categoryResults: CategoryResult[] = [];

        for (const category of AUDIT_CATEGORIES) {
          const matches = transactions.filter((t) => {
            const searchText = `${t.vendor} ${t.description || ''} ${t.department}`.toLowerCase();
            return category.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));
          });

          if (matches.length > 0) {
            const totalAmount = matches.reduce((sum, t) => sum + t.amount, 0);
            categoryResults.push({
              category: category.name,
              keywords: category.keywords,
              transactions: matches.sort((a, b) => b.amount - a.amount),
              totalAmount,
              count: matches.length,
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

    fetchAndAnalyze();
  }, []);

  const handleCustomSearch = () => {
    if (!customSearch.trim()) return;
    setSearching(true);

    const searchTerms = customSearch.toLowerCase().split(',').map((s) => s.trim());
    const matches = allTransactions.filter((t) => {
      const searchText = `${t.vendor} ${t.description || ''} ${t.department}`.toLowerCase();
      return searchTerms.some((term) => searchText.includes(term));
    });

    setCustomResults(matches.sort((a, b) => b.amount - a.amount));
    setSearching(false);
  };

  const exportToCSV = (transactions: Transaction[], filename: string) => {
    const headers = ['Vendor', 'Department', 'Amount', 'Date', 'Description'];
    const rows = transactions.map((t) => [
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

  const totalFlagged = results.reduce((sum, r) => sum + r.totalAmount, 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Scanning spending data for audit categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Spending Audit</h1>
        <p className="mt-2 text-slate-600">
          Search government spending by category. Find where your tax dollars are going.
        </p>
      </div>

      {/* Summary Banner */}
      <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">
              {formatCompactCurrency(totalFlagged)} Found Across {results.length} Categories
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Spending matching audit keywords in the Boston checkbook data. Click any category to see details
              and export the data. All vendor names are clickable to search for more information.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Search */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Custom Keyword Search
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Search for any terms in vendor names, descriptions, or departments. Separate multiple terms with commas.
        </p>
        <div className="flex gap-4">
          <input
            type="text"
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
            placeholder="e.g., equity, transgender, immigrant, homeless, consulting"
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
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Vendor</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Department</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-700">Amount</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Date</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customResults.slice(0, 100).map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-4">
                        <GoogleSearchLink name={t.vendor} truncateAt={25} />
                      </td>
                      <td className="py-2 px-4 text-slate-600">{t.department}</td>
                      <td className="py-2 px-4 text-right font-medium">{formatCurrency(t.amount)}</td>
                      <td className="py-2 px-4 text-slate-600 text-xs">{t.date ? formatDate(t.date) : '-'}</td>
                      <td className="py-2 px-4 text-slate-600 text-xs">{t.description || '-'}</td>
                    </tr>
                  ))}
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
          {results.map((result) => (
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
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCompactCurrency(result.totalAmount)}</p>
                    <p className="text-sm text-slate-500">{result.count} transactions</p>
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
                      onClick={() => exportToCSV(result.transactions, result.category.toLowerCase().replace(/\s+/g, '-'))}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Export All ({result.count})
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-4 font-medium text-slate-700">Vendor</th>
                          <th className="text-left py-2 px-4 font-medium text-slate-700">Department</th>
                          <th className="text-right py-2 px-4 font-medium text-slate-700">Amount</th>
                          <th className="text-left py-2 px-4 font-medium text-slate-700">Date</th>
                          <th className="text-left py-2 px-4 font-medium text-slate-700">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {result.transactions.slice(0, 50).map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-4">
                              <GoogleSearchLink name={t.vendor} truncateAt={25} />
                            </td>
                            <td className="py-2 px-4 text-slate-600">{t.department}</td>
                            <td className="py-2 px-4 text-right font-medium">{formatCurrency(t.amount)}</td>
                            <td className="py-2 px-4 text-slate-600 text-xs">{t.date ? formatDate(t.date) : '-'}</td>
                            <td className="py-2 px-4 text-slate-600 text-xs max-w-xs truncate">
                              {t.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
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
              This search scans vendor names, departments, and descriptions for keywords. Some matches may be
              legitimate services misidentified by keyword matching. Always verify the actual purpose of spending
              before drawing conclusions. Click vendor names to research further.
            </p>
          </div>
        </div>
      </div>

      {/* Data Source */}
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
          </a>
          {' '}— Search your own keywords to find any type of spending.
        </p>
      </div>
    </div>
  );
}
