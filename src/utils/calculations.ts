import type { Snapshot, AssetSummary, AssetHistory, AppState } from '../types';

/**
 * 스냅샷 배열에서 특정 구성원들의 자산을 AssetClass별로 합산.
 * memberIds가 비어 있으면 전체 구성원 합산.
 */
export function summarizeAssets(
  snapshots: Snapshot[],
  memberIds?: string[],
): AssetSummary {
  const filtered = memberIds?.length
    ? snapshots.filter((s) => memberIds.includes(s.memberId))
    : snapshots;

  const summary: AssetSummary = { cash: 0, stock: 0, pension: 0, total: 0 };

  for (const snapshot of filtered) {
    for (const asset of snapshot.assets) {
      summary[asset.assetClass] += asset.balance;
      summary.total += asset.balance;
    }
  }

  return summary;
}

/**
 * 전체 스냅샷에서 날짜별 가장 최신 스냅샷을 구성원별로 선택하여
 * 날짜 기준 자산 이력 배열 반환 (차트용).
 * 날짜 오름차순 정렬.
 */
export function buildAssetHistory(snapshots: Snapshot[]): AssetHistory[] {
  // 날짜 집합 수집
  const dates = Array.from(new Set(snapshots.map((s) => s.date))).sort();

  return dates.map((date) => {
    // 해당 날짜까지의 각 구성원별 최신 스냅샷 선택
    const relevantSnapshots = getLatestSnapshotsPerMember(snapshots, date);
    const summary = summarizeAssets(relevantSnapshots);
    return { date, ...summary };
  });
}

/**
 * 주어진 날짜(포함) 이전의 스냅샷 중 구성원별 가장 최신 스냅샷을 반환.
 * 전체 자산 현황 표시 시 날짜가 다른 구성원들의 데이터를 합산하는 데 사용.
 */
export function getLatestSnapshotsPerMember(
  snapshots: Snapshot[],
  upToDate?: string,
): Snapshot[] {
  const cutoff = upToDate ?? '9999-12-31';
  const eligibleSnapshots = snapshots.filter((s) => s.date <= cutoff);

  const latestByMember = new Map<string, Snapshot>();
  for (const snapshot of eligibleSnapshots) {
    const existing = latestByMember.get(snapshot.memberId);
    if (!existing || snapshot.date > existing.date) {
      latestByMember.set(snapshot.memberId, snapshot);
    }
  }

  return Array.from(latestByMember.values());
}

/**
 * 현재 자산 합계와 목표 비율을 기반으로 리밸런싱 필요 금액 계산.
 * 반환값: 각 자산 분류별 현재 금액, 목표 금액, 차이 금액.
 */
export function calculateRebalancing(
  summary: AssetSummary,
  targetRatios: AppState['targetRatios'],
): {
  cash: { current: number; target: number; diff: number };
  stock: { current: number; target: number; diff: number };
  pension: { current: number; target: number; diff: number };
} {
  const { total } = summary;
  const targetCash = (total * targetRatios.cash) / 100;
  const targetStock = (total * targetRatios.stock) / 100;
  const targetPension = (total * targetRatios.pension) / 100;

  return {
    cash: { current: summary.cash, target: targetCash, diff: targetCash - summary.cash },
    stock: { current: summary.stock, target: targetStock, diff: targetStock - summary.stock },
    pension: { current: summary.pension, target: targetPension, diff: targetPension - summary.pension },
  };
}

/**
 * 복리 기반 미래 자산 가치 시뮬레이션.
 * 월 추가 불입이 있으면 미래가치에 더함.
 * 반환값: 연도별 예상 자산 배열 (연도, 금액).
 */
export function simulateFutureValue(
  currentTotal: number,
  targetReturnRate: number,
  years: number,
  monthlyAdd: number,
): Array<{ year: number; value: number }> {
  const annualRate = targetReturnRate / 100;
  const monthlyRate = annualRate / 12;
  const result: Array<{ year: number; value: number }> = [];

  for (let y = 1; y <= years; y++) {
    const months = y * 12;
    // 현재 자산 복리 증가
    const principal = currentTotal * Math.pow(1 + annualRate, y);
    // 월 불입 미래가치 (등비수열 합)
    const additionalFV =
      monthlyAdd > 0 && monthlyRate > 0
        ? monthlyAdd * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
        : monthlyAdd * months;

    result.push({ year: y, value: Math.round(principal + additionalFV) });
  }

  return result;
}

/** 원화 포맷 (ex: 1,234,567원) */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + '원';
}

/** 억/만 단위 축약 포맷 (차트 축 등에 사용) */
export function formatKRWShort(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만`;
  }
  return String(Math.round(amount));
}

/** 비율 포맷 (소수점 1자리) */
export function formatPercent(ratio: number): string {
  return ratio.toFixed(1) + '%';
}
