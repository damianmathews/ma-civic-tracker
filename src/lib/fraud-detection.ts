'use client';

import { formatCurrency, formatCompactCurrency } from './utils';

export interface Transaction {
  department: string;
  vendor: string;
  amount: number;
  date: string;
  description?: string;
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  vendor?: string;
  department?: string;
  amount?: number;
  count?: number;
  details: string[];
  investigationTips: string[];
}

// Benford's Law expected distribution for first digits
const BENFORD_EXPECTED = {
  1: 0.301,
  2: 0.176,
  3: 0.125,
  4: 0.097,
  5: 0.079,
  6: 0.067,
  7: 0.058,
  8: 0.051,
  9: 0.046,
};

// Common approval thresholds to check for avoidance
const APPROVAL_THRESHOLDS = [1000, 2500, 5000, 10000, 25000, 50000, 100000];

export function analyzeTransactions(transactions: Transaction[]): {
  anomalies: Anomaly[];
  stats: {
    totalAnomalies: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalFlaggedAmount: number;
  };
} {
  const anomalies: Anomaly[] = [];
  let anomalyId = 0;

  // ============================================
  // 1. BENFORD'S LAW ANALYSIS
  // ============================================
  const benfordAnomalies = analyzeBenfordsLaw(transactions, anomalyId);
  anomalies.push(...benfordAnomalies.anomalies);
  anomalyId = benfordAnomalies.nextId;

  // ============================================
  // 2. DUPLICATE PAYMENT DETECTION
  // ============================================
  const duplicateAnomalies = detectDuplicatePayments(transactions, anomalyId);
  anomalies.push(...duplicateAnomalies.anomalies);
  anomalyId = duplicateAnomalies.nextId;

  // ============================================
  // 3. THRESHOLD AVOIDANCE (Invoice Splitting)
  // ============================================
  const thresholdAnomalies = detectThresholdAvoidance(transactions, anomalyId);
  anomalies.push(...thresholdAnomalies.anomalies);
  anomalyId = thresholdAnomalies.nextId;

  // ============================================
  // 4. ROUND NUMBER PATTERNS
  // ============================================
  const roundNumberAnomalies = detectRoundNumbers(transactions, anomalyId);
  anomalies.push(...roundNumberAnomalies.anomalies);
  anomalyId = roundNumberAnomalies.nextId;

  // ============================================
  // 5. WEEKEND/HOLIDAY PAYMENTS
  // ============================================
  const weekendAnomalies = detectWeekendPayments(transactions, anomalyId);
  anomalies.push(...weekendAnomalies.anomalies);
  anomalyId = weekendAnomalies.nextId;

  // ============================================
  // 6. SAME-DAY MULTIPLE PAYMENTS
  // ============================================
  const sameDayAnomalies = detectSameDayPayments(transactions, anomalyId);
  anomalies.push(...sameDayAnomalies.anomalies);
  anomalyId = sameDayAnomalies.nextId;

  // ============================================
  // 7. VENDOR ADDRESS RED FLAGS
  // ============================================
  const addressAnomalies = detectAddressRedFlags(transactions, anomalyId);
  anomalies.push(...addressAnomalies.anomalies);
  anomalyId = addressAnomalies.nextId;

  // ============================================
  // 8. HIGH FREQUENCY VENDORS
  // ============================================
  const frequencyAnomalies = detectHighFrequency(transactions, anomalyId);
  anomalies.push(...frequencyAnomalies.anomalies);
  anomalyId = frequencyAnomalies.nextId;

  // ============================================
  // 9. UNUSUAL PAYMENT AMOUNTS (Large outliers)
  // ============================================
  const outlierAnomalies = detectOutliers(transactions, anomalyId);
  anomalies.push(...outlierAnomalies.anomalies);
  anomalyId = outlierAnomalies.nextId;

  // ============================================
  // 10. VENDOR CONCENTRATION
  // ============================================
  const concentrationAnomalies = detectVendorConcentration(transactions, anomalyId);
  anomalies.push(...concentrationAnomalies.anomalies);

  // Calculate stats
  const stats = {
    totalAnomalies: anomalies.length,
    criticalCount: anomalies.filter((a) => a.severity === 'critical').length,
    highCount: anomalies.filter((a) => a.severity === 'high').length,
    mediumCount: anomalies.filter((a) => a.severity === 'medium').length,
    lowCount: anomalies.filter((a) => a.severity === 'low').length,
    totalFlaggedAmount: anomalies.reduce((sum, a) => sum + (a.amount || 0), 0),
  };

  return { anomalies, stats };
}

