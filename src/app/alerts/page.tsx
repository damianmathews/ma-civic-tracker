'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { GoogleSearchLink } from '@/components/ui/google-search-link';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';
import { analyzeTransactions, Anomaly } from '@/lib/fraud-detection';
import {
  AlertTriangle,
  TrendingUp,
  Shield,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileWarning,
  CircleDollarSign,
  Calendar,
  Building2,
  Users,
  BarChart3,
  Repeat,
  SplitSquareHorizontal,
  Clock,
  Link2,
  Network,
} from 'lucide-react';

interface AnomalyStats {
  totalAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalFlaggedAmount: number;
}

interface CrossRefMatch {
  name: string;
  normalizedName: string;
  sources: {
    source: string;
    data: Record<string, unknown>;
  }[];
  totalAmount: number;
  riskScore: number;
  flags: string[];
}

interface CrossRefSummary {
  totalCrossMatches: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  totalAmount: number;
  sourceCombinations: {
    childcareFederal: number;
    childcareBoston: number;
    federalBoston: number;
    allThree: number;
  };
}

const TYPE_INFO: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  benfords_law: { icon: BarChart3, label: "Benford's Law", color: 'bg-purple-100 text-purple-800' },
  duplicate_payments: { icon: Repeat, label: 'Duplicate Payments', color: 'bg-red-100 text-red-800' },
  threshold_avoidance: { icon: SplitSquareHorizontal, label: 'Threshold Avoidance', color: 'bg-orange-100 text-orange-800' },
  round_numbers: { icon: CircleDollarSign, label: 'Round Numbers', color: 'bg-amber-100 text-amber-800' },
  weekend_payments: { icon: Calendar, label: 'Weekend Payments', color: 'bg-blue-100 text-blue-800' },
  same_day_payments: { icon: Clock, label: 'Same-Day Payments', color: 'bg-cyan-100 text-cyan-800' },
  vendor_name_flag: { icon: Building2, label: 'Vendor Name Flag', color: 'bg-slate-100 text-slate-800' },
  high_frequency: { icon: TrendingUp, label: 'High Frequency', color: 'bg-green-100 text-green-800' },
  large_outlier: { icon: AlertTriangle, label: 'Large Outlier', color: 'bg-red-100 text-red-800' },
  vendor_concentration: { icon: Users, label: 'Vendor Concentration', color: 'bg-indigo-100 text-indigo-800' },
};

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Cross-reference analysis state
  const [crossRefMatches, setCrossRefMatches] = useState<CrossRefMatch[]>([]);
  const [crossRefSummary, setCrossRefSummary] = useState<CrossRefSummary | null>(null);
  const [crossRefLoading, setCrossRefLoading] = useState(true);
  const [showCrossRef, setShowCrossRef] = useState(false);
  const [activeTab, setActiveTab] = useState<'anomalies' | 'crossref'>('anomalies');

  useEffect(() => {
    async function fetchAndAnalyze() {
      try {
        // Fetch more data for better analysis
        const response = await fetch('/api/boston/spending?type=transactions&limit=10000');
        const data = await response.json();

        if (!data.success) {
          setLoading(false);
          return;
        }

        const transactions = data.data.transactions.map((t: Record<string, unknown>) => ({
          department: t.department as string,
          vendor: t.vendor as string,
          amount: t.amount as number,
          date: t.date as string,
          description: t.description as string,
        }));

        const result = analyzeTransactions(transactions);
        setAnomalies(result.anomalies);
        setStats(result.stats);
      } catch (error) {
        console.error('Error analyzing data:', error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchCrossRef() {
      try {
        const [matchesRes, summaryRes] = await Promise.all([
          fetch('/api/crossref'),
          fetch('/api/crossref?type=summary'),
        ]);

        const matchesData = await matchesRes.json();
        const summaryData = await summaryRes.json();

        if (matchesData.success) {
          setCrossRefMatches(matchesData.data.matches || []);
        }
        if (summaryData.success) {
          setCrossRefSummary(summaryData.data);
        }
      } catch (error) {
        console.error('Error fetching cross-reference data:', error);
      } finally {
        setCrossRefLoading(false);
      }
    }

    fetchAndAnalyze();
    fetchCrossRef();
  }, []);

  const filteredAnomalies = anomalies.filter((a) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    return true;
  });

  // Sort by severity (critical first) then by amount
  const sortedAnomalies = [...filteredAnomalies].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return (b.amount || 0) - (a.amount || 0);
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getTypeInfo = (type: string) => {
    return TYPE_INFO[type] || { icon: FileWarning, label: type, color: 'bg-slate-100 text-slate-800' };
  };

  // Get unique types for filter
  const uniqueTypes = [...new Set(anomalies.map((a) => a.type))];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Running fraud detection analysis...</p>
          <p className="mt-2 text-sm text-slate-500">Analyzing patterns using Benford&apos;s Law, duplicate detection, and more...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Fraud Detection Analysis</h1>
        <p className="mt-2 text-slate-600">
          Advanced pattern detection using techniques from Minnesota fraud investigations, ACFE guidelines, and forensic accounting.
        </p>
      </div>

      {/* Methods Banner */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Detection Methods</h3>
            <p className="mt-1 text-sm text-blue-700">
              This analysis uses: <strong>Benford&apos;s Law</strong> (digit distribution), <strong>Threshold Avoidance</strong> (invoice splitting),{' '}
              <strong>Duplicate Detection</strong>, <strong>Round Number Patterns</strong>, <strong>Weekend Payments</strong>, and{' '}
              <strong>Vendor Concentration Analysis</strong> — the same techniques used by the FBI and forensic accountants in the{' '}
              <a href="https://en.wikipedia.org/wiki/Feeding_Our_Future" target="_blank" rel="noopener noreferrer" className="underline">
                Feeding Our Future
              </a>{' '}
              investigation.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Analysis Disclaimer</h3>
            <p className="mt-1 text-sm text-amber-700">
              These flags are automatically generated based on statistical patterns and <strong>do not indicate wrongdoing</strong>.
              Many flagged items will have legitimate explanations. These are starting points for further investigation, not conclusions.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Pattern Flags"
            value={stats.totalAnomalies.toString()}
            description="Anomalies detected"
            icon={AlertTriangle}
            iconColor="text-amber-600"
          />
          <StatCard
            title="Critical/High"
            value={`${stats.criticalCount}/${stats.highCount}`}
            description="Needs attention"
            icon={FileWarning}
            iconColor="text-red-600"
          />
          <StatCard
            title="Cross-Matches"
            value={crossRefSummary?.totalCrossMatches.toString() || '...'}
            description="Multi-source entities"
            icon={Link2}
            iconColor="text-purple-600"
          />
          <StatCard
            title="High Risk Entities"
            value={crossRefSummary?.highRisk.toString() || '...'}
            description="Score 70+"
            icon={Network}
            iconColor="text-red-600"
          />
          <StatCard
            title="Flagged Amount"
            value={formatCompactCurrency(stats.totalFlaggedAmount + (crossRefSummary?.totalAmount || 0))}
            description="Combined total"
            icon={CircleDollarSign}
            iconColor="text-green-600"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'anomalies'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Pattern Anomalies
          <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded">
            {stats?.totalAnomalies || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('crossref')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'crossref'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Link2 className="h-4 w-4" />
          Cross-Reference Analysis
          <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded">
            {crossRefSummary?.totalCrossMatches || 0}
          </span>
        </button>
      </div>

      {activeTab === 'anomalies' ? (
        <>
      {/* Filters */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Filter Results</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Detection Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {getTypeInfo(type).label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <p className="text-sm text-slate-600">
              Showing {sortedAnomalies.length} of {anomalies.length} flags
            </p>
          </div>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="space-y-4">
        {sortedAnomalies.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-green-500" />
            <h3 className="mt-4 font-semibold text-slate-900">No Anomalies Match Filters</h3>
            <p className="mt-2 text-sm text-slate-500">
              {anomalies.length === 0
                ? 'No spending anomalies detected in the current dataset.'
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          sortedAnomalies.map((anomaly) => {
            const typeInfo = getTypeInfo(anomaly.type);
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={anomaly.id}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === anomaly.id ? null : anomaly.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.severity.toUpperCase()}
                    </span>
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{anomaly.title}</h3>
                      <p className="text-sm text-slate-500">{anomaly.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {anomaly.amount && (
                      <span className="text-sm font-medium text-slate-700">
                        {formatCompactCurrency(anomaly.amount)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {expandedId === anomaly.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedId === anomaly.id && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Details */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Details</h4>
                        <ul className="space-y-2">
                          {anomaly.details.map((detail, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-slate-400 mt-1">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Investigation Tips */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Investigation Tips</h4>
                        <ul className="space-y-2">
                          {anomaly.investigationTips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <Search className="h-3 w-3 text-amber-500 mt-1 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {anomaly.vendor && (
                      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-3">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(anomaly.vendor + ' Massachusetts')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          <Search className="h-4 w-4" />
                          Search &quot;{anomaly.vendor.length > 20 ? anomaly.vendor.slice(0, 20) + '...' : anomaly.vendor}&quot;
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href={`https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
                        >
                          <Building2 className="h-4 w-4" />
                          MA Business Search
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href={`https://opencorporates.com/companies?q=${encodeURIComponent(anomaly.vendor)}&jurisdiction_code=us_ma`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          OpenCorporates
                        </a>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        This flag is for informational purposes only. Many flagged patterns have legitimate explanations.
                        Always verify findings with official records and documentation before drawing conclusions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      ) : (
        /* Cross-Reference Tab */
        <>
          <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-start gap-3">
              <Network className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-800">Cross-Reference Analysis</h3>
                <p className="mt-1 text-sm text-purple-700">
                  Entities appearing in multiple datasets (childcare providers, federal grants, city payments).
                  Multi-source entities may indicate legitimate businesses OR potential fraud schemes like
                  double-dipping or shell company networks. High risk scores require investigation.
                </p>
              </div>
            </div>
          </div>

          {crossRefLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
                <p className="mt-4 text-slate-600">Running cross-reference analysis...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Cross-ref summary */}
              {crossRefSummary && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600">Childcare + Federal</p>
                    <p className="text-2xl font-bold text-slate-900">{crossRefSummary.sourceCombinations.childcareFederal}</p>
                    <p className="text-xs text-red-600">Potential double-dipping</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600">Childcare + Boston</p>
                    <p className="text-2xl font-bold text-slate-900">{crossRefSummary.sourceCombinations.childcareBoston}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600">Federal + Boston</p>
                    <p className="text-2xl font-bold text-slate-900">{crossRefSummary.sourceCombinations.federalBoston}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600">All Three Sources</p>
                    <p className="text-2xl font-bold text-red-600">{crossRefSummary.sourceCombinations.allThree}</p>
                    <p className="text-xs text-red-600">Highest priority</p>
                  </div>
                </div>
              )}

              {/* Cross-ref matches list */}
              <div className="space-y-3">
                {crossRefMatches.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
                    <Shield className="h-12 w-12 mx-auto text-green-500" />
                    <h3 className="mt-4 font-semibold text-slate-900">No Cross-Matches Found</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      No entities appear across multiple datasets.
                    </p>
                  </div>
                ) : (
                  crossRefMatches.slice(0, 50).map((match, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            match.riskScore >= 70 ? 'bg-red-600 text-white' :
                            match.riskScore >= 40 ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            Risk: {match.riskScore}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{match.name}</h3>
                            <div className="flex gap-2 mt-1">
                              {match.sources.map((s, sidx) => (
                                <span key={sidx} className={`text-xs px-2 py-0.5 rounded ${
                                  s.source === 'childcare' ? 'bg-pink-100 text-pink-800' :
                                  s.source === 'federal' ? 'bg-green-100 text-green-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {s.source}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCompactCurrency(match.totalAmount)}</p>
                          <p className="text-xs text-slate-500">{match.sources.length} sources</p>
                        </div>
                      </div>
                      {match.flags.length > 0 && (
                        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                          <ul className="text-xs text-red-700">
                            {match.flags.map((flag, fidx) => (
                              <li key={fidx}>• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex gap-2">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(match.name + ' Massachusetts')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Search className="h-3 w-3" />
                          Google Search
                        </a>
                        <a
                          href={`https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="h-3 w-3" />
                          MA Corp Search
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Detection Methods Reference */}
      <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Detection Methods Explained</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h3 className="font-medium text-slate-900">Benford&apos;s Law</h3>
            </div>
            <p className="text-sm text-slate-600">
              Natural numbers follow a predictable pattern where &quot;1&quot; appears as the first digit ~30% of the time.
              Fabricated numbers often deviate from this pattern.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <SplitSquareHorizontal className="h-5 w-5 text-orange-600" />
              <h3 className="font-medium text-slate-900">Threshold Avoidance</h3>
            </div>
            <p className="text-sm text-slate-600">
              Payments clustering just below approval limits (like $9,900 instead of $10,000) may indicate
              invoice splitting to avoid oversight.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="h-5 w-5 text-red-600" />
              <h3 className="font-medium text-slate-900">Duplicate Payments</h3>
            </div>
            <p className="text-sm text-slate-600">
              Multiple identical payments to the same vendor may indicate double-billing,
              invoice resubmission, or payment system errors.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <CircleDollarSign className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-slate-900">Round Numbers</h3>
            </div>
            <p className="text-sm text-slate-600">
              Legitimate invoices rarely come to exact round amounts. High rates of round-dollar
              payments can indicate fabricated invoices.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-slate-900">Weekend Payments</h3>
            </div>
            <p className="text-sm text-slate-600">
              Government offices typically don&apos;t process payments on weekends.
              High weekend activity may indicate backdated or falsified transactions.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h3 className="font-medium text-slate-900">Shell Company Indicators</h3>
            </div>
            <p className="text-sm text-slate-600">
              Generic business names, missing web presence, and PO Box addresses
              are common characteristics of fraudulent shell companies.
            </p>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Report Suspected Fraud</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="https://www.mass.gov/how-to/file-a-complaint-with-the-office-of-the-inspector-general"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            MA Inspector General
          </a>
          <a
            href="https://www.mass.gov/orgs/office-of-state-auditor-diana-dizoglio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            MA State Auditor
          </a>
          <a
            href="https://www.fbi.gov/contact-us/field-offices/boston"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            FBI Boston (Public Corruption)
          </a>
        </div>
      </div>
    </div>
  );
}
