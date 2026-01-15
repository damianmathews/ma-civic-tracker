import { NextRequest, NextResponse } from 'next/server';

// Analyze Boston data API
const BOSTON_API = 'https://data.boston.gov/api/3/action';

// Real dataset IDs from Analyze Boston - Checkbook Explorer
const CHECKBOOK_DATASETS = {
  fy26: 'd22fdd5c-7e4c-41b7-a3eb-dfc57a87b245',
  fy25: '84dfc1af-28bd-4f17-804a-9cc0c09a237e',
  fy24: '0b7c9c5f-d1c2-46e7-b738-6ab37a110eef',
  fy23: '5ce2ff98-3313-40d2-88bd-47eae9e5a654',
};

// Default to most recent COMPLETE fiscal year for accurate analysis
const CURRENT_FY = 'fy25';
const CURRENT_FY_YEAR = 2025;

// Field names in Boston Checkbook dataset
const FIELDS = {
  department: 'Dept Name',
  vendor: 'Vendor Name',
  amount: 'Monetary Amount',
  date: 'Entered',
  description: 'Account Descr',
  orgName: '6 Digit Org Name',
};

// Helper to run SQL queries against Boston's CKAN API
async function runSQL(sql: string) {
  const url = `${BOSTON_API}/datastore_search_sql?sql=${encodeURIComponent(sql)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.success) {
    return data.result.records;
  }
  throw new Error(data.error?.message || 'SQL query failed');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'summary';
  const limit = parseInt(searchParams.get('limit') || '100');
  const department = searchParams.get('department');
  const fy = searchParams.get('fy') || CURRENT_FY; // Allow fiscal year selection

  const validFY = fy as keyof typeof CHECKBOOK_DATASETS;
  const resourceId = CHECKBOOK_DATASETS[validFY] || CHECKBOOK_DATASETS[CURRENT_FY];
  const fiscalYear = parseInt(fy.replace('fy', '20')) || CURRENT_FY_YEAR;

  try {
    if (type === 'summary') {
      // Use SQL aggregation for accurate totals
      const [totalResult, deptResults, vendorResults, countResult] = await Promise.all([
        // Total spending
        runSQL(`SELECT SUM(CAST("${FIELDS.amount}" AS FLOAT)) as total FROM "${resourceId}"`),
        // By department
        runSQL(`
          SELECT "${FIELDS.department}" as name, SUM(CAST("${FIELDS.amount}" AS FLOAT)) as value
          FROM "${resourceId}"
          GROUP BY "${FIELDS.department}"
          ORDER BY value DESC
          LIMIT 15
        `),
        // By vendor
        runSQL(`
          SELECT "${FIELDS.vendor}" as name, SUM(CAST("${FIELDS.amount}" AS FLOAT)) as value
          FROM "${resourceId}"
          GROUP BY "${FIELDS.vendor}"
          ORDER BY value DESC
          LIMIT 15
        `),
        // Total count
        runSQL(`SELECT COUNT(*) as count FROM "${resourceId}"`),
      ]);

      const totalSpending = totalResult[0]?.total || 0;
      const totalTransactions = countResult[0]?.count || 0;

      const topDepartments = deptResults.map((r: { name: string; value: number }) => ({
        name: r.name || 'Unknown',
        value: Number(r.value) || 0,
      }));

      const topVendors = vendorResults.map((r: { name: string; value: number }) => ({
        name: r.name || 'Unknown',
        value: Number(r.value) || 0,
      }));

      return NextResponse.json({
        success: true,
        data: {
          totalSpending,
          totalTransactions,
          topDepartments,
          topVendors,
          fiscalYear,
        },
      });
    }

    if (type === 'transactions') {
      // Get raw transaction data with optional filters
      let sql = `
        SELECT "${FIELDS.department}" as department,
               "${FIELDS.vendor}" as vendor,
               "${FIELDS.amount}" as amount,
               "${FIELDS.date}" as date,
               "${FIELDS.description}" as description
        FROM "${resourceId}"
      `;

      if (department) {
        sql += ` WHERE "${FIELDS.department}" = '${department.replace(/'/g, "''")}'`;
      }

      sql += ` ORDER BY CAST("${FIELDS.amount}" AS FLOAT) DESC LIMIT ${limit}`;

      const records = await runSQL(sql);

      const transactions = records.map((r: Record<string, unknown>) => ({
        department: r.department || 'Unknown',
        vendor: r.vendor || 'Unknown',
        amount: parseFloat(String(r.amount || '0')),
        date: r.date || '',
        description: r.description || '',
      }));

      // Get total count for this filter
      let countSql = `SELECT COUNT(*) as count FROM "${resourceId}"`;
      if (department) {
        countSql += ` WHERE "${FIELDS.department}" = '${department.replace(/'/g, "''")}'`;
      }
      const countResult = await runSQL(countSql);

      return NextResponse.json({
        success: true,
        data: {
          transactions,
          total: countResult[0]?.count || transactions.length,
        },
      });
    }

    if (type === 'departments') {
      // List all departments with their totals
      const results = await runSQL(`
        SELECT DISTINCT "${FIELDS.department}" as name
        FROM "${resourceId}"
        WHERE "${FIELDS.department}" IS NOT NULL
        ORDER BY "${FIELDS.department}"
      `);

      const departments = results.map((r: { name: string }) => r.name).filter(Boolean);

      return NextResponse.json({
        success: true,
        data: {
          departments,
        },
      });
    }

    if (type === 'large_payments') {
      // Get payments over a threshold for anomaly detection
      const threshold = parseInt(searchParams.get('threshold') || '1000000');

      const records = await runSQL(`
        SELECT "${FIELDS.department}" as department,
               "${FIELDS.vendor}" as vendor,
               "${FIELDS.amount}" as amount,
               "${FIELDS.date}" as date,
               "${FIELDS.description}" as description
        FROM "${resourceId}"
        WHERE CAST("${FIELDS.amount}" AS FLOAT) > ${threshold}
        ORDER BY CAST("${FIELDS.amount}" AS FLOAT) DESC
        LIMIT 100
      `);

      return NextResponse.json({
        success: true,
        data: {
          transactions: records.map((r: Record<string, unknown>) => ({
            department: r.department,
            vendor: r.vendor,
            amount: parseFloat(String(r.amount || '0')),
            date: r.date,
            description: r.description,
          })),
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid type parameter',
    });
  } catch (error) {
    console.error('Boston API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data: ' + (error instanceof Error ? error.message : 'Unknown error'),
    });
  }
}
