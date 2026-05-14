import type { AssetClass } from '../types';

/**
 * 연금 계좌/상품 식별 키워드 목록.
 * 뱅크샐러드 파일의 상품명·계좌유형이 이 키워드를 포함하면 pension으로 분류.
 */
const PENSION_KEYWORDS = [
  'IRP',
  '개인형IRP',
  '연금저축',
  '퇴직연금',
  '확정기여',
  'DC',
  'ISA',
  '중개형',   // ISA(중개형) 포함
  '연금',
] as const;

/**
 * 현금성 자산 카테고리 헤더 키워드 목록.
 * 뱅크샐러드 재무현황 섹션의 카테고리 레이블 매칭용.
 */
const CASH_CATEGORY_KEYWORDS = [
  '자유입출금',
  '현금 자산',
  '저축성',
  '전자금융',
  '신탁',
] as const;

/** 주어진 텍스트가 연금 관련 키워드를 포함하는지 확인 */
export function isPensionProduct(text: string): boolean {
  const upper = text.toUpperCase();
  return PENSION_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()));
}

/** 주어진 카테고리 헤더가 현금성 자산인지 확인 */
export function isCashCategory(categoryLabel: string): boolean {
  return CASH_CATEGORY_KEYWORDS.some((kw) =>
    categoryLabel.includes(kw),
  );
}

/**
 * 뱅크샐러드 재무현황 섹션의 카테고리 레이블과 상품명을 기반으로 AssetClass 결정.
 * - 연금 자산 카테고리 → pension
 * - 투자성 자산 카테고리 + 연금 키워드 → pension
 * - 투자성 자산 카테고리 (그 외) → stock
 * - 현금성 카테고리 → cash
 */
export function classifyByCategory(
  categoryLabel: string,
  productName: string,
): AssetClass {
  if (categoryLabel.includes('연금')) return 'pension';
  if (categoryLabel.includes('투자성')) {
    return isPensionProduct(productName) ? 'pension' : 'stock';
  }
  if (isCashCategory(categoryLabel)) return 'cash';
  return 'cash';
}

/**
 * 투자현황 섹션의 투자상품종류 텍스트로 AssetClass 결정.
 * - 펀드, 주식 → stock (개별 상품명 연금 키워드 없으면)
 * - 상품명에 연금 키워드 포함 → pension
 */
export function classifyInvestmentProduct(
  productType: string,
  productName: string,
): AssetClass {
  if (isPensionProduct(productName)) return 'pension';
  if (productType === '펀드' || productType === '주식') return 'stock';
  return 'stock';
}