function analyzeBenfordsLaw(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Get first digits of all amounts > $100
  const amounts = transactions.filter((t) => t.amount >= 100).map((t) => t.amount);
  if (amounts.length < 100) {
    return { anomalies, nextId: id }; // Need sufficient sample size
  }

  const firstDigits: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

  for (const amount of amounts) {
    const firstDigit = parseInt(String(amount)[0]);
    if (firstDigit >= 1 && firstDigit <= 9) {
      firstDigits[firstDigit]++;
    }
  }

  const total = amounts.length;
  const deviations: { digit: number; expected: number; actual: number; deviation: number }[] = [];

  for (let digit = 1; digit <= 9; digit++) {
    const expected = BENFORD_EXPECTED[digit as keyof typeof BENFORD_EXPECTED];
    const actual = firstDigits[digit] / total;
    const deviation = Math.abs(actual - expected);

    // Flag if deviation is more than 5 percentage points
    if (deviation > 0.05) {
      deviations.push({ digit, expected, actual, deviation });
    }
  }

  if (deviations.length > 0) {
    // Sort by deviation
    deviations.sort((a, b) => b.deviation - a.deviation);

    const severity = deviations.some((d) => d.deviation > 0.1) ? 'high' : 'medium';

    anomalies.push({
      id: `anomaly-${id++}`,
      type: 'benfords_law',
      severity,
      title: "Benford's Law Deviation Detected",
      description: `Payment amounts don't follow expected natural distribution - a potential indicator of fabricated numbers`,
      details: [
        `Analyzed ${total.toLocaleString()} payments over $100`,
        ...deviations.slice(0, 3).map(
          (d) =>
            `Digit ${d.digit}: Expected ${(d.expected * 100).toFixed(1)}%, Actual ${(d.actual * 100).toFixed(1)}% (${d.deviation > 0 ? '+' : ''}${((d.actual - d.expected) * 100).toFixed(1)}% deviation)`
        ),
        `Higher-than-expected rates of digits 7-9 can indicate fabricated invoices`,
      ],
      investigationTips: [
        'Benford\'s Law violations suggest numbers may not be naturally occurring',
        'Fabricated invoice amounts often skew toward higher first digits',
        'Cross-reference with vendors showing the largest deviations',
        'This was a key indicator in the Feeding Our Future fraud case',
      ],
    });
  }

  return { anomalies, nextId: id };
}

