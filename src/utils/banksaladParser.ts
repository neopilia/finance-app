import * as XLSX from 'xlsx';
import type { AssetItem, ClassificationOverride } from '../types';
import {
  classifyByCategory,
  classifyInvestmentProduct,
  getStockSubType,
  getPensionSubType,
} from './assetClassifier';

/** 파싱 결과 */
export interface ParseResult {
  assets: AssetItem[];
  warnings: string[];
}

function sheetToRows(ws: XLSX.WorkSheet): string[][] {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? String(cell.v ?? '') : '');
    }
    rows.push(row);
  }
  return rows;
}

function findSectionRow(rows: string[][], marker: string): number {
  return rows.findIndex((row) => row.some((cell) => cell.includes(marker)));
}

/**
 * 재무현황 섹션(3.재무현황) 파싱.
 * 컬럼: B(row[0])=카테고리, C(row[1])=상품명, E(row[3])=금액
 * 카테고리 행에 첫 상품이 함께 있는 구조 처리.
 */
function parseFinancialStatus(rows: string[][], startRow: number): AssetItem[] {
  const items: AssetItem[] = [];
  const endMarkers = ['4.보험현황', '5.투자현황', '총자산'];
  let currentCategory = '';

  for (let i = startRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0]?.trim() ?? '';
    const col1 = row[1]?.trim() ?? '';
    const col3 = row[3]?.trim() ?? '';

    if (endMarkers.some((m) => col0.includes(m))) break;

    if (col0 && col0 !== '항목' && !col0.includes('총자산') && !col0.includes('순자산') && !col0.includes('데이터')) {
      currentCategory = col0;
      const balance = parseFloat(col3.replace(/,/g, ''));
      if (col1 && !isNaN(balance) && balance >= 0) {
        const assetClass = classifyByCategory(currentCategory, col1);
        items.push({
          institution: '',
          accountType: currentCategory,
          productName: col1,
          assetClass,
          pensionSubType: assetClass === 'pension' ? getPensionSubType(col1) : undefined,
          balance,
        });
      }
      continue;
    }

    const balance = parseFloat(col3.replace(/,/g, ''));
    if (col1 && !isNaN(balance) && balance >= 0) {
      const assetClass = classifyByCategory(currentCategory, col1);
      items.push({
        institution: '',
        accountType: currentCategory,
        productName: col1,
        assetClass,
        pensionSubType: assetClass === 'pension' ? getPensionSubType(col1) : undefined,
        balance,
      });
    }
  }
  return items;
}

/**
 * 투자현황 섹션(5.투자현황) 파싱.
 * 컬럼: B(row[0])=투자상품종류, C(row[1])=금융사, D(row[2])=상품명,
 *       F(row[4])=투자원금, G(row[5])=평가금액, H(row[6])=수익률
 */
function parseInvestmentDetail(rows: string[][], startRow: number): AssetItem[] {
  const items: AssetItem[] = [];
  const endMarkers = ['6.대출현황', '총계'];

  for (let i = startRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0]?.trim() ?? '';
    const col1 = row[1]?.trim() ?? '';
    const col2 = row[2]?.trim() ?? '';
    const col4 = row[4]?.trim() ?? '';
    const col5 = row[5]?.trim() ?? '';
    const col6 = row[6]?.trim() ?? '';

    if (endMarkers.some((m) => col0.includes(m) || col1.includes(m))) break;
    if (col0 === '투자상품종류') continue;

    const balance = parseFloat(col5.replace(/,/g, ''));
    if (!col2 || isNaN(balance)) continue;

    const costBasis = parseFloat(col4.replace(/,/g, ''));
    const returnRate = parseFloat(col6.replace(/,/g, ''));
    const assetClass = classifyInvestmentProduct(col0, col2);

    items.push({
      institution: col1,
      accountType: col0,
      productName: col2,
      assetClass,
      stockSubType: assetClass === 'stock' ? getStockSubType(col0) : undefined,
      pensionSubType: assetClass === 'pension' ? getPensionSubType(col2) : undefined,
      balance,
      costBasis: isNaN(costBasis) ? undefined : costBasis,
      returnRate: isNaN(returnRate) ? undefined : returnRate,
    });
  }
  return items;
}

/** 오버라이드 맵을 각 자산 항목에 적용 */
function applyOverrides(
  assets: AssetItem[],
  overrides: Record<string, ClassificationOverride>,
): AssetItem[] {
  return assets.map((asset) => {
    const key = `${asset.institution}||${asset.productName}`;
    const override = overrides[key];
    if (!override) return asset;
    return { ...asset, ...override };
  });
}

/**
 * 뱅크샐러드 내보내기 .xlsx 파일을 파싱하여 자산 목록과 경고를 반환.
 * overrides가 주어지면 파싱 후 해당 오버라이드를 적용.
 */
export async function parseBanksaladFile(
  file: File,
  overrides: Record<string, ClassificationOverride> = {},
): Promise<ParseResult> {
  const warnings: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find((n) => n.includes('뱅샐현황') || n.includes('현황'));
  if (!sheetName) {
    warnings.push("'뱅샐현황' 시트를 찾을 수 없습니다.");
    return { assets: [], warnings };
  }

  const ws = wb.Sheets[sheetName];
  const rows = sheetToRows(ws);

  const financialRow = findSectionRow(rows, '3.재무현황');
  let financialAssets: AssetItem[] = [];
  if (financialRow === -1) {
    warnings.push("'3.재무현황' 섹션을 찾을 수 없습니다.");
  } else {
    financialAssets = parseFinancialStatus(rows, financialRow);
  }

  const investmentRow = findSectionRow(rows, '5.투자현황');
  let investmentAssets: AssetItem[] = [];
  if (investmentRow === -1) {
    warnings.push("'5.투자현황' 섹션을 찾을 수 없습니다.");
  } else {
    investmentAssets = parseInvestmentDetail(rows, investmentRow);
  }

  const cashAssets = financialAssets.filter((a) => a.assetClass === 'cash');
  const pensionAssets = financialAssets.filter((a) => a.assetClass === 'pension');
  const stockAssets =
    investmentAssets.length > 0
      ? investmentAssets
      : financialAssets.filter((a) => a.assetClass === 'stock');

  let assets = [...cashAssets, ...stockAssets, ...pensionAssets].filter((a) => a.balance > 0);

  if (Object.keys(overrides).length > 0) {
    assets = applyOverrides(assets, overrides);
  }

  if (assets.length === 0) {
    warnings.push('파싱된 자산 항목이 없습니다. 파일 형식을 확인하세요.');
  }

  return { assets, warnings };
}
