'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/stat-card';
import { SpendingBarChart } from '@/components/spending/spending-chart';
import { formatCompactCurrency } from '@/lib/utils';
import {
  DollarSign,
  AlertTriangle,
  Building2,
  FileText,
  Users,
  Briefcase,
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

export default function Dashboard() {
  const [bostonData, setBostonData] = useState<SpendingSummary | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [spendingRes, payrollRes] = await Promise.all([
          fetch('/api/boston/spending?type=summary'),
          fetch('/api/boston/payroll?type=summary'),
        ]);

        const spendingResult = await spendingRes.json();
        const payrollResult = await payrollRes.json();

        if (spendingResult.success) {
          setBostonData(spendingResult.data);
        } else {
          setError(spendingResult.error || 'Failed to fetch spending data');
        }

        if (payrollResult.success) {
          setPayrollData(payrollResult.data);
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

  const combinedTotal = (bostonData?.totalSpending || 0) + (payrollData?.totalPayroll || 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Massachusetts Civic Spending Tracker
        </h1>
        <p className="mt-2 text-slate-600">
          Monitor government spending, identify anomalies, and ensure taxpayer accountability.
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
              This tool aggregates public data from Boston and Massachusetts open data portals.
              Use it to track spending patterns, identify potential anomalies, and hold government accountable.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading spending data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-600" />
          <h3 className="mt-2 font-semibold text-red-800">Error Loading Data</h3>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-2 text-xs text-red-500">
            Boston&apos;s API may be temporarily unavailable. Try refreshing.
          </p>
        </div>
      ) : (
        <>
          {/* Key Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={`FY${bostonData?.fiscalYear || '25'} Checkbook`}
              value={bostonData ? formatCompactCurrency(bostonData.totalSpending) : '$0'}
              description={`${bostonData?.totalTransactions.toLocaleString() || 0} transactions (complete year)`}
              icon={DollarSign}
            />
            <StatCard
              title="FY24 Payroll"
              value={payrollData ? formatCompactCurrency(payrollData.totalPayroll) : '$0'}
              description={`${payrollData?.totalEmployees.toLocaleString() || 0} employees (latest available)`}
              icon={Briefcase}
            />
            <StatCard
              title="FY24 Overtime"
              value={payrollData ? formatCompactCurrency(payrollData.totalOvertime) : '$0'}
              description="Total overtime (latest available)"
              icon={Users}
            />
            <StatCard
              title="Combined Spending"
              value={formatCompactCurrency(combinedTotal)}
              description="Checkbook + Payroll"
              icon={Building2}
            />
          </div>

          {/* Data Note */}
          <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Why different fiscal years?</strong> Boston&apos;s Checkbook data is current through FY25 (complete),
              but the Employee Earnings Report is only available through FY24 - the city hasn&apos;t released FY25 payroll yet.
              The Checkbook excludes payroll and independent agencies. Combined: FY25 checkbook $2.97B + FY24 payroll $2.42B.
            </p>
          </div>

          {/* Charts */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {bostonData && (
              <SpendingBarChart
                data={bostonData.topDepartments}
                title={`Top Departments - FY${bostonData.fiscalYear} Checkbook`}
              />
            )}
            {payrollData && (
              <SpendingBarChart
                data={payrollData.byDepartment.map(d => ({ name: d.name, value: d.value }))}
                title={`Top Departments - FY${payrollData.fiscalYear} Payroll`}
              />
            )}
          </div>

          {/* Top Vendors & Top Earners */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {bostonData && (
              <SpendingBarChart
                data={bostonData.topVendors}
                title="Top Vendors Receiving Payments"
              />
            )}
            {payrollData && (
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Top Earners (FY24)
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    Detailed city checkbook data
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Search transactions by department, vendor, amount. Identify large payments and patterns.
              </p>
            </Link>

            <Link
              href="/massachusetts"
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-3 group-hover:bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">MA State Spending</h3>
                  <p className="text-sm text-slate-500">
                    Statewide contracts & grants
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Track state agency expenditures, welfare programs, and contractor payments.
              </p>
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
                  <h3 className="font-semibold text-slate-900">Anomaly Detection</h3>
                  <p className="text-sm text-slate-500">
                    Flag suspicious patterns
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Automatic detection of unusual spending, duplicate payments, and outliers.
              </p>
            </Link>
          </div>

          {/* Data Sources */}
          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Data Sources</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <h3 className="font-medium text-slate-900">Boston Checkbook</h3>
                <p className="text-sm text-slate-600">
                  Non-payroll expenditures from{' '}
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
                <h3 className="font-medium text-slate-900">Boston Payroll</h3>
                <p className="text-sm text-slate-600">
                  Employee earnings from{' '}
                  <a
                    href="https://data.boston.gov/dataset/employee-earnings-report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Employee Earnings Report
                  </a>
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Massachusetts</h3>
                <p className="text-sm text-slate-600">
                  State spending from{' '}
                  <a
                    href="https://cthru.data.socrata.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    MA Open Checkbook
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
