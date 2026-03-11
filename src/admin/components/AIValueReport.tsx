/**
 * AI价值报告组件 - Phase 2 核心功能
 * 自动生成集团ROI报告，支持PDF导出
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  TrendingUp,
  Clock,
  DollarSign,
  Building2,
  Target,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Customer } from '../stores/adminStore';
import { generateAIValueReport, type AIValueReport as AIValueReportType } from '../services/customerSuccessService';

interface AIValueReportProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

// 数字动画组件
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <span className="tabular-nums">
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

// 指标卡片
function MetricCard({
  title,
  value,
  prefix = '',
  suffix = '',
  color = 'cyan',
  icon: Icon,
  subtitle
}: {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color?: 'cyan' | 'purple' | 'green' | 'amber';
  icon: React.ElementType;
  subtitle?: string;
}) {
  const colorMap = {
    cyan: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30',
    purple: 'bg-neon-purple/10 text-neon-purple border-neon-purple/30',
    green: 'bg-neon-green/10 text-neon-green border-neon-green/30',
    amber: 'bg-neon-amber/10 text-neon-amber border-neon-amber/30',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-80">{title}</span>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </p>
      {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
  );
}

// 门店对比表格
function HotelComparisonTable({ hotels }: { hotels: AIValueReportType['hotelComparisons'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">门店</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">AI采用率</th>
            <th className="text-right py-3 px-4 text-gray-400 font-medium">增收估算</th>
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel, idx) => (
            <motion.tr
              key={hotel.hotelId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border-b border-gray-800/50 hover:bg-white/5"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs">
                    {idx + 1}
                  </div>
                  <span className="font-medium">{hotel.hotelName}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        hotel.aiAdoptionRate >= 66 ? 'bg-neon-green' :
                        hotel.aiAdoptionRate >= 33 ? 'bg-neon-amber' : 'bg-neon-red'
                      }`}
                      style={{ width: `${hotel.aiAdoptionRate}%` }}
                    />
                  </div>
                  <span className="text-xs w-10">{hotel.aiAdoptionRate}%</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-medium text-neon-cyan">
                ¥{hotel.revenueLift.toLocaleString()}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AIValueReport({ customer, isOpen, onClose }: AIValueReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // 生成报告数据
  const period = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  };
  
  const report = generateAIValueReport(customer, period);
  
  // PDF导出
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0B0F19',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`AI价值报告-${customer.companyName}-${period.end}.pdf`);
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          
          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 bg-[#0B0F19] rounded-2xl border border-gray-800 z-50 overflow-hidden flex flex-col"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#151B2B]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                  <FileText size={24} className="text-neon-cyan" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI价值报告</h2>
                  <p className="text-sm text-gray-400">
                    {customer.companyName} · {period.start} 至 {period.end}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-all disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isExporting ? '导出中...' : '导出PDF'}
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* 报告内容 */}
            <div ref={reportRef} className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* 报告标题 */}
              <div className="text-center pb-8 border-b border-gray-800">
                <h1 className="text-3xl font-bold text-white mb-2">
                  AI价值评估报告
                </h1>
                <p className="text-gray-400">
                  {customer.companyName} · 报告周期：{period.start} 至 {period.end}
                </p>
              </div>
              
              {/* 核心指标 */}
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  title="AI总增收"
                  value={report.totalLift}
                  prefix="¥"
                  color="green"
                  icon={TrendingUp}
                  subtitle="定价+内容+客服"
                />
                <MetricCard
                  title="降本效益"
                  value={report.laborCostSaved}
                  prefix="¥"
                  color="cyan"
                  icon={Clock}
                  subtitle={`节省${report.laborHoursSaved}工时`}
                />
                <MetricCard
                  title="净收益"
                  value={report.totalLift + report.laborCostSaved - report.totalInvestment}
                  prefix="¥"
                  color="purple"
                  icon={DollarSign}
                  subtitle="增收+降本-投入"
                />
                <MetricCard
                  title="投资回报率"
                  value={report.roi}
                  suffix="%"
                  color={report.roi >= 100 ? 'green' : report.roi >= 50 ? 'amber' : 'cyan'}
                  icon={Target}
                  subtitle={report.roi >= 100 ? '表现优秀' : report.roi >= 50 ? '表现良好' : '有待提升'}
                />
              </div>
              
              {/* 增收明细 */}
              <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-neon-green" />
                  AI增收明细
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0B0F19] rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">智能定价增收</p>
                    <p className="text-xl font-bold text-neon-cyan">
                      ¥{report.pricingLift.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">基于AI动态定价优化</p>
                  </div>
                  <div className="p-4 bg-[#0B0F19] rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">内容营销增收</p>
                    <p className="text-xl font-bold text-neon-purple">
                      ¥{report.contentLift.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">AI生成内容转化提升</p>
                  </div>
                  <div className="p-4 bg-[#0B0F19] rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">智能客服增收</p>
                    <p className="text-xl font-bold text-neon-amber">
                      ¥{report.serviceLift.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">响应效率提升收益</p>
                  </div>
                </div>
              </div>
              
              {/* 门店对比 */}
              <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-neon-cyan" />
                  门店AI采用对比
                </h3>
                <HotelComparisonTable hotels={report.hotelComparisons} />
              </div>
              
              {/* 建议 */}
              <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-neon-green" />
                  优化建议
                </h3>
                <div className="space-y-3">
                  {report.recommendations.map((rec, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-[#0B0F19] rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-neon-cyan font-medium">{idx + 1}</span>
                      </div>
                      <p className="text-sm text-gray-300">{rec}</p>
                    </motion.div>
                  ))}
                  {report.recommendations.length === 0 && (
                    <p className="text-gray-500 text-center py-4">当前AI应用表现良好，暂无优化建议</p>
                  )}
                </div>
              </div>
              
              {/* 页脚 */}
              <div className="text-center text-xs text-gray-600 pt-8 border-t border-gray-800">
                <p>本报告由 ShadowBees AI 系统自动生成 · 数据仅供参考</p>
                <p className="mt-1">生成时间：{new Date().toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
