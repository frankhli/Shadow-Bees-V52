/**
 * 模板 Provider
 * 基于本地模板的零成本内容生成方案
 */

import { BaseProvider } from './BaseProvider';
import type {
  ContentGenerationRequest,
  GeneratedContent,
  LLMProviderConfig,
  Platform,
} from '../types';

interface Template {
  title: string;
  content: string;
  hashtags: string[];
  callToAction: string;
  imageSuggestions: string[];
}

const PLATFORM_TEMPLATES: Record<Platform, Template[]> = {
  xiaohongshu: [
    {
      title: '🎤看演唱会住这里！步行{walk_time}分钟到场馆',
      content: `姐妹们！！！发现了一个宝藏酒店🏨
就在{location}，离{venue}超级近！

从酒店走到场馆只要{walk_time}分钟，散场也不用挤地铁

房间也很棒，{feature}
躺在床上就能看城市夜景，太治愈了～

💰价格：现在只要¥{price}/晚
比周边便宜了¥{discount}！

📸拍照Tips：
- 酒店大堂超出片
- 房间落地窗拍夜景绝了
- 记得带补光灯

姐妹们冲！下次就锁死这家了！`,
      hashtags: ['酒店推荐', '演唱会住宿', '宝藏酒店', '追星女孩'],
      callToAction: '点击左下角链接预订，手慢无！',
      imageSuggestions: ['酒店外观夜景', '房间落地窗', '大堂', '演唱会门票+房卡'],
    },
    {
      title: '✨被问爆的演唱会酒店！{hotel_name}',
      content: `最近去看{event_name}，住到了一家超级满意的酒店！

📍位置绝了
就在{location}，步行{walk_time}分钟到{venue}
看完演唱会走回去完全无压力

🛏️房间超赞
{feature}，床品也很舒服
第二天睡到自然醒，不用赶早班车

💰性价比超高
平台价只要¥{price}，比旁边便宜¥{discount}
省下的钱可以买周边了！

📌小tips：
提前订！演唱会期间房源超紧张

#{hashtags}`,
      hashtags: ['酒店推荐', '演唱会攻略', '住宿推荐'],
      callToAction: '收藏备用！下次演唱会就住这',
      imageSuggestions: ['房间实拍', '位置地图', '窗外景色'],
    },
  ],
  xianyu: [
    {
      title: '💔含泪转让｜{event_name}酒店｜离{venue}步行{walk_time}分钟',
      content: `姐妹们我真的哭死😭😭😭
好不容易抢到的{event_name}门票
结果公司临时安排出差去不了了

🏨 酒店是提前一个月订的
📍 就在{location}，步行{walk_time}分钟就到
💰 当时订成¥{original_price}，现在¥{price}转让
🛏️ {room_type}，可以住2人

‼️ 房间真的很抢手
我当时对比了好几家才选的这家
{feature}

💔 求有缘姐妹收走
可以小刀，屠龙刀勿扰
芝麻信用780+，诚信交易`,
      hashtags: ['演唱会住宿', '酒店转让'],
      callToAction: '想要的姐妹私我',
      imageSuggestions: ['酒店实拍', '预订确认单', '地图定位'],
    },
  ],
  wechat: [
    {
      title: '【限时特惠】{hotel_name}｜{event_name}住宿首选',
      content: `各位老友们好！

{event_name}即将在{venue}举办
为您推荐{hotel_name}

✅ 步行{walk_time}分钟直达场馆
✅ {feature}
✅ 专属粉丝福利价：¥{price}/晚

【限时优惠】
即日起预订，享受：
• 延迟退房至14:00
• 免费接送服务
• 早餐升级

房源有限，先到先得！`,
      hashtags: [],
      callToAction: '扫码立即预订 或 回复"预订"咨询',
      imageSuggestions: ['酒店全景', '房间细节', '位置示意'],
    },
  ],
  douyin: [
    {
      title: '🔥{event_name}住宿攻略！这家酒店绝了',
      content: `去看{event_name}的姐妹们！
住宿就选{hotel_name}！

📍 离{venue}超近
🚶 步行{walk_time}分钟
💰 只要¥{price}
✨ {feature}

住过才知道有多方便！
散场不用挤地铁，走路就回酒店

#酒店推荐 #演唱会攻略 #{event_name}`,
      hashtags: ['酒店推荐', '演唱会攻略'],
      callToAction: '点击小黄车预订',
      imageSuggestions: ['短视频封面', '房间一镜到底', '步行路线'],
    },
  ],
};

export class TemplateProvider extends BaseProvider {
  readonly name = 'template';
  readonly version = '1.0.0';

  constructor(config: LLMProviderConfig = { name: 'template', enabled: true, priority: 999 }) {
    super(config);
  }

  async healthCheck(): Promise<boolean> {
    // 模板服务始终可用
    return true;
  }

  async generate(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const startTime = Date.now();
    
    const templates = PLATFORM_TEMPLATES[request.platform] || PLATFORM_TEMPLATES.xiaohongshu;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const result: GeneratedContent = {
      title: this.replacePlaceholders(template.title, request),
      content: this.replacePlaceholders(template.content, request),
      hashtags: [...template.hashtags, ...(this.getPlatformHashtags(request.platform))],
      callToAction: template.callToAction,
      imageSuggestions: template.imageSuggestions,
      bestPublishTime: this.getBestPublishTime(request.platform),
      estimatedEngagement: 'medium',
      metadata: {
        provider: this.name,
        generationTime: Date.now() - startTime,
      },
    };

    return result;
  }

  /**
   * 替换模板占位符
   */
  private replacePlaceholders(text: string, request: ContentGenerationRequest): string {
    const { hotelInfo, pricing, hotEvent } = request;
    
    const replacements: Record<string, string> = {
      '{hotel_name}': hotelInfo.name,
      '{location}': hotelInfo.location,
      '{feature}': hotelInfo.uniqueSellingPoints[0] || '位置优越',
      '{price}': pricing.platformPrice.toString(),
      '{original_price}': pricing.basePrice.toString(),
      '{discount}': (pricing.competitorAvg - pricing.platformPrice).toString(),
      '{event_name}': hotEvent?.name || '演唱会',
      '{venue}': hotEvent?.venue || '场馆',
      '{walk_time}': '5',
      '{room_type}': hotelInfo.roomTypes[0]?.name || '大床房',
      '{hashtags}': this.getPlatformHashtags(request.platform).join(' #'),
    };

    return text.replace(/\{[^}]+\}/g, (match) => replacements[match] || match);
  }

  /**
   * 获取平台专属标签
   */
  private getPlatformHashtags(platform: Platform): string[] {
    const hashtags: Record<Platform, string[]> = {
      xiaohongshu: ['小红书探店', '发现宝藏酒店'],
      xianyu: ['闲鱼转让', '诚信交易'],
      wechat: ['酒店推荐', '限时优惠'],
      douyin: ['抖音探店', '网红酒店'],
    };
    return hashtags[platform] || [];
  }

  /**
   * 获取最佳发布时间
   */
  private getBestPublishTime(platform: Platform): string {
    const times: Record<Platform, string> = {
      xiaohongshu: '20:00-22:00',
      xianyu: '12:00-14:00',
      wechat: '08:00-09:00 或 21:00-22:00',
      douyin: '18:00-20:00',
    };
    return times[platform] || '19:00-21:00';
  }
}
