/**
 * Shadow-Bees V52 - 内容工厂页面
 * 完整功能：AI生成 + 图片管理 + 模板库 + 历史记录 + 发布联动
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Wand2, Clock, Image as ImageIcon, History, 
  LayoutTemplate, Upload, X, Check, Copy, Send, 
  Eye, Calendar, Sparkles, Trash2, RotateCcw,
  Flame, Crown, Heart, Mic, TrendingUp, Download,
  ArrowRight
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { themeColors, modeDetails, platformLogos, calculatePriceRange } from '@/utils/helpers';
import type { Platform, ContentItem } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { LazyImage } from '@/components/ui/LazyImage';

// ============================================
// 内容类型定义
// ============================================
type ContentType = 'image' | 'video' | 'text';
type WechatContentSubtype = 'moments' | 'group' | 'private' | 'channels';

// 视频分镜定义
interface VideoScene {
  id: number;
  startTime: number;
  endTime: number;
  duration: number;
  shot: string;
  subtitle: string;
  bgm?: string;
  tips?: string;
}

// 拍摄素材需求
interface ShotMaterial {
  type: 'photo' | 'video' | 'screenshot';
  description: string;
  count: number;
  tips: string;
}

// 完整的视频脚本
interface VideoScript {
  totalDuration: number;
  scenes: VideoScene[];
  materials: ShotMaterial[];
  bgmRecommendation: string;
  shootingTips: string[];
  editingTips: string[];
}

// 图文内容
interface ImageContent {
  title: string;
  content: string;
  hashtags: string[];
}

// 朋友圈内容（1-9图 + 文案）
interface MomentsContent {
  title: string;
  content: string;
  imageCount: 1 | 4 | 6 | 9;
  imageLayout: 'single' | 'grid';
  callToAction: string;
}

// 群运营脚本
interface GroupScript {
  title: string;
  content: string;
  atAll: boolean;
  type: 'welcome' | 'announcement' | 'flashsale' | 'interaction' | 'daily';
}

// 私聊话术
interface PrivateChatScript {
  title: string;
  content: string;
  type: 'welcome' | 'booking' | 'reminder' | 'followup' | 'rebooking';
}

// 统一的内容案例
interface ContentCase {
  title: string;
  type: ContentType;
  subtype?: WechatContentSubtype;
  imageContent?: ImageContent;
  videoScript?: VideoScript;
  momentsContent?: MomentsContent;
  groupScript?: GroupScript;
  privateScript?: PrivateChatScript;
  photoTips: string;
  bestTime: string;
  engagement: string;
}

// ============================================
// 模拟图片库
// ============================================
const mockImageLibrary = [
  { id: 'img1', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', type: 'room', name: '豪华大床房-夜景' },
  { id: 'img2', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', type: 'room', name: '标准双床房-白天' },
  { id: 'img3', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', type: 'view', name: '窗外景观-城市' },
  { id: 'img4', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', type: 'facility', name: '酒店大堂' },
  { id: 'img5', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400', type: 'room', name: '房间细节-床头' },
  { id: 'img6', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400', type: 'bathroom', name: '浴室-淋浴间' },
];

// ============================================
// 深度内容模板库 - 支持图文和视频
// ============================================
const contentTemplates: Record<string, {
  name: string;
  icon: React.ElementType;
  iconColor: string;
  desc: string;
  platforms: Platform[];
  scenarios: string[];
  realCases: ContentCase[];
}> = {
  // 演唱会转让 - 闲鱼图文
  concertTransfer: {
    name: '演唱会门票转让型',
    icon: Flame,
    iconColor: '#FF6B6B',
    desc: '临时有事去不了，原价转让酒店',
    platforms: ['xianyu'],
    scenarios: ['周杰伦演唱会', '林俊杰演唱会', '五月天演唱会', '薛之谦演唱会'],
    realCases: [
      {
        title: '💔含泪转让｜周杰伦演唱会酒店｜离场馆步行5分钟',
        type: 'image',
        imageContent: {
          title: '💔含泪转让｜周杰伦演唱会酒店｜离场馆步行5分钟',
          content: '姐妹们我真的哭死😭😭😭\n好不容易抢到的周杰伦演唱会门票\n结果公司临时安排出差去不了了\n\n🏨 酒店是提前一个月订的\n📍 就在工体旁边，步行5分钟就到\n💰 当时订成¥680，现在¥520转让\n🛏️ 大床房，可以住2人\n\n‼️ 房间真的很抢手\n我当时对比了好几家才选的这家\n性价比真的很高\n\n💔 求有缘姐妹收走\n可以小刀，屠龙刀勿扰\n芝麻信用780+，诚信交易\n\n#周杰伦演唱会 #酒店转让 #北京酒店 #演唱会住宿',
          hashtags: ['周杰伦演唱会', '酒店转让', '北京酒店', '演唱会住宿']
        },
        photoTips: '实拍酒店房间图+演唱会门票截图+定位截图',
        bestTime: '演唱会前3-7天发布',
        engagement: '咨询量高，需快速响应'
      },
      {
        title: '【已出】原价出林俊杰演唱会酒店｜被朋友鸽了',
        type: 'image',
        imageContent: {
          title: '【已出】原价出林俊杰演唱会酒店｜被朋友鸽了',
          content: '姐妹们我来更新了，已经出了！感谢小红书！\n\n原帖：\n本来和闺蜜约好一起看林俊杰演唱会的\n结果她被男朋友叫去约会了😅\n\n📍 国家体育场附近酒店\n🚇 地铁直达，看完演唱会不用打车\n💰 原价¥580出，不赚差价\n\n房间细节：\n✅ 独立卫浴，24h热水\n✅ 有窗户，通风好\n✅ 楼下就是便利店\n\n本人芝麻信用极好\n可以走平台，双方都有保障\n\n#林俊杰演唱会 #酒店转让 #演唱会搭子',
          hashtags: ['林俊杰演唱会', '酒店转让', '演唱会搭子']
        },
        photoTips: '聊天记录截图+酒店实拍+地铁线路图',
        bestTime: '被鸽后当天发布',
        engagement: '共鸣感强，容易获得同情和信任'
      }
    ]
  },
  
  // 小红书攻略 - 图文
  xhsGuide: {
    name: '小红书攻略型',
    icon: Crown,
    iconColor: '#FFD93D',
    desc: '真实体验分享，种草感强的攻略笔记',
    platforms: ['xiaohongshu'],
    scenarios: ['首次打卡', '避坑指南', '性价比推荐'],
    realCases: [
      {
        title: '北京工体附近住宿｜人均200+｜看演唱会必住',
        type: 'image',
        imageContent: {
          title: '北京工体附近住宿｜人均200+｜看演唱会必住',
          content: '姐妹们！发现一家宝藏酒店！\n上周去看演唱会住这里，真的太香了！\n\n📍 位置：工体步行8分钟\n看完演唱会不用排队打车\n走回去还能买点宵夜\n\n💰 价格：我们两人住，人均¥200+\n对比附近的亚朵、全季便宜一半！\n\n🏨 房间环境：\n✨ 装修很新，拍照超出片\n🛏️ 床品很干净，睡得超舒服\n🚿 水压够大，洗头很方便\n🔇 隔音不错，不会被吵醒\n\n⚠️ 小缺点：\n房间稍微有点小\n但是200+的价格真的不能要求更多\n\n🍜 周边：\n楼下就有便利店\n步行5分钟有很多吃的\n看完演唱会不怕饿肚子\n\n💡 Tips：\n演唱会期间房源紧张\n建议提前1-2周订\n\n姐妹们还有什么问题可以问我～\n\n#北京酒店 #工体演唱会 #住宿推荐 #性价比酒店 #演唱会攻略',
          hashtags: ['北京酒店', '工体演唱会', '住宿推荐', '性价比酒店', '演唱会攻略']
        },
        photoTips: '房间细节图+窗外夜景+浴室+床品特写',
        bestTime: '工作日晚8-10点发布',
        engagement: '互动率高，评论区多询问细节'
      },
      {
        title: '避雷❗️工体附近酒店真实测评｜别被照片骗了',
        type: 'image',
        imageContent: {
          title: '避雷❗️工体附近酒店真实测评｜别被照片骗了',
          content: '之前被坑过一次\n这次特意住了3家对比\n给大家做个真实测评\n\n🚫 第一家（名字不提了）：\n照片看着很高级\n实际房间又小又旧\n窗户对着墙壁，闷死了\n价格还要¥600+\n\n✅ 第二家（推荐）：\n就是我现在住的这家\n虽然装修一般，但胜在干净\n最重要的是位置好！\n步行到工体真的只要5分钟\n价格¥400+，性价比可以\n\n⚠️ 第三家（中规中矩）：\n连锁酒店，标准配置\n没有惊喜也没有失望\n价格¥500左右\n适合对住宿要求不高的\n\n💡 总结：\n看演唱会住宿，位置>环境\n走得近真的能省很多麻烦\n\n#酒店测评 #北京住宿 #避坑指南 #真实分享',
          hashtags: ['酒店测评', '北京住宿', '避坑指南', '真实分享']
        },
        photoTips: '对比图+房间实拍+窗外景色+步行路线截图',
        bestTime: '周末下午发布',
        engagement: '避雷类内容容易引起共鸣和传播'
      }
    ]
  },
  
  // 微信私域运营 - 朋友圈早安
  wechatMorning: {
    name: '朋友圈早安模板',
    icon: Mic,
    iconColor: '#07C160',
    desc: '每日早安问候，软性植入房价信息',
    platforms: ['wechat'],
    scenarios: ['每日问候', '房价提醒', '天气结合'],
    realCases: [
      {
        title: '早安问候+房价信息',
        type: 'image',
        subtype: 'moments',
        momentsContent: {
          title: '早安北京',
          content: '☀️ 早安！北京今天晴 18°C\n\n🏨 今日房源充足\n提前预订享早鸟价\n\n💰 今日房价：\n• 大床房 ¥329（原价¥399）\n• 双床房 ¥359（原价¥429）\n\n📍 三里屯步行5分钟\n🎫 演唱会期间不加价\n\n👇 扫码进群领20元专属券',
          imageCount: 4,
          imageLayout: 'grid',
          callToAction: '扫码进群领券'
        },
        photoTips: '房间实拍1张+价格卡片1张+窗外景色1张+早餐1张',
        bestTime: '早上7:30-9:00',
        engagement: '温和种草，不引起反感'
      },
      {
        title: '雨天问候+温馨氛围',
        type: 'image',
        subtype: 'moments',
        momentsContent: {
          title: '雨天温馨问候',
          content: '🌧️ 今天下雨了，出门记得带伞\n\n如果正好在附近\n欢迎进来坐坐，喝杯热茶\n\n🏨 今日特价房：\n标准间 ¥299（限3间）\n\n适合：\n✅ 临时避雨休息\n✅ 下午茶办公\n✅ 临时过夜\n\n📞 需要的随时联系',
          imageCount: 1,
          imageLayout: 'single',
          callToAction: '私信咨询'
        },
        photoTips: '大堂温馨一角，有热茶/咖啡氛围',
        bestTime: '雨天上午10:00-11:00',
        engagement: '共情营销，提升好感度'
      }
    ]
  },

  // 微信私域运营 - 朋友圈晒单
  wechatTestimonial: {
    name: '朋友圈好评晒单',
    icon: Mic,
    iconColor: '#07C160',
    desc: '展示真实客人好评，建立信任',
    platforms: ['wechat'],
    scenarios: ['好评展示', '口碑营销', '信任建立'],
    realCases: [
      {
        title: '客人好评截图+感谢文案',
        type: 'image',
        subtype: 'moments',
        momentsContent: {
          title: '感谢认可',
          content: '💚 收到客人的好评，开心一整天\n\n"房间很干净，位置也方便，\n下次来看演唱会还住这里！"\n\n感谢每一位选择我们的朋友\n你们的认可是我们最大的动力\n\n🏨 我们会继续保持\n✨ 干净舒适的房间\n✨ 热情周到的服务\n✨ 便利的地理位置\n\n期待再次相见～',
          imageCount: 4,
          imageLayout: 'grid',
          callToAction: '欢迎预订'
        },
        photoTips: '好评截图1张+房间实拍2张+客人退房时照片1张（如有）',
        bestTime: '收到好评后当天',
        engagement: '真实口碑，增强信任'
      },
      {
        title: '回头客专属晒单',
        type: 'image',
        subtype: 'moments',
        momentsContent: {
          title: '感谢老朋友',
          content: '🎉 这位客人已经是第5次入住了\n\n从第一次的"试试"\n到现在的"来这就跟回家一样"\n\n这就是我们坚持做好服务的意义\n\n💚 给回头客的专属福利：\n• 每次入住送早餐\n• 免费延迟退房\n• 专属优惠价\n\n成为我们的老朋友吧～',
          imageCount: 6,
          imageLayout: 'grid',
          callToAction: '咨询会员权益'
        },
        photoTips: '聊天记录截图+多次入住记录+房间照片+早餐照片',
        bestTime: '下午2-4点',
        engagement: '强调复购价值，引导成为会员'
      }
    ]
  },

  // 微信私域运营 - 群运营脚本
  wechatGroup: {
    name: '微信群运营脚本',
    icon: Mic,
    iconColor: '#07C160',
    desc: '粉丝群专属内容和互动脚本',
    platforms: ['wechat'],
    scenarios: ['群欢迎', '群公告', '限时闪购', '互动活动'],
    realCases: [
      {
        title: '新人进群欢迎语',
        type: 'text',
        subtype: 'group',
        groupScript: {
          title: '欢迎新朋友',
          content: '🎉 欢迎 {{昵称}} 加入希遇粉丝群！\n\n📍 本群专享福利：\n1️⃣ 群内专属价，比平台便宜20-50元\n2️⃣ 优先预订热门日期（演唱会/节假日）\n3️⃣ 不定期抽奖，免费送房券\n4️⃣ 本地吃喝玩乐攻略分享\n\n⚠️ 群规：\n❌ 禁止广告\n❌ 禁止加好友骚扰\n✅ 有问题@管理员\n\n🎁 新人礼包：\n回复【新人】领取50元券',
          atAll: false,
          type: 'welcome'
        },
        photoTips: '无需配图，纯文字',
        bestTime: '新人入群时自动发送',
        engagement: '明确群价值，引导互动'
      },
      {
        title: '群专属闪购',
        type: 'text',
        subtype: 'group',
        groupScript: {
          title: '今晚闪购',
          content: '⚡️ 【群内专属闪购】⚡️\n\n🕘 今晚还剩最后3间！\n\n📅 日期：今晚入住\n🛏️ 房型：豪华大床房\n💰 群内专享：¥299\n📱 携程价：¥459\n\n✨ 包含：\n• 双人早餐\n• 免费停车\n• 延迟退房至14:00\n\n⚡️ 已预订2间，还剩1间\n💬 回复【预订】锁定房间\n\n⏰ 21:00前有效，过期恢复原价',
          atAll: true,
          type: 'flashsale'
        },
        photoTips: '房间照片+价格对比图',
        bestTime: '晚上19:00-20:00',
        engagement: '紧迫感强，转化率高'
      },
      {
        title: '群互动抽奖',
        type: 'text',
        subtype: 'group',
        groupScript: {
          title: '周末抽奖',
          content: '🎁 【周末福利抽奖】🎁\n\n奖品：\n🥇 一等奖：免费房券1张（1名）\n🥈 二等奖：5折券1张（3名）\n🥉 三等奖：20元券1张（10名）\n\n📋 参与方式：\n1️⃣ 回复【我要抽奖】\n2️⃣ 邀请1位好友进群\n\n⏰ 开奖时间：周日晚8点\n🎲 开奖方式：群里直播摇号\n\n快来参与吧！🎉',
          atAll: true,
          type: 'interaction'
        },
        photoTips: '奖品展示图',
        bestTime: '周五下午或周六上午',
        engagement: '活跃群气氛，拉新获客'
      }
    ]
  },

  // 微信私域运营 - 私聊话术
  wechatPrivate: {
    name: '私聊话术模板',
    icon: Mic,
    iconColor: '#07C160',
    desc: '一对一客服话术，个性化服务',
    platforms: ['wechat'],
    scenarios: ['新好友欢迎', '预订咨询', '入住提醒', '回访维护', '复购引导'],
    realCases: [
      {
        title: '新加好友欢迎',
        type: 'text',
        subtype: 'private',
        privateScript: {
          title: '欢迎新好友',
          content: '您好！感谢添加希遇酒店～\n\n我是您的专属客服小希\n有任何问题随时找我\n\n🎁 新朋友专属福利：\n首单立减30元\n\n快速预订方式：\n1️⃣ 发送入住日期+房型\n2️⃣ 我为您查房报价\n3️⃣ 确认后发送付款码\n\n📍 地址：三里屯路XX号\n☎️ 前台电话：010-XXXXXXX\n\n也可以直接进群，享受群内专属价哦～',
          type: 'welcome'
        },
        photoTips: '酒店外观图+位置导航图',
        bestTime: '好友添加后立即发送',
        engagement: '建立第一印象，引导入群'
      },
      {
        title: '入住后回访',
        type: 'text',
        subtype: 'private',
        privateScript: {
          title: '入住回访',
          content: 'Hi {{姓名}}，昨晚休息得怎么样？\n\n希望我们的房间和服务让您满意\n\n💡 如果有任何建议，欢迎告诉我\n我们会不断改进～\n\n🎁 感谢您的支持：\n下次入住报暗号【老朋友】\n享专属回头客价\n\n期待再次为您服务！',
          type: 'followup'
        },
        photoTips: '无需配图',
        bestTime: '退房后当天下午',
        engagement: '收集反馈，引导复购'
      },
      {
        title: '复购引导',
        type: 'text',
        subtype: 'private',
        privateScript: {
          title: '复购优惠提醒',
          content: '{{姓名}}，好久不见！\n\n最近有出行计划吗？\n\n🏨 给老朋友的专属优惠：\n• 大床房 ¥299（原价¥399）\n• 含双早\n• 免费升级房型（视房态）\n\n📅 近期热门日期：\n• 下周末演唱会期间\n• 清明节假期\n\n需要的话帮您提前锁定房间～',
          type: 'rebooking'
        },
        photoTips: '房间实拍图',
        bestTime: '距离上次入住30天后',
        engagement: '激活沉睡客户'
      }
    ]
  },

  // 微信视频号 - 真实风格（区别于抖音）
  wechatChannels: {
    name: '视频号真实记录',
    icon: Mic,
    iconColor: '#07C160',
    desc: '真实、无滤镜、生活化的短视频',
    platforms: ['wechat'],
    scenarios: ['日常记录', '客人真实体验', '幕后故事', '周边探索'],
    realCases: [
      {
        title: '今天房间长这样｜原相机直出',
        type: 'video',
        subtype: 'channels',
        videoScript: {
          totalDuration: 30,
          scenes: [
            {
              id: 1,
              startTime: 0,
              endTime: 5,
              duration: 5,
              shot: '手机原相机打开房间门',
              subtitle: '今天带大家看看302房间',
              bgm: '轻音乐或自然音',
              tips: '原相机拍摄，不添加滤镜，展示真实光线'
            },
            {
              id: 2,
              startTime: 5,
              endTime: 15,
              duration: 10,
              shot: '缓慢移动展示房间全景',
              subtitle: '刚打扫完的样子\n阳光还不错',
              bgm: '轻音乐',
              tips: '手持稳定，展示真实空间大小和采光'
            },
            {
              id: 3,
              startTime: 15,
              endTime: 22,
              duration: 7,
              shot: '细节展示：床品、浴室、窗外',
              subtitle: '床品一客一换\n浴室干湿分离\n窗外是小区花园',
              bgm: '轻音乐',
              tips: '展示真实细节，不要过度美化'
            },
            {
              id: 4,
              startTime: 22,
              endTime: 30,
              duration: 8,
              shot: '站在窗边介绍周边',
              subtitle: '步行5分钟到工体\n楼下便利店超市都有\n需要预订的私信我～',
              bgm: '音乐渐弱',
              tips: '自然结束，引导私信而非直接下单'
            }
          ],
          materials: [
            { type: 'video', description: '房间全景展示', count: 1, tips: '原相机，无滤镜' },
            { type: 'photo', description: '床品细节', count: 2, tips: '展示整洁度' },
            { type: 'photo', description: '浴室环境', count: 1, tips: '干湿分离' },
            { type: 'video', description: '窗外景色', count: 1, tips: '展示真实环境' }
          ],
          bgmRecommendation: '轻音乐或自然音，不使用抖音神曲',
          shootingTips: [
            '使用手机原相机，关闭美颜滤镜',
            '选择自然光线好的时段拍摄',
            '镜头移动要慢，让观众看清细节',
            '不要过度剪辑，保持真实感'
          ],
          editingTips: [
            '简单剪辑，不要过多特效',
            '字幕用简洁字体，白色描边',
            '封面选择最自然的房间角度',
            '发布时选择"原创"，增加可信度'
          ]
        },
        photoTips: '原相机拍摄，展示真实房间状态',
        bestTime: '下午光线好时拍摄',
        engagement: '真实感强，转发到朋友圈效果好'
      },
      {
        title: '客人真实入住vlog｜来自老朋友的反馈',
        type: 'video',
        subtype: 'channels',
        videoScript: {
          totalDuration: 45,
          scenes: [
            {
              id: 1,
              startTime: 0,
              endTime: 8,
              duration: 8,
              shot: '客人自拍视角：到达酒店',
              subtitle: '又来住了，第3次了',
              bgm: '轻松音乐',
              tips: '邀请熟客配合拍摄，更真实'
            },
            {
              id: 2,
              startTime: 8,
              endTime: 20,
              duration: 12,
              shot: '客人展示房间+使用场景',
              subtitle: '房间还是一样干净\n床很舒服',
              bgm: '轻松音乐',
              tips: '记录客人真实使用过程'
            },
            {
              id: 3,
              startTime: 20,
              endTime: 35,
              duration: 15,
              shot: '周边探索：便利店、餐厅',
              subtitle: '楼下便利店买点零食\n附近很多吃的',
              bgm: '轻松音乐',
              tips: '展示生活便利性'
            },
            {
              id: 4,
              startTime: 35,
              endTime: 45,
              duration: 10,
              shot: '离店时总结',
              subtitle: '下次来还住这里\n推荐给朋友们',
              bgm: '音乐渐弱',
              tips: '真实评价，最有说服力'
            }
          ],
          materials: [
            { type: 'video', description: '客人入住过程', count: 1, tips: '客人配合拍摄' },
            { type: 'video', description: '房间使用场景', count: 1, tips: '真实入住状态' },
            { type: 'video', description: '周边探索', count: 1, tips: '便利店/餐厅' }
          ],
          bgmRecommendation: '轻快但不过于闹腾的音乐',
          shootingTips: [
            '邀请熟客配合，自然记录',
            '不要摆拍，记录真实过程',
            '可以适当的画外音交流'
          ],
          editingTips: [
            '保留自然感，不要过度剪辑',
            '真实比完美更重要'
          ]
        },
        photoTips: '真实入住过程记录',
        bestTime: '客人实际入住时',
        engagement: '最有说服力的内容，适合老客户转发'
      }
    ]
  },
  
  // 小红书视频 - 图文结合视频
  xhsVideo: {
    name: '小红书Vlog型',
    icon: Heart,
    iconColor: '#FF8FB1',
    desc: '沉浸式体验、氛围感视频笔记',
    platforms: ['xiaohongshu'],
    scenarios: ['入住体验', ' room tour', '周边探索'],
    realCases: [
      {
        title: '沉浸式入住｜工体旁的氛围感酒店',
        type: 'video',
        videoScript: {
          totalDuration: 30,
          scenes: [
            {
              id: 1,
              startTime: 0,
              endTime: 5,
              duration: 5,
              shot: '酒店外观+大堂',
              subtitle: '今天入住的是工体旁的这家酒店',
              bgm: '轻音乐前奏',
              tips: '优雅慢推，营造高级感'
            },
            {
              id: 2,
              startTime: 5,
              endTime: 12,
              duration: 7,
              shot: '刷卡进门→房间全景',
              subtitle: '房间不大但很温馨',
              bgm: '音乐渐强',
              tips: 'Room Tour标准开头'
            },
            {
              id: 3,
              startTime: 12,
              endTime: 20,
              duration: 8,
              shot: '床品+浴室+窗外细节',
              subtitle: '床品很干净\n浴室干湿分离\n窗外就是CBD',
              bgm: '继续',
              tips: '慢镜头展示，突出质感'
            },
            {
              id: 4,
              startTime: 20,
              endTime: 30,
              duration: 10,
              shot: '晚上演唱会散场走回酒店',
              subtitle: '看完演唱会走5分钟就到家了\n真的太方便了',
              bgm: '音乐高潮',
              tips: '对比白天，展示便利性'
            }
          ],
          materials: [
            { type: 'video', description: '酒店大堂', count: 1, tips: '稳定器慢推' },
            { type: 'video', description: 'Room Tour', count: 1, tips: '连贯拍摄房间' },
            { type: 'photo', description: '床品细节', count: 3, tips: '质感特写' },
            { type: 'video', description: '夜晚回酒店', count: 1, tips: '手持拍摄街道' }
          ],
          bgmRecommendation: '小红书热门BGM，轻音乐或治愈系',
          shootingTips: [
            '整体节奏比微信慢，突出氛围感',
            '多用慢镜头和特写',
            '色调保持温暖治愈'
          ],
          editingTips: [
            '使用小红书自带剪辑工具',
            '添加滤镜：奶杏、暖棕',
            '字幕用细体字，位置在画面下方',
            '封面选最美的房间角度'
          ]
        },
        photoTips: '慢节奏Room Tour风格',
        bestTime: '工作日晚8-10点',
        engagement: '收藏率高，适合种草'
      }
    ]
  },
  
  // 闲鱼图文
  xianyuDeal: {
    name: '闲鱼捡漏型',
    icon: Flame,
    iconColor: '#FF9500',
    desc: '急出、可刀、包邮等促销话术',
    platforms: ['xianyu'],
    scenarios: ['急出回血', '订多了转让', '行程变更'],
    realCases: [
      {
        title: '【急出】演唱会酒店｜原价¥680现¥450｜可小刀',
        type: 'image',
        imageContent: {
          title: '【急出】演唱会酒店｜原价¥680现¥450｜可小刀',
          content: '急出！急出！急出！\n\n本来约好和朋友一起看演唱会的\n结果她临时有事去不了\n一个人住太浪费了\n\n📍 位置：工体旁边，步行3分钟\n📅 日期：本周六晚\n💰 价格：¥450（原价¥680）\n可小刀，别太离谱就行\n\n房间情况：\n✅ 大床房，可以住2人\n✅ 独立卫浴，有窗户\n✅ 已付定金，可以直接改入住人\n\n🎁 Bonus：\n我买了演唱会周边小礼品\n成交的话一起送你\n\n⚠️ 诚信交易\n芝麻信用极好\n可走平台，双方都安心\n\n有意直接私聊\n看到就回\n\n#演唱会酒店 #急出 #北京住宿 #转让',
          hashtags: ['演唱会酒店', '急出', '北京住宿', '转让']
        },
        photoTips: '订单截图+房间实拍+周边礼品',
        bestTime: '随时发布，尽快处理',
        engagement: '价格敏感用户，议价较多'
      }
    ]
  }
};

// 模板使用指南
const templateGuide = {
  title: '如何选择合适的模板？',
  tips: [
    { scenario: '演唱会门票已买，临时去不了', template: 'concertTransfer', reason: '真实转让场景，可信度高' },
    { scenario: '想吸引自然流量', template: 'xhsGuide', reason: '攻略型内容搜索权重高' },
    { scenario: '情侣/女性用户', template: 'coupleStay', reason: '氛围感强，转化率高' },
    { scenario: '微信每日早安', template: 'wechatMorning', reason: '软性植入，不引起反感' },
    { scenario: '朋友圈好评晒单', template: 'wechatTestimonial', reason: '建立信任，口碑营销' },
    { scenario: '微信群限时闪购', template: 'wechatGroup', reason: '紧迫感强，群内转化率高' },
    { scenario: '私聊激活老客户', template: 'wechatPrivate', reason: '个性化服务，引导复购' },
    { scenario: '视频号真实记录', template: 'wechatChannels', reason: '真实感强，适合转发传播' },
    { scenario: '快速出清库存', template: 'xianyuDeal', reason: '闲鱼用户价格敏感，成交快' },
    { scenario: '企业客户/B端', template: 'businessTrip', reason: '专业性强，客单价高' },
  ]
};

// ============================================
// 历史生成记录（本地存储）
// ============================================
// 生成内容结果类型
type GeneratedContent = {
  id: string;
  platform: Platform;
  template: string;
  contentType: ContentType;
  subtype?: WechatContentSubtype;
  title: string;
  content: string;
  images: string[];
  generatedAt: string;
  status: 'draft' | 'published' | 'expired';
  videoScript?: VideoScript; // 视频脚本（视频类型时存在）
  groupScript?: GroupScript; // 群运营脚本
  privateScript?: PrivateChatScript; // 私聊话术
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
  };
};

// ============================================
// 主组件
// ============================================
export default function ContentFactory() {
  const { 
    currentTheme, 
    currentHotel, 
    pricing, 
    currentMode,
    currentRoomType,
    addContent
  } = useUnifiedStore();
  
  // UI状态
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('xianyu');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('concertTransfer');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'history'>('generate');
  const [contentType, setContentType] = useState<ContentType>('image'); // 内容类型：图文或视频
  
  // 步骤向导状态
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // 视频预览状态（预留）
  // const [isPlaying, setIsPlaying] = useState(false);
  // const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  
  // 用户上传的本地图片
  const [uploadedImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [_countdown, setCountdown] = useState(0);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [contentHistory, setContentHistory] = useState<GeneratedContent[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  
  void themeColors[currentTheme];
  const mode = modeDetails[currentMode];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从localStorage加载历史记录
  useEffect(() => {
    const saved = localStorage.getItem('content-history');
    if (saved) {
      setContentHistory(JSON.parse(saved));
    }
  }, []);

  // 保存历史记录到localStorage
  useEffect(() => {
    localStorage.setItem('content-history', JSON.stringify(contentHistory));
  }, [contentHistory]);

  // Toast 提示
  const toast = useToast();

  // 价格替换辅助函数
  const replacePrices = (text: string, basePrice: number, competitorAvg: number, platformPrice: number): string => {
    return text
      .replace(/当前酒店\.name/g, currentHotel.name)
      .replace(/\$\{currentHotel\.name\}/g, currentHotel.name)
      .replace(/原价¥\d+/g, `原价¥${Math.round(basePrice * 1.2)}`)
      .replace(/现¥\d+/g, `现¥${platformPrice}`)
      .replace(/¥\d+出/g, `¥${platformPrice}出`)
      .replace(/订成¥\d+/g, `订成¥${Math.round(basePrice * 1.2)}`)
      .replace(/当时订成¥\d+/g, `当时订成¥${Math.round(basePrice * 1.2)}`)
      .replace(/价格：¥\d+/g, `价格：¥${platformPrice}`)
      .replace(/人均¥\d+/g, `人均¥${Math.round(platformPrice / 2)}`)
      .replace(/¥300\/晚/g, `¥${platformPrice}/晚`)
      .replace(/¥300\+/g, `¥${platformPrice}`)
      .replace(/¥520/g, `¥${platformPrice}`)
      .replace(/¥450/g, `¥${platformPrice}`)
      .replace(/¥580/g, `¥${platformPrice}`)
      .replace(/¥400\+/g, `¥${Math.round(platformPrice * 0.8)}+`)
      .replace(/¥500/g, `¥${Math.round(platformPrice * 0.9)}`)
      .replace(/¥600\+/g, `¥${competitorAvg}+`)
      .replace(/¥680/g, `¥${Math.round(basePrice * 1.2)}`)
      .replace(/¥800\+/g, `¥${competitorAvg}+`)
      .replace(/比亚朵便宜¥\d+/g, `比亚朵便宜¥${Math.round(competitorAvg - platformPrice)}`)
      .replace(/便宜¥\d+/g, `便宜¥${Math.round(competitorAvg - platformPrice)}`)
      .replace(/协议价：¥\d+/g, `协议价：¥${platformPrice}`);
  };

  // 生成内容 - 支持图文和视频
  const generateContent = async () => {
    if (selectedImages.length === 0) {
      toast.warning('请至少选择一张图片');
      return;
    }
    
    setIsGenerating(true);
    
    // 模拟AI生成耗时
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const platformPrices = {
      xianyu: pricing?.platformPrices?.xianyu?.price || 626,
      xiaohongshu: pricing?.platformPrices?.xiaohongshu?.price || 580,
      wechat: pricing?.platformPrices?.wechat?.price || 551,
    };
    
    const basePrice = pricing?.basePrice || 580;
    const competitorAvg = pricing?.competitorAvg || 680;
    
    // 获取当前选中的模板
    const template = contentTemplates[selectedTemplate as keyof typeof contentTemplates];
    
    // 查找符合当前内容类型的案例
    const suitableCases = template?.realCases?.filter(c => c.type === contentType) || [];
    const randomCase = suitableCases.length > 0 
      ? suitableCases[Math.floor(Math.random() * suitableCases.length)]
      : template?.realCases?.[0];
    
    let title = '';
    let content = '';
    let videoScript: VideoScript | undefined;
    let groupScript: GroupScript | undefined;
    let privateScript: PrivateChatScript | undefined;
    let subtype: WechatContentSubtype | undefined;
    
    if (randomCase) {
      title = replacePrices(randomCase.title, basePrice, competitorAvg, platformPrices[selectedPlatform]);
      subtype = randomCase.subtype;
      
      if (contentType === 'image' && randomCase.imageContent) {
        // 图文内容（小红书/闲鱼）
        content = replacePrices(randomCase.imageContent.content, basePrice, competitorAvg, platformPrices[selectedPlatform]);
      } else if (contentType === 'video' && randomCase.videoScript) {
        // 视频脚本 - 深拷贝并替换价格
        const script = JSON.parse(JSON.stringify(randomCase.videoScript)) as VideoScript;
        script.scenes.forEach((scene: VideoScene) => {
          scene.shot = replacePrices(scene.shot, basePrice, competitorAvg, platformPrices[selectedPlatform]);
          scene.subtitle = replacePrices(scene.subtitle, basePrice, competitorAvg, platformPrices[selectedPlatform]);
        });
        videoScript = script;
        // 生成视频文案（用于发布时的文字描述）
        content = `🎬 视频时长：${script.totalDuration}秒\n🎵 BGM建议：${script.bgmRecommendation}\n\n📋 分镜脚本：\n${script.scenes.map((s: VideoScene) => `${s.startTime}-${s.endTime}秒: ${s.shot}`).join('\n')}`;
      } else if (randomCase.momentsContent) {
        // 朋友圈内容
        content = replacePrices(randomCase.momentsContent.content, basePrice, competitorAvg, platformPrices[selectedPlatform]);
      } else if (randomCase.groupScript) {
        // 群运营脚本
        const script = JSON.parse(JSON.stringify(randomCase.groupScript)) as GroupScript;
        script.content = replacePrices(script.content, basePrice, competitorAvg, platformPrices[selectedPlatform]);
        groupScript = script;
        content = script.content;
      } else if (randomCase.privateScript) {
        // 私聊话术
        const script = JSON.parse(JSON.stringify(randomCase.privateScript)) as PrivateChatScript;
        script.content = replacePrices(script.content, basePrice, competitorAvg, platformPrices[selectedPlatform]);
        privateScript = script;
        content = script.content;
      } else {
        // 备用
        content = `📍位置：${currentHotel.name}，距演唱会场馆超近\n💰价格：¥${platformPrices[selectedPlatform]}/晚\n🏨房型：${currentRoomType?.name || '豪华房'}`;
      }
    } else {
      // 备用生成逻辑
      title = `【推荐】${currentHotel.name}｜${currentRoomType?.name || '优质房源'}｜演唱会住宿首选`;
      content = `📍位置：${currentHotel.name}，距演唱会场馆超近\n💰价格：¥${platformPrices[selectedPlatform]}/晚\n🏨房型：${currentRoomType?.name || '豪华房'}\n✨特色：位置优越，出行便利\n\n#演唱会住宿 #北京酒店 #酒店推荐`;
    }
    
    const newContent: GeneratedContent = {
      id: `content-${Date.now()}`,
      platform: selectedPlatform,
      template: selectedTemplate,
      contentType,
      subtype,
      title,
      content,
      images: selectedImages,
      generatedAt: new Date().toISOString(),
      status: 'draft',
      videoScript,
      groupScript,
      privateScript,
    };
    
    setGeneratedContent(newContent);
    setContentHistory(prev => [newContent, ...prev]);
    setIsGenerating(false);
    
    // ===== 发送内容生成事件到知识库 =====
    try {
      const { sendContentGeneratedEvent } = await import('@/admin/services/aiKnowledgeCollector');
      sendContentGeneratedEvent({
        eventId: newContent.id,
        hotelId: currentHotel.id,
        hotelName: currentHotel.name,
        timestamp: newContent.generatedAt,
        input: {
          features: [
            selectedPlatform === 'xiaohongshu' ? 1 : selectedPlatform === 'xianyu' ? 0.7 : 0.5,
            contentType === 'video' ? 1 : 0.5,
            basePrice / 1000,
          ],
          context: {
            platform: selectedPlatform,
            contentType,
            template: selectedTemplate,
            pricePoint: basePrice,
          },
        },
        aiOutput: {
          model: 'content-template-v1',
          suggestion: {
            title: newContent.title,
            text: newContent.content,
            hashtags: newContent.content.match(/#[\w\u4e00-\u9fa5]+/g) || [],
          },
          confidence: 0.75,
          reasoning: `基于${selectedTemplate}模板生成${selectedPlatform}内容`,
        },
      });
      console.log('[ContentFactory] Content generation event sent to knowledge base');
    } catch (error) {
      console.error('[ContentFactory] Failed to send event:', error);
    }
    
    // 启动15分钟库存倒计时
    setCountdown(15 * 60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 发布内容
  const publishContent = () => {
    if (!generatedContent) return;
    
    const isPrivateDomain = generatedContent.platform === 'wechat';
    
    if (isPrivateDomain) {
      // 私域内容保存为草稿，需要到 PrivateDomain 页面手动发布
      const draftContent: ContentItem = {
        id: generatedContent.id,
        platform: generatedContent.platform,
        title: generatedContent.title,
        content: generatedContent.content,
        price: pricing?.platformPrices?.[generatedContent.platform]?.price || 580,
        status: 'draft',
        performance: {
          impressions: 0,
          clicks: 0,
          inquiries: 0,
          conversions: 0,
          touches: 0,
          replies: 0,
          privateConversions: 0,
        },
        createdAt: new Date().toISOString(),
        // 保存私域内容扩展字段
        contentType: generatedContent.contentType,
        subtype: generatedContent.subtype,
        videoScript: generatedContent.videoScript,
        groupScript: generatedContent.groupScript,
        privateScript: generatedContent.privateScript,
        images: generatedContent.images,
        publishMethod: 'manual',
      };
      
      addContent(draftContent);
      toast.success('私域内容已保存，请在"私域运营"页面确认后发布');
    } else {
      // 公域内容直接发布
      const publishedContent = { ...generatedContent, status: 'published' as const };
      setGeneratedContent(publishedContent);
      setContentHistory(prev => 
        prev.map(c => c.id === generatedContent.id ? publishedContent : c)
      );
      
      const contentItem: ContentItem = {
        id: generatedContent.id,
        platform: generatedContent.platform,
        title: generatedContent.title,
        content: generatedContent.content,
        price: pricing?.platformPrices?.[generatedContent.platform]?.price || 580,
        status: 'published',
        performance: {
          impressions: 0,
          clicks: 0,
          inquiries: 0,
          conversions: 0,
        },
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        contentType: generatedContent.contentType,
        subtype: generatedContent.subtype,
        videoScript: generatedContent.videoScript,
        groupScript: generatedContent.groupScript,
        privateScript: generatedContent.privateScript,
        images: generatedContent.images,
        publishMethod: 'auto',
      };
      
      addContent(contentItem);
      toast.success('发布成功', '可在"发布状态"页面查看');
    }
  };

  // 复制内容
  const copyContent = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(`${generatedContent.title}\n\n${generatedContent.content}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // 删除历史记录
  const deleteHistory = (id: string) => {
    setContentHistory(prev => prev.filter(c => c.id !== id));
  };

  // 重新加载历史内容
  const loadHistory = (content: GeneratedContent) => {
    setGeneratedContent(content);
    setSelectedPlatform(content.platform);
    setSelectedTemplate(content.template);
    setSelectedImages(content.images);
    setActiveTab('generate');
  };

  // 格式化时间
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 计算统计数据
  const stats = useMemo(() => {
    const totalContents = contentHistory.length;
    const publishedContents = contentHistory.filter(c => c.status === 'published').length;
    const totalImpressions = contentHistory.reduce((sum, c) => sum + (c.performance?.impressions || 0), 0);
    const totalConversions = contentHistory.reduce((sum, c) => sum + (c.performance?.conversions || 0), 0);
    const conversionRate = totalImpressions > 0 ? Math.round((totalConversions / totalImpressions) * 100) : 0;
    
    return {
      totalContents,
      publishedContents,
      totalImpressions,
      totalConversions,
      conversionRate,
    };
  }, [contentHistory]);

  return (
    <div className="space-y-6">
      {/* 页面标题 + 统计卡片 + Tab切换 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">内容工厂</h1>
            <span className="px-2 py-0.5 rounded text-xs bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
              {mode.label}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">AI生成多平台差异化内容</p>
        </div>
        
        <div className="flex items-center gap-2 bg-bg-secondary rounded-xl p-1 border border-border-color">
          {[
            { key: 'generate', icon: Sparkles, label: '生成内容' },
            { key: 'library', icon: LayoutTemplate, label: '模板库' },
            { key: 'history', icon: History, label: '历史记录', badge: contentHistory.length },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                  activeTab === tab.key
                    ? 'bg-neon-cyan/20 text-neon-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className="px-1.5 py-0.5 bg-neon-cyan/30 rounded text-xs">{tab.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 关键指标统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">生成内容</span>
            <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
              <Rocket size={16} className="text-neon-cyan" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neon-cyan">{stats.totalContents}</div>
          <div className="text-xs text-text-secondary mt-1">已发布 {stats.publishedContents}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">总曝光</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Eye size={16} className="text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats.totalImpressions.toLocaleString()}</div>
          <div className="text-xs text-text-secondary mt-1">累计浏览量</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">成交转化</span>
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-neon-green" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neon-green">{stats.totalConversions}</div>
          <div className="text-xs text-text-secondary mt-1">转化率 {stats.conversionRate}%</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">当前模式</span>
            <div className="w-8 h-8 rounded-lg bg-neon-amber/10 flex items-center justify-center">
              <mode.icon size={16} style={{ color: mode.color }} />
            </div>
          </div>
          <div className="text-lg font-bold" style={{ color: mode.color }}>{mode.label}</div>
          <div className="text-xs text-text-secondary mt-1">{mode.description}</div>
        </motion.div>
      </div>

      {/* 生成内容 Tab - 步骤向导 */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {/* 步骤导航 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <div className="flex items-center justify-between">
              {/* 步骤1 */}
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= 1 ? 'bg-neon-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
                }`}>
                  1
                </div>
                <div>
                  <div className={`font-medium ${currentStep >= 1 ? 'text-text-primary' : 'text-text-secondary'}`}>选择配置</div>
                  <div className="text-xs text-text-secondary">平台、模板、图片</div>
                </div>
              </div>
              
              {/* 连接线 */}
              <div className={`flex-1 h-1 mx-6 rounded ${currentStep >= 2 ? 'bg-neon-cyan' : 'bg-bg-tertiary'}`} />
              
              {/* 步骤2 */}
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= 2 ? 'bg-neon-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
                }`}>
                  2
                </div>
                <div>
                  <div className={`font-medium ${currentStep >= 2 ? 'text-text-primary' : 'text-text-secondary'}`}>生成预览</div>
                  <div className="text-xs text-text-secondary">AI生成内容</div>
                </div>
              </div>
              
              {/* 连接线 */}
              <div className={`flex-1 h-1 mx-6 rounded ${currentStep >= 3 ? 'bg-neon-cyan' : 'bg-bg-tertiary'}`} />
              
              {/* 步骤3 */}
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= 3 ? 'bg-neon-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
                }`}>
                  3
                </div>
                <div>
                  <div className={`font-medium ${currentStep >= 3 ? 'text-text-primary' : 'text-text-secondary'}`}>导出发布</div>
                  <div className="text-xs text-text-secondary">复制或导出</div>
                </div>
              </div>
            </div>
          </div>

          {/* 步骤内容 */}
          <div className="min-h-[500px]">
            {/* ===== 步骤1：选择配置 ===== */}
            {currentStep === 1 && (
              <div className="grid grid-cols-3 gap-6">
                {/* 左列：基础设置 */}
                <div className="space-y-6">
                  {/* 市场态势 */}
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Eye size={16} className="text-neon-cyan" />
                      当前市场态势
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <mode.icon size={24} style={{ color: mode.color }} />
                      <div>
                        <div className="font-medium" style={{ color: mode.color }}>{mode.label}</div>
                        <div className="text-xs text-text-secondary">{mode.description}</div>
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      让价空间: <span className="text-neon-cyan">{calculatePriceRange(currentMode).label}</span>
                    </div>
                  </div>

                  {/* 内容类型 */}
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                    <h3 className="font-medium mb-3">内容形式</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setContentType('image');
                          if (selectedPlatform === 'wechat') setSelectedPlatform('xiaohongshu');
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          contentType === 'image'
                            ? 'border-neon-cyan bg-neon-cyan/10'
                            : 'border-border-color hover:border-neon-cyan/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ImageIcon size={18} className={contentType === 'image' ? 'text-neon-cyan' : 'text-text-secondary'} />
                          <span className={contentType === 'image' ? 'text-neon-cyan' : ''}>图文笔记</span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">适合小红书、闲鱼、朋友圈</p>
                      </button>
                      <button
                        onClick={() => {
                          setContentType('video');
                          if (selectedPlatform === 'xianyu') setSelectedPlatform('xiaohongshu');
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          contentType === 'video'
                            ? 'border-neon-purple bg-neon-purple/10'
                            : 'border-border-color hover:border-neon-purple/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Mic size={18} className={contentType === 'video' ? 'text-neon-purple' : 'text-text-secondary'} />
                          <span className={contentType === 'video' ? 'text-neon-purple' : ''}>短视频</span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">适合视频号、小红书</p>
                      </button>
                      {selectedPlatform === 'wechat' && (
                        <button
                          onClick={() => setContentType('text')}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            contentType === 'text'
                              ? 'border-neon-green bg-neon-green/10'
                              : 'border-border-color hover:border-neon-green/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Mic size={18} className={contentType === 'text' ? 'text-neon-green' : 'text-text-secondary'} />
                            <span className={contentType === 'text' ? 'text-neon-green' : ''}>私域文案</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-1">适合微信群、私聊话术</p>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 平台选择 */}
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                    <h3 className="font-medium mb-3">发布平台</h3>
                    <div className="space-y-2">
                      {(contentType === 'video' 
                        ? ['xiaohongshu', 'wechat'] as Platform[]
                        : contentType === 'text'
                        ? ['wechat'] as Platform[]
                        : ['xianyu', 'xiaohongshu', 'wechat'] as Platform[]
                      ).map((platform) => {
                        const info = platformLogos[platform];
                        return (
                          <button
                            key={platform}
                            onClick={() => setSelectedPlatform(platform)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              selectedPlatform === platform
                                ? 'border-neon-cyan bg-neon-cyan/10'
                                : 'border-border-color hover:border-neon-cyan/50'
                            }`}
                          >
                            <img src={info.logo} alt={info.name} className="w-8 h-8 rounded object-contain" />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">{info.name}</div>
                            </div>
                            {selectedPlatform === platform && <Check size={14} className="text-neon-cyan" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 p-2 bg-neon-amber/10 rounded text-xs text-neon-amber">
                      {contentType === 'video' 
                        ? '💡 短视频不支持闲鱼' 
                        : contentType === 'text'
                        ? '💡 私域文案仅支持微信'
                        : '💡 朋友圈图文请选择微信'}
                    </div>
                  </div>
                </div>

                {/* 中列：模板选择 */}
                <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                  <h3 className="font-medium mb-4">选择模板</h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {Object.entries(contentTemplates).map(([key, template]) => {
                      // 过滤不支持当前平台的模板
                      if (!template.platforms.includes(selectedPlatform)) return null;
                      
                      // 过滤不支持当前内容类型的模板
                      const hasSuitableCase = template.realCases.some(c => {
                        if (contentType === 'text') {
                          // 文本类型：群运营或私聊话术
                          return c.subtype === 'group' || c.subtype === 'private';
                        }
                        return c.type === contentType;
                      });
                      if (!hasSuitableCase) return null;
                      
                      const Icon = template.icon;
                      const isSelected = selectedTemplate === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedTemplate(key)}
                          className={`w-full p-4 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-neon-cyan bg-neon-cyan/10'
                              : 'border-border-color hover:border-neon-cyan/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg" style={{ background: `${template.iconColor}20` }}>
                              <Icon size={20} style={{ color: template.iconColor }} />
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${isSelected ? 'text-neon-cyan' : ''}`}>{template.name}</div>
                              <div className="text-xs text-text-secondary mt-1">{template.desc}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.scenarios.slice(0, 2).map((s, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">{s}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 右列：图片选择 */}
                <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">选择图片 ({selectedImages.length}/9)</h3>
                    <button
                      onClick={() => setShowImageLibrary(true)}
                      className="text-xs text-neon-cyan hover:underline"
                    >
                      从图库选择
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {selectedImages.map((imgId) => {
                      const img = uploadedImages.find(i => i.id === imgId) || mockImageLibrary.find(i => i.id === imgId);
                      return (
                        <div key={imgId} className="relative aspect-square rounded-lg overflow-hidden">
                          <LazyImage src={img?.url || ''} alt={img?.name || ''} className="w-full h-full" />
                          <button
                            onClick={() => setSelectedImages(prev => prev.filter(id => id !== imgId))}
                            className="absolute top-1 right-1 w-5 h-5 bg-neon-red rounded-full flex items-center justify-center"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {selectedImages.length < 9 && (
                      <button
                        onClick={() => setShowImageLibrary(true)}
                        className="aspect-square rounded-lg border-2 border-dashed border-border-color flex flex-col items-center justify-center text-text-secondary hover:border-neon-cyan hover:text-neon-cyan transition-all"
                      >
                        <Upload size={20} />
                        <span className="text-xs mt-1">添加</span>
                      </button>
                    )}
                  </div>
                  
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 border border-dashed border-border-color rounded-lg text-sm text-text-secondary hover:border-neon-cyan hover:text-neon-cyan transition-all"
                  >
                    + 上传本地图片
                  </button>

                  {/* 下一步按钮 */}
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={selectedImages.length === 0}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-neon-cyan to-blue-500 rounded-xl font-semibold text-bg-primary flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  >
                    下一步：生成内容
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ===== 步骤2：生成预览 ===== */}
            {currentStep === 2 && (
              <div className="grid grid-cols-12 gap-6">
                {/* 左侧：配置摘要 */}
                <div className="col-span-3 space-y-4">
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Check size={16} className="text-neon-green" />
                      当前配置
                    </h3>
                    <div className="space-y-4">
                      {/* 平台信息 */}
                      <div className="p-3 bg-bg-tertiary rounded-lg">
                        <div className="text-xs text-text-secondary mb-1">发布平台</div>
                        <div className="flex items-center gap-2">
                          <img 
                            src={platformLogos[selectedPlatform].logo}
                            alt={platformLogos[selectedPlatform].name}
                            className="w-6 h-6 rounded object-contain"
                          />
                          <span className="font-medium">{platformLogos[selectedPlatform].name}</span>
                        </div>
                      </div>
                      
                      {/* 模板信息 */}
                      <div className="p-3 bg-bg-tertiary rounded-lg">
                        <div className="text-xs text-text-secondary mb-1">内容模板</div>
                        <div className="font-medium text-sm">
                          {contentTemplates[selectedTemplate as keyof typeof contentTemplates]?.name}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {contentTemplates[selectedTemplate as keyof typeof contentTemplates]?.desc}
                        </div>
                      </div>
                      
                      {/* 内容类型 */}
                      <div className="p-3 bg-bg-tertiary rounded-lg">
                        <div className="text-xs text-text-secondary mb-1">内容形式</div>
                        <div className="flex items-center gap-2">
                          {contentType === 'image' ? (
                            <>
                              <ImageIcon size={16} className="text-neon-cyan" />
                              <span>图文笔记</span>
                            </>
                          ) : (
                            <>
                              <Mic size={16} className="text-neon-purple" />
                              <span>短视频</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* 图片数量 */}
                      <div className="p-3 bg-bg-tertiary rounded-lg">
                        <div className="text-xs text-text-secondary mb-1">已选图片</div>
                        <div className="font-medium">{selectedImages.length} 张</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 上一步按钮 */}
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="w-full py-3 bg-bg-tertiary border border-border-color rounded-xl font-medium flex items-center justify-center gap-2 hover:border-neon-cyan transition-all"
                  >
                    ← 返回修改配置
                  </button>
                </div>

                {/* 中间：生成操作区 */}
                <div className="col-span-4">
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-6 h-full flex flex-col">
                    <h3 className="font-medium mb-6 flex items-center gap-2">
                      <Wand2 size={18} className="text-neon-cyan" />
                      AI 内容生成
                    </h3>
                    
                    {/* 生成按钮 */}
                    {!generatedContent && !isGenerating && (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-cyan/20 to-blue-500/20 flex items-center justify-center mb-6">
                          <Sparkles size={40} className="text-neon-cyan" />
                        </div>
                        <p className="text-lg font-medium mb-2">准备好生成内容了</p>
                        <p className="text-sm text-text-secondary text-center mb-6">
                          AI将根据您的配置自动生成<br />适合{platformLogos[selectedPlatform].name}的{
                            contentType === 'image' 
                              ? '图文内容' 
                              : contentType === 'video' 
                              ? '视频脚本'
                              : '私域运营文案'
                          }
                        </p>
                        <button
                          onClick={generateContent}
                          className={`px-8 py-4 rounded-xl font-semibold text-bg-primary flex items-center gap-3 transition-all hover:shadow-lg ${
                            contentType === 'video'
                              ? 'bg-gradient-to-r from-neon-purple to-pink-500 hover:shadow-neon-purple/30'
                              : 'bg-gradient-to-r from-neon-cyan to-blue-500 hover:shadow-neon-cyan/30'
                          }`}
                        >
                          <Wand2 size={20} />
                          开始生成
                        </button>
                      </div>
                    )}
                    
                    {/* 生成中动画 */}
                    {isGenerating && (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                          transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 1, repeat: Infinity } }}
                          className="w-24 h-24 rounded-full border-4 border-neon-cyan/30 border-t-neon-cyan flex items-center justify-center mb-6"
                        >
                          <Sparkles size={32} className="text-neon-cyan" />
                        </motion.div>
                        <p className="text-lg font-medium mb-2">AI正在创作中...</p>
                        <p className="text-sm text-text-secondary">分析平台风格 · 匹配模板 · 生成文案</p>
                      </div>
                    )}
                    
                    {/* 生成完成提示 */}
                    {generatedContent && !isGenerating && (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-24 h-24 rounded-full bg-neon-green/20 flex items-center justify-center mb-6"
                        >
                          <Check size={48} className="text-neon-green" />
                        </motion.div>
                        <p className="text-lg font-medium mb-2">内容生成成功！</p>
                        <p className="text-sm text-text-secondary text-center mb-6">
                          预览效果满意后<br />点击下一步进行发布
                        </p>
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="px-8 py-4 bg-gradient-to-r from-neon-green to-emerald-500 rounded-xl font-semibold text-bg-primary flex items-center gap-3 hover:shadow-lg hover:shadow-neon-green/30 transition-all"
                        >
                          下一步：导出发布
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧：预览区域 */}
                <div className="col-span-5">
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-5 h-full">
                    <h3 className="font-medium mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Eye size={16} className="text-neon-cyan" />
                        内容预览
                      </span>
                      {generatedContent && (
                        <span className="text-xs px-2 py-1 bg-neon-green/20 text-neon-green rounded">
                          已生成
                        </span>
                      )}
                    </h3>
                    
                    {generatedContent ? (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {/* 标题 */}
                        <div className="p-3 bg-bg-tertiary rounded-lg">
                          <div className="text-xs text-text-secondary mb-1">标题</div>
                          <div className="font-medium text-sm">{generatedContent.title}</div>
                        </div>
                        
                        {/* 视频脚本预览（仅视频类型） */}
                        {generatedContent.contentType === 'video' && generatedContent.videoScript && (
                          <div className="p-3 bg-neon-purple/10 border border-neon-purple/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Mic size={14} className="text-neon-purple" />
                              <span className="text-sm font-medium text-neon-purple">视频脚本概览</span>
                            </div>
                            <div className="text-xs text-text-secondary">
                              总时长: {generatedContent.videoScript.totalDuration}秒 · 
                              {generatedContent.videoScript.scenes.length}个场景
                            </div>
                            <div className="mt-2 space-y-1">
                              {generatedContent.videoScript.scenes.slice(0, 3).map((scene, idx) => (
                                <div key={idx} className="text-xs p-2 bg-bg-secondary rounded">
                                  <span className="text-neon-cyan">{scene.startTime}-{scene.endTime}s</span>
                                  <span className="text-text-secondary ml-2">{scene.shot}</span>
                                </div>
                              ))}
                              {generatedContent.videoScript.scenes.length > 3 && (
                                <div className="text-xs text-text-secondary text-center py-1">
                                  ...还有{generatedContent.videoScript.scenes.length - 3}个场景
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 微信群运营脚本预览 */}
                        {generatedContent.groupScript && (
                          <div className="p-3 bg-neon-green/10 border border-neon-green/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Mic size={14} className="text-neon-green" />
                              <span className="text-sm font-medium text-neon-green">
                                群运营脚本 · {generatedContent.groupScript.type === 'welcome' ? '欢迎语' : generatedContent.groupScript.type === 'flashsale' ? '闪购' : generatedContent.groupScript.type === 'interaction' ? '互动' : '公告'}
                              </span>
                            </div>
                            {generatedContent.groupScript.atAll && (
                              <div className="text-xs text-neon-amber mb-2">@所有人</div>
                            )}
                            <div className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-4">
                              {generatedContent.groupScript.content}
                            </div>
                          </div>
                        )}
                        
                        {/* 私聊话术预览 */}
                        {generatedContent.privateScript && (
                          <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Mic size={14} className="text-neon-cyan" />
                              <span className="text-sm font-medium text-neon-cyan">
                                私聊话术 · {generatedContent.privateScript.type === 'welcome' ? '新好友' : generatedContent.privateScript.type === 'followup' ? '回访' : generatedContent.privateScript.type === 'rebooking' ? '复购引导' : '预订咨询'}
                              </span>
                            </div>
                            <div className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-4">
                              {generatedContent.privateScript.content}
                            </div>
                          </div>
                        )}
                        
                        {/* 文案预览 */}
                        <div className="p-3 bg-bg-tertiary rounded-lg">
                          <div className="text-xs text-text-secondary mb-1">文案预览</div>
                          <div className="text-sm text-text-secondary whitespace-pre-wrap line-clamp-6">
                            {generatedContent.content}
                          </div>
                        </div>
                        
                        {/* 图片预览 */}
                        {generatedContent.images.length > 0 && (
                          <div>
                            <div className="text-xs text-text-secondary mb-2">配图预览</div>
                            <div className="grid grid-cols-3 gap-2">
                              {generatedContent.images.slice(0, 6).map((imgId, idx) => {
                                const img = uploadedImages.find(i => i.id === imgId) || mockImageLibrary.find(i => i.id === imgId);
                                return (
                                  <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                    <img src={img?.url || ''} alt="" className="w-full h-full object-cover" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-96 flex flex-col items-center justify-center text-text-secondary">
                        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                          <Eye size={32} className="opacity-30" />
                        </div>
                        <p className="text-sm">点击左侧生成按钮</p>
                        <p className="text-xs text-text-secondary mt-1">预览将在这里显示</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== 步骤3：导出发布 ===== */}
            {currentStep === 3 && generatedContent && (
              <div className="grid grid-cols-12 gap-6">
                {/* 左侧：最终预览 */}
                <div className="col-span-7">
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Eye size={16} className="text-neon-cyan" />
                      最终预览
                    </h3>
                    
                    {/* 平台样式预览 */}
                    <div className="rounded-xl overflow-hidden shadow-2xl max-w-md mx-auto">
                      {selectedPlatform === 'xianyu' && (
                        <div className="bg-[#F6F7F9] text-gray-900">
                          {/* 闲鱼顶部导航 */}
                          <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-text-primary text-xs font-bold">卖家</div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">酒店小助手</div>
                              <div className="text-xs text-text-secondary">信用极好 | IP属地：北京</div>
                            </div>
                            <button className="px-3 py-1 border border-red-500 text-red-500 rounded-full text-xs">关注</button>
                          </div>
                          
                          {/* 闲鱼图片区域 */}
                          <div className="bg-white">
                            <div className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                              {generatedContent.images.map((imgId, idx) => {
                                const img = uploadedImages.find(i => i.id === imgId) || mockImageLibrary.find(i => i.id === imgId);
                                return (
                                  <div key={idx} className="flex-shrink-0 w-full snap-center aspect-square bg-gray-100">
                                    <img src={img?.url || ''} alt="" className="w-full h-full object-cover" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* 闲鱼价格区域 */}
                          <div className="bg-white px-4 py-3 border-b border-gray-100">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-red-600">
                                <span className="text-sm">¥</span>{pricing?.platformPrices?.[selectedPlatform]?.price || 626}
                              </span>
                              <span className="text-sm text-text-secondary line-through">¥{Math.round((pricing?.basePrice || 580) * 1.2)}</span>
                            </div>
                          </div>
                          
                          {/* 闲鱼标题和内容 */}
                          <div className="bg-white px-4 py-3 border-b border-gray-100">
                            <h4 className="font-medium text-base leading-relaxed mb-2">{generatedContent.title}</h4>
                            <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{generatedContent.content}</div>
                          </div>
                          
                          {/* 闲鱼底部操作栏 */}
                          <div className="bg-white px-4 py-3 flex items-center justify-end gap-4">
                            <button className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-text-primary rounded-full font-medium text-sm">
                              我想要
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {selectedPlatform === 'xiaohongshu' && (
                        <div className="bg-white text-gray-900">
                          {/* 小红书顶部 */}
                          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center text-text-primary text-xs font-bold">酒店</div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{currentHotel.name}</div>
                              <div className="text-xs text-text-secondary">北京 · 酒店民宿</div>
                            </div>
                            <button className="px-4 py-1.5 bg-red-500 text-text-primary rounded-full text-xs font-medium">关注</button>
                          </div>
                          
                          {/* 小红书图片 */}
                          <div className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                            {generatedContent.images.map((imgId, idx) => {
                              const img = uploadedImages.find(i => i.id === imgId) || mockImageLibrary.find(i => i.id === imgId);
                              return (
                                <div key={idx} className="flex-shrink-0 w-full snap-center aspect-[3/4] bg-gray-100">
                                  <img src={img?.url || ''} alt="" className="w-full h-full object-cover" />
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* 小红书互动栏 */}
                          <div className="px-4 py-3 flex items-center gap-6 border-b border-gray-50">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-6 h-6" fill="#ff2442" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                              <span className="text-sm">128</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                              <span className="text-sm">23</span>
                            </div>
                          </div>
                          
                          {/* 小红书内容区域 */}
                          <div className="px-4 py-3">
                            <h4 className="font-medium text-base mb-2">{generatedContent.title}</h4>
                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{generatedContent.content}</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedPlatform === 'wechat' && (
                        <div className="bg-black text-text-primary">
                          <div className="aspect-[9/16] relative">
                            {generatedContent.images[0] && (
                              <img 
                                src={(uploadedImages.find(i => i.id === generatedContent.images[0]) || mockImageLibrary.find(i => i.id === generatedContent.images[0]))?.url} 
                                alt="" 
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                            <div className="absolute left-4 right-16 bottom-4">
                              <div className="text-sm mb-2">{generatedContent.title}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧：操作按钮 */}
                <div className="col-span-5 space-y-4">
                  <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Send size={16} className="text-neon-green" />
                      发布操作
                    </h3>
                    
                    <div className="space-y-3">
                      {/* 复制文案 */}
                      <button
                        onClick={copyContent}
                        className="w-full py-4 bg-bg-tertiary border border-border-color rounded-xl flex items-center justify-center gap-3 hover:border-neon-cyan transition-all"
                      >
                        {copySuccess ? <Check size={20} className="text-neon-green" /> : <Copy size={20} />}
                        <span className="font-medium">{copySuccess ? '已复制到剪贴板' : '复制文案内容'}</span>
                      </button>
                      
                      {/* 确认发布 */}
                      {generatedContent.status === 'draft' ? (
                        <button
                          onClick={publishContent}
                          className="w-full py-4 bg-gradient-to-r from-neon-green to-emerald-500 rounded-xl font-semibold text-bg-primary flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-neon-green/30 transition-all"
                        >
                          <Send size={20} />
                          确认发布到系统
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-4 bg-bg-tertiary border border-neon-green/30 text-neon-green rounded-xl flex items-center justify-center gap-3"
                        >
                          <Check size={20} />
                          已发布
                        </button>
                      )}
                      
                      {/* 导出视频脚本（仅视频类型） */}
                      {generatedContent.contentType === 'video' && generatedContent.videoScript && (
                        <button
                          onClick={() => {
                            const vs = generatedContent.videoScript!;
                            const scriptText = `【视频拍摄脚本】
标题：${generatedContent.title}
总时长：${vs.totalDuration}秒
BGM：${vs.bgmRecommendation}

【分镜脚本】
${vs.scenes.map((s, i) => `
场景${i + 1} (${s.startTime}-${s.endTime}秒)
镜头：${s.shot}
字幕：${s.subtitle}
${s.tips ? `提示：${s.tips}` : ''}
`).join('\n---\n')}

【所需素材】
${vs.materials.map(m => `- ${m.type === 'photo' ? '照片' : m.type === 'video' ? '视频' : '截图'}：${m.description} × ${m.count}`).join('\n')}

【拍摄技巧】
${vs.shootingTips.map(t => `• ${t}`).join('\n')}

【剪辑建议】
${vs.editingTips.map(t => `• ${t}`).join('\n')}
`;
                            navigator.clipboard.writeText(scriptText);
                            toast.success('完整脚本已复制到剪贴板');
                          }}
                          className="w-full py-4 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple rounded-xl flex items-center justify-center gap-3 hover:bg-neon-purple/20 transition-all"
                        >
                          <Download size={20} />
                          导出完整拍摄脚本
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* 视频脚本详情（仅视频类型） */}
                  {generatedContent.contentType === 'video' && generatedContent.videoScript && (
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Clock size={16} className="text-neon-cyan" />
                        分镜脚本
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {generatedContent.videoScript.scenes.map((scene, idx) => (
                          <div key={idx} className="p-2 bg-bg-tertiary rounded-lg text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-neon-cyan font-mono">{scene.startTime}-{scene.endTime}s</span>
                              <span className="text-text-secondary">{scene.shot}</span>
                            </div>
                            <div className="text-text-secondary">{scene.subtitle}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 底部按钮 */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 py-3 bg-bg-tertiary border border-border-color rounded-xl font-medium hover:border-neon-cyan transition-all"
                    >
                      ← 返回修改
                    </button>
                    <button
                      onClick={() => {
                        setCurrentStep(1);
                        setGeneratedContent(null);
                        setSelectedImages([]);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-neon-cyan to-blue-500 rounded-xl font-semibold text-bg-primary hover:shadow-lg transition-all"
                    >
                      完成，新建内容
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 模板库 Tab */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* 使用指南 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-neon-purple/10 to-neon-cyan/10 rounded-xl border border-neon-purple/30 p-5"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="text-neon-purple" size={20} />
              {templateGuide.title}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {templateGuide.tips.map((tip, idx) => (
                <div key={idx} className="bg-bg-secondary/50 rounded-lg p-3 text-sm">
                  <div className="text-text-secondary text-xs mb-1">{tip.scenario}</div>
                  <div className="font-medium text-neon-cyan mb-1">推荐：{contentTemplates[tip.template as keyof typeof contentTemplates]?.name}</div>
                  <div className="text-xs text-text-hint">{tip.reason}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 模板列表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(contentTemplates).map(([key, template]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden"
              >
                {/* 模板头部 */}
                <div className="p-5 border-b border-border-color">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg" style={{ background: `${template.iconColor}15` }}>
                      <template.icon 
                        size={32} 
                        style={{ color: template.iconColor }}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
                      <p className="text-sm text-text-secondary mb-3">{template.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {template.platforms.map(p => {
                          const info = platformLogos[p];
                          return (
                            <span 
                              key={p} 
                              className="px-2 py-1 rounded text-xs"
                              style={{ background: `${info.color}20`, color: info.color }}
                            >
                              {info.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* 适用场景 */}
                  {template.scenarios && (
                    <div className="mt-4 pt-4 border-t border-border-color">
                      <div className="text-xs text-text-secondary mb-2">适用场景</div>
                      <div className="flex flex-wrap gap-2">
                        {template.scenarios.map((scenario, idx) => (
                          <span key={idx} className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-secondary">
                            {scenario}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 真实案例展示 */}
                {template.realCases && (
                  <div className="border-b border-border-color">
                    <div className="px-5 py-3 bg-bg-tertiary/50 text-xs text-text-secondary flex items-center gap-2">
                      <Eye size={14} />
                      真实案例参考（{template.realCases.length}个）
                    </div>
                    <div className="divide-y divide-border-color">
                      {template.realCases.slice(0, 2).map((caseItem, idx) => (
                        <div key={idx} className="p-5 hover:bg-bg-tertiary/30 transition-colors">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan text-xs rounded">案例{idx + 1}</span>
                            <h4 className="font-medium text-sm flex-1 line-clamp-2">{caseItem.title}</h4>
                          </div>
                          
                          {/* 文案预览 */}
                          <div className="bg-black/20 rounded-lg p-3 mb-3 text-xs text-text-secondary line-clamp-4 font-mono whitespace-pre-wrap">
                            {caseItem.type === 'image' && caseItem.imageContent
                              ? caseItem.imageContent.content.slice(0, 200)
                              : caseItem.type === 'video' && caseItem.videoScript
                                ? caseItem.videoScript.scenes.map(s => s.shot).join(' / ').slice(0, 200)
                                : ''}...
                          </div>
                          
                          {/* 关键信息 */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-text-secondary">
                              <ImageIcon size={12} className="text-neon-purple" />
                              <span className="truncate">{caseItem.photoTips}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-text-secondary">
                              <Clock size={12} className="text-neon-amber" />
                              <span>{caseItem.bestTime}</span>
                            </div>
                          </div>
                          
                          {/* 效果预期 */}
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            <TrendingUp size={12} className="text-neon-green" />
                            <span className="text-neon-green">{caseItem.engagement}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="p-5 flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedTemplate(key);
                      setActiveTab('generate');
                    }}
                    className="flex-1 py-2.5 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-all font-medium"
                  >
                    使用此模板
                  </button>
                  {template.realCases && template.realCases.length > 2 && (
                    <button className="px-4 py-2.5 border border-border-color rounded-lg text-text-secondary hover:border-neon-cyan hover:text-neon-cyan transition-all text-sm">
                      查看更多案例
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 历史记录 Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {contentHistory.length === 0 ? (
            <div className="text-center py-16 text-text-secondary">
              <History size={48} className="mx-auto mb-4 opacity-30" />
              <p>暂无历史记录</p>
              <p className="text-sm">生成的内容将保存在这里</p>
            </div>
          ) : (
            contentHistory.map((content) => {
              const info = platformLogos[content.platform];
              return (
                <motion.div
                  key={content.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-bg-secondary rounded-xl border border-border-color p-4"
                >
                  <div className="flex items-start gap-4">
                    <img 
                      src={info.logo}
                      alt={info.name}
                      className="w-12 h-12 rounded-lg object-contain"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{content.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          content.status === 'published' 
                            ? 'bg-neon-green/20 text-neon-green'
                            : 'bg-neon-amber/20 text-neon-amber'
                        }`}>
                          {content.status === 'published' ? '已发布' : '草稿'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatTime(content.generatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <LayoutTemplate size={12} />
                          {contentTemplates[content.template as keyof typeof contentTemplates]?.name || content.template}
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon size={12} />
                          {content.images.length}张图片
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadHistory(content)}
                        className="p-2 hover:bg-bg-tertiary rounded-lg transition-all"
                        title="重新编辑"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => deleteHistory(content.id)}
                        className="p-2 hover:bg-neon-red/20 text-neon-red rounded-lg transition-all"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* 图片库弹窗 */}
      <AnimatePresence>
        {showImageLibrary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => setShowImageLibrary(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-secondary rounded-xl border border-border-color p-6 w-full max-w-2xl max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">选择图片 ({selectedImages.length}/9)</h3>
                <button onClick={() => setShowImageLibrary(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {mockImageLibrary.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => {
                      if (selectedImages.includes(img.id)) {
                        setSelectedImages(prev => prev.filter(id => id !== img.id));
                      } else if (selectedImages.length < 9) {
                        setSelectedImages(prev => [...prev, img.id]);
                      }
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImages.includes(img.id)
                        ? 'border-neon-cyan'
                        : 'border-transparent hover:border-neon-cyan/50'
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    {selectedImages.includes(img.id) && (
                      <div className="absolute inset-0 bg-neon-cyan/30 flex items-center justify-center">
                        <Check size={24} className="text-text-primary" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                      <div className="text-xs text-text-primary truncate">{img.name}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowImageLibrary(false)}
                  className="px-4 py-2 bg-bg-tertiary rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowImageLibrary(false)}
                  className="px-4 py-2 bg-neon-cyan text-bg-primary rounded-lg"
                >
                  确认选择 ({selectedImages.length})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
