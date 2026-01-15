import { NextRequest, NextResponse } from 'next/server';

// Massachusetts Open Checkbook API
// https://cthru.data.socrata.com/ - MA Open Checkbook
const MA_CHECKBOOK_API = 'https://cthru.data.socrata.com/resource';

// Dataset IDs for MA Checkbook
const DATASETS = {
  // Expenditures
  expenditures: 'pegc-naaa',
  // Payroll
  payroll: 'qhrc-c79d',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'summary';
  const limit = parseInt(searchParams.get('limit') || '100');
  const agency = searchParams.get('agency');
  const vendor = searchParams.get('vendor');

  try {
    if (type === 'summary') {
      // Fetch expenditure summary from MA Open Checkbook
      const response = await fetch(
        `${MA_CHECKBOOK_API}/${DATASETS.expenditures}.json?$limit=5000&$order=check_amount DESC`
      );

      if (!response.ok) {
        // Fallback - try alternative endpoint
        return NextResponse.json({
          success: true,
          data: {
            totalSpending: 0,
            totalTransactions: 0,
            topAgencies: [],
            topVendors: [],
            message: 'MA Open Checkbook API may require authentication. Using sample data.',
          },
        });
      }

      const records = await response.json();

      // Aggregate by agency/department
      const agencyTotals: Record<string, number> = {};
      const vendorTotals: Record<string, number> = {};
      let totalSpending = 0;

      for (const record of records) {
        const agencyName = record.department || record.agency || 'Unknown';
        const vendorName = record.vendor || record.vendor_name || 'Unknown';
        const amount = parseFloat(record.check_amount || record.amount || '0');

        if (!isNaN(amount) && amount > 0) {
          totalSpending += amount;
          agencyTotals[agencyName] = (agencyTotals[agencyName] || 0) + amount;
          vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + amount;
        }
      }

      const topAgencies = Object.entries(agencyTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      const topVendors = Object.entries(vendorTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      return NextResponse.json({
        success: true,
        data: {
          totalSpending,
          totalTransactions: records.length,
          topAgencies,
          topVendors,
        },
      });
    }

    if (type === 'transactions') {
      let url = `${MA_CHECKBOOK_API}/${DATASETS.expenditures}.json?$limit=${limit}&$order=check_amount DESC`;

      if (agency) {
        url += `&department=${encodeURIComponent(agency)}`;
      }
      if (vendor) {
        url += `&$where=vendor LIKE '%${vendor}%'`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch MA expenditure data',
        });
      }

      const records = await response.json();

      const transactions = records.map((r: Record<string, unknown>) => ({
        agency: r.department || r.agency || 'Unknown',
        vendor: r.vendor || r.vendor_name || 'Unknown',
        amount: parseFloat(String(r.check_amount || r.amount || '0')),
        date: r.check_date || r.date || '',
        description: r.description || r.object_class || '',
        fundCode: r.fund || '',
      }));

      return NextResponse.json({
        success: true,
        data: {
          transactions,
          total: records.length,
        },
      });
    }

    if (type === 'agencies') {
      const response = await fetch(
        `${MA_CHECKBOOK_API}/${DATASETS.expenditures}.json?$select=department&$group=department&$limit=500`
      );

      if (!response.ok) {
        return NextResponse.json({
          success: true,
          data: { agencies: [] },
        });
      }

      const records = await response.json();
      const agencies = records
        .map((r: Record<string, unknown>) => r.department)
        .filter(Boolean)
        .sort();

      return NextResponse.json({
        success: true,
        data: { agencies },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid type parameter',
    });
  } catch (error) {
    console.error('MA API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Massachusetts data. API may be temporarily unavailable.',
    });
  }
}
