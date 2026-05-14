import { useMemo, useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import { getLatestSnapshotsPerMember, formatKRW, formatPercent } from '../../utils/calculations';
import type { AssetClass, StockSubType, PensionSubType, ClassificationOverride } from '../../types';

const CLASS_META: Record<AssetClass, { label: string; badge: string }> = {
  cash: { label: '현금', badge: 'badge-cash' },
  stock: { label: '주식', badge: 'badge-stock' },
  pension: { label: '연금', badge: 'badge-pension' },
};

const STOCK_SUB_OPTIONS: { value: StockSubType; label: string }[] = [
  { value: 'individual', label: '개별종목' },
  { value: 'fund', label: '펀드' },
  { value: 'ai', label: 'AI투자' },
];

const PENSION_SUB_OPTIONS: { value: PensionSubType; label: string }[] = [
  { value: 'dc', label: 'DC형' },
  { value: 'irp', label: 'IRP' },
  { value: 'isa', label: 'ISA' },
  { value: 'pension_savings', label: '연금저축' },
  { value: 'etc', label: '기타' },
];

function getOverrideKey(institution: string, productName: string): string {
  return `${institution}||${productName}`;
}

/** 보유 상품별 투자원금·평가금액·수익률 상세 목록 (분류 수동 수정 가능) */
export default function Portfolio() {
  const { state, dispatch } = useAppContext();
  const [filter, setFilter] = useState<AssetClass | 'all'>('all');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ClassificationOverride>({ assetClass: 'stock' });

  const overrides = state.classificationOverrides ?? {};

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

  function startEdit(institution: string, productName: string, current: ClassificationOverride) {
    const key = getOverrideKey(institution, productName);
    setEditingKey(key);
    setEditForm({ ...current });
  }

  function saveEdit(key: string) {
    dispatch({ type: 'SET_CLASSIFICATION_OVERRIDE', payload: { key, override: editForm } });
    setEditingKey(null);
  }

  function removeOverride(key: string) {
    dispatch({ type: 'REMOVE_CLASSIFICATION_OVERRIDE', payload: key });
  }

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
                  {['분류', '금융기관', '상품명', '구성원', '투자원금', '평가금액', '수익률', '비중', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const overrideKey = getOverrideKey(item.institution, item.productName);
                  const isOverridden = !!overrides[overrideKey];
                  const isEditing = editingKey === overrideKey;
                  const weight = total > 0 ? (item.balance / total) * 100 : 0;

                  if (isEditing) {
                    return (
                      <tr key={i} style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface2)' }}>
                        <td colSpan={9} style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{item.productName}</span>
                            <select
                              className="input"
                              style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                              value={editForm.assetClass}
                              onChange={(e) => setEditForm({ assetClass: e.target.value as AssetClass })}
                            >
                              {(['cash', 'stock', 'pension'] as AssetClass[]).map((c) => (
                                <option key={c} value={c}>{CLASS_META[c].label}</option>
                              ))}
                            </select>
                            {editForm.assetClass === 'stock' && (
                              <select
                                className="input"
                                style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                                value={editForm.stockSubType ?? 'individual'}
                                onChange={(e) => setEditForm({ ...editForm, stockSubType: e.target.value as StockSubType })}
                              >
                                {STOCK_SUB_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            )}
                            {editForm.assetClass === 'pension' && (
                              <select
                                className="input"
                                style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                                value={editForm.pensionSubType ?? 'etc'}
                                onChange={(e) => setEditForm({ ...editForm, pensionSubType: e.target.value as PensionSubType })}
                              >
                                {PENSION_SUB_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            )}
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(overrideKey)}>저장</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingKey(null)}>취소</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '9px 14px' }}>
                        <span className={`badge ${CLASS_META[item.assetClass].badge}`}>{CLASS_META[item.assetClass].label}</span>
                        {isOverridden && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 4 }}>수정됨</span>
                        )}
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
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => startEdit(item.institution, item.productName, {
                            assetClass: item.assetClass,
                            stockSubType: item.stockSubType,
                            pensionSubType: item.pensionSubType,
                          })}
                        >
                          수정
                        </button>
                        {isOverridden && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, marginLeft: 4, color: 'var(--color-text-muted)' }}
                            onClick={() => removeOverride(overrideKey)}
                          >
                            원복
                          </button>
                        )}
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
