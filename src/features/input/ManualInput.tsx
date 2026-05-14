import { useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import type { AssetItem, AssetClass } from '../../types';

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: 'cash', label: '현금' },
  { value: 'stock', label: '주식' },
  { value: 'pension', label: '연금' },
];

const EMPTY_ITEM: Omit<AssetItem, 'assetClass'> & { assetClass: AssetClass } = {
  institution: '',
  accountType: '',
  productName: '',
  assetClass: 'cash',
  balance: 0,
};

/** 구성원 1명의 자산을 수동으로 행 단위로 입력하는 컴포넌트 */
export default function ManualInput({ memberId }: { memberId: string }) {
  const { dispatch } = useAppContext();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<AssetItem[]>([{ ...EMPTY_ITEM }]);
  const [saved, setSaved] = useState(false);

  function updateItem(index: number, field: keyof AssetItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addRow() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  /** 입력된 행을 스냅샷으로 저장 */
  function handleSave() {
    const valid = items.filter((item) => item.productName && item.balance > 0);
    if (valid.length === 0) return;
    dispatch({
      type: 'ADD_SNAPSHOT',
      payload: {
        id: `${memberId}_${date}_${Date.now()}`,
        date,
        memberId,
        source: 'manual',
        assets: valid,
      },
    });
    setSaved(true);
    setItems([{ ...EMPTY_ITEM }]);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label className="label">기준 날짜</label>
        <input
          type="date"
          className="input"
          style={{ width: 180 }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface2)' }}>
              {['분류', '금융기관', '계좌유형', '상품명', '금액 (원)', ''].map((h) => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '6px 8px' }}>
                  <select
                    className="input"
                    style={{ width: 80 }}
                    value={item.assetClass}
                    onChange={(e) => updateItem(i, 'assetClass', e.target.value as AssetClass)}
                  >
                    {ASSET_CLASS_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input className="input" placeholder="예: 토스뱅크" value={item.institution} onChange={(e) => updateItem(i, 'institution', e.target.value)} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input className="input" placeholder="예: IRP" value={item.accountType} onChange={(e) => updateItem(i, 'accountType', e.target.value)} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input className="input" placeholder="상품명 *" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    style={{ width: 140 }}
                    value={item.balance || ''}
                    onChange={(e) => updateItem(i, 'balance', Number(e.target.value))}
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <button className="btn btn-danger btn-sm" onClick={() => removeRow(i)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="btn btn-ghost btn-sm" onClick={addRow}>+ 행 추가</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>저장</button>
        {saved && <span className="text-success" style={{ fontSize: 13 }}>✅ 저장 완료</span>}
      </div>
    </div>
  );
}
