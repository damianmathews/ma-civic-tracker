'use client';

import { useEffect, useState } from 'react';
import { GoogleSearchLink } from '@/components/ui/google-search-link';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  AlertTriangle,
  Store,
  MapPin,
  Download,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Flag,
} from 'lucide-react';

interface SNAPRetailer {
  store_name: string;
  address: string;
  city: string;
  state: string;
  zip5: string;
  store_type?: string;
  county?: string;
}

interface SNAPFlag {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  retailers: SNAPRetailer[];
  count: number;
}

interface CitySummary {
  city: string;
  count: number;
}

interface TypeSummary {
  type: string;
  count: number;
}

export default function SNAPRetailersPage() {
  const [retailers, setRetailers] = useState<SNAPRetailer[]>([]);
  const [flags, setFlags] = useState<SNAPFlag[]>([]);
  const [totalRetailers, setTotalRetailers] = useState(0);
  const [byCity, setByCity] = useState<CitySummary[]>([]);
  const [byType, setByType] = useState<TypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searching, setSearching] = useState(false);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, flagsRes, retailersRes] = await Promise.all([
          fetch('/api/snap?type=summary'),
          fetch('/api/snap?type=flags'),
          fetch('/api/snap?limit=100'),
        ]);

        const summaryData = await summaryRes.json();
        const flagsData = await flagsRes.json();
        const retailersData = await retailersRes.json();

        if (summaryData.success) {
          setTotalRetailers(summaryData.data.totalRetailers);
          setByCity(summaryData.data.byCity || []);
          setByType(summaryData.data.byType || []);
        }

        if (flagsData.success) {
          setFlags(flagsData.data.flags || []);
        }

        if (retailersData.success) {
          setRetailers(retailersData.data.retailers || []);
        }
      } catch (error) {
        console.error('Error fetching SNAP data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchName && !searchCity) return;
    setSearching(true);

    try {
      let url = '/api/snap?type=search';
      if (searchName) url += `&name=${encodeURIComponent(searchName)}`;
      if (searchCity) url += `&city=${encodeURIComponent(searchCity)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setRetailers(data.data.retailers || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const exportToCSV = () => {
    if (retailers.length === 0) return;

    const headers = ['Store Name', 'Address', 'City', 'Zip', 'Store Type', 'County'];
    const rows = retailers.map((r) => [
      r.store_name,
      r.address,
      r.city,
      r.zip5,
      r.store_type || '',
      r.county || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ma-snap-retailers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-amber-200 bg-amber-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-800';
      case 'medium':
        return 'text-amber-800';
      case 'low':
        return 'text-blue-800';
      default:
        return 'text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading SNAP retailer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">SNAP Retailers</h1>
        <p className="mt-2 text-slate-600">
          SNAP-authorized food retailers in Massachusetts. Fake food shelves were a major fraud vector in Minnesota.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Fraud Detection Context</h3>
            <p className="mt-1 text-sm text-amber-700">
              In Minnesota, fraudsters created fake food shelves and grocery stores to bill SNAP for food never distributed.
              Look for: multiple stores at same address, stores at residential addresses, very generic names, and stores
              with no online presence.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="SNAP Retailers"
          value={totalRetailers.toLocaleString()}
          description="Authorized in MA"
          icon={Store}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Store Types"
          value={byType.length.toString()}
          description="Different categories"
          icon={ShoppingCart}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Cities Covered"
          value={byCity.length.toString()}
          description="With SNAP retailers"
          icon={MapPin}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Red Flags"
          value={flags.reduce((sum, f) => sum + f.count, 0).toString()}
          description="Potential issues found"
          icon={Flag}
          iconColor="text-red-600"
        />
      </div>

      {/* Red Flags Section */}
      {flags.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Potential Red Flags
          </h2>
          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.type}
                className={`rounded-lg border ${getSeverityColor(flag.severity)} overflow-hidden`}
              >
                <button
                  onClick={() => setExpandedFlag(expandedFlag === flag.type ? null : flag.type)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-5 w-5 ${getSeverityText(flag.severity)}`} />
                    <div className="text-left">
                      <h3 className={`font-semibold ${getSeverityText(flag.severity)}`}>{flag.title}</h3>
                      <p className="text-sm text-slate-600">{flag.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">{flag.count} items</span>
                    {expandedFlag === flag.type ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedFlag === flag.type && (
                  <div className="px-4 py-3 border-t border-slate-200 bg-white">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium text-slate-700">Store Name</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-700">Address</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-700">City</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-700">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {flag.retailers.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <GoogleSearchLink name={r.store_name} truncateAt={30} />
                              </td>
                              <td className="py-2 px-3 text-slate-600">{r.address}</td>
                              <td className="py-2 px-3 text-slate-600">{r.city}</td>
                              <td className="py-2 px-3 text-slate-600">{r.store_type || '-'}</td>
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
      )}

      {/* Top Cities */}
      {byCity.length > 0 && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Cities by SNAP Retailers</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {byCity.slice(0, 12).map((c) => (
              <button
                key={c.city}
                onClick={() => {
                  setSearchCity(c.city);
                  setSearchName('');
                  handleSearch();
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-sm"
              >
                <span className="font-medium text-slate-900">{c.city}</span>
                <span className="text-slate-500">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search SNAP Retailers
        </h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Store name..."
              className="w-full rounded-lg border border-slate-300 py-2 px-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="City..."
              className="w-full rounded-lg border border-slate-300 py-2 px-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:bg-slate-300"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            onClick={exportToCSV}
            disabled={retailers.length === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900">
            SNAP Retailers ({retailers.length} shown)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Store Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Address</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">City</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Zip</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {retailers.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <GoogleSearchLink name={r.store_name} truncateAt={35} />
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.address}</td>
                  <td className="py-3 px-4 text-slate-600">{r.city}</td>
                  <td className="py-3 px-4 text-slate-600">{r.zip5}</td>
                  <td className="py-3 px-4 text-slate-600">{r.store_type || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Source */}
      <div className="mt-8 text-sm text-slate-500">
        <p>
          Data source:{' '}
          <a
            href="https://www.fns.usda.gov/snap/retailer-locator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            USDA SNAP Retailer Locator
          </a>
        </p>
      </div>
    </div>
  );
}
