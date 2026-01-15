'use client';

import { formatCurrency, formatDate, truncate } from '@/lib/utils';
import { GoogleSearchLink } from '@/components/ui/google-search-link';

interface SpendingRecord {
  department: string;
  vendor: string;
  amount: number;
  date: string;
  description?: string;
}

interface SpendingTableProps {
  data: SpendingRecord[];
  title: string;
  isLoading?: boolean;
}

export function SpendingTable({ data, title, isLoading }: SpendingTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                Vendor
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-600">
                  No spending records found
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {truncate(record.department, 30)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <GoogleSearchLink name={record.vendor} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {record.date ? formatDate(record.date) : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data.length > 0 && (
        <div className="border-t border-slate-200 px-6 py-3 text-sm text-slate-600">
          Showing {data.length} records
        </div>
      )}
    </div>
  );
}
