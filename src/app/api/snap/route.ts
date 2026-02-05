import { NextRequest, NextResponse } from 'next/server';

// USDA SNAP Retailer Locator API
const SNAP_API = 'https://usda-fns-snap-retailer-locator.hub.arcgis.com/api/v3/datasets/f374dc6b34b84dbea3f2b7df0431133e_0/downloads/data';

// Alternative: Direct ArcGIS query
const ARCGIS_API = 'https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/SNAP_Store_Locations/FeatureServer/0/query';

interface SNAPRetailer {
  store_name: string;
  address: string;
  city: string;
  state: string;
  zip5: string;
  longitude: number;
  latitude: number;
  store_type?: string;
  county?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'retailers';
  const city = searchParams.get('city');
  const zip = searchParams.get('zip');
  const limit = parseInt(searchParams.get('limit') || '500');

  try {
    if (type === 'summary') {
      // Get summary stats for MA SNAP retailers
      const countUrl = `${ARCGIS_API}?where=State='MA'&returnCountOnly=true&f=json`;
      const countRes = await fetch(countUrl);
      const countData = await countRes.json();

      // Get store type breakdown
      const typeUrl = `${ARCGIS_API}?where=State='MA'&outStatistics=[{"statisticType":"count","onStatisticField":"ObjectId","outStatisticFieldName":"count"}]&groupByFieldsForStatistics=Store_Type&f=json`;
      const typeRes = await fetch(typeUrl);
      const typeData = await typeRes.json();

      // Get city breakdown (top 20)
      const cityUrl = `${ARCGIS_API}?where=State='MA'&outStatistics=[{"statisticType":"count","onStatisticField":"ObjectId","outStatisticFieldName":"count"}]&groupByFieldsForStatistics=City&orderByFields=count DESC&resultRecordCount=20&f=json`;
      const cityRes = await fetch(cityUrl);
      const cityData = await cityRes.json();

      return NextResponse.json({
        success: true,
        data: {
          totalRetailers: countData.count || 0,
          byType: typeData.features?.map((f: { attributes: { Store_Type: string; count: number } }) => ({
            type: f.attributes.Store_Type || 'Unknown',
            count: f.attributes.count,
          })) || [],
          byCity: cityData.features?.map((f: { attributes: { City: string; count: number } }) => ({
            city: f.attributes.City,
            count: f.attributes.count,
          })) || [],
        },
      });
    }

    if (type === 'flags') {
      // Get potential red flags in SNAP retailers
      const flags: {
        type: string;
        severity: 'high' | 'medium' | 'low';
        title: string;
        description: string;
        retailers: SNAPRetailer[];
        count: number;
      }[] = [];

      // 1. Multiple retailers at same address
      const dupeAddressUrl = `${ARCGIS_API}?where=State='MA'&outFields=Store_Name,Address,City,Zip5,Store_Type&orderByFields=Address&resultRecordCount=2000&f=json`;
      const dupeRes = await fetch(dupeAddressUrl);
      const dupeData = await dupeRes.json();

      if (dupeData.features) {
        const addressMap = new Map<string, SNAPRetailer[]>();
        dupeData.features.forEach((f: { attributes: Record<string, unknown> }) => {
          const addr = `${f.attributes.Address}|${f.attributes.City}`.toLowerCase();
          if (!addressMap.has(addr)) {
            addressMap.set(addr, []);
          }
          addressMap.get(addr)!.push({
            store_name: f.attributes.Store_Name as string,
            address: f.attributes.Address as string,
            city: f.attributes.City as string,
            state: 'MA',
            zip5: f.attributes.Zip5 as string,
            longitude: 0,
            latitude: 0,
            store_type: f.attributes.Store_Type as string,
          });
        });

        const duplicates: SNAPRetailer[] = [];
        addressMap.forEach((retailers) => {
          if (retailers.length > 1) {
            duplicates.push(...retailers);
          }
        });

        if (duplicates.length > 0) {
          flags.push({
            type: 'duplicate_address',
            severity: 'high',
            title: 'Multiple SNAP Retailers at Same Address',
            description: `${duplicates.length} retailers share addresses with other SNAP-authorized stores`,
            retailers: duplicates.slice(0, 30),
            count: duplicates.length,
          });
        }
      }

      // 2. Retailers with suspicious names (generic names often used for fraud)
      const suspiciousNames = ['grocery', 'food mart', 'mini mart', 'convenience', 'market', 'bodega'];
      const nameUrl = `${ARCGIS_API}?where=State='MA' AND (${suspiciousNames.map(n => `LOWER(Store_Name) LIKE '%${n}%'`).join(' OR ')})&outFields=Store_Name,Address,City,Zip5,Store_Type&resultRecordCount=100&f=json`;

      // 3. Small stores in residential areas (requires more complex analysis)
      // For now, flag stores without typical business indicators

      return NextResponse.json({
        success: true,
        data: { flags },
      });
    }

    if (type === 'search') {
      const name = searchParams.get('name') || '';
      let whereClause = "State='MA'";

      if (name) {
        whereClause += ` AND UPPER(Store_Name) LIKE '%${name.toUpperCase()}%'`;
      }
      if (city) {
        whereClause += ` AND UPPER(City)='${city.toUpperCase()}'`;
      }
      if (zip) {
        whereClause += ` AND Zip5='${zip}'`;
      }

      const url = `${ARCGIS_API}?where=${encodeURIComponent(whereClause)}&outFields=Store_Name,Address,City,State,Zip5,Longitude,Latitude,Store_Type,County&resultRecordCount=${limit}&orderByFields=Store_Name&f=json`;

      const response = await fetch(url);
      const data = await response.json();

      const retailers = data.features?.map((f: { attributes: Record<string, unknown> }) => ({
        store_name: f.attributes.Store_Name,
        address: f.attributes.Address,
        city: f.attributes.City,
        state: f.attributes.State,
        zip5: f.attributes.Zip5,
        longitude: f.attributes.Longitude,
        latitude: f.attributes.Latitude,
        store_type: f.attributes.Store_Type,
        county: f.attributes.County,
      })) || [];

      return NextResponse.json({
        success: true,
        data: {
          retailers,
          count: retailers.length,
        },
      });
    }

    // Default: Get all MA SNAP retailers (paginated)
    const offset = parseInt(searchParams.get('offset') || '0');
    let whereClause = "State='MA'";

    if (city) {
      whereClause += ` AND UPPER(City)='${city.toUpperCase()}'`;
    }

    const url = `${ARCGIS_API}?where=${encodeURIComponent(whereClause)}&outFields=Store_Name,Address,City,State,Zip5,Longitude,Latitude,Store_Type,County&resultRecordCount=${limit}&resultOffset=${offset}&orderByFields=Store_Name&f=json`;

    const response = await fetch(url);
    const data = await response.json();

    const retailers = data.features?.map((f: { attributes: Record<string, unknown> }) => ({
      store_name: f.attributes.Store_Name,
      address: f.attributes.Address,
      city: f.attributes.City,
      state: f.attributes.State,
      zip5: f.attributes.Zip5,
      longitude: f.attributes.Longitude,
      latitude: f.attributes.Latitude,
      store_type: f.attributes.Store_Type,
      county: f.attributes.County,
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        retailers,
        count: retailers.length,
        offset,
        hasMore: retailers.length === limit,
      },
    });
  } catch (error) {
    console.error('SNAP API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SNAP retailer data' },
      { status: 500 }
    );
  }
}
