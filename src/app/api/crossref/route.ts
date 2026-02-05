import { NextRequest, NextResponse } from 'next/server';

// Cross-reference analysis across multiple data sources
// Looks for entities appearing in multiple datasets (potential fraud indicator)

interface CrossRefMatch {
  name: string;
  normalizedName: string;
  sources: {
    source: string;
    data: Record<string, unknown>;
  }[];
  totalAmount: number;
  riskScore: number;
  flags: string[];
}

// Normalize names for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(inc|llc|corp|corporation|company|co|ltd|limited|group|services|service)\b/g, '')
    .trim();
}

// Calculate similarity between two strings (Jaccard similarity)
function similarity(a: string, b: string): number {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'full';

  try {
    // Fetch data from all sources
    const [childcareRes, federalRes, bostonRes] = await Promise.all([
      fetch(`${request.nextUrl.origin}/api/childcare?type=providers&limit=500`),
      fetch(`${request.nextUrl.origin}/api/federal/spending?type=recipients&limit=200&fy=2024`),
      fetch(`${request.nextUrl.origin}/api/boston/spending?type=vendors&limit=200`),
    ]);

    const childcareData = await childcareRes.json();
    const federalData = await federalRes.json();
    const bostonData = await bostonRes.json();

    // Build lookup maps
    const entityMap = new Map<string, CrossRefMatch>();

    // Process childcare providers
    if (childcareData.success && childcareData.data.providers) {
      childcareData.data.providers.forEach((p: Record<string, unknown>) => {
        const name = p.program_name as string || '';
        const normalized = normalizeName(name);
        if (normalized.length < 3) return;

        if (!entityMap.has(normalized)) {
          entityMap.set(normalized, {
            name,
            normalizedName: normalized,
            sources: [],
            totalAmount: 0,
            riskScore: 0,
            flags: [],
          });
        }
        const entity = entityMap.get(normalized)!;
        entity.sources.push({
          source: 'childcare',
          data: {
            programName: p.program_name,
            address: p.program_street_address1,
            city: p.program_city,
            capacity: p.licensed_capacity,
            type: p.program_type,
            subsidyVoucher: p.voucher_contract,
          },
        });
      });
    }

    // Process federal grant recipients
    if (federalData.success && federalData.data.recipients) {
      federalData.data.recipients.forEach((r: { name: string; amount: number }) => {
        const name = r.name || '';
        const normalized = normalizeName(name);
        if (normalized.length < 3) return;

        // Check for exact match first
        if (entityMap.has(normalized)) {
          const entity = entityMap.get(normalized)!;
          entity.sources.push({
            source: 'federal',
            data: {
              recipientName: r.name,
              amount: r.amount,
            },
          });
          entity.totalAmount += r.amount || 0;
        } else {
          // Check for similar names (fuzzy match)
          for (const [key, entity] of entityMap.entries()) {
            if (similarity(normalized, key) > 0.7) {
              entity.sources.push({
                source: 'federal',
                data: {
                  recipientName: r.name,
                  amount: r.amount,
                  matchType: 'fuzzy',
                },
              });
              entity.totalAmount += r.amount || 0;
              entity.flags.push(`Fuzzy match with federal recipient: ${r.name}`);
              break;
            }
          }
        }

        // Also add federal recipients as standalone entries
        if (!entityMap.has(normalized)) {
          entityMap.set(normalized, {
            name,
            normalizedName: normalized,
            sources: [{
              source: 'federal',
              data: {
                recipientName: r.name,
                amount: r.amount,
              },
            }],
            totalAmount: r.amount || 0,
            riskScore: 0,
            flags: [],
          });
        }
      });
    }

    // Process Boston vendors
    if (bostonData.success && bostonData.data.vendors) {
      bostonData.data.vendors.forEach((v: { name: string; value: number }) => {
        const name = v.name || '';
        const normalized = normalizeName(name);
        if (normalized.length < 3) return;

        // Check for exact match
        if (entityMap.has(normalized)) {
          const entity = entityMap.get(normalized)!;
          entity.sources.push({
            source: 'boston',
            data: {
              vendorName: v.name,
              amount: v.value,
            },
          });
          entity.totalAmount += v.value || 0;
        } else {
          // Check for similar names
          for (const [key, entity] of entityMap.entries()) {
            if (similarity(normalized, key) > 0.7) {
              entity.sources.push({
                source: 'boston',
                data: {
                  vendorName: v.name,
                  amount: v.value,
                  matchType: 'fuzzy',
                },
              });
              entity.totalAmount += v.value || 0;
              entity.flags.push(`Fuzzy match with Boston vendor: ${v.name}`);
              break;
            }
          }
        }
      });
    }

    // Find entities appearing in multiple sources
    const crossMatches: CrossRefMatch[] = [];

    entityMap.forEach((entity) => {
      const uniqueSources = new Set(entity.sources.map(s => s.source));

      if (uniqueSources.size > 1) {
        // Calculate risk score
        let riskScore = uniqueSources.size * 20; // Base score for multi-source

        // Higher risk if childcare + federal (potential double-dipping)
        if (uniqueSources.has('childcare') && uniqueSources.has('federal')) {
          riskScore += 30;
          entity.flags.push('Childcare provider also receiving federal grants');
        }

        // Higher risk for large amounts
        if (entity.totalAmount > 1000000) {
          riskScore += 20;
          entity.flags.push('Total funding exceeds $1M');
        }
        if (entity.totalAmount > 5000000) {
          riskScore += 20;
          entity.flags.push('Total funding exceeds $5M');
        }

        // Higher risk for fuzzy matches (potential shell companies)
        const fuzzyMatches = entity.sources.filter(s => (s.data as { matchType?: string }).matchType === 'fuzzy');
        if (fuzzyMatches.length > 0) {
          riskScore += 15;
        }

        entity.riskScore = Math.min(100, riskScore);
        crossMatches.push(entity);
      }
    });

    // Sort by risk score
    crossMatches.sort((a, b) => b.riskScore - a.riskScore);

    if (type === 'summary') {
      return NextResponse.json({
        success: true,
        data: {
          totalCrossMatches: crossMatches.length,
          highRisk: crossMatches.filter(m => m.riskScore >= 70).length,
          mediumRisk: crossMatches.filter(m => m.riskScore >= 40 && m.riskScore < 70).length,
          lowRisk: crossMatches.filter(m => m.riskScore < 40).length,
          totalAmount: crossMatches.reduce((sum, m) => sum + m.totalAmount, 0),
          sourceCombinations: {
            childcareFederal: crossMatches.filter(m =>
              m.sources.some(s => s.source === 'childcare') &&
              m.sources.some(s => s.source === 'federal')
            ).length,
            childcareBoston: crossMatches.filter(m =>
              m.sources.some(s => s.source === 'childcare') &&
              m.sources.some(s => s.source === 'boston')
            ).length,
            federalBoston: crossMatches.filter(m =>
              m.sources.some(s => s.source === 'federal') &&
              m.sources.some(s => s.source === 'boston')
            ).length,
            allThree: crossMatches.filter(m =>
              m.sources.some(s => s.source === 'childcare') &&
              m.sources.some(s => s.source === 'federal') &&
              m.sources.some(s => s.source === 'boston')
            ).length,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        matches: crossMatches.slice(0, 100),
        totalMatches: crossMatches.length,
      },
    });
  } catch (error) {
    console.error('Cross-reference error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform cross-reference analysis' },
      { status: 500 }
    );
  }
}
