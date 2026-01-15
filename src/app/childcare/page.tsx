'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { GoogleSearchLink } from '@/components/ui/google-search-link';
import { formatCompactCurrency } from '@/lib/utils';
import {
  Baby,
  Building2,
  MapPin,
  Phone,
  AlertTriangle,
  Search,
  Filter,
  ExternalLink,
  Shield,
  Users,
  ChevronDown,
  ChevronUp,
  Home,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ChildcareProvider {
  provider_number: string;
  program_name: string;
  program_umbrella?: string;
  program_street_address1: string;
  program_city: string;
  program_zipcode: string;
  program_phone?: string;
  licensing_region: string;
  subsidy_region: string;
  program_type: string;
  licensed_funded: string;
  licensed_provider_status: string;
  first_issued_date?: string;
  licensed_capacity?: string;
  voucher_contract?: boolean;
  c3_attestation?: string;
  coi_cat?: string;
}

interface Flag {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  providers: ChildcareProvider[];
  count: number;
}

interface Summary {
  totalProviders: number;
  acceptingSubsidy: number;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export default function ChildcarePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [providers, setProviders] = useState<ChildcareProvider[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);

  // Filters
  const [selectedCity, setSelectedCity] = useState('');
  const [subsidyOnly, setSubsidyOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, citiesRes] = await Promise.all([
          fetch('/api/childcare?type=summary'),
          fetch('/api/childcare?type=cities'),
        ]);

        const summaryData = await summaryRes.json();
        const citiesData = await citiesRes.json();

        if (summaryData.success) {
          setSummary(summaryData.data);
        }
        if (citiesData.success) {
          setCities(citiesData.data.cities);
        }
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchFlags() {
      try {
        const flagsRes = await fetch('/api/childcare?type=flags');
        const flagsData = await flagsRes.json();
        if (flagsData.success) {
          setFlags(flagsData.data.flags);
        }
      } catch (error) {
        console.error('Error fetching flags:', error);
      } finally {
        setFlagsLoading(false);
      }
    }

    fetchData();
    fetchFlags();
  }, []);

  useEffect(() => {
    async function fetchProviders() {
      try {
        let url = `/api/childcare?type=providers&limit=200`;
        if (selectedCity) {
          url += `&city=${encodeURIComponent(selectedCity)}`;
        }
        if (subsidyOnly) {
          url += `&subsidy=true`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setProviders(data.data.providers);
        }
      } catch (error) {
        console.error('Error fetching providers:', error);
      }
    }

    if (!loading) {
      fetchProviders();
    }
  }, [selectedCity, subsidyOnly, loading]);

  const filteredProviders = providers.filter((p) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.program_name.toLowerCase().includes(search) ||
      p.program_street_address1.toLowerCase().includes(search) ||
      p.provider_number.toLowerCase().includes(search)
    );
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Current') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (status === 'Renewal in progress') {
      return <Calendar className="h-4 w-4 text-amber-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading Massachusetts childcare provider data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Childcare Provider Analysis</h1>
        <p className="mt-2 text-slate-600">
          Licensed childcare providers in Massachusetts - the same type of data where fraud was found in Minnesota.
        </p>
      </div>

      {/* Context Banner */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Minnesota Fraud Context</h3>
            <p className="mt-1 text-sm text-blue-700">
              In Minnesota, fraud investigators found childcare centers billing for children who weren&apos;t enrolled,
              facilities that appeared empty, and providers at residential addresses claiming commercial-level capacity.
              This page analyzes MA&apos;s {summary?.totalProviders.toLocaleString()} licensed providers for similar patterns.
            </p>
            <a
              href="https://www.cbsnews.com/minnesota/news/minnesota-day-care-fraud-warning-records/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              Read about the Minnesota investigation
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      {summary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Providers"
            value={summary.totalProviders.toLocaleString()}
            description="Licensed in Massachusetts"
            icon={Baby}
          />
          <StatCard
            title="Accept Subsidies"
            value={summary.acceptingSubsidy.toLocaleString()}
            description={`${((summary.acceptingSubsidy / summary.totalProviders) * 100).toFixed(0)}% of total`}
            icon={Building2}
          />
          <StatCard
            title="Center-Based"
            value={(summary.byType.find((t) => t.type === 'Center-based Care')?.count || 0).toLocaleString()}
            description="Licensed centers"
            icon={Building2}
          />
          <StatCard
            title="Family Childcare"
            value={(summary.byType.find((t) => t.type === 'Family Child Care')?.count || 0).toLocaleString()}
            description="Home-based providers"
            icon={Home}
          />
        </div>
      )}

      {/* Red Flags Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Automated Red Flags
        </h2>

        {flagsLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
            <p className="mt-2 text-sm text-slate-600">Analyzing provider patterns...</p>
          </div>
        ) : flags.length === 0 ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
            <p className="mt-2 text-green-800">No significant red flags detected in current dataset.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.type}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFlag(expandedFlag === flag.type ? null : flag.type)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getSeverityColor(flag.severity)}`}>
                      {flag.severity.toUpperCase()}
                    </span>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{flag.title}</h3>
                      <p className="text-sm text-slate-500">{flag.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-600">{flag.count} providers</span>
                    {expandedFlag === flag.type ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedFlag === flag.type && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 font-medium text-slate-700">Provider</th>
                            <th className="text-left py-2 font-medium text-slate-700">Address</th>
                            <th className="text-left py-2 font-medium text-slate-700">Type</th>
                            <th className="text-left py-2 font-medium text-slate-700">Capacity</th>
                            <th className="text-left py-2 font-medium text-slate-700">Status</th>
                            <th className="text-left py-2 font-medium text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {flag.providers.slice(0, 10).map((p) => (
                            <tr key={p.provider_number} className="hover:bg-white">
                              <td className="py-3">
                                <p className="font-medium text-slate-900">{p.program_name}</p>
                                <p className="text-xs text-slate-500">{p.provider_number}</p>
                              </td>
                              <td className="py-3 text-slate-600">
                                {p.program_street_address1}, {p.program_city}
                              </td>
                              <td className="py-3 text-slate-600">{p.program_type}</td>
                              <td className="py-3 text-slate-600">{p.licensed_capacity || 'N/A'}</td>
                              <td className="py-3">
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(p.licensed_provider_status)}
                                  <span className="text-xs">{p.licensed_provider_status}</span>
                                </span>
                              </td>
                              <td className="py-3">
                                <GoogleSearchLink name={p.program_name} truncateAt={20} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {flag.providers.length > 10 && (
                      <p className="mt-4 text-sm text-slate-500">
                        Showing 10 of {flag.count} providers. Export data for full list.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Browse Providers</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Cities</option>
              {cities.slice(0, 50).map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name or address..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={subsidyOnly}
                onChange={(e) => setSubsidyOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Subsidy providers only</span>
            </label>
          </div>

          <div className="flex items-end">
            <p className="text-sm text-slate-600">
              Showing {filteredProviders.length} providers
            </p>
          </div>
        </div>
      </div>

      {/* Provider List */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Subsidy
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No providers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProviders.slice(0, 100).map((provider) => (
                  <tr key={provider.provider_number} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <div>
                          <GoogleSearchLink name={provider.program_name} truncateAt={30} />
                          <p className="text-xs text-slate-500 mt-1">{provider.provider_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p>{provider.program_street_address1}</p>
                          <p>{provider.program_city}, MA {provider.program_zipcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {provider.program_type}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {provider.licensed_capacity || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1">
                        {getStatusIcon(provider.licensed_provider_status)}
                        <span className="text-xs text-slate-600">{provider.licensed_provider_status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {provider.voucher_contract ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                          <CheckCircle2 className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">No</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredProviders.length > 100 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">
              Showing first 100 of {filteredProviders.length} providers. Use filters to narrow results.
            </p>
          </div>
        )}
      </div>

      {/* Data Source */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Data Source & Investigation Tips</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="font-medium text-slate-900 mb-2">Data Source</h3>
            <p className="text-sm text-slate-600 mb-2">
              This data comes from the Massachusetts Department of Early Education and Care (EEC)
              licensing database, updated monthly.
            </p>
            <a
              href="https://www.mass.gov/lists/data-on-massachusetts-child-care-programs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              MA EEC Data Portal
            </a>
          </div>
          <div>
            <h3 className="font-medium text-slate-900 mb-2">How to Investigate</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Google the provider name + &quot;Massachusetts&quot;</li>
              <li>• Check if the address is residential vs commercial</li>
              <li>• Look for web presence, reviews, photos</li>
              <li>• Compare licensed capacity to facility size</li>
              <li>• Check MA Secretary of State business records</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
