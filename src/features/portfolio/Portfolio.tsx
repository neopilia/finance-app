import { useMemo, useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import { getLatestSnapshotsPerMember, formatKRW, formatPercent } from '../../utils/calculations';
import type { AssetClass } from '../../types';

const CLASS_META: Record<AssetClass, { label: string; badge: string }> = {
  cash: { label: '현금', badge: 'badge-cash' },
  stock: { label: '주식', badge: 'badge-stock' },
  pension: { label: '연금', badge: 'badge-pension' },
};

/** 보유 상품별 투자원금·평가금액·수익률 상세 목록 */
export default function Portfolio() {
  const { state } = useAppContext();
  const [filter, setFilter] = useState<AssetClass | 'all'>('all');

  const latest = useMemo(
    () => getLatestSnapshotsPerMember(state.snapshots),
    [state.snapshots],
  );

  const allItems = useMemo(
    () => latest.flatMap((s) => s.assets.map((a) => ({ ...a, memberId: s.memberId }))),
    [latest],
  );

  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? id;

  const filtered = filter === 'all' ? allItems : allItems.filter((a) => a.assetClass === filter);
  const total = filtered.reduce((sum, a) => sum + a.balance, 0);
  const totalCost = filtered.reduce((sum, a) => sum + (a.costBasis ?? 0), 0);
  const overallReturn = totalCost > 0 ? ((total - totalCost) / totalCost) * 100 : null;

  return (
    <div>
      <h1 className="page-title">포트폴리오</h1>

      {allItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="text-muted">자산을 먼저 입력하세요</div>
        </div>
      ) : (
        <>
          {/* 요약 */}
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="label">평가 총액</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{formatKRW(total)}</div>
            </div>
            <div className="card">
              <div className="label">투자 원금</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{totalCost > 0 ? formatKRW(totalCost) : '-'}</div>
            </div>
            <div className="card">
              <div className="label">전체 수익률</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: overallReturn != null && overallReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {overallReturn != null ? `${overallReturn >= 0 ? '+' : ''}${overallReturn.toFixed(1)}%` : '-'}
              </div>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex gap-2" style={{ marginBottom: 12 }}>
            {(['all', 'cash', 'stock', 'pension'] as const).map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '전체' : CLASS_META[f].label}
              </button>
            ))}
          </div>

          {/* 상품 목록 */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)' }}>
                  {['분류', '금융기관', '상품명', '구성원', '투자원금', '평가금액', '수익률', '비중'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const weight = total > 0 ? (item.balance / total) * 100 : 0;
                  return (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '9px 14px' }}>
                        <span className={`badge ${CLASS_META[item.assetClass].badge}`}>{CLASS_META[item.assetClass].label}</span>
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 13 }}>{item.institution || '-'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>{item.productName}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>{memberName(item.memberId)}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13 }}>{item.costBasis != null ? formatKRW(item.costBasis) : '-'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>{formatKRW(item.balance)}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, color: item.returnRate != null && item.returnRate >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {item.returnRate != null ? `${item.returnRate >= 0 ? '+' : ''}${item.returnRate.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {formatPercent(weight)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
