/**
 * 数据导入导出工具
 * Shadow-Bees V52 - Excel/PDF/JSON
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================
// Excel 导出
// ============================================

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const { filename = 'export', sheetName = 'Sheet1' } = options;

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 自动调整列宽
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}_${formatDate(new Date())}.xlsx`);
}

// 导出多个 Sheet
export function exportMultiSheet(
  sheets: Record<string, any[]>,
  filename = 'export'
): void {
  const wb = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([name, data]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  XLSX.writeFile(wb, `${filename}_${formatDate(new Date())}.xlsx`);
}

// ============================================
// Excel 导入
// ============================================

export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Excel 解析失败'));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

// ============================================
// PDF 导出
// ============================================

interface PDFOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
}

// 从 DOM 元素导出 PDF
export async function exportElementToPDF(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const { filename = 'export', title, orientation = 'portrait' } = options;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

  const imgX = (pdfWidth - imgWidth * ratio) / 2;
  let imgY = 10;

  // 添加标题
  if (title) {
    pdf.setFontSize(16);
    pdf.text(title, pdfWidth / 2, 10, { align: 'center' });
    imgY = 20;
  }

  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
  pdf.save(`${filename}_${formatDate(new Date())}.pdf`);
}

// 简单表格导出 PDF
export function exportTableToPDF<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; title: string }[],
  options: PDFOptions = {}
): void {
  const { filename = 'export', title } = options;

  const pdf = new jsPDF({ orientation: 'landscape' });

  if (title) {
    pdf.setFontSize(16);
    pdf.text(title, 14, 20);
  }

  // 表头
  const headers = columns.map((c) => c.title);
  const rows = data.map((item) => columns.map((c) => String(item[c.key] || '')));

  (pdf as any).autoTable({
    head: [headers],
    body: rows,
    startY: title ? 30 : 20,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  pdf.save(`${filename}_${formatDate(new Date())}.pdf`);
}

// ============================================
// JSON 导出/导入（配置备份）
// ============================================

export function exportToJSON(data: any, filename = 'config'): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${formatDate(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importFromJSON<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (error) {
        reject(new Error('JSON 解析失败'));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

// ============================================
// CSV 导出
// ============================================

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename = 'export'
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((key) => {
          const value = row[key];
          // 处理包含逗号或引号的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${formatDate(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// 工具函数
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 验证导入文件
export function validateImportFile(
  file: File,
  options: {
    maxSize?: number; // MB
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 10, allowedTypes = ['.xlsx', '.xls', '.csv', '.json'] } = options;

  if (!allowedTypes.some((type) => file.name.toLowerCase().endsWith(type))) {
    return {
      valid: false,
      error: `仅支持 ${allowedTypes.join(', ')} 格式`,
    };
  }

  if (file.size > maxSize * 1024 * 1024) {
    return {
      valid: false,
      error: `文件大小不能超过 ${maxSize}MB`,
    };
  }

  return { valid: true };
}
