import { useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import { getLatestSnapshotsPerMember, summarizeAssets, formatKRW, formatPercent } from '../../utils/calculations';

/** 현재 자산 현황을 Claude 분석 프롬프트로 생성하는 함수 */
function buildPrompt(
  members: ReturnType<typeof useAppContext>['state']['members'],
  snapshots: ReturnType<typeof useAppContext>['state']['snapshots'],
  targetRatios: ReturnType<typeof useAppContext>['state']['targetRatios'],
): string {
  const latest = getLatestSnapshotsPerMember(snapshots);
  const summary = summarizeAssets(latest);

  const lines: string[] = [
    '아래는 저의 현재 금융자산 현황입니다. 분석해주시고 리밸런싱 제안을 해주세요.',
    '',
    '## 전체 자산 요약',
    `- 총 자산: ${formatKRW(summary.total)}`,
    `- 현금: ${formatKRW(summary.cash)} (${formatPercent(summary.total > 0 ? (summary.cash / summary.total) * 100 : 0)})`,
    `- 주식: ${formatKRW(summary.stock)} (${formatPercent(summary.total > 0 ? (summary.stock / summary.total) * 100 : 0)})`,
    `- 연금: ${formatKRW(summary.pension)} (${formatPercent(summary.total > 0 ? (summary.pension / summary.total) * 100 : 0)})`,
    '',
    '## 목표 비율',
    `- 현금: ${targetRatios.cash}%`,
    `- 주식: ${targetRatios.stock}%`,
    `- 연금: ${targetRatios.pension}%`,
    '',
  ];

  for (const member of members) {
    const memberSnapshots = latest.filter((s) => s.memberId === member.id);
    if (memberSnapshots.length === 0) continue;
    const ms = summarizeAssets(memberSnapshots);
    lines.push(`## ${member.name}${member.isOwner ? ' (본인)' : ''}`);
    lines.push(`- 합계: ${formatKRW(ms.total)}`);

    for (const snap of memberSnapshots) {
      for (const asset of snap.assets) {
        const returnStr = asset.returnRate != null ? ` (수익률: ${asset.returnRate.toFixed(1)}%)` : '';
        lines.push(`  - [${asset.assetClass === 'cash' ? '현금' : asset.assetClass === 'stock' ? '주식' : '연금'}] ${asset.institution ? asset.institution + ' ' : ''}${asset.productName}: ${formatKRW(asset.balance)}${returnStr}`);
      }
    }
    lines.push('');
  }

  lines.push('## 요청사항');
  lines.push('1. 현재 자산 구성에 대한 전반적인 평가');
  lines.push('2. 목표 비율 달성을 위한 구체적인 리밸런싱 제안 (금액 기준)');
  lines.push('3. 투자 성과가 좋지 않은 항목에 대한 검토 의견');
  lines.push('4. 장기 관점에서의 자산 배분 전략 제안');

  return lines.join('\n');
}

/** Claude 프롬프트 내보내기 및 응답 파일 업로드·저장 컴포넌트 */
export default function ClaudePanel() {
  const { state, dispatch } = useAppContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAnalysis, setShowAnalysis] = useState<string | null>(null);

  const prompt = useMemo(
    () => buildPrompt(state.members, state.snapshots, state.targetRatios),
    [state.members, state.snapshots, state.targetRatios],
  );

  /** 프롬프트를 .txt 파일로 다운로드 */
  function downloadPrompt() {
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude_분석요청_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Claude 응답 .txt 파일을 읽어 분석 이력에 저장 */
  async function handleResponseUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    dispatch({
      type: 'ADD_CLAUDE_ANALYSIS',
      payload: {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        title: `Claude 분석 ${new Date().toLocaleDateString('ko-KR')}`,
        content: text,
      },
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div>
      <h1 className="page-title">Claude 분석</h1>

      {/* 사용 안내 */}
      <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(108,142,247,0.4)' }}>
        <div className="section-title">사용 방법</div>
        <ol style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
          <li>아래 "프롬프트 다운로드" 버튼으로 현황 파일을 받으세요</li>
          <li>Claude 새 채팅에 파일 내용을 붙여넣어 분석을 요청하세요</li>
          <li>Claude 답변을 텍스트 파일(.txt)로 저장하세요</li>
          <li>"응답 파일 업로드" 버튼으로 답변을 이력에 저장하세요</li>
        </ol>
      </div>

      {/* 내보내기 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">프롬프트 생성</div>
        <div style={{ background: 'var(--color-surface2)', borderRadius: 8, padding: 14, marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
          <pre style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{prompt}</pre>
        </div>
        <button className="btn btn-primary" onClick={downloadPrompt}>
          ⬇ 프롬프트 다운로드 (.txt)
        </button>
      </div>

      {/* 응답 업로드 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Claude 응답 업로드</div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md"
          className="input"
          style={{ width: 'auto' }}
          onChange={handleResponseUpload}
        />
      </div>

      {/* 분석 이력 */}
      {state.claudeAnalyses.length > 0 && (
        <div className="card">
          <div className="section-title">분석 이력</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.claudeAnalyses.map((analysis) => (
              <div key={analysis.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div
                  className="flex items-center justify-between"
                  style={{ padding: '10px 14px', background: 'var(--color-surface2)', cursor: 'pointer' }}
                  onClick={() => setShowAnalysis(showAnalysis === analysis.id ? null : analysis.id)}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{analysis.title}</span>
                    <span className="text-muted" style={{ marginLeft: 10, fontSize: 12 }}>{analysis.date}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted" style={{ fontSize: 12 }}>{showAnalysis === analysis.id ? '▲' : '▼'}</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_CLAUDE_ANALYSIS', payload: analysis.id }); }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {showAnalysis === analysis.id && (
                  <div style={{ padding: 14 }}>
                    <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--color-text)' }}>
                      {analysis.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
