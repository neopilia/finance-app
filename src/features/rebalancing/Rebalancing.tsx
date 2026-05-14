import { useMemo } from 'react';
import { useAppContext } from '../../store/AppContext';
import {
  getLatestSnapshotsPerMember,
  summarizeAssets,
  calculateRebalancing,
  formatKRW,
  formatPercent,
} from '../../utils/calculations';

const CLASS_META = [
  { key: 'cash' as const, label: '현금', color: 'var(--color-cash)', badge: 'badge-cash' },
  { key: 'stock' as const, label: '주식', color: 'var(--color-stock)', badge: 'badge-stock' },
  { key: 'pension' as const, label: '연금', color: 'var(--color-pension)', badge: 'badge-pension' },
];

/** 현재 비율 vs 목표 비율 차이와 리밸런싱 필요 금액을 표시하는 페이지 */
export default function Rebalancing() {
  const { state, dispatch } = useAppContext();
  const { targetRatios } = state;

  const latest = useMemo(() => getLatestSnapshotsPerMember(state.snapshots), [state.snapshots]);
  const summary = useMemo(() => summarizeAssets(latest), [latest]);
  const rebalance = useMemo(() => calculateRebalancing(summary, targetRatios), [summary, targetRatios]);

  const totalRatio = targetRatios.cash + targetRatios.stock + targetRatios.pension;

  function updateRatio(key: 'cash' | 'stock' | 'pension', value: number) {
    dispatch({
      type: 'SET_TARGET_RATIOS',
      payload: { ...targetRatios, [key]: value },
    });
  }

  return (
    <div>
      <h1 className="page-title">리밸런싱</h1>

      {/* 목표 비율 설정 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">목표 비율 설정</div>
        <div className="grid-3">
          {CLASS_META.map(({ key, label, color }) => (
            <div key={key}>
              <label className="label">{label} (%)</label>
              <input
                type="number"
                className="input"
                min={0}
                max={100}
                value={targetRatios[key]}
                onChange={(e) => updateRatio(key, Number(e.target.value))}
                style={{ borderColor: color }}
              />
            </div>
          ))}
        </div>
        {totalRatio !== 100 && (
          <div className="text-danger mt-2" style={{ fontSize: 13 }}>
            ⚠️ 비율 합계가 {totalRatio}%입니다. 100%가 되도록 조정하세요.
          </div>
        )}
      </div>

      {/* 리밸런싱 제안 */}
      {summary.total === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="text-muted">자산을 먼저 입력하세요</div>
        </div>
      ) : (
        <div className="card">
          <div className="section-title">현재 vs 목표</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CLASS_META.map(({ key, label, color, badge }) => {
              const { current, target, diff } = rebalance[key];
              const currentRatio = summary.total > 0 ? (current / summary.total) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span className={`badge ${badge}`}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      현재 {formatPercent(currentRatio)} → 목표 {formatPercent(targetRatios[key])}
                    </span>
                  </div>
                  {/* 프로그레스 바 */}
                  <div style={{ position: 'relative', height: 8, background: 'var(--color-surface2)', borderRadius: 4, marginBottom: 6 }}>
                    <div
                      style={{
                        position: 'absolute',
                        height: '100%',
                        width: `${Math.min(currentRatio, 100)}%`,
                        background: color,
                        borderRadius: 4,
                        opacity: 0.8,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: -2,
                        left: `${Math.min(targetRatios[key], 100)}%`,
                        width: 2,
                        height: 12,
                        background: color,
                        borderRadius: 1,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                    <span>{formatKRW(current)}</span>
                    <span className={diff >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 600 }}>
                      {diff >= 0 ? '▲ ' : '▼ '}{formatKRW(Math.abs(diff))} {diff >= 0 ? '매수 필요' : '매도 필요'}
                    </span>
                    <span className="text-muted">목표 {formatKRW(target)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
