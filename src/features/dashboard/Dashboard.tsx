import { useMemo } from 'react';
import { useAppContext } from '../../store/AppContext';
import {
  getLatestSnapshotsPerMember,
  summarizeAssets,
  buildAssetHistory,
  formatKRW,
  formatPercent,
} from '../../utils/calculations';
import DonutChart from '../../components/DonutChart';
import LineChart from '../../components/LineChart';

const ASSET_META = [
  { key: 'cash' as const, label: '현금', color: 'var(--color-cash)', badge: 'badge-cash' },
  { key: 'stock' as const, label: '주식', color: 'var(--color-stock)', badge: 'badge-stock' },
  { key: 'pension' as const, label: '연금', color: 'var(--color-pension)', badge: 'badge-pension' },
];

/** 자산 총액, 분류별 금액·비율, 증감, 추이 차트를 표시하는 메인 대시보드 */
export default function Dashboard() {
  const { state } = useAppContext();
  const { snapshots, members } = state;

  // 현재 시점 기준 구성원별 최신 스냅샷 합산
  const latestSnapshots = useMemo(() => getLatestSnapshotsPerMember(snapshots), [snapshots]);
  const summary = useMemo(() => summarizeAssets(latestSnapshots), [latestSnapshots]);
  const history = useMemo(() => buildAssetHistory(snapshots), [snapshots]);

  // 전월 대비 증감 계산
  const prevSummary = useMemo(() => {
    if (history.length < 2) return null;
    const prev = history[history.length - 2];
    return prev;
  }, [history]);

  const totalDiff = prevSummary ? summary.total - prevSummary.total : null;

  const donutData = ASSET_META.map(({ key, label, color }) => ({
    name: label,
    value: summary[key],
    color,
  }));

  return (
    <div>
      <h1 className="page-title">자산 현황</h1>

      {snapshots.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📥</div>
          <div style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
            아직 자산 데이터가 없습니다
          </div>
          <a href="/input" className="btn btn-primary">자산 입력하러 가기</a>
        </div>
      )}

      {snapshots.length > 0 && (
        <>
          {/* 총자산 카드 */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="text-muted label">총 자산</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)' }}>
              {formatKRW(summary.total)}
            </div>
            {totalDiff !== null && (
              <div className={`mt-1 ${totalDiff >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: 13 }}>
                {totalDiff >= 0 ? '▲' : '▼'} {formatKRW(Math.abs(totalDiff))} (전 스냅샷 대비)
              </div>
            )}
          </div>

          {/* 분류별 카드 3개 */}
          <div className="grid-3" style={{ marginBottom: 16 }}>
            {ASSET_META.map(({ key, label, color, badge }) => {
              const value = summary[key];
              const ratio = summary.total > 0 ? (value / summary.total) * 100 : 0;
              return (
                <div className="card" key={key}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span className={`badge ${badge}`}>{label}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>{formatPercent(ratio)}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{formatKRW(value)}</div>
                </div>
              );
            })}
          </div>

          {/* 구성원별 카드 */}
          {members.length > 1 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title">구성원별 자산</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {members.map((member) => {
                  const memberSnapshots = latestSnapshots.filter((s) => s.memberId === member.id);
                  const ms = summarizeAssets(memberSnapshots);
                  return (
                    <div
                      key={member.id}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--color-surface2)',
                        borderRadius: 'var(--radius-sm)',
                        minWidth: 180,
                      }}
                    >
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                        {member.name} {member.isOwner && '(본인)'}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{formatKRW(ms.total)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 도넛 + 라인 차트 */}
          <div className="grid-2">
            <div className="card">
              <div className="section-title">자산 비율</div>
              <DonutChart data={donutData} total={summary.total} />
            </div>
            <div className="card">
              <div className="section-title">자산 추이</div>
              <LineChart
                data={history}
                series={ASSET_META.map(({ key, label, color }) => ({ key, label, color }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