function detectDuplicatePayments(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Group by vendor + amount
  const groups: Record<string, Transaction[]> = {};

  for (const t of transactions) {
    const key = `${t.vendor}|${t.amount}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(t);
  }

  // Find potential duplicates (same vendor, same amount, multiple times)
  for (const [key, txns] of Object.entries(groups)) {
    if (txns.length >= 3 && txns[0].amount > 1000) {
      const [vendor] = key.split('|');
      const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);

      // Check if dates are close together
      const dates = txns.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
      const daysBetween = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);

      const severity = txns.length >= 5 || totalAmount > 100000 ? 'high' : 'medium';

      anomalies.push({
        id: `anomaly-${id++}`,
        type: 'duplicate_payments',
        severity,
        title: `Potential Duplicate Payments`,
        description: `${vendor} received ${txns.length} identical payments of ${formatCurrency(txns[0].amount)}`,
        vendor,
        amount: totalAmount,
        count: txns.length,
        details: [
          `Vendor: ${vendor}`,
          `Identical payment amount: ${formatCurrency(txns[0].amount)}`,
          `Number of identical payments: ${txns.length}`,
          `Total paid: ${formatCurrency(totalAmount)}`,
          `Time span: ${Math.round(daysBetween)} days`,
          `Department(s): ${[...new Set(txns.map((t) => t.department))].join(', ')}`,
        ],
        investigationTips: [
          'Verify each payment corresponds to a unique service/invoice',
          'Check for different invoice numbers on same-amount payments',
          'Could indicate invoice resubmission or system error',
          'Request supporting documentation for each payment',
        ],
      });
    }
  }

  return { anomalies, nextId: id };
}

function detectThresholdAvoidance(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  for (const threshold of APPROVAL_THRESHOLDS) {
    // Look for payments clustering just below threshold (within 5%)
    const lowerBound = threshold * 0.95;
    const upperBound = threshold - 1;

    const nearThreshold = transactions.filter(
      (t) => t.amount >= lowerBound && t.amount <= upperBound
    );

    // Group by vendor
    const byVendor: Record<string, Transaction[]> = {};
    for (const t of nearThreshold) {
      if (!byVendor[t.vendor]) {
        byVendor[t.vendor] = [];
      }
      byVendor[t.vendor].push(t);
    }

    // Flag vendors with multiple payments just under threshold
    for (const [vendor, txns] of Object.entries(byVendor)) {
      if (txns.length >= 3) {
        const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);

        anomalies.push({
          id: `anomaly-${id++}`,
          type: 'threshold_avoidance',
          severity: txns.length >= 5 ? 'critical' : 'high',
          title: `Possible Invoice Splitting at $${threshold.toLocaleString()} Threshold`,
          description: `${vendor} has ${txns.length} payments between ${formatCurrency(lowerBound)} and ${formatCurrency(upperBound)}`,
          vendor,
          amount: totalAmount,
          count: txns.length,
          details: [
            `Vendor: ${vendor}`,
            `Threshold being avoided: ${formatCurrency(threshold)}`,
            `Payments in range: ${txns.length}`,
            `Amount range: ${formatCurrency(lowerBound)} - ${formatCurrency(upperBound)}`,
            `Total if combined: ${formatCurrency(totalAmount)}`,
            `Sample amounts: ${txns.slice(0, 5).map((t) => formatCurrency(t.amount)).join(', ')}`,
          ],
          investigationTips: [
            'Invoice splitting is a common fraud technique to avoid approval requirements',
            'Verify if payments represent genuinely separate services',
            'Check if invoices have sequential numbers or same dates',
            'This pattern was flagged in Minnesota daycare fraud investigations',
            `Combining these would exceed the ${formatCurrency(threshold)} approval threshold`,
          ],
        });
      }
    }
  }

  return { anomalies, nextId: id };
}

function detectRoundNumbers(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Detect perfectly round amounts (multiples of 1000, 5000, 10000)
  const roundPatterns = [
    { divisor: 10000, minAmount: 10000, name: '$10K increments' },
    { divisor: 5000, minAmount: 5000, name: '$5K increments' },
    { divisor: 1000, minAmount: 5000, name: '$1K increments' },
  ];

  for (const pattern of roundPatterns) {
    const roundPayments = transactions.filter(
      (t) => t.amount >= pattern.minAmount && t.amount % pattern.divisor === 0
    );

    // Group by vendor
    const byVendor: Record<string, Transaction[]> = {};
    for (const t of roundPayments) {
      if (!byVendor[t.vendor]) {
        byVendor[t.vendor] = [];
      }
      byVendor[t.vendor].push(t);
    }

    for (const [vendor, txns] of Object.entries(byVendor)) {
      // Flag if vendor has many round number payments
      const totalForVendor = transactions.filter((t) => t.vendor === vendor).length;
      const roundPercentage = (txns.length / totalForVendor) * 100;

      if (txns.length >= 4 && roundPercentage > 50) {
        const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);

        anomalies.push({
          id: `anomaly-${id++}`,
          type: 'round_numbers',
          severity: txns.length >= 10 ? 'high' : 'medium',
          title: `Suspicious Round Number Pattern`,
          description: `${roundPercentage.toFixed(0)}% of payments to ${vendor} are exact ${pattern.name}`,
          vendor,
          amount: totalAmount,
          count: txns.length,
          details: [
            `Vendor: ${vendor}`,
            `Round number payments: ${txns.length} of ${totalForVendor} (${roundPercentage.toFixed(1)}%)`,
            `Pattern: ${pattern.name}`,
            `Total in round payments: ${formatCurrency(totalAmount)}`,
            `Sample amounts: ${txns.slice(0, 5).map((t) => formatCurrency(t.amount)).join(', ')}`,
          ],
          investigationTips: [
            'Legitimate invoices rarely come out to perfectly round numbers',
            'Round numbers are a classic indicator of fabricated invoices',
            'ACFE identifies round-dollar amounts as a key fraud red flag',
            'Request original invoices to verify pricing details',
          ],
        });
      }
    }
  }

  return { anomalies, nextId: id };
}

function detectWeekendPayments(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  const weekendPayments = transactions.filter((t) => {
    if (!t.date) return false;
    const date = new Date(t.date);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  });

  if (weekendPayments.length === 0) {
    return { anomalies, nextId: id };
  }

  // Group by vendor
  const byVendor: Record<string, Transaction[]> = {};
  for (const t of weekendPayments) {
    if (!byVendor[t.vendor]) {
      byVendor[t.vendor] = [];
    }
    byVendor[t.vendor].push(t);
  }

  // Flag vendors with significant weekend payment activity
  for (const [vendor, txns] of Object.entries(byVendor)) {
    if (txns.length >= 5) {
      const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);
      const allVendorTxns = transactions.filter((t) => t.vendor === vendor);
      const weekendPercentage = (txns.length / allVendorTxns.length) * 100;

      if (weekendPercentage > 20) {
        anomalies.push({
          id: `anomaly-${id++}`,
          type: 'weekend_payments',
          severity: weekendPercentage > 40 ? 'high' : 'medium',
          title: `High Weekend Payment Activity`,
          description: `${weekendPercentage.toFixed(0)}% of payments to ${vendor} occurred on weekends`,
          vendor,
          amount: totalAmount,
          count: txns.length,
          details: [
            `Vendor: ${vendor}`,
            `Weekend payments: ${txns.length} of ${allVendorTxns.length} (${weekendPercentage.toFixed(1)}%)`,
            `Total weekend payments: ${formatCurrency(totalAmount)}`,
            `Government offices typically don't process payments on weekends`,
          ],
          investigationTips: [
            'Weekend payments may indicate backdated transactions',
            'In MN fraud cases, services claimed on weekends when facilities were closed',
            'Verify the vendor actually provides weekend services',
            'Cross-reference with vendor operating hours',
          ],
        });
      }
    }
  }

  return { anomalies, nextId: id };
}

