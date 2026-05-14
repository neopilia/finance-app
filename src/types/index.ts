/** 자산 분류: 현금성 / 투자성 / 연금 */
export type AssetClass = 'cash' | 'stock' | 'pension';

/** 주식 세부 분류 */
export type StockSubType = 'individual' | 'fund' | 'ai';

/** 연금 세부 분류 */
export type PensionSubType = 'dc' | 'irp' | 'isa' | 'pension_savings' | 'etc';

/** 가족 구성원 */
export interface Member {
  id: string;
  name: string;
  /** 본인 여부 — 뱅크샐러드 파싱 대상 */
  isOwner: boolean;
}

/** 개별 금융 상품 */
export interface AssetItem {
  institution: string;
  accountType: string;
  productName: string;
  assetClass: AssetClass;
  /** 주식일 때 세부 분류 */
  stockSubType?: StockSubType;
  /** 연금일 때 세부 분류 */
  pensionSubType?: PensionSubType;
  /** 평가금액 (원) */
  balance: number;
  /** 투자원금 (투자성·연금 자산에만 존재) */
  costBasis?: number;
  /** 수익률 % */
  returnRate?: number;
}

/** 분류 수동 오버라이드 항목 */
export interface ClassificationOverride {
  assetClass: AssetClass;
  stockSubType?: StockSubType;
  pensionSubType?: PensionSubType;
}

/** 특정 날짜의 자산 스냅샷 (구성원 1명 단위) */
export interface Snapshot {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  memberId: string;
  source: 'banksalad' | 'manual';
  assets: AssetItem[];
}

/** Claude 분석 이력 */
export interface ClaudeAnalysis {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  content: string;
}

/** 목표 수익률 시뮬레이션 설정 */
export interface SimulationConfig {
  /** 목표 연수익률 % */
  targetReturnRate: number;
  /** 시뮬레이션 연수 */
  years: number;
  /** 월 추가 불입액 (원) */
  monthlyAdd: number;
}

/** 전체 앱 상태 */
export interface AppState {
  members: Member[];
  snapshots: Snapshot[];
  /** 현금/주식/연금 목표 비율 (합계 = 100) */
  targetRatios: {
    cash: number;
    stock: number;
    pension: number;
  };
  claudeAnalyses: ClaudeAnalysis[];
  simulation: SimulationConfig;
  /** 수동 분류 오버라이드. key = `${institution}||${productName}` */
  classificationOverrides: Record<string, ClassificationOverride>;
}

/** 자산 분류별 합계 */
export interface AssetSummary {
  cash: number;
  stock: number;
  pension: number;
  total: number;
}

/** 날짜별 전체 자산 합계 (차트용) */
export interface AssetHistory {
  date: string;
  total: number;
  cash: number;
  stock: number;
  pension: number;
  [key: string]: number | string;
}
