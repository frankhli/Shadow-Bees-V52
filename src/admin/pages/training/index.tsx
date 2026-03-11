/**
 * SaaS运营后台 - 培训管理
 * 课程库、培训进度、效果分析
 */

import { useState, useMemo, useEffect } from 'react';
import { PageSkeleton } from '@/components/ux/Skeleton';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Award,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';

// 课程类型
interface Course {
  id: string;
  name: string;
  description: string;
  type: 'required' | 'optional';
  duration: string;
  moduleCount: number;
}

// 课程库
const courseLibrary: Course[] = [
  {
    id: 'basic',
    name: '系统基础操作',
    description: 'Shadow-Bees 系统入门，界面导航、基础设置',
    type: 'required',
    duration: '30分钟',
    moduleCount: 5,
  },
  {
    id: 'content',
    name: 'AI内容生成',
    description: '掌握AI内容创作技巧，提升曝光转化',
    type: 'required',
    duration: '45分钟',
    moduleCount: 8,
  },
  {
    id: 'service',
    name: 'AI客服配置',
    description: '智能客服设置、话术优化、自动回复',
    type: 'required',
    duration: '40分钟',
    moduleCount: 6,
  },
  {
    id: 'pricing',
    name: '智能定价策略',
    description: '定价模型理解、策略配置、收益优化',
    type: 'optional',
    duration: '60分钟',
    moduleCount: 10,
  },
  {
    id: 'analytics',
    name: '数据分析进阶',
    description: '经营数据解读、竞品分析、决策支持',
    type: 'optional',
    duration: '50分钟',
    moduleCount: 7,
  },
];

