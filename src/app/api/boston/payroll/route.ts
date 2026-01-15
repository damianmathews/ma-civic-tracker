import { NextRequest, NextResponse } from 'next/server';

// Analyze Boston data API
const BOSTON_API = 'https://data.boston.gov/api/3/action';

// Employee Earnings Report dataset IDs
const PAYROLL_DATASETS = {
  fy24: '579a4be3-9ca7-4183-bc95-7d67ee715b6d',
  fy23: '6b3c5333-1dcb-4b3d-9cd7-6a03fb526da7',
};

// Helper to run SQL queries
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

  const resourceId = PAYROLL_DATASETS.fy24; // Most recent available

  try {
    if (type === 'summary') {
      const [totalResult, deptResults, topEarnersResult] = await Promise.all([
        // Total payroll - need to handle currency format with $ and commas
        runSQL(`
          SELECT
            SUM(CAST(REPLACE(REPLACE("TOTAL GROSS",'$',''),',','') AS FLOAT)) as total,
            COUNT(*) as employees,
            SUM(CAST(REPLACE(REPLACE("OVERTIME",'$',''),',','') AS FLOAT)) as overtime
          FROM "${resourceId}"
        `),
        // By department
        runSQL(`
          SELECT
            "DEPARTMENT_NAME" as name,
            SUM(CAST(REPLACE(REPLACE("TOTAL GROSS",'$',''),',','') AS FLOAT)) as value,
            COUNT(*) as employees
          FROM "${resourceId}"
          GROUP BY "DEPARTMENT_NAME"
          ORDER BY value DESC
          LIMIT 15
        `),
        // Top earners
        runSQL(`
          SELECT
            "NAME" as name,
            "DEPARTMENT_NAME" as department,
            "TITLE" as title,
            CAST(REPLACE(REPLACE("TOTAL GROSS",'$',''),',','') AS FLOAT) as total,
            CAST(REPLACE(REPLACE("OVERTIME",'$',''),',','') AS FLOAT) as overtime
          FROM "${resourceId}"
          ORDER BY CAST(REPLACE(REPLACE("TOTAL GROSS",'$',''),',','') AS FLOAT) DESC
          LIMIT 20
        `),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          totalPayroll: totalResult[0]?.total || 0,
          totalEmployees: totalResult[0]?.employees || 0,
          totalOvertime: totalResult[0]?.overtime || 0,
          byDepartment: deptResults.map((r: { name: string; value: number; employees: number }) => ({
            name: r.name || 'Unknown',
            value: Number(r.value) || 0,
            employees: Number(r.employees) || 0,
          })),
          topEarners: topEarnersResult.map((r: Record<string, unknown>) => ({
            name: r.name,
            department: r.department,
            title: r.title,
            total: Number(r.total) || 0,
            overtime: Number(r.overtime) || 0,
          })),
          fiscalYear: 2024,
        },
      });
    }

    if (type === 'employees') {
      let sql = `
        SELECT
          "NAME" as name,
          "DEPARTMENT_NAME" as department,
          "TITLE" as title,
          CAST(REPLACE(REPLACE("REGULAR",'$',''),',','') AS FLOAT) as regular,
          CAST(REPLACE(REPLACE("OVERTIME",'$',''),',','') AS FLOAT) as overtime,
          CAST(REPLACE(REPLACE("TOTAL GROSS",'$',''),',','') AS FLOAT) as total
        FROM "${resourceId}"
      `;

      if (department) {
        sql += ` WHERE "DEPARTMENT_NAME" = '${department.replace(/'/g, "''")}'`;
      }

      sql += ` ORDER BY CAST(REPLACE(REPLACE("TOTAL GROSS",'$',''),',','') AS FLOAT) DESC LIMIT ${limit}`;

      const records = await runSQL(sql);

      return NextResponse.json({
        success: true,
        data: {
          employees: records.map((r: Record<string, unknown>) => ({
            name: r.name,
            department: r.department,
            title: r.title,
            regular: Number(r.regular) || 0,
            overtime: Number(r.overtime) || 0,
            total: Number(r.total) || 0,
          })),
        },
      });
    }

    if (type === 'overtime') {
      // High overtime earners - potential abuse flag
      const records = await runSQL(`
        SELECT
          "NAME" as name,
          "DEPARTMENT_NAME" as department,
          "TITLE" as title,
          CAST(REPLACE(REPLACE("REGULAR",'$',''),',','') AS FLOAT) as regular,
          CAST(REPLACE(REPLACE("OVERTIME",'$',''),',','') AS FLOAT) as overtime,
          CAST(REPLACE(REPLACE("TOTAL GROSS",'$',''),',','') AS FLOAT) as total
        FROM "${resourceId}"
        WHERE CAST(REPLACE(REPLACE("OVERTIME",'$',''),',','') AS FLOAT) > 50000
        ORDER BY CAST(REPLACE(REPLACE("OVERTIME",'$',''),',','') AS FLOAT) DESC
        LIMIT 100
      `);

      return NextResponse.json({
        success: true,
        data: {
          employees: records.map((r: Record<string, unknown>) => ({
            name: r.name,
            department: r.department,
            title: r.title,
            regular: Number(r.regular) || 0,
            overtime: Number(r.overtime) || 0,
            total: Number(r.total) || 0,
          })),
        },
      });
    }

    if (type === 'departments') {
      const results = await runSQL(`
        SELECT DISTINCT "DEPARTMENT_NAME" as name
        FROM "${resourceId}"
        WHERE "DEPARTMENT_NAME" IS NOT NULL
        ORDER BY "DEPARTMENT_NAME"
      `);

      return NextResponse.json({
        success: true,
        data: {
          departments: results.map((r: { name: string }) => r.name).filter(Boolean),
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid type parameter',
    });
  } catch (error) {
    console.error('Payroll API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payroll data',
    });
  }
}
