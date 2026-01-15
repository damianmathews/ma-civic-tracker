import { NextRequest, NextResponse } from 'next/server';

const EEC_API = 'https://educationtocareer.data.mass.gov/resource/iyks-y3g6.json';

interface ChildcareProvider {
  provider_number: string;
  program_name: string;
  program_umbrella?: string;
  program_street_address1: string;
  program_city: string;
  program_zipcode: string;
  program_phone?: string;
  licensing_region: string;
  subsidy_region: string;
  program_type: string;
  licensed_funded: string;
  licensed_provider_status: string;
  first_issued_date?: string;
  licensed_capacity?: string;
  voucher_contract?: boolean;
  c3_attestation?: string;
  coi_cat?: string;
  // Age group capacities
  infant_birth15mo?: string;
  infant_toddler_birth33mo?: string;
  toddler_15mo33mo?: string;
  preschool_33mok?: string;
  preschoolsa_33mo8yr?: string;
  schoolage_57yr?: string;
  schoolage_5yr14yr?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'providers';
  const city = searchParams.get('city');
  const subsidyOnly = searchParams.get('subsidy') === 'true';
  const limit = parseInt(searchParams.get('limit') || '1000');

  try {
    if (type === 'summary') {
      // Get summary stats
      const [totalRes, subsidyRes, typeRes, statusRes] = await Promise.all([
        fetch(`${EEC_API}?$select=count(*)`),
        fetch(`${EEC_API}?$select=count(*)&$where=voucher_contract=true`),
        fetch(`${EEC_API}?$select=program_type,count(*)&$group=program_type`),
        fetch(`${EEC_API}?$select=licensed_provider_status,count(*)&$group=licensed_provider_status`),
      ]);

      const totalData = await totalRes.json();
      const subsidyData = await subsidyRes.json();
      const typeData = await typeRes.json();
      const statusData = await statusRes.json();

      return NextResponse.json({
        success: true,
        data: {
          totalProviders: parseInt(totalData[0]?.count || '0'),
          acceptingSubsidy: parseInt(subsidyData[0]?.count || '0'),
          byType: typeData.map((t: Record<string, string>) => ({
            type: t.program_type,
            count: parseInt(t.count),
          })),
          byStatus: statusData.map((s: Record<string, string>) => ({
            status: s.licensed_provider_status,
            count: parseInt(s.count),
          })),
        },
      });
    }

    if (type === 'flags') {
      // Get potential red flags
      const flags: {
        type: string;
        severity: 'high' | 'medium' | 'low';
        title: string;
        description: string;
        providers: ChildcareProvider[];
        count: number;
      }[] = [];

      // 1. Providers with expired/suspended status still in system
      const statusIssuesRes = await fetch(
        `${EEC_API}?$where=licensed_provider_status NOT IN ('Current', 'Renewal in progress')&$limit=100`
      );
      const statusIssues = await statusIssuesRes.json();
      if (statusIssues.length > 0) {
        flags.push({
          type: 'license_status',
          severity: 'high',
          title: 'Non-Current License Status',
          description: `${statusIssues.length} providers have license status that is not "Current" or "Renewal in progress"`,
          providers: statusIssues.slice(0, 20),
          count: statusIssues.length,
        });
      }

      // 2. Very high capacity providers (potential overbilling)
      const highCapacityRes = await fetch(
        `${EEC_API}?$where=licensed_capacity > 200&voucher_contract=true&$order=licensed_capacity DESC&$limit=50`
      );
      const highCapacity = await highCapacityRes.json();
      if (highCapacity.length > 0) {
        flags.push({
          type: 'high_capacity',
          severity: 'medium',
          title: 'Very High Capacity Subsidy Providers',
          description: `${highCapacity.length} subsidy providers with capacity over 200 children`,
          providers: highCapacity.slice(0, 20),
          count: highCapacity.length,
        });
      }

      // 3. Family childcare with unusually high capacity
      const familyHighCapRes = await fetch(
        `${EEC_API}?$where=program_type='Family Child Care' AND licensed_capacity > 10&$order=licensed_capacity DESC&$limit=50`
      );
      const familyHighCap = await familyHighCapRes.json();
      if (familyHighCap.length > 0) {
        flags.push({
          type: 'family_high_capacity',
          severity: 'medium',
          title: 'Family Childcare with High Capacity',
          description: `${familyHighCap.length} family childcare providers with capacity over 10 (unusual for home-based care)`,
          providers: familyHighCap.slice(0, 20),
          count: familyHighCap.length,
        });
      }

      // 4. Get all providers to check for duplicate addresses
      const allProvidersRes = await fetch(`${EEC_API}?$select=program_street_address1,program_city,count(*)&$group=program_street_address1,program_city&$having=count(*)>2&$order=count(*) DESC&$limit=50`);
      const duplicateAddresses = await allProvidersRes.json();

      if (duplicateAddresses.length > 0) {
        // Get details for top duplicate addresses
        const topDupe = duplicateAddresses[0];
        if (topDupe) {
          const dupeDetailsRes = await fetch(
            `${EEC_API}?$where=program_street_address1='${encodeURIComponent(topDupe.program_street_address1)}' AND program_city='${encodeURIComponent(topDupe.program_city)}'`
          );
          const dupeDetails = await dupeDetailsRes.json();

          flags.push({
            type: 'duplicate_address',
            severity: 'high',
            title: 'Multiple Providers at Same Address',
            description: `${duplicateAddresses.length} addresses have multiple childcare providers registered`,
            providers: dupeDetails,
            count: duplicateAddresses.length,
          });
        }
      }

      // 5. Very old providers without recent attestation
      const oldNoAttestRes = await fetch(
        `${EEC_API}?$where=voucher_contract=true AND c3_attestation IS NULL AND first_issued_date < '2000-01-01'&$limit=50`
      );
      const oldNoAttest = await oldNoAttestRes.json();
      if (oldNoAttest.length > 0) {
        flags.push({
          type: 'missing_attestation',
          severity: 'low',
          title: 'Subsidy Providers Missing C3 Attestation',
          description: `${oldNoAttest.length} long-established subsidy providers have not completed C3 attestation`,
          providers: oldNoAttest.slice(0, 20),
          count: oldNoAttest.length,
        });
      }

      return NextResponse.json({
        success: true,
        data: { flags },
      });
    }

    if (type === 'cities') {
      const citiesRes = await fetch(
        `${EEC_API}?$select=program_city,count(*)&$group=program_city&$order=count(*) DESC&$limit=100`
      );
      const cities = await citiesRes.json();

      return NextResponse.json({
        success: true,
        data: {
          cities: cities.map((c: Record<string, string>) => ({
            city: c.program_city,
            count: parseInt(c.count),
          })),
        },
      });
    }

    // Default: Get providers list
    let url = `${EEC_API}?$limit=${limit}&$order=licensed_capacity DESC`;

    if (city) {
      url += `&$where=program_city='${encodeURIComponent(city)}'`;
      if (subsidyOnly) {
        url = url.replace('$where=', '$where=voucher_contract=true AND ');
      }
    } else if (subsidyOnly) {
      url += `&$where=voucher_contract=true`;
    }

    const response = await fetch(url);
    const providers = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        providers,
        count: providers.length,
      },
    });
  } catch (error) {
    console.error('EEC API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch childcare data' },
      { status: 500 }
    );
  }
}
