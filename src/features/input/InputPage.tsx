import { useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import BanksaladUpload from './BanksaladUpload';
import ManualInput from './ManualInput';

/** 구성원 선택 후 뱅크샐러드 업로드 또는 수동입력 탭으로 자산을 입력하는 페이지 */
export default function InputPage() {
  const { state } = useAppContext();
  const { members } = state;
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? '');
  const [tab, setTab] = useState<'banksalad' | 'manual'>('banksalad');

  const owner = members.find((m) => m.isOwner);
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // 자동으로 본인 선택
  const effectiveMemberId = selectedMemberId || owner?.id || '';

  if (members.length === 0) {
    return (
      <div>
        <h1 className="page-title">자산 입력</h1>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="text-muted" style={{ marginBottom: 12 }}>먼저 설정에서 구성원을 추가하세요</div>
          <a href="/settings" className="btn btn-primary">설정으로 가기</a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">자산 입력</h1>

      {/* 구성원 선택 */}
      {members.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="label">구성원 선택</label>
          <div className="flex gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                className={`btn ${effectiveMemberId === m.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSelectedMemberId(m.id)}
              >
                {m.name} {m.isOwner && '(본인)'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex gap-2" style={{ marginBottom: 20 }}>
          <button
            className={`btn ${tab === 'banksalad' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('banksalad')}
          >
            뱅크샐러드 업로드
          </button>
          <button
            className={`btn ${tab === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('manual')}
          >
            직접 입력 {selectedMember && !selectedMember.isOwner && '(가족)'}
          </button>
        </div>

        {tab === 'banksalad' ? (
          <BanksaladUpload memberId={effectiveMemberId} />
        ) : (
          <ManualInput memberId={effectiveMemberId} />
        )}
      </div>

      {/* 스냅샷 이력 */}
      <SnapshotHistory />
    </div>
  );
}

/** 저장된 스냅샷 이력 목록 및 삭제 기능 */
function SnapshotHistory() {
  const { state, dispatch } = useAppContext();
  const { snapshots, members } = state;

  if (snapshots.length === 0) return null;

  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title">스냅샷 이력</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((snap) => {
          const total = snap.assets.reduce((sum, a) => sum + a.balance, 0);
          return (
            <div
              key={snap.id}
              className="flex items-center justify-between"
              style={{ padding: '10px 14px', background: 'var(--color-surface2)', borderRadius: 8 }}
            >
              <div>
                <span style={{ fontWeight: 500 }}>{snap.date}</span>
                <span className="text-muted" style={{ marginLeft: 10, fontSize: 13 }}>
                  {getMemberName(snap.memberId)} · {snap.source === 'banksalad' ? '뱅크샐러드' : '수동입력'} · {snap.assets.length}개 항목 · {total.toLocaleString()}원
                </span>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => dispatch({ type: 'DELETE_SNAPSHOT', payload: snap.id })}
              >
                삭제
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
