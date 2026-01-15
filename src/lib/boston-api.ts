// Boston Open Data API (Analyze Boston)
// Data source: https://data.boston.gov/

const BOSTON_DATA_BASE = 'https://data.boston.gov/api/3/action';

// Known dataset IDs from Analyze Boston
const DATASETS = {
  // City checkbook - actual spending
  checkbook: '7f43a3e4-b47b-4c2e-9e63-f8b4f0c87c08',
  // Operating budget
  operatingBudget: '8b7e6c2d-1a3f-4d5e-9c8b-0a1b2c3d4e5f',
  // Contracts
  contracts: 'contracts',
} as const;

interface SocrataResponse {
  success: boolean;
  result: {
    records: Record<string, unknown>[];
    total: number;
    fields: { id: string; type: string }[];
  };
}

export async function fetchBostonCheckbook(params: {
  limit?: number;
  offset?: number;
  department?: string;
  vendor?: string;
  fiscalYear?: number;
}): Promise<{ records: Record<string, unknown>[]; total: number }> {
  const { limit = 100, offset = 0, department, vendor, fiscalYear } = params;

  // Build SQL query for the CKAN datastore
  let sql = `SELECT * FROM "${DATASETS.checkbook}"`;
  const conditions: string[] = [];

  if (department) {
    conditions.push(`"Department Name" LIKE '%${department}%'`);
  }
  if (vendor) {
    conditions.push(`"Vendor Name" LIKE '%${vendor}%'`);
  }
  if (fiscalYear) {
    conditions.push(`"Fiscal Year" = ${fiscalYear}`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` ORDER BY "Amount" DESC LIMIT ${limit} OFFSET ${offset}`;

  const url = `${BOSTON_DATA_BASE}/datastore_search_sql?sql=${encodeURIComponent(sql)}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as SocrataResponse;

    if (data.success) {
      return {
        records: data.result.records,
        total: data.result.total || data.result.records.length,
      };
    }
    return { records: [], total: 0 };
  } catch (error) {
    console.error('Error fetching Boston checkbook:', error);
    return { records: [], total: 0 };
  }
}

export async function fetchBostonBudget(fiscalYear?: number): Promise<{
  records: Record<string, unknown>[];
  total: number;
}> {
  // Fetch budget data from Analyze Boston
  const url = `${BOSTON_DATA_BASE}/datastore_search?resource_id=${DATASETS.operatingBudget}&limit=1000`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as SocrataResponse;

    if (data.success) {
      let records = data.result.records;
      if (fiscalYear) {
        records = records.filter(
          (r) => r['Fiscal Year'] === fiscalYear || r['fiscal_year'] === fiscalYear
        );
      }
      return { records, total: records.length };
    }
    return { records: [], total: 0 };
  } catch (error) {
    console.error('Error fetching Boston budget:', error);
    return { records: [], total: 0 };
  }
}

export async function fetchDepartmentSummary(): Promise<
  { department: string; total: number }[]
> {
  const sql = `
    SELECT "Department Name" as department, SUM(CAST("Amount" AS FLOAT)) as total
    FROM "${DATASETS.checkbook}"
    GROUP BY "Department Name"
    ORDER BY total DESC
    LIMIT 20
  `;

  const url = `${BOSTON_DATA_BASE}/datastore_search_sql?sql=${encodeURIComponent(sql)}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as SocrataResponse;

    if (data.success) {
      return data.result.records.map((r) => ({
        department: String(r.department || 'Unknown'),
        total: Number(r.total) || 0,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching department summary:', error);
    return [];
  }
}

export async function fetchVendorSummary(): Promise<
  { vendor: string; total: number }[]
> {
  const sql = `
    SELECT "Vendor Name" as vendor, SUM(CAST("Amount" AS FLOAT)) as total
    FROM "${DATASETS.checkbook}"
    GROUP BY "Vendor Name"
    ORDER BY total DESC
    LIMIT 20
  `;

  const url = `${BOSTON_DATA_BASE}/datastore_search_sql?sql=${encodeURIComponent(sql)}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as SocrataResponse;

    if (data.success) {
      return data.result.records.map((r) => ({
        vendor: String(r.vendor || 'Unknown'),
        total: Number(r.total) || 0,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching vendor summary:', error);
    return [];
  }
}

// Get available dataset info
export async function getDatasetInfo(resourceId: string): Promise<unknown> {
  const url = `${BOSTON_DATA_BASE}/resource_show?id=${resourceId}`;

  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching dataset info:', error);
    return null;
  }
}
