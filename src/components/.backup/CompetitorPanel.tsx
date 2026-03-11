import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, MapPin, AlertCircle, TrendingDown, Target, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { competitorsByTier } from '@/data/hotels';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CompetitorWithTier } from '@/data/hotels';

export function CompetitorPanel() {
  const { currentHotel } = useUnifiedStore();
  const [expandedTier, setExpandedTier] = React.useState<'economy' | 'comfort' | 'premium'>('comfort');

  const hotelCompetitors = currentHotel?.id ? competitorsByTier[currentHotel.id as keyof typeof competitorsByTier] : null;

  if (!hotelCompetitors) {
    return (
      <Card className="p-6">
        <div className="text-center text-text-muted">暂无竞品数据</div>
      </Card>
    );
  }

  const tierConfigs = {
    economy: { 
      label: '低一档：经济型', 
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      desc: '引流参考 - 价格比我们低40-60%',
      Icon: TrendingDown
    },
    comfort: { 
      label: '同档次：舒适型', 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: '核心对标 - 与我们同档竞争',
      Icon: Target
    },
    premium: { 
      label: '高一档：高端型', 
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      desc: '溢价参考 - 价格比我们高50-100%',
      Icon: TrendingUpIcon
    },
  };

  const getLowestPrice = (competitor: CompetitorWithTier) => {
    return Math.min(
      competitor.platformPrices.xiecheng,
      competitor.platformPrices.meituan,
      competitor.platformPrices.gaode,
      competitor.platformPrices.feizhu
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">周边竞品监测</h3>
            <p className="text-xs text-text-muted mt-0.5">实时抓取携程、美团、高德、飞猪四平台价格</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <TrendingUp className="w-3 h-3 mr-1" />
              实时更新
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 档次切换标签 */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          {(Object.keys(tierConfigs) as Array<keyof typeof tierConfigs>).map((tier) => (
            <button
              key={tier}
              onClick={() => setExpandedTier(tier)}
              className={cn(
                'flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all',
                expandedTier === tier
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-text-muted hover:text-gray-700'
              )}
            >
              {(() => {
                const Icon = tierConfigs[tier].Icon;
                return <Icon size={14} className="inline mr-1" />;
              })()}
              {tierConfigs[tier].label.split('：')[1]}
            </button>
          ))}
        </div>

        {/* 当前档次说明 */}
        <div className={cn(
          'p-3 rounded-lg border text-sm',
          tierConfigs[expandedTier].color
        )}>
          <div className="flex items-center justify-between">
            <span className="font-medium">{tierConfigs[expandedTier].label}</span>
            <span className="text-xs opacity-75">{tierConfigs[expandedTier].desc}</span>
          </div>
        </div>

        {/* 竞品列表 */}
        <div className="space-y-2">
          {hotelCompetitors[expandedTier]?.map((competitor) => {
            const lowestPrice = getLowestPrice(competitor);
            const avgPrice = Math.round(
              (competitor.platformPrices.xiecheng +
                competitor.platformPrices.meituan +
                competitor.platformPrices.gaode +
                competitor.platformPrices.feizhu) / 4
            );

            return (
              <motion.div
                key={competitor.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {competitor.name}
                      {competitor.status === 'soldout' && (
                        <Badge variant="destructive" className="text-[10px]">满房</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {competitor.distance}km
                      </span>
                      <span>⭐ {competitor.rating}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded',
                        competitor.inventory <= 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      )}>
                        剩{competitor.inventory}间
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">¥{lowestPrice}</div>
                    <div className="text-xs text-text-secondary">均价 ¥{avgPrice}</div>
                  </div>
                </div>

                {/* 四平台价格对比 */}
                <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t">
                  {[
                    { key: 'xiecheng', label: '携程', price: competitor.platformPrices.xiecheng },
                    { key: 'meituan', label: '美团', price: competitor.platformPrices.meituan },
                    { key: 'gaode', label: '高德', price: competitor.platformPrices.gaode },
                    { key: 'feizhu', label: '飞猪', price: competitor.platformPrices.feizhu },
                  ].map((platform) => {
                    const isLowest = platform.price === lowestPrice;
                    return (
                      <div
                        key={platform.key}
                        className={cn(
                          'text-center py-1.5 rounded text-xs',
                          isLowest 
                            ? 'bg-green-50 border border-green-200 text-green-700 font-medium' 
                            : 'bg-gray-50 text-text-muted'
                        )}
                      >
                        <div className="text-[10px] text-text-secondary">{platform.label}</div>
                        <div>¥{platform.price}</div>
                        {isLowest && <div className="text-[9px] text-green-600">最低</div>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 定价建议 */}
        {expandedTier === 'comfort' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                <div className="font-medium mb-1">定价建议</div>
                <div>同档次竞品均价 {Math.round(
                  hotelCompetitors.comfort.reduce((sum, c) => 
                    sum + (c.platformPrices.xiecheng + c.platformPrices.meituan + c.platformPrices.gaode + c.platformPrices.feizhu) / 4, 0
                  ) / hotelCompetitors.comfort.length
                )} 元，建议定价区间 280-320 元</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
