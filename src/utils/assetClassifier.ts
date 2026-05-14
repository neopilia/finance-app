import type { AssetClass, StockSubType, PensionSubType } from '../types';

const PENSION_KEYWORDS = [
  'IRP',
  '개인형IRP',
  '연금저축',
  '퇴직연금',
  '확정기여',
  'DC',
  'ISA',
  '중개형',
  '연금',
] as const;

const CASH_CATEGORY_KEYWORDS = [
  '자유입출금',
  '현금 자산',
  '저축성',
  '전자금융',
  '신탁',
] as const;

/** 주식 계좌 예수금으로 처리할 상품명 목록 (현금으로 분류) */
const DEPOSIT_ACCOUNT_NAMES = [
  '기본계좌', '위탁', '위탁계좌', '수신', '종합', '종합매매', '수시입출금',
];

export function isPensionProduct(text: string): boolean {
  const upper = text.toUpperCase();
  return PENSION_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()));
}

export function isCashCategory(categoryLabel: string): boolean {
  return CASH_CATEGORY_KEYWORDS.some((kw) => categoryLabel.includes(kw));
}

/** 예수금 계좌명 여부 (주식 계좌 내 현금) */
function isDepositAccount(productName: string): boolean {
  return DEPOSIT_ACCOUNT_NAMES.some(
    (name) => productName === name || productName.startsWith(name + ' '),
  );
}

export function classifyByCategory(
  categoryLabel: string,
  productName: string,
): AssetClass {
  if (categoryLabel.includes('연금')) return 'pension';
  if (categoryLabel.includes('투자성')) {
    if (isDepositAccount(productName)) return 'cash';
    return isPensionProduct(productName) ? 'pension' : 'stock';
  }
  if (isCashCategory(categoryLabel)) return 'cash';
  return 'cash';
}

export function classifyInvestmentProduct(
  productType: string,
  productName: string,
): AssetClass {
  if (isPensionProduct(productName)) return 'pension';
  if (productType === '펀드' || productType === '주식') return 'stock';
  return 'stock';
}

/** 투자현황의 투자상품종류로 주식 세부 분류 결정 */
export function getStockSubType(productType: string): StockSubType {
  if (productType === '펀드') return 'fund';
  return 'individual';
}

/** 상품명으로 연금 세부 분류 결정 */
export function getPensionSubType(productName: string): PensionSubType {
  const upper = productName.toUpperCase();
  if (upper.includes('확정기여') || upper.includes('DC형') || productName === '확정기여형(DC)') return 'dc';
  if (upper.includes('IRP')) return 'irp';
  if (upper.includes('ISA')) return 'isa';
  if (upper.includes('연금저축')) return 'pension_savings';
  return 'etc';
}