function detectSameDayPayments(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Group by vendor + date
  const groups: Record<string, Transaction[]> = {};

  for (const t of transactions) {
    if (!t.date) continue;
    const dateStr = t.date.split('T')[0]; // Get just the date part
    const key = `${t.vendor}|${dateStr}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(t);
  }

  // Find vendors with multiple payments on same day
  for (const [key, txns] of Object.entries(groups)) {
    if (txns.length >= 3) {
      const [vendor, date] = key.split('|');
      const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);

      anomalies.push({
        id: `anomaly-${id++}`,
        type: 'same_day_payments',
        severity: txns.length >= 5 || totalAmount > 50000 ? 'high' : 'medium',
        title: `Multiple Same-Day Payments`,
        description: `${vendor} received ${txns.length} separate payments on ${date}`,
        vendor,
        amount: totalAmount,
        count: txns.length,
        details: [
          `Vendor: ${vendor}`,
          `Date: ${date}`,
          `Number of payments: ${txns.length}`,
          `Individual amounts: ${txns.map((t) => formatCurrency(t.amount)).join(', ')}`,
          `Combined total: ${formatCurrency(totalAmount)}`,
          `Departments: ${[...new Set(txns.map((t) => t.department))].join(', ')}`,
        ],
        investigationTips: [
          'Multiple same-day payments may indicate invoice splitting',
          'Could be used to keep individual amounts below approval thresholds',
          'Verify each payment corresponds to a distinct service',
          'Check if invoices are sequentially numbered',
        ],
      });
    }
  }

  return { anomalies, nextId: id };
}

function detectAddressRedFlags(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Look for vendor names that suggest shell company patterns
  const suspiciousPatterns = [
    { pattern: /\bLLC\b.*\bLLC\b/i, name: 'Double LLC' },
    { pattern: /^[A-Z]{2,4}\s+(LLC|INC|CORP)/i, name: 'Acronym company' },
    { pattern: /consulting|services|solutions|enterprises|holdings/i, name: 'Generic business name' },
  ];

  // Group vendors by total payments
  const vendorTotals: Record<string, { total: number; count: number; txns: Transaction[] }> = {};
  for (const t of transactions) {
    if (!vendorTotals[t.vendor]) {
      vendorTotals[t.vendor] = { total: 0, count: 0, txns: [] };
    }
    vendorTotals[t.vendor].total += t.amount;
    vendorTotals[t.vendor].count++;
    vendorTotals[t.vendor].txns.push(t);
  }

  // Flag high-value vendors with suspicious name patterns
  for (const [vendor, data] of Object.entries(vendorTotals)) {
    if (data.total < 50000) continue; // Only flag significant vendors

    for (const { pattern, name } of suspiciousPatterns) {
      if (pattern.test(vendor)) {
        anomalies.push({
          id: `anomaly-${id++}`,
          type: 'vendor_name_flag',
          severity: data.total > 500000 ? 'medium' : 'low',
          title: `Vendor Name Red Flag: ${name}`,
          description: `"${vendor}" matches shell company naming patterns`,
          vendor,
          amount: data.total,
          count: data.count,
          details: [
            `Vendor: ${vendor}`,
            `Pattern matched: ${name}`,
            `Total payments: ${formatCurrency(data.total)}`,
            `Number of payments: ${data.count}`,
            `Primary department: ${data.txns[0]?.department || 'Unknown'}`,
          ],
          investigationTips: [
            'Generic business names are commonly used by shell companies',
            'Verify business registration with Secretary of State',
            'Search for web presence and physical location',
            'Check if business address is a PO Box or virtual office',
            'Cross-reference with employee addresses',
          ],
        });
        break; // Only flag once per vendor
      }
    }
  }

  return { anomalies, nextId: id };
}

function detectHighFrequency(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Group by vendor
  const vendorStats: Record<string, { count: number; total: number; departments: Set<string> }> = {};

  for (const t of transactions) {
    if (!vendorStats[t.vendor]) {
      vendorStats[t.vendor] = { count: 0, total: 0, departments: new Set() };
    }
    vendorStats[t.vendor].count++;
    vendorStats[t.vendor].total += t.amount;
    vendorStats[t.vendor].departments.add(t.department);
  }

  // Calculate average payment per vendor
  const avgCount = Object.values(vendorStats).reduce((sum, v) => sum + v.count, 0) / Object.keys(vendorStats).length;

  // Flag vendors with unusually high payment frequency
  for (const [vendor, stats] of Object.entries(vendorStats)) {
    if (stats.count > avgCount * 5 && stats.count > 20) {
      const avgPayment = stats.total / stats.count;

      anomalies.push({
        id: `anomaly-${id++}`,
        type: 'high_frequency',
        severity: stats.count > 100 ? 'high' : 'medium',
        title: `Unusually High Payment Frequency`,
        description: `${vendor} received ${stats.count} separate payments (${Math.round(stats.count / avgCount)}x average)`,
        vendor,
        amount: stats.total,
        count: stats.count,
        details: [
          `Vendor: ${vendor}`,
          `Total payments: ${stats.count}`,
          `Average for all vendors: ${avgCount.toFixed(0)} payments`,
          `This vendor: ${Math.round(stats.count / avgCount)}x the average`,
          `Total amount: ${formatCurrency(stats.total)}`,
          `Average payment: ${formatCurrency(avgPayment)}`,
          `Departments involved: ${stats.departments.size}`,
        ],
        investigationTips: [
          'High frequency may indicate split payments to avoid thresholds',
          'Could also indicate legitimate high-volume vendor relationship',
          'Verify contract terms support payment frequency',
          'Check for duplicate services across departments',
        ],
      });
    }
  }

  return { anomalies, nextId: id };
}

function detectOutliers(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Calculate statistics
  const amounts = transactions.map((t) => t.amount).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const q3 = amounts[Math.floor(amounts.length * 0.75)];
  const iqr = q3 - amounts[Math.floor(amounts.length * 0.25)];
  const upperFence = q3 + iqr * 3; // Extreme outliers

  // Find extreme outliers
  const outliers = transactions.filter((t) => t.amount > upperFence && t.amount > 1000000);

  for (const t of outliers.slice(0, 10)) {
    const multiplier = Math.round(t.amount / median);

    anomalies.push({
      id: `anomaly-${id++}`,
      type: 'large_outlier',
      severity: t.amount > 10000000 ? 'critical' : 'high',
      title: `Extreme Payment Amount`,
      description: `${formatCurrency(t.amount)} payment to ${t.vendor} is ${multiplier.toLocaleString()}x the median`,
      vendor: t.vendor,
      department: t.department,
      amount: t.amount,
      details: [
        `Vendor: ${t.vendor}`,
        `Department: ${t.department}`,
        `Amount: ${formatCurrency(t.amount)}`,
        `Median payment: ${formatCurrency(median)}`,
        `This payment is ${multiplier.toLocaleString()}x the median`,
        `Date: ${t.date || 'Unknown'}`,
        t.description ? `Description: ${t.description}` : '',
      ].filter(Boolean),
      investigationTips: [
        'Verify payment matches a valid contract or purchase order',
        'Large one-time payments warrant additional scrutiny',
        'Check if payment was properly approved at appropriate levels',
        'Request supporting documentation (contracts, invoices, receipts)',
      ],
    });
  }

  return { anomalies, nextId: id };
}

function detectVendorConcentration(
  transactions: Transaction[],
  startId: number
): { anomalies: Anomaly[]; nextId: number } {
  const anomalies: Anomaly[] = [];
  let id = startId;

  // Calculate vendor totals
  const vendorTotals: Record<string, number> = {};
  for (const t of transactions) {
    vendorTotals[t.vendor] = (vendorTotals[t.vendor] || 0) + t.amount;
  }

  const totalSpending = Object.values(vendorTotals).reduce((a, b) => a + b, 0);

  // Sort vendors by total
  const sortedVendors = Object.entries(vendorTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([vendor, amount]) => ({
      vendor,
      amount,
      percentage: (amount / totalSpending) * 100,
    }));

  // Flag if top vendor has disproportionate share
  if (sortedVendors.length > 0 && sortedVendors[0].percentage > 15) {
    const top = sortedVendors[0];

    anomalies.push({
      id: `anomaly-${id++}`,
      type: 'vendor_concentration',
      severity: top.percentage > 25 ? 'high' : 'medium',
      title: `High Vendor Concentration`,
      description: `${top.vendor} receives ${top.percentage.toFixed(1)}% of all spending`,
      vendor: top.vendor,
      amount: top.amount,
      details: [
        `Vendor: ${top.vendor}`,
        `Total received: ${formatCurrency(top.amount)}`,
        `Percentage of total spending: ${top.percentage.toFixed(1)}%`,
        `Total dataset spending: ${formatCurrency(totalSpending)}`,
        'Top 5 vendors:',
        ...sortedVendors.slice(0, 5).map(
          (v, i) => `  ${i + 1}. ${v.vendor}: ${formatCurrency(v.amount)} (${v.percentage.toFixed(1)}%)`
        ),
      ],
      investigationTips: [
        'High concentration may indicate preferential treatment',
        'Verify competitive bidding was conducted',
        'Check for related party relationships',
        'Review contract award process',
      ],
    });
  }

  return { anomalies, nextId: id };
}
