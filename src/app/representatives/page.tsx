'use client';

import { useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import {
  Users,
  Search,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Building2,
} from 'lucide-react';

interface Representative {
  name: string;
  title: string;
  party: string;
  district: string;
  chamber: string;
  email?: string;
  phone?: string;
  website?: string;
}

// Sample MA representatives data - in production would come from OpenStates API
const sampleRepresentatives: Representative[] = [
  {
    name: 'Karen E. Spilka',
    title: 'Senate President',
    party: 'Democratic',
    district: '2nd Middlesex and Norfolk',
    chamber: 'Senate',
    website: 'https://malegislature.gov/Legislators/Profile/KES0',
  },
  {
    name: 'Ronald Mariano',
    title: 'Speaker of the House',
    party: 'Democratic',
    district: '3rd Norfolk',
    chamber: 'House',
    website: 'https://malegislature.gov/Legislators/Profile/RJM1',
  },
  {
    name: 'Michelle Wu',
    title: 'Mayor of Boston',
    party: 'Democratic',
    district: 'City of Boston',
    chamber: 'Executive',
    website: 'https://www.boston.gov/departments/mayors-office',
  },
];

export default function Representatives() {
  const [address, setAddress] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Representative[] | null>(null);

  const handleSearch = async () => {
    if (!address.trim()) return;

    setSearching(true);
    // Simulate API call - in production would use Google Civic Info API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setResults(sampleRepresentatives);
    setSearching(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Find Your Representatives</h1>
        <p className="mt-2 text-slate-600">
          Look up your elected officials at the state and local level. Contact them about spending concerns.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Enter Your Massachusetts Address
        </h2>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="123 Main St, Boston, MA 02108"
              className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !address.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {searching ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find Representatives
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Note: Representative lookup requires a Google Civic Information API key for full functionality.
        </p>
      </div>

      {/* Results */}
      {results && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Representatives</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((rep, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-white p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{rep.name}</h3>
                    <p className="text-sm text-slate-600">{rep.title}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      rep.party === 'Democratic'
                        ? 'bg-blue-100 text-blue-800'
                        : rep.party === 'Republican'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {rep.party.charAt(0)}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {rep.chamber}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {rep.district}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  {rep.website && (
                    <a
                      href={rep.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Website
                    </a>
                  )}
                  {rep.email && (
                    <a
                      href={`mailto:${rep.email}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                  )}
                  {rep.phone && (
                    <a
                      href={`tel:${rep.phone}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      Call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Officials */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Key Massachusetts Officials</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="https://www.mass.gov/orgs/office-of-the-governor"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-slate-900">Governor</h3>
            <p className="text-sm text-slate-600">Maura Healey</p>
            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
              Visit Office <ExternalLink className="h-3 w-3" />
            </p>
          </a>

          <a
            href="https://www.mass.gov/orgs/office-of-state-auditor-diana-dizoglio"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-slate-900">State Auditor</h3>
            <p className="text-sm text-slate-600">Diana DiZoglio</p>
            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
              Report Concerns <ExternalLink className="h-3 w-3" />
            </p>
          </a>

          <a
            href="https://www.mass.gov/orgs/office-of-the-inspector-general"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-slate-900">Inspector General</h3>
            <p className="text-sm text-slate-600">Jeffrey Shapiro</p>
            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
              File Complaint <ExternalLink className="h-3 w-3" />
            </p>
          </a>
        </div>
      </div>

      {/* How to Report */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          How to Report Suspected Fraud or Waste
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="font-medium text-slate-900">Massachusetts Inspector General</h3>
            <p className="text-sm text-slate-600 mt-1">
              The Office of the Inspector General investigates fraud, waste, and abuse in government.
            </p>
            <a
              href="https://www.mass.gov/how-to/file-a-complaint-with-the-office-of-the-inspector-general"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              File a Complaint <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <h3 className="font-medium text-slate-900">State Auditor&apos;s Office</h3>
            <p className="text-sm text-slate-600 mt-1">
              The State Auditor audits government spending and investigates waste.
            </p>
            <a
              href="https://www.mass.gov/orgs/office-of-state-auditor-diana-dizoglio"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              Contact Auditor <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <h3 className="font-medium text-slate-900">Boston City Hotline</h3>
            <p className="text-sm text-slate-600 mt-1">
              Report fraud, waste, or abuse in Boston city government.
            </p>
            <p className="mt-2 text-sm text-slate-900">Call: 617-635-4500</p>
          </div>

          <div>
            <h3 className="font-medium text-slate-900">FBI Boston</h3>
            <p className="text-sm text-slate-600 mt-1">
              For serious federal crimes including public corruption.
            </p>
            <a
              href="https://www.fbi.gov/contact-us/field-offices/boston"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              FBI Boston Office <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
