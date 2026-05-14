import { useState, useRef } from 'react';
import { useAppContext } from '../../store/AppContext';
import { parseBanksaladFile } from '../../utils/banksaladParser';
import type { AssetItem } from '../../types';

const ASSET_CLASS_LABEL: Record<string, string> = {
  cash: '현금',
  stock: '주식',
  pension: '연금',
};

/** 뱅크샐러드 .xlsx 파일을 업로드하고 파싱 미리보기 후 저장하는 컴포넌트 */
export default function BanksaladUpload({ memberId }: { memberId: string }) {
  const { state, dispatch } = useAppContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<AssetItem[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  /** 파일 선택 시 파싱 후 미리보기 표시 */
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setSaved(false);
    const result = await parseBanksaladFile(file, state.classificationOverrides ?? {});
    setPreview(result.assets);
    setWarnings(result.warnings);
    setLoading(false);
  }

  /** 미리보기 확인 후 스냅샷으로 저장 */
  function handleSave() {
    if (!preview) return;
    dispatch({
      type: 'ADD_SNAPSHOT',
      payload: {
        id: `${memberId}_${date}_${Date.now()}`,
        date,
        memberId,
        source: 'banksalad',
        assets: preview,
      },
    });
    setSaved(true);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="label">기준 날짜</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label className="label">뱅크샐러드 .xlsx 파일</label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="input"
            onChange={handleFile}
          />
        </div>
      </div>

      {loading && <div className="text-muted">파싱 중...</div>}

      {warnings.length > 0 && (
        <div style={{ background: '#2d1f0f', border: '1px solid #7c4a1a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ color: '#fb923c', fontSize: 13 }}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {saved && (
        <div style={{ color: 'var(--color-success)', fontSize: 13, marginBottom: 12 }}>
          ✅ 저장 완료
        </div>
      )}

      {preview && preview.length > 0 && (
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>파싱 결과 {preview.length}개 항목</span>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              이 데이터로 저장
            </button>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', position: 'sticky', top: 0 }}>
                  {['분류', '금융기관', '상품명', '평가금액', '수익률'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((item, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '7px 12px' }}>
                      <span className={`badge badge-${item.assetClass}`}>{ASSET_CLASS_LABEL[item.assetClass]}</span>
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{item.institution || '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{item.productName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{item.balance.toLocaleString()}원</td>
                    <td style={{ padding: '7px 12px', fontSize: 13, color: item.returnRate != null && item.returnRate >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {item.returnRate != null ? `${item.returnRate.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
