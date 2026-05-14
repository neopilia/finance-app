import type { AppState } from '../types';

const STORAGE_KEY = 'finance_app_state';

/** localStorage에서 앱 상태를 읽어 반환하고, 없거나 파싱 실패 시 null 반환 */
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

/** 앱 상태 전체를 localStorage에 JSON 직렬화하여 저장 */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 용량 초과 등 저장 실패는 무시 (조회는 여전히 가능)
  }
}

/** 앱 상태를 JSON 파일로 다운로드 (백업) */
export function exportStateAsJson(state: AppState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** JSON 파일을 읽어 AppState를 반환하고, 파싱 실패 시 null 반환 */
export function importStateFromJson(file: File): Promise<AppState | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target?.result as string) as AppState;
        resolve(state);
      } catch {
        resolve(null);
      }
    };
    reader.readAsText(file);
  });
}
