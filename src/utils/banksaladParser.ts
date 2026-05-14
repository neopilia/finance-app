import * as XLSX from 'xlsx';
import type { AssetItem } from '../types';
import { classifyByCategory, classifyInvestmentProduct } from './assetClassifier';

/** 파싱 결과 */
export interface ParseResult {
  assets: AssetItem[];
  /** 파싱 중 발생한 경고 메시지 목록 */
  warnings: string[];
}

/**
 * 워크시트의 모든 셀 값을 2차원 배열로 추출.
 * null/undefined 셀은 빈 문자열로 처리.
 */
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

/**
 * 특정 마커 텍스트를 포함하는 행 인덱스를 반환.
 * 찾지 못하면 -1 반환.
 */
function findSectionRow(rows: string[][], marker: string): number {
  return rows.findIndex((row) =>
    row.some((cell) => cell.includes(marker)),
  );
}

/**
 * 재무현황 섹션(3.재무현황)을 파싱하여 자산 목록 반환.
 * 실제 파일 컬럼: B(row[0])=카테고리, C(row[1])=상품명, E(row[3])=금액
 * 카테고리 행에 첫 번째 상품이 함께 있는 구조도 처리.
 */
function parseFinancialStatus(rows: string[][], startRow: number): AssetItem[] {
  const items: AssetItem[] = [];
  const endMarkers = ['4.보험현황', '5.투자현황', '총자산'];
  let currentCategory = '';

  for (let i = startRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0]?.trim() ?? '';  // B열: 카테고리/항목
    const col1 = row[1]?.trim() ?? '';  // C열: 상품명
    const col3 = row[3]?.trim() ?? '';  // E열: 금액

    // 다음 섹션 시작 시 중단
    if (endMarkers.some((m) => col0.includes(m))) break;

    // B열에 값이 있으면 카테고리 행
    if (col0 && col0 !== '항목' && !col0.includes('총자산') && !col0.includes('순자산') && !col0.includes('데이터')) {
      currentCategory = col0;
      // 같은 행에 상품도 있으면 바로 추가
      const balance = parseFloat(col3.replace(/,/g, ''));
      if (col1 && !isNaN(balance) && balance >= 0) {
        items.push({
          institution: '',
          accountType: currentCategory,
          productName: col1,
          assetClass: classifyByCategory(currentCategory, col1),
          balance,
        });
      }
      continue;
    }

    // B열이 비어있으면 상품 행
    const balance = parseFloat(col3.replace(/,/g, ''));
    if (col1 && !isNaN(balance) && balance >= 0) {
      items.push({
        institution: '',
        accountType: currentCategory,
        productName: col1,
        assetClass: classifyByCategory(currentCategory, col1),
        balance,
      });
    }
  }
  return items;
}

/**
 * 투자현황 섹션(5.투자현황)을 파싱하여 투자원금·수익률 정보를 보완한 자산 목록 반환.
 * 실제 파일 컬럼: B(row[0])=투자상품종류, C(row[1])=금융사, D(row[2])=상품명,
 *                 F(row[4])=투자원금, G(row[5])=평가금액, H(row[6])=수익률
 */
function parseInvestmentDetail(rows: string[][], startRow: number): AssetItem[] {
  const items: AssetItem[] = [];
  const endMarkers = ['6.대출현황', '총계'];

  for (let i = startRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0]?.trim() ?? '';  // B열: 투자상품종류
    const col1 = row[1]?.trim() ?? '';  // C열: 금융사
    const col2 = row[2]?.trim() ?? '';  // D열: 상품명
    const col4 = row[4]?.trim() ?? '';  // F열: 투자원금
    const col5 = row[5]?.trim() ?? '';  // G열: 평가금액
    const col6 = row[6]?.trim() ?? '';  // H열: 수익률

    if (endMarkers.some((m) => col0.includes(m) || col1.includes(m))) break;

    // 헤더 행 건너뜀
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
      balance,
      costBasis: isNaN(costBasis) ? undefined : costBasis,
      returnRate: isNaN(returnRate) ? undefined : returnRate,
    });
  }
  return items;
}

/**
 * 뱅크샐러드 내보내기 .xlsx 파일을 파싱하여 자산 목록과 경고를 반환.
 * - '뱅샐현황' 시트의 '3.재무현황', '5.투자현황' 섹션을 순서대로 파싱
 * - 투자현황 데이터가 있으면 재무현황의 투자성 항목을 대체 (기관명·원금·수익률 포함)
 * - 섹션 마커를 찾지 못하면 warnings에 기록하고 빈 배열 반환
 */
export async function parseBanksaladFile(file: File): Promise<ParseResult> {
  const warnings: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find((n) => n.includes('뱅샐현황') || n.includes('현황'));
  if (!sheetName) {
    warnings.push("'뱅샐현황' 시트를 찾을 수 없습니다. 뱅크샐러드 내보내기 파일인지 확인하세요.");
    return { assets: [], warnings };
  }

  const ws = wb.Sheets[sheetName];
  const rows = sheetToRows(ws);

  // 3.재무현황 파싱
  const financialRow = findSectionRow(rows, '3.재무현황');
  let financialAssets: AssetItem[] = [];
  if (financialRow === -1) {
    warnings.push("'3.재무현황' 섹션을 찾을 수 없습니다.");
  } else {
    financialAssets = parseFinancialStatus(rows, financialRow);
  }

  // 5.투자현황 파싱
  const investmentRow = findSectionRow(rows, '5.투자현황');
  let investmentAssets: AssetItem[] = [];
  if (investmentRow === -1) {
    warnings.push("'5.투자현황' 섹션을 찾을 수 없습니다.");
  } else {
    investmentAssets = parseInvestmentDetail(rows, investmentRow);
  }

  // 현금: 재무현황에서
  // 연금: 재무현황에서 (투자현황에 연금 항목이 없음)
  // 주식/펀드: 투자현황에서 (기관명·원금·수익률 포함). 없으면 재무현황 fallback.
  const cashAssets = financialAssets.filter((a) => a.assetClass === 'cash');
  const pensionAssets = financialAssets.filter((a) => a.assetClass === 'pension');
  const stockAssets =
    investmentAssets.length > 0
      ? investmentAssets
      : financialAssets.filter((a) => a.assetClass === 'stock');

  const assets = [...cashAssets, ...stockAssets, ...pensionAssets].filter((a) => a.balance > 0);

  if (assets.length === 0) {
    warnings.push('파싱된 자산 항목이 없습니다. 파일 형식을 확인하세요.');
  }

  return { assets, warnings };
}
