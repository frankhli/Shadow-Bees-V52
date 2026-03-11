/**
 * 内容管理弹窗 - 支持下架和代修改
 */

import { useState } from 'react';
import { X, Building2, AlertTriangle, CheckCircle, Edit3, EyeOff, Send, Eye, Users, MessageSquare, Mic } from 'lucide-react';
import { PlatformLogo } from '../../components/PlatformLogo';
import { motion } from 'framer-motion';
import { useAdminStore, type ContentItem, type Platform } from '../../stores/adminStore';
import { Button } from '../../components/ui';
import { useToast } from '../../components/ui';

interface ContentManageModalProps {
  content: ContentItem;
  onClose: () => void;
}

const platformConfig: Record<Platform, { name: string; color: string }> = {
  xianyu: { name: '闲鱼', color: 'text-yellow-400' },
  xiaohongshu: { name: '小红书', color: 'text-red-400' },
  wechat: { name: '微信', color: 'text-green-500' },
};

export function ContentManageModal({ content, onClose }: ContentManageModalProps) {
  const { updateContentStatus } = useAdminStore();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [editedTitle, setEditedTitle] = useState(content.title);
  const [editedContent, setEditedContent] = useState(content.content || '');
  const [offlineReason, setOfflineReason] = useState('');
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);

  const config = platformConfig[content.platform];

  // 风险分析（模拟）
  const riskAnalysis = [
    { item: '敏感词检测', status: content.aiScore && content.aiScore > 70 ? 'pass' : 'fail', detail: '未发现敏感词汇' },
    { item: '价格合理性', status: 'pass', detail: '价格在合理区间内' },
    { item: '图片合规', status: 'pass', detail: '图片版权正常' },
    { item: '平台规范', status: content.aiScore && content.aiScore > 80 ? 'pass' : 'warning', detail: content.aiScore && content.aiScore > 80 ? '符合平台规范' : '建议优化标题' },
  ];

  const handleOffline = async () => {
    if (!offlineReason.trim()) {
      toast.error('请填写下架原因');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 更新状态为下架
    updateContentStatus(content.id, 'rejected');
    
    toast.success('已下架', `${content.hotelName} 的内容已下架，原因：${offlineReason}`);
    setLoading(false);
    onClose();
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) {
      toast.error('标题不能为空');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 实际应该调用API更新内容
    toast.success('修改已保存', `已代 ${content.hotelName} 优化内容并重新发布`);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <PlatformLogo platform={content.platform} size={28} />
            <h3 className="text-xl font-bold">内容管理</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('view')}
            className={`flex items-center gap-2 px-6 py-3 text-sm transition-all ${
              activeTab === 'view'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye size={16} />
            查看详情
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-6 py-3 text-sm transition-all ${
              activeTab === 'edit'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Edit3 size={16} />
            代客修改
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'view' ? (
            <div className="space-y-6">
              {/* 内容信息 */}
              <div className="p-4 bg-[#0B0F19] rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`px-2 py-1 bg-gray-800 text-xs rounded flex items-center gap-1.5 ${config.color}`}>
                    <PlatformLogo platform={content.platform} size={16} />
                    {config.name}
                  </span>
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <Building2 size={12} />
                    {content.hotelName}
                  </span>
                  <span className="text-sm text-neon-green font-medium">
                    ¥{content.price}
                  </span>
                </div>
                {/* 私域子类型标签 */}
                {content.subtype && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      content.subtype === 'moments' ? 'bg-green-500/20 text-green-400' :
                      content.subtype === 'group' ? 'bg-amber-500/20 text-amber-400' :
                      content.subtype === 'private' ? 'bg-cyan-500/20 text-cyan-400' :
                      content.subtype === 'channels' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {content.subtype === 'moments' ? '朋友圈' :
                       content.subtype === 'group' ? '微信群' :
                       content.subtype === 'private' ? '私聊' :
                       content.subtype === 'channels' ? '视频号' :
                       content.subtype}
                    </span>
                    {content.contentType === 'video' && (
                      <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400">
                        视频内容
                      </span>
                    )}
                  </div>
                )}
                
                <h4 className="text-lg font-medium mb-2">{content.title}</h4>
                {content.content && (
                  <p className="text-sm text-gray-400 whitespace-pre-line">{content.content}</p>
                )}
              </div>

              {/* 私域内容详情（只读展示） */}
              {content.groupScript && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-amber-400">
                    <Users size={16} />
                    群运营脚本
                    {content.groupScript.atAll && (
                      <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">@所有人</span>
                    )}
                  </h4>
                  <div className="text-sm text-gray-400 whitespace-pre-line">
                    {content.groupScript.content}
                  </div>
                </div>
              )}

              {content.privateScript && (
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-cyan-400">
                    <MessageSquare size={16} />
                    私聊话术 · {content.privateScript.type === 'welcome' ? '新好友' : 
                                content.privateScript.type === 'followup' ? '回访' : 
                                content.privateScript.type === 'rebooking' ? '复购引导' : '咨询'}
                  </h4>
                  <div className="text-sm text-gray-400 whitespace-pre-line">
                    {content.privateScript.content}
                  </div>
                </div>
              )}

              {content.videoScript && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-purple-400">
                    <Mic size={16} />
                    视频脚本 · {content.videoScript.totalDuration}秒
                  </h4>
                  <div className="space-y-2 mb-3">
                    {content.videoScript.scenes.map((scene, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <span className="text-purple-400 font-mono">{scene.startTime}-{scene.endTime}s</span>
                        <div>
                          <div className="text-gray-300">{scene.shot}</div>
                          <div className="text-gray-500 text-xs">{scene.subtitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="text-purple-400">BGM:</span> {content.videoScript.bgmRecommendation}
                  </div>
                </div>
              )}

              {/* AI风险分析 - 私域内容不显示下架按钮 */}
              {content.platform !== 'wechat' && (
              <div className="p-4 bg-[#0B0F19] rounded-lg">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-neon-amber" />
                  AI风险巡检报告
                </h4>
                <div className="space-y-3">
                  {riskAnalysis.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{item.item}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${
                          item.status === 'pass' ? 'text-neon-green' :
                          item.status === 'warning' ? 'text-neon-amber' :
                          'text-neon-red'
                        }`}>
                          {item.status === 'pass' ? '✓' : item.status === 'warning' ? '!' : '✗'}
                        </span>
                        <span className="text-sm">{item.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {content.aiScore !== undefined && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">AI安全评分</span>
                      <span className={`font-bold ${
                        content.aiScore >= 80 ? 'text-neon-green' :
                        content.aiScore >= 60 ? 'text-neon-amber' :
                        'text-neon-red'
                      }`}>
                        {content.aiScore}/100
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          content.aiScore >= 80 ? 'bg-neon-green' :
                          content.aiScore >= 60 ? 'bg-neon-amber' :
                          'bg-neon-red'
                        }`}
                        style={{ width: `${content.aiScore}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 操作按钮 - 仅公域内容显示下架 */}
              {content.platform !== 'wechat' && (
                !showOfflineConfirm ? (
                  <div className="flex gap-3">
                    <Button
                      variant="danger"
                      icon={<EyeOff size={16} />}
                      onClick={() => setShowOfflineConfirm(true)}
                      className="flex-1"
                    >
                      下架内容
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-neon-red/10 border border-neon-red/30 rounded-lg space-y-3">
                    <p className="text-sm text-neon-red font-medium">确认下架此内容？</p>
                    <textarea
                      value={offlineReason}
                      onChange={(e) => setOfflineReason(e.target.value)}
                      placeholder="请输入下架原因（将通知酒店）..."
                      rows={3}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-red focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOfflineConfirm(false)}
                      >
                        取消
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={loading}
                        onClick={handleOffline}
                      >
                        确认下架
                      </Button>
                    </div>
                  </div>
                )
              )}
              
              {/* 私域内容提示 */}
              {content.platform === 'wechat' && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400">
                    私域内容由酒店自主运营，管理端仅做查看记录
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 代修改模式 */}
              <div className="p-4 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
                <p className="text-sm text-neon-cyan">
                  您正在为 <strong>{content.hotelName}</strong> 代修改内容
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">标题</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">内容</label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  价格 <span className="text-neon-green">¥{content.price}</span>
                </label>
                <p className="text-xs text-gray-500">价格修改需在酒店端进行</p>
              </div>

              <Button
                icon={<Send size={16} />}
                loading={loading}
                onClick={handleSaveEdit}
                className="w-full"
              >
                保存并重新发布
              </Button>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle size={14} className="text-neon-green" />
            已发布于 {new Date(content.createdAt).toLocaleString('zh-CN')}
          </div>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
