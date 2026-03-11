import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, AlertCircle, CheckCircle, XCircle, 
  TrendingDown, Shield, Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { cn } from '@/lib/utils';

export function PricingPanel() {
  const { 
    user, 
    pricing, 
    currentRoomType,
    pendingPriceApproval,
    updateBasePrice,
    requestPriceChange,
    approvePriceChange,
    rejectPriceChange
  } = useUnifiedStore();

  const [newPrice, setNewPrice] = React.useState(pricing.basePrice);
  const [reason, setReason] = React.useState('');

  // 员工视图：申请模式
  if (user.role === 'staff') {
    return (
      <Card className="p-4 bg-bg-secondary border-border-color">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary">价格调整</h3>
            <p className="text-xs text-text-secondary">员工模式 - 需申请审批</p>
          </div>
          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
            <Shield className="w-3 h-3 mr-1" />
            员工权限
          </Badge>
        </div>

        {/* 当前定价信息 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-bg-primary rounded-lg border border-border-color/50">
            <div className="text-xs text-text-secondary">当前底价</div>
            <div className="text-lg font-bold text-[#00F0FF]">¥{currentRoomType.floorPrice}</div>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg border border-border-color/50">
            <div className="text-xs text-text-secondary">房型底价限制</div>
            <div className="text-lg font-bold text-[#FFB800]">¥{currentRoomType.floorPrice}</div>
          </div>
        </div>

        {/* 申请表单或待审批状态 */}
        {!pendingPriceApproval ? (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-text-secondary">申请新价格</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={newPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPrice(Number(e.target.value))}
                    className={cn(
                      "bg-bg-primary border-border-color text-text-primary",
                      newPrice < currentRoomType.floorPrice && "border-red-500/50"
                    )}
                  />
                </div>
                {newPrice < currentRoomType.floorPrice && (
                  <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                    <TrendingDown className="w-3 h-3" />
                    低于底价，需要老板审批
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-text-secondary">申请理由</label>
                <Input
                  value={reason}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                  placeholder="请输入价格调整原因..."
                  className="mt-1 bg-bg-primary border-border-color text-text-primary"
                />
              </div>

              <Button 
                className="w-full bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF]/30"
                disabled={!reason || newPrice <= 0}
                onClick={() => {
                  requestPriceChange(newPrice, reason);
                  setReason('');
                }}
              >
                提交审批申请
              </Button>
            </div>

            {/* 权限说明 */}
            <div className="mt-4 p-3 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-lg text-xs text-[#00F0FF]">
              <div className="font-medium mb-1">💡 提示</div>
              <div className="text-gray-300">作为员工，您无法直接修改价格。您的申请将发送给经理或老板审批。</div>
            </div>
          </>
        ) : (
          // 申请已提交状态 - 显示确认信息
          <div className="p-4 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-lg">
            <div className="flex items-center gap-2 text-[#FFB800] font-medium">
              <Clock className="w-4 h-4" />
              已提交审批
            </div>
            <div className="text-sm text-gray-300 mt-2">
              您申请将价格从 <span className="text-text-primary">¥{pendingPriceApproval.currentPrice}</span> 调整至 <span className="text-[#00F0FF]">¥{pendingPriceApproval.requestedPrice}</span>
            </div>
            <div className="text-xs text-text-muted mt-2">
              申请时间: {new Date(pendingPriceApproval.timestamp).toLocaleString('zh-CN')}
            </div>
            <div className="text-xs text-text-muted">
              理由: {pendingPriceApproval.reason}
            </div>
            <div className="mt-3 text-xs text-[#00E396]">
              ✓ 申请已发送，等待审批中...
            </div>
          </div>
        )}
      </Card>
    );
  }

  // 老板/经理视图：审批模式
  return (
    <Card className="p-4 bg-bg-secondary border-border-color">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-text-primary">价格调整</h3>
          <p className="text-xs text-text-secondary">
            {user.role === 'owner' ? '老板模式' : '经理模式'} - 可直接修改或审批
          </p>
        </div>
        <Badge className={user.role === 'owner' ? "bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/30" : "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30"}>
          <Shield className="w-3 h-3 mr-1" />
          {user.role === 'owner' ? '老板权限' : '经理权限'}
        </Badge>
      </div>

      {/* 待审批提示 */}
      <AnimatePresence>
        {pendingPriceApproval && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-[#FFB800] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  价格调整申请待审批
                </div>
                <div className="text-sm text-gray-300 mt-1">
                  {pendingPriceApproval.requestedBy} 申请将价格从 
                  <span className="text-text-primary"> ¥{pendingPriceApproval.currentPrice} </span>
                  调整至 
                  <span className="text-[#00F0FF]"> ¥{pendingPriceApproval.requestedPrice}</span>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  理由: {pendingPriceApproval.reason}
                </div>
                {pendingPriceApproval.requestedBy === user.name && (
                  <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    不能审批自己的申请
                  </div>
                )}
              </div>
            </div>

            {/* 审批操作按钮 */}
            {pendingPriceApproval.requestedBy !== user.name && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={rejectPriceChange}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  拒绝
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#00E396]/20 text-[#00E396] border border-[#00E396]/30 hover:bg-[#00E396]/30"
                  onClick={approvePriceChange}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  同意
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 直接调价 */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-bg-primary rounded-lg border border-border-color/50">
            <div className="text-xs text-text-secondary">当前底价</div>
            <div className="text-lg font-bold text-[#00F0FF]">¥{currentRoomType.floorPrice}</div>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg border border-border-color/50">
            <div className="text-xs text-text-secondary">房型底价限制</div>
            <div className="text-lg font-bold text-[#FFB800]">¥{currentRoomType.floorPrice}</div>
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary">新价格</label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              value={newPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPrice(Number(e.target.value))}
              className={cn(
                "bg-bg-primary border-border-color text-text-primary",
                newPrice < currentRoomType.floorPrice && "border-red-500/50"
              )}
            />
          </div>
          {newPrice < currentRoomType.floorPrice && (
            <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
              <AlertCircle className="w-3 h-3" />
              低于底价，系统将记录此操作
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-text-secondary">调整原因</label>
          <Input
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
            placeholder="记录价格调整原因..."
            className="mt-1 bg-bg-primary border-border-color text-text-primary"
          />
        </div>

        <Button 
          className="w-full bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF]/30"
          disabled={newPrice <= 0}
          onClick={() => {
            updateBasePrice(newPrice, reason);
            setReason('');
          }}
        >
          <DollarSign className="w-4 h-4 mr-1" />
          确认调整
        </Button>
      </div>

      {/* 权限说明 */}
      <div className="mt-4 p-3 bg-[#00E396]/10 border border-[#00E396]/30 rounded-lg text-xs text-[#00E396]">
        <div className="font-medium mb-1">✓ 权限说明</div>
        {user.role === 'owner' ? (
          <div className="text-gray-300">您是老板，可以修改底价，审批员工申请，所有操作将被审计记录。</div>
        ) : (
          <div className="text-gray-300">您是经理，可以调价（但不能低于底价），可以审批员工申请。</div>
        )}
      </div>
    </Card>
  );
}
