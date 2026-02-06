import { NextRequest, NextResponse } from 'next/server';

// Massachusetts Open Checkbook API (CTHRU)
// https://cthru.data.socrata.com/
const MA_CHECKBOOK_API = 'https://cthru.data.socrata.com/resource';

// Dataset IDs for MA Checkbook
const DATASETS = {
  expenditures: 'pegc-naaa',
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
        `${MA_CHECKBOOK_API}/${DATASETS.expenditures}.json?$limit=5000&$order=amount DESC`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('MA API response not ok:', response.status, response.statusText);
        return NextResponse.json({
          success: true,
          data: {
            totalSpending: 0,
            totalTransactions: 0,
            topAgencies: [],
            topVendors: [],
            message: 'MA Open Checkbook API temporarily unavailable.',
          },
        });
      }

      const records = await response.json();

      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            totalSpending: 0,
            totalTransactions: 0,
            topAgencies: [],
            topVendors: [],
            message: 'No records returned from MA Open Checkbook API.',
          },
        });
      }

      // Aggregate by agency/department
      const agencyTotals: Record<string, number> = {};
      const vendorTotals: Record<string, number> = {};
      let totalSpending = 0;

      for (const record of records) {
        const agencyName = record.department || record.cabinet_secretariat || 'Unknown';
        const vendorName = record.vendor || 'Unknown';
        const amount = parseFloat(record.amount || '0');

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
      let url = `${MA_CHECKBOOK_API}/${DATASETS.expenditures}.json?$limit=${limit}&$order=amount DESC`;

      if (agency) {
        url += `&$where=department='${encodeURIComponent(agency)}'`;
      }
      if (vendor) {
        const whereClause = agency
          ? ` AND upper(vendor) LIKE upper('%${vendor}%')`
          : `&$where=upper(vendor) LIKE upper('%${vendor}%')`;
        url += whereClause;
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch MA expenditure data',
        });
      }

      const records = await response.json();

      const transactions = records.map((r: Record<string, unknown>) => ({
        agency: r.department || r.cabinet_secretariat || 'Unknown',
        vendor: r.vendor || 'Unknown',
        amount: parseFloat(String(r.amount || '0')),
        date: r.date || '',
        description: r.appropriation_name || r.object_class || '',
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
        `${MA_CHECKBOOK_API}/${DATASETS.expenditures}.json?$select=department&$group=department&$limit=500`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
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

    if (type === 'vendors') {
      // Get top vendors for cross-reference
      const response = await fetch(
        `${MA_CHECKBOOK_API}/${DATASETS.expenditures}.json?$select=vendor,sum(amount) as total&$group=vendor&$order=total DESC&$limit=${limit}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json({
          success: true,
          data: { vendors: [] },
        });
      }

      const records = await response.json();
      const vendors = records.map((r: Record<string, unknown>) => ({
        name: r.vendor,
        value: parseFloat(String(r.total || '0')),
      }));

      return NextResponse.json({
        success: true,
        data: { vendors },
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
