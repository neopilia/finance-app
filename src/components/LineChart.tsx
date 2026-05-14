import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatKRW, formatKRWShort } from '../utils/calculations';

interface DataPoint {
  date: string;
  [key: string]: number | string;
}

interface LineSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: DataPoint[];
  series: LineSeries[];
  height?: number;
}

/** 날짜별 자산 추이를 라인으로 표시하는 차트 */
export default function LineChart({ data, series, height = 260 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        스냅샷 데이터가 2개 이상 있어야 추이를 볼 수 있습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
        <YAxis tickFormatter={formatKRWShort} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
        <Tooltip
          formatter={(value, name) => [typeof value === 'number' ? formatKRW(value) : String(value), name]}
          contentStyle={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }}
        />
        <Legend
          formatter={(value) => <span style={{ color: 'var(--color-text)', fontSize: 12 }}>{value}</span>}
        />
        {series.map(({ key, label, color }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={data.length <= 12}
            activeDot={{ r: 4 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}
