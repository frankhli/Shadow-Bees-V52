/**
 * 可排序表格组件
 * 支持表头点击排序、加载状态、空状态
 */

import { useState, useMemo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ux/Skeleton';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export interface Column<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  sorter?: (a: T, b: T) => number;
}

interface SortableTableProps<T> {
  // 数据
  data: T[];
  // 列配置
  columns: Column<T>[];
  // 加载状态
  loading?: boolean;
  // 加载行数
  loadingRows?: number;
  // 空状态提示
  emptyMessage?: string;
  // 自定义空状态
  emptyComponent?: ReactNode;
  // 行点击
  onRowClick?: (row: T, index: number) => void;
  // 行样式
  rowClassName?: (row: T, index: number) => string;
  // 默认排序
  defaultSort?: SortConfig<T>;
  // 动画延迟
  animateDelay?: number;
  // 行 key
  rowKey: keyof T | ((row: T) => string);
}

export function SortableTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  loadingRows = 5,
  emptyMessage = '暂无数据',
  emptyComponent,
  onRowClick,
  rowClassName,
  defaultSort,
  animateDelay = 0,
  rowKey,
}: SortableTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | undefined>(defaultSort);

  // 处理排序
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const key = column.key;
    let direction: SortDirection = 'asc';

    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    setSortConfig(direction ? { key, direction } : undefined);
  };

  // 获取排序图标
  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;

    if (sortConfig?.key !== column.key || !sortConfig.direction) {
      return <ArrowUpDown size={14} className="text-gray-600 opacity-0 group-hover:opacity-50 transition-opacity" />;
    }

    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="text-neon-cyan" />
      : <ChevronDown size={14} className="text-neon-cyan" />;
  };

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) return data;

    const { key, direction } = sortConfig;
    const column = columns.find(c => c.key === key);

    return [...data].sort((a, b) => {
      let comparison = 0;

      // 使用自定义排序函数
      if (column?.sorter) {
        comparison = column.sorter(a, b);
      } else {
        // 默认排序
        const aVal = a[key as keyof T];
        const bVal = b[key as keyof T];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal, 'zh-CN');
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        } else {
          comparison = String(aVal).localeCompare(String(bVal), 'zh-CN');
        }
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig, columns]);

  // 获取行 key
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey] ?? index);
  };

  // 加载状态
  if (loading) {
    return (
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F19]">
              <tr>
                {columns.map((col, i) => (
                  <th key={String(col.key)} className="py-3 px-4">
                    <Skeleton width={i === 0 ? 80 : 60} height={14} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {Array.from({ length: loadingRows }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td key={String(col.key)} className="py-4 px-4">
                      <Skeleton 
                        height={colIdx === 0 ? 20 : 14} 
                        width={colIdx === 0 ? '80%' : '60%'} 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 空状态
  if (data.length === 0) {
    return (
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-12">
        {emptyComponent || (
          <div className="text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400">{emptyMessage}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#0B0F19]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`
                    py-3 px-4 text-left text-xs font-medium text-gray-400
                    ${column.sortable ? 'cursor-pointer hover:text-white group' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className={`
                    flex items-center gap-1
                    ${column.align === 'center' ? 'justify-center' : ''}
                    ${column.align === 'right' ? 'justify-end' : ''}
                  `}>
                    {column.title}
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedData.map((row, index) => (
              <motion.tr
                key={getRowKey(row, index)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: animateDelay + index * 0.05,
                  duration: 0.3
                }}
                className={`
                  hover:bg-[#1E2538] transition-colors
                  ${onRowClick ? 'cursor-pointer' : ''}
                  ${rowClassName ? rowClassName(row, index) : ''}
                `}
                onClick={() => onRowClick?.(row, index)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`
                      py-4 px-4
                      ${column.align === 'center' ? 'text-center' : ''}
                      ${column.align === 'right' ? 'text-right' : ''}
                    `}
                  >
                    {column.render 
                      ? column.render(row, index)
                      : String(row[column.key as keyof T] ?? '-')
                    }
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SortableTable;
