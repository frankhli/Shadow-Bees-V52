/**
 * 空状态组件
 */
import { FileSearch, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  title = '暂无数据', 
  description = '当前没有任何数据',
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FileSearch className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {action.text}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
