'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/stat-card';
import { SpendingBarChart } from '@/components/spending/spending-chart';
import { GoogleSearchLink } from '@/components/ui/google-search-link';
import { formatCompactCurrency } from '@/lib/utils';
import {
  DollarSign,
  AlertTriangle,
  Building2,
  Users,
  Briefcase,
  Flag,
  Landmark,
  Search,
} from 'lucide-react';

interface SpendingSummary {
  totalSpending: number;
  totalTransactions: number;
  topDepartments: { name: string; value: number }[];
  topVendors: { name: string; value: number }[];
  fiscalYear: number;
}

interface PayrollSummary {
  totalPayroll: number;
  totalEmployees: number;
  totalOvertime: number;
  byDepartment: { name: string; value: number; employees: number }[];
  topEarners: { name: string; department: string; title: string; total: number; overtime: number }[];
  fiscalYear: number;
}

interface FederalRecipient {
  name: string;
  amount: number;
}

interface FederalSummary {
  totalAmount: number;
  topRecipients: FederalRecipient[];
  fiscalYear: string;
}

export default function Dashboard() {
  const [bostonData, setBostonData] = useState<SpendingSummary | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollSummary | null>(null);
  const [federalData, setFederalData] = useState<FederalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [spendingRes, payrollRes, federalRes] = await Promise.all([
          fetch('/api/boston/spending?type=summary'),
          fetch('/api/boston/payroll?type=summary'),
          fetch('/api/federal/spending?type=recipients&limit=20&fy=2024'),
        ]);

        const spendingResult = await spendingRes.json();
        const payrollResult = await payrollRes.json();
        const federalResult = await federalRes.json();

        if (spendingResult.success) {
          setBostonData(spendingResult.data);
        } else {
          setError(spendingResult.error || 'Failed to fetch spending data');
        }

        if (payrollResult.success) {
          setPayrollData(payrollResult.data);
        }

        if (federalResult.success && federalResult.data.recipients) {
          const total = federalResult.data.recipients.reduce(
            (sum: number, r: { amount: number }) => sum + r.amount,
            0
          );
          setFederalData({
            totalAmount: total,
            topRecipients: federalResult.data.recipients.map((r: { name: string; amount: number }) => ({
              name: r.name,
              amount: r.amount,
            })),
            fiscalYear: federalResult.data.fiscalYear,
          });
        }
      } catch (err) {
        setError('Failed to connect to API');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const combinedTotal = (bostonData?.totalSpending || 0) + (payrollData?.totalPayroll || 0) + (federalData?.totalAmount || 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Massachusetts Civic Spending Tracker
        </h1>
        <p className="mt-2 text-slate-600">
          Monitor government spending from city, state, and federal sources. Identify anomalies and ensure taxpayer accountability.
        </p>
      </div>

      {/* Alert Banner */}
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">
              Transparency Tool for Citizens
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              This tool aggregates public data from Boston, Massachusetts, and federal open data portals.
              Track spending patterns, identify potential fraud, and hold government accountable across all levels.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading spending data from all sources...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-600" />
          <h3 className="mt-2 font-semibold text-red-800">Error Loading Data</h3>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-2 text-xs text-red-500">
            APIs may be temporarily unavailable. Try refreshing.
          </p>
        </div>
      ) : (
        <>
          {/* Key Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title={`FY${bostonData?.fiscalYear || '25'} Boston`}
              value={bostonData ? formatCompactCurrency(bostonData.totalSpending) : '$0'}
              description="City checkbook spending"
              icon={Building2}
              iconColor="text-blue-600"
            />
            <StatCard
              title="FY24 Boston Payroll"
              value={payrollData ? formatCompactCurrency(payrollData.totalPayroll) : '$0'}
              description={`${payrollData?.totalEmployees.toLocaleString() || 0} employees`}
              icon={Briefcase}
              iconColor="text-slate-600"
            />
            <StatCard
              title="FY24 Federal Grants"
              value={federalData ? formatCompactCurrency(federalData.totalAmount) : '$0'}
              description="Federal grants to MA"
              icon={Flag}
              iconColor="text-green-600"
            />
            <StatCard
              title="FY24 Overtime"
              value={payrollData ? formatCompactCurrency(payrollData.totalOvertime) : '$0'}
              description="Boston employee overtime"
              icon={Users}
              iconColor="text-amber-600"
            />
            <StatCard
              title="Combined Total"
              value={formatCompactCurrency(combinedTotal)}
              description="All tracked spending"
              icon={DollarSign}
              iconColor="text-red-600"
            />
          </div>

          {/* Data Note */}
          <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Multi-source tracking:</strong> Boston Checkbook (FY25), Boston Payroll (FY24 latest),
              Federal Grants (FY24 via USASpending.gov). Use the Audit page to search across all sources for specific keywords.
            </p>
          </div>

          {/* Charts */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {bostonData && (
              <SpendingBarChart
                data={bostonData.topDepartments}
                title={`Boston Top Departments - FY${bostonData.fiscalYear}`}
              />
            )}
            {federalData && federalData.topRecipients.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Flag className="h-5 w-5 text-green-600" />
                  Top Federal Grant Recipients in MA
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {federalData.topRecipients.slice(0, 15).map((recipient, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <GoogleSearchLink name={recipient.name} truncateAt={40} />
                      <span className="font-medium text-slate-900 ml-4 whitespace-nowrap">
                        {formatCompactCurrency(recipient.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Vendors & Top Earners */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {bostonData && (
              <SpendingBarChart
                data={bostonData.topVendors}
                title="Boston Top Vendors Receiving Payments"
              />
            )}
            {payrollData && (
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Top Boston Earners (FY24)
                </h3>
                <div className="space-y-3">
                  {payrollData.topEarners.slice(0, 10).map((emp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.title} - {emp.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{formatCompactCurrency(emp.total)}</p>
                        {emp.overtime > 50000 && (
                          <p className="text-xs text-amber-600">OT: {formatCompactCurrency(emp.overtime)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/boston"
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-3 group-hover:bg-blue-100">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Boston Spending</h3>
                  <p className="text-sm text-slate-500">
                    City checkbook data
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/massachusetts"
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-50 p-3 group-hover:bg-purple-100">
                  <Landmark className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">MA State</h3>
                  <p className="text-sm text-slate-500">
                    State spending data
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/audit"
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-red-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-50 p-3 group-hover:bg-red-100">
                  <Search className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Spending Audit</h3>
                  <p className="text-sm text-slate-500">
                    Search all sources
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/alerts"
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-3 group-hover:bg-amber-100">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Fraud Detection</h3>
                  <p className="text-sm text-slate-500">
                    Anomaly patterns
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Data Sources */}
          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Data Sources</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Boston Checkbook
                </h3>
                <p className="text-sm text-slate-600">
                  <a
                    href="https://data.boston.gov/dataset/checkbook-explorer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Checkbook Explorer
                  </a>
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-600" />
                  Boston Payroll
                </h3>
                <p className="text-sm text-slate-600">
                  <a
                    href="https://data.boston.gov/dataset/employee-earnings-report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Employee Earnings
                  </a>
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-purple-600" />
                  MA State
                </h3>
                <p className="text-sm text-slate-600">
                  <a
                    href="https://cthru.mass.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    CTHRU Checkbook
                  </a>
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                  <Flag className="h-4 w-4 text-green-600" />
                  Federal Grants
                </h3>
                <p className="text-sm text-slate-600">
                  <a
                    href="https://www.usaspending.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    USASpending.gov
                  </a>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
