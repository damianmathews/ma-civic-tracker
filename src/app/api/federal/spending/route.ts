import { NextRequest, NextResponse } from 'next/server';

// USASpending.gov API endpoints
const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

interface FederalGrant {
  recipient_name: string;
  award_amount: number;
  description: string;
  awarding_agency_name: string;
  funding_agency_name: string;
  period_of_performance_start_date: string;
  period_of_performance_current_end_date: string;
  recipient_city_name: string;
  recipient_state_code: string;
  cfda_number: string;
  cfda_title: string;
  award_type: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'grants';
  const keywords = searchParams.get('keywords')?.split(',') || [];
  const fiscalYear = searchParams.get('fy') || '2024';
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    if (type === 'summary') {
      // Get summary of federal spending in MA
      const response = await fetch(`${USASPENDING_API}/search/spending_by_geography/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'recipient_location',
          geo_layer: 'state',
          geo_layer_filters: ['MA'],
          filters: {
            time_period: [{ start_date: `${fiscalYear}-10-01`, end_date: `${parseInt(fiscalYear) + 1}-09-30` }],
            award_type_codes: ['02', '03', '04', '05'], // Grants only
            recipient_locations: [{ country: 'USA', state: 'MA' }],
          },
        }),
      });

      const data = await response.json();

      // Also get agency breakdown
      const agencyResponse = await fetch(`${USASPENDING_API}/search/spending_by_category/awarding_agency/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{ start_date: `${fiscalYear}-10-01`, end_date: `${parseInt(fiscalYear) + 1}-09-30` }],
            award_type_codes: ['02', '03', '04', '05'],
            recipient_locations: [{ country: 'USA', state: 'MA' }],
          },
          category: 'awarding_agency',
          limit: 20,
        }),
      });

      const agencyData = await agencyResponse.json();

      return NextResponse.json({
        success: true,
        data: {
          totalAmount: data.results?.[0]?.aggregated_amount || 0,
          byAgency: agencyData.results || [],
          fiscalYear,
        },
      });
    }

    if (type === 'search' || keywords.length > 0) {
      // Search grants by keywords
      const searchKeywords = keywords.length > 0 ? keywords : ['massachusetts'];

      const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{ start_date: `${fiscalYear}-10-01`, end_date: `${parseInt(fiscalYear) + 1}-09-30` }],
            award_type_codes: ['02', '03', '04', '05'], // Block grants, project grants, etc.
            recipient_locations: [{ country: 'USA', state: 'MA' }],
            keywords: searchKeywords,
          },
          fields: [
            'Award ID',
            'Recipient Name',
            'Award Amount',
            'Description',
            'Awarding Agency',
            'Funding Agency',
            'Start Date',
            'End Date',
            'recipient_city_name',
            'CFDA Number',
            'Award Type',
          ],
          limit,
          sort: 'Award Amount',
          order: 'desc',
        }),
      });

      const data = await response.json();

      return NextResponse.json({
        success: true,
        data: {
          grants: data.results || [],
          total: data.page_metadata?.total || 0,
          keywords: searchKeywords,
          fiscalYear,
        },
      });
    }

    if (type === 'recipients') {
      // Get top recipients in MA
      const response = await fetch(`${USASPENDING_API}/search/spending_by_category/recipient/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{ start_date: `${fiscalYear}-10-01`, end_date: `${parseInt(fiscalYear) + 1}-09-30` }],
            award_type_codes: ['02', '03', '04', '05'],
            recipient_locations: [{ country: 'USA', state: 'MA' }],
          },
          category: 'recipient',
          limit: limit,
        }),
      });

      const data = await response.json();

      return NextResponse.json({
        success: true,
        data: {
          recipients: data.results || [],
          fiscalYear,
        },
      });
    }

    if (type === 'cfda') {
      // Get spending by CFDA program (federal assistance programs)
      const response = await fetch(`${USASPENDING_API}/search/spending_by_category/cfda/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{ start_date: `${fiscalYear}-10-01`, end_date: `${parseInt(fiscalYear) + 1}-09-30` }],
            award_type_codes: ['02', '03', '04', '05'],
            recipient_locations: [{ country: 'USA', state: 'MA' }],
          },
          category: 'cfda',
          limit: 50,
        }),
      });

      const data = await response.json();

      return NextResponse.json({
        success: true,
        data: {
          programs: data.results || [],
          fiscalYear,
        },
      });
    }

    // Default: Get recent large grants to MA
    const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: `${fiscalYear}-10-01`, end_date: `${parseInt(fiscalYear) + 1}-09-30` }],
          award_type_codes: ['02', '03', '04', '05'],
          recipient_locations: [{ country: 'USA', state: 'MA' }],
        },
        fields: [
          'Award ID',
          'Recipient Name',
          'Award Amount',
          'Description',
          'Awarding Agency',
          'Funding Agency',
          'Start Date',
          'End Date',
          'recipient_city_name',
          'CFDA Number',
          'Award Type',
        ],
        limit,
        sort: 'Award Amount',
        order: 'desc',
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        grants: data.results || [],
        total: data.page_metadata?.total || 0,
        fiscalYear,
      },
    });
  } catch (error) {
    console.error('USASpending API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch federal spending data' },
      { status: 500 }
    );
  }
}
