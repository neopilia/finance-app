import { useMemo } from 'react';
import { useAppContext } from '../../store/AppContext';
import {
  getLatestSnapshotsPerMember,
  summarizeAssets,
  simulateFutureValue,
  formatKRW,
} from '../../utils/calculations';
import LineChart from '../../components/LineChart';

/** 목표 수익률·기간·월 불입액 기반 미래 자산 시뮬레이션 */
export default function Simulation() {
  const { state, dispatch } = useAppContext();
  const { simulation } = state;

  const latest = useMemo(() => getLatestSnapshotsPerMember(state.snapshots), [state.snapshots]);
  const summary = useMemo(() => summarizeAssets(latest), [latest]);

  const results = useMemo(
    () =>
      simulateFutureValue(
        summary.total,
        simulation.targetReturnRate,
        simulation.years,
        simulation.monthlyAdd,
      ),
    [summary.total, simulation],
  );

  const chartData = [
    { date: '현재', total: summary.total },
    ...results.map(({ year, value }) => ({ date: `${year}년`, total: value })),
  ];

  function update(field: keyof typeof simulation, value: number) {
    dispatch({ type: 'SET_SIMULATION', payload: { ...simulation, [field]: value } });
  }

  const milestones = [1, 3, 5, 10, 20].filter((y) => y <= simulation.years);

  return (
    <div>
      <h1 className="page-title">미래 가치 시뮬레이션</h1>

      {/* 설정 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">시뮬레이션 설정</div>
        <div className="grid-3">
          <div>
            <label className="label">목표 연수익률 (%)</label>
            <input
              type="number"
              className="input"
              min={0}
              max={50}
              step={0.5}
              value={simulation.targetReturnRate}
              onChange={(e) => update('targetReturnRate', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">시뮬레이션 기간 (년)</label>
            <input
              type="number"
              className="input"
              min={1}
              max={50}
              value={simulation.years}
              onChange={(e) => update('years', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">월 추가 불입액 (원)</label>
            <input
              type="number"
              className="input"
              min={0}
              step={100000}
              value={simulation.monthlyAdd}
              onChange={(e) => update('monthlyAdd', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-3 text-muted" style={{ fontSize: 13 }}>
          현재 총 자산 <strong style={{ color: 'var(--color-text)' }}>{formatKRW(summary.total)}</strong> 기준
        </div>
      </div>

      {/* 결과 카드 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {milestones.map((y) => {
          const r = results.find((r) => r.year === y);
          if (!r) return null;
          return (
            <div className="card" key={y} style={{ flex: '1 0 140px' }}>
              <div className="label">{y}년 후</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>{formatKRW(r.value)}</div>
              {summary.total > 0 && (
                <div className="text-success mt-1" style={{ fontSize: 12 }}>
                  +{(((r.value - summary.total) / summary.total) * 100).toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 추이 차트 */}
      <div className="card">
        <div className="section-title">자산 성장 추이</div>
        <LineChart
          data={chartData}
          series={[{ key: 'total', label: '예상 자산', color: 'var(--color-primary)' }]}
          height={300}
        />
      </div>
    </div>
  );
}
