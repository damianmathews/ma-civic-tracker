'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCompactCurrency } from '@/lib/utils';

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
];

interface BarChartProps {
  data: ChartData[];
  title: string;
}

export function SpendingBarChart({ data, title }: BarChartProps) {
  const handleBarClick = (entry: { name?: string }) => {
    if (entry.name) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(entry.name + ' Massachusetts')}`;
      window.open(searchUrl, '_blank');
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatCompactCurrency(value)}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              fontSize={12}
              tickFormatter={(value) =>
                value.length > 15 ? value.slice(0, 15) + '...' : value
              }
            />
            <Tooltip
              formatter={(value) => [formatCompactCurrency(Number(value) || 0), 'Amount']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar
              dataKey="value"
              fill="#3B82F6"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={handleBarClick}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">Click any bar to search Google for that organization</p>
    </div>
  );
}

interface PieChartProps {
  data: ChartData[];
  title: string;
}

export function SpendingPieChart({ data, title }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const handlePieClick = (entry: { name?: string }) => {
    if (entry.name) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(entry.name + ' Massachusetts')}`;
      window.open(searchUrl, '_blank');
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              cursor="pointer"
              onClick={handlePieClick}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const numValue = Number(value) || 0;
                return [
                  `${formatCompactCurrency(numValue)} (${((numValue / total) * 100).toFixed(1)}%)`,
                  'Amount',
                ];
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend
              formatter={(value) =>
                value.length > 20 ? value.slice(0, 20) + '...' : value
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">Click any slice to search Google for that organization</p>
    </div>
  );
}