export default function TrainingManagement() {
  const { customers, hotels } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'courses' | 'progress' | 'effect'>('courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState<'all' | 'required' | 'optional'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [activeTab, searchQuery]);

  // 计算培训统计数据
  const trainingStats = useMemo(() => {
    const totalHotels = hotels.length;
    const completedTraining = hotels.filter(h => h.training?.completed).length;
    const inProgress = hotels.filter(h => !h.training?.completed && h.training?.completedAt).length;
    const notStarted = totalHotels - completedTraining - inProgress;
    
    // 按课程统计完成率
    const courseProgress = courseLibrary.map(course => {
      const completed = Math.floor(Math.random() * totalHotels * 0.8);
      return {
        ...course,
        completed,
        rate: totalHotels > 0 ? Math.round((completed / totalHotels) * 100) : 0,
      };
    });

    return {
      totalHotels,
      completedTraining,
      inProgress,
      notStarted,
      completionRate: totalHotels > 0 ? Math.round((completedTraining / totalHotels) * 100) : 0,
      courseProgress,
    };
  }, [hotels]);

  // 过滤课程
  const filteredCourses = useMemo(() => {
    return courseLibrary
      .filter(c => courseFilter === 'all' || c.type === courseFilter)
      .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [courseFilter, searchQuery]);

  // 客户培训进度数据
  const customerProgress = useMemo(() => {
    return customers.map(customer => {
      const customerHotels = hotels.filter(h => customer.hotelIds.includes(h.id));
      const completedCount = customerHotels.filter(h => h.training?.completed).length;
      const avgScore = customerHotels.reduce((sum, h) => sum + (h.training?.score || 0), 0) / (customerHotels.length || 1);
      
      return {
        ...customer,
        completedCount,
        totalHotels: customerHotels.length,
        progressRate: customerHotels.length > 0 ? Math.round((completedCount / customerHotels.length) * 100) : 0,
        avgScore: Math.round(avgScore),
      };
    }).sort((a, b) => a.progressRate - b.progressRate);
  }, [customers, hotels]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">培训管理</h1>
          <p className="text-gray-400 text-sm mt-1">
            课程库管理 · 培训进度追踪 · 效果分析
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">总培训客户</span>
            <Users size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{trainingStats.totalHotels}</p>
          <p className="text-xs text-gray-500 mt-1">{customers.length} 家客户</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已完成培训</span>
            <CheckCircle size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">{trainingStats.completedTraining}</p>
          <p className="text-xs text-gray-500 mt-1">占比 {trainingStats.completionRate}%</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">培训中</span>
            <Clock size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{trainingStats.inProgress}</p>
          <p className="text-xs text-gray-500 mt-1">进行中</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">未开始</span>
            <AlertCircle size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{trainingStats.notStarted}</p>
          <p className="text-xs text-gray-500 mt-1">需跟进</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        {[
          { key: 'courses', label: '课程库', icon: BookOpen },
          { key: 'progress', label: '培训进度', icon: Users },
          { key: 'effect', label: '效果分析', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-neon-cyan border-neon-cyan bg-neon-cyan/10'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="min-h-[400px]">
        {/* 课程库 */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {/* 筛选栏 */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索课程..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value as typeof courseFilter)}
                  className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
                >
                  <option value="all">全部课程</option>
                  <option value="required">必修</option>
                  <option value="optional">选修</option>
                </select>
              </div>
            </div>

            {/* 课程列表 */}
            <div className="grid grid-cols-2 gap-4">
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 bg-[#151B2B] rounded-xl border border-gray-800 hover:border-gray-600 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        course.type === 'required' ? 'bg-neon-purple/10' : 'bg-neon-cyan/10'
                      }`}>
                        <GraduationCap size={20} className={
                          course.type === 'required' ? 'text-neon-purple' : 'text-neon-cyan'
                        } />
                      </div>
                      <div>
                        <h3 className="font-medium">{course.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          course.type === 'required' 
                            ? 'bg-neon-purple/10 text-neon-purple' 
                            : 'bg-neon-cyan/10 text-neon-cyan'
                        }`}>
                          {course.type === 'required' ? '必修' : '选修'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">完成率</span>
                      <p className="text-lg font-bold text-neon-green">
                        {trainingStats.courseProgress.find(c => c.id === course.id)?.rate || 0}%
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{course.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />
                      {course.moduleCount} 个章节
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {trainingStats.courseProgress.find(c => c.id === course.id)?.completed || 0} 家完成
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 培训进度 */}
        {activeTab === 'progress' && (
          <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0B0F19]">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">客户名称</th>
                  <th className="text-center text-xs font-medium text-gray-400 py-3 px-4">门店数</th>
                  <th className="text-center text-xs font-medium text-gray-400 py-3 px-4">已完成</th>
                  <th className="text-center text-xs font-medium text-gray-400 py-3 px-4">完成率</th>
                  <th className="text-center text-xs font-medium text-gray-400 py-3 px-4">平均分</th>
                  <th className="text-center text-xs font-medium text-gray-400 py-3 px-4">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {customerProgress.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#1E2538] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.companyName}</span>
                        {customer.progressRate < 50 && (
                          <AlertCircle size={14} className="text-neon-red" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">{customer.totalHotels}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={customer.completedCount === customer.totalHotels ? 'text-neon-green' : 'text-gray-400'}>
                        {customer.completedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              customer.progressRate >= 80 ? 'bg-neon-green' : 
                              customer.progressRate >= 50 ? 'bg-neon-amber' : 'bg-neon-red'
                            }`}
                            style={{ width: `${customer.progressRate}%` }}
                          />
                        </div>
                        <span className="text-xs w-8">{customer.progressRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${
                        customer.avgScore >= 80 ? 'text-neon-green' : 
                        customer.avgScore >= 60 ? 'text-neon-amber' : 'text-neon-red'
                      }`}>
                        {customer.avgScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        customer.progressRate >= 80 
                          ? 'bg-neon-green/10 text-neon-green' : 
                        customer.progressRate >= 50 
                          ? 'bg-neon-amber/10 text-neon-amber' 
                          : 'bg-neon-red/10 text-neon-red'
                      }`}>
                        {customer.progressRate >= 80 ? '优秀' : customer.progressRate >= 50 ? '进行中' : '需跟进'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 效果分析 */}
        {activeTab === 'effect' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-[#151B2B] rounded-xl border border-gray-800">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Award size={18} className="text-neon-purple" />
                  培训完成 vs 未完成对比
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
                    <div>
                      <p className="text-sm text-gray-400">已完成培训客户</p>
                      <p className="text-xs text-gray-500">平均健康度</p>
                    </div>
                    <p className="text-2xl font-bold text-neon-green">85</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
                    <div>
                      <p className="text-sm text-gray-400">未完成培训客户</p>
                      <p className="text-xs text-gray-500">平均健康度</p>
                    </div>
                    <p className="text-2xl font-bold text-neon-red">62</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neon-purple/5 rounded-lg border border-neon-purple/20">
                    <p className="text-sm">培训带来的健康度提升</p>
                    <p className="text-xl font-bold text-neon-purple">+23 分</p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[#151B2B] rounded-xl border border-gray-800">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-neon-cyan" />
                  功能采用率对比
                </h3>
                <div className="space-y-4">
                  {['AI内容生成', 'AI客服配置', '智能定价'].map((feature, idx) => {
                    const trained = [92, 88, 76][idx];
                    const untrained = [45, 38, 25][idx];
                    return (
                      <div key={feature}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">{feature}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-neon-green">已培训</span>
                              <span className="text-neon-green">{trained}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-neon-green rounded-full" style={{ width: `${trained}%` }} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">未培训</span>
                              <span className="text-gray-500">{untrained}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-600 rounded-full" style={{ width: `${untrained}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
