/**
 * 导出按钮组件
 * Shadow-Bees V52 - Excel/PDF/JSON/CSV 导出
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  FileCode,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  exportToExcel,
  exportTableToPDF,
  exportToJSON,
  exportToCSV,
  exportElementToPDF,
} from '@/utils/exportImport';

export type ExportFormat = 'excel' | 'pdf' | 'json' | 'csv';

interface ExportButtonProps {
  data?: any[];
  filename?: string;
  formats?: ExportFormat[];
  onExport?: (format: ExportFormat) => Promise<void>;
  elementRef?: React.RefObject<HTMLElement>; // PDF 导出用
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const formatConfig = {
  excel: { label: 'Excel', icon: FileSpreadsheet, color: 'text-green-400' },
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-400' },
  json: { label: 'JSON', icon: FileJson, color: 'text-yellow-400' },
  csv: { label: 'CSV', icon: FileCode, color: 'text-blue-400' },
};

export function ExportButton({
  data,
  filename = 'export',
  formats = ['excel', 'pdf', 'csv'],
  onExport,
  elementRef,
  variant = 'secondary',
  size = 'md',
  className = '',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(format);

    try {
      if (onExport) {
        await onExport(format);
      } else {
        switch (format) {
          case 'excel':
            if (data) exportToExcel(data, { filename });
            break;
          case 'csv':
            if (data) exportToCSV(data, filename);
            break;
          case 'json':
            exportToJSON(data || {}, filename);
            break;
          case 'pdf':
            if (elementRef?.current) {
              await exportElementToPDF(elementRef.current, { filename });
            } else if (data) {
              // 简单表格导出
              const columns = Object.keys(data[0] || {}).map((key) => ({
                key: key as any,
                title: key,
              }));
              exportTableToPDF(data, columns, { filename });
            }
            break;
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    primary: 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30',
    secondary: 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary',
    ghost: 'text-text-tertiary hover:text-text-primary hover:bg-white/5',
  };

  return (
    <div ref={buttonRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!!exporting}
        className={`flex items-center gap-2 rounded-lg transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>导出</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-1 py-1 bg-bg-secondary border border-white/10 rounded-lg shadow-xl z-50 min-w-[140px]"
            >
              {formats.map((format) => {
                const config = formatConfig[format];
                const Icon = config.icon;
                const isExporting = exporting === format;

                return (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={!!exporting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                    ) : (
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    )}
                    <span>{isExporting ? '导出中...' : config.label}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// 简化版导出按钮（单一格式）
interface SimpleExportButtonProps {
  data: any[];
  format?: ExportFormat;
  filename?: string;
  className?: string;
}

export function SimpleExportButton({
  data,
  format = 'excel',
  filename = 'export',
  className = '',
}: SimpleExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const config = formatConfig[format];
  const Icon = config.icon;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      switch (format) {
        case 'excel':
          exportToExcel(data, { filename });
          break;
        case 'csv':
          exportToCSV(data, filename);
          break;
        case 'json':
          exportToJSON(data, filename);
          break;
      }
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 ${className}`}
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className={`w-4 h-4 ${config.color}`} />
      )}
      导出{config.label}
    </button>
  );
}

export default ExportButton;
