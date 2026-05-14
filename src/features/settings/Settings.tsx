import { useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import { exportStateAsJson, importStateFromJson } from '../../utils/storage';

/** 가족 구성원 관리 및 데이터 백업/복원 설정 페이지 */
export default function Settings() {
  const { state, dispatch } = useAppContext();
  const { members } = state;
  const [newName, setNewName] = useState('');
  const [importMsg, setImportMsg] = useState('');

  function addMember() {
    const name = newName.trim();
    if (!name) return;
    const isFirstMember = members.length === 0;
    dispatch({
      type: 'ADD_MEMBER',
      payload: { id: `m_${Date.now()}`, name, isOwner: isFirstMember },
    });
    setNewName('');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const imported = await importStateFromJson(file);
    if (imported) {
      dispatch({ type: 'IMPORT_STATE', payload: imported });
      setImportMsg('✅ 데이터 복원 완료');
    } else {
      setImportMsg('❌ 파일 형식 오류');
    }
    setTimeout(() => setImportMsg(''), 3000);
  }

  return (
    <div>
      <h1 className="page-title">설정</h1>

      {/* 구성원 관리 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">가족 구성원</div>

        {members.length === 0 && (
          <div className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
            구성원을 추가하면 자산 입력을 시작할 수 있습니다. 첫 번째로 추가된 구성원이 본인(뱅크샐러드 업로드 대상)으로 설정됩니다.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between"
              style={{ padding: '10px 14px', background: 'var(--color-surface2)', borderRadius: 8 }}
            >
              <div>
                <span style={{ fontWeight: 500 }}>{m.name}</span>
                {m.isOwner && <span className="badge badge-cash" style={{ marginLeft: 8 }}>본인</span>}
              </div>
              {!m.isOwner && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => dispatch({ type: 'DELETE_MEMBER', payload: m.id })}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="input"
            style={{ maxWidth: 200 }}
            placeholder="이름 입력"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMember()}
          />
          <button className="btn btn-primary" onClick={addMember}>추가</button>
        </div>
      </div>

      {/* 데이터 백업 / 복원 */}
      <div className="card">
        <div className="section-title">데이터 백업 / 복원</div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          데이터는 브라우저 localStorage에 저장됩니다. 브라우저 데이터 초기화 전에 백업하세요.
        </div>
        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => exportStateAsJson(state)}>
            ⬇ JSON 백업
          </button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            ⬆ JSON 복원
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
        </div>
        {importMsg && (
          <div className="mt-2" style={{ fontSize: 13, color: importMsg.startsWith('✅') ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {importMsg}
          </div>
        )}
      </div>
    </div>
  );
}
