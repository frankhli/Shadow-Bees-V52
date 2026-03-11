/**
 * Shadow-Bees V52 - 调价审批弹窗
 */

import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Check, X } from 'lucide-react';

interface PriceApproval {
  id: string;
  requestedBy: string;
  currentPrice: number;
  requestedPrice: number;
  reason: string;
  timestamp: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approval: PriceApproval | null;
}

export function PriceApprovalModal({ 
  isOpen, 
  onClose, 
  onApprove, 
  onReject,
  approval 
}: Props) {
  if (!isOpen || !approval) return null;
  
  const priceChange = approval.requestedPrice - approval.currentPrice;
  const changePercent = ((priceChange / approval.currentPrice) * 100).toFixed(1);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-bg-secondary rounded-xl border border-border-color p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-neon-red/20 flex items-center justify-center">
              <DollarSign size={20} className="text-neon-red" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">底价突破审批</h3>
              <p className="text-xs text-text-secondary">申请ID: {approval.id}</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
              <span className="text-text-secondary">当前价格</span>
              <span className="font-mono text-lg text-text-primary">¥{approval.currentPrice}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
              <span className="text-text-secondary">申请价格</span>
              <span className="font-mono text-lg text-neon-red">¥{approval.requestedPrice}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">价格变动</span>
              <span className={`font-mono ${priceChange >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {priceChange >= 0 ? '+' : ''}{changePercent}%
              </span>
            </div>
            <div className="p-3 bg-neon-red/10 border border-neon-red/30 rounded-lg">
              <span className="text-neon-red text-sm font-medium block mb-1">⚠️ 底价突破</span>
              <p className="text-sm text-text-secondary">此价格低于房型底价，需要审批通过后才能生效</p>
            </div>
            <div className="p-3 bg-bg-tertiary rounded-lg">
              <span className="text-text-secondary text-sm block mb-1">申请原因</span>
              <p className="text-sm text-text-secondary">{approval.reason}</p>
            </div>
            <div className="flex justify-between items-center text-xs text-text-secondary">
              <span>申请人: {approval.requestedBy}</span>
              <span>{new Date(approval.timestamp).toLocaleString('zh-CN')}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neon-red/20 border border-neon-red rounded-lg text-neon-red hover:bg-neon-red/30 transition-all"
            >
              <X size={18} />
              拒绝
            </button>
            <button
              onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neon-green/20 border border-neon-green rounded-lg text-neon-green hover:bg-neon-green/30 transition-all"
            >
              <Check size={18} />
              同意
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
