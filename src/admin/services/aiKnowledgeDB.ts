/**
 * AI知识库 IndexedDB 存储服务
 */

// ============================================
// 类型定义
// ============================================

export type AIType = 'pricing' | 'content' | 'service';
export type CaseStatus = 'success' | 'failure' | 'pending';

export interface AIKnowledgeEntry {
  id: string;
  type: AIType;
  status: CaseStatus;
  hotelId: string;
  hotelName: string;
  timestamp: string;
  
  // 输入特征
  input: {
    features: number[];
    context: Record<string, any>;
  };
  
  // AI输出
  aiOutput: {
    model: string;
    suggestion: any;
    confidence: number;
    reasoning: string;
  };
  
  // 人工干预
  humanAction?: {
    userId: string;
    action: 'accept' | 'modify' | 'reject';
    finalResult?: any;
    feedback?: string;
  };
  
  // 效果追踪
  outcome?: {
    success: boolean;
    metrics: Record<string, number>;
    trackedAt: string;
  };
  
  // 学习标签
  tags: string[];
  learningValue: number;
}

export interface KnowledgeStats {
  totalCases: number;
  successCases: number;
  failureCases: number;
  pendingCases: number;
  avgConfidence: number;
  acceptanceRate: number;
  topTags: Array<{ tag: string; count: number }>;
}

// ============================================
// 数据库配置
// ============================================

const DB_NAME = 'ShadowBeesAIKnowledgeDB';
const DB_VERSION = 1;
const STORE_NAME = 'ai_knowledge';

// ============================================
// IndexedDB 服务
// ============================================

class AIKnowledgeDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[AIKnowledgeDB] Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // 创建索引
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('hotelId', 'hotelId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          
          console.log('[AIKnowledgeDB] Object store created');
        }
      };
    });
  }

  /**
   * 添加条目
   */
  async addEntry(entry: AIKnowledgeEntry): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // 检查是否已存在
      const getRequest = store.get(entry.id);
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          // 已存在，更新
          const updateRequest = store.put({ ...getRequest.result, ...entry });
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          // 新增
          const addRequest = store.add(entry);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 更新效果
   */
  async updateOutcome(
    id: string, 
    outcome: AIKnowledgeEntry['outcome']
  ): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        const entry = request.result as AIKnowledgeEntry;
        if (entry) {
          entry.outcome = outcome;
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(); // 条目不存在，静默处理
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新状态
   */
  async updateStatus(id: string, status: CaseStatus): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        const entry = request.result as AIKnowledgeEntry;
        if (entry) {
          entry.status = status;
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 查询条目
   */
  async queryEntries(options: {
    type?: AIType;
    status?: CaseStatus;
    hotelId?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AIKnowledgeEntry[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      let request: IDBRequest;
      
      // 根据条件选择索引
      if (options.type) {
        const index = store.index('type');
        request = index.getAll(options.type);
      } else if (options.status) {
        const index = store.index('status');
        request = index.getAll(options.status);
      } else if (options.hotelId) {
        const index = store.index('hotelId');
        request = index.getAll(options.hotelId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result as AIKnowledgeEntry[];
        
        // 标签筛选
        if (options.tag) {
          results = results.filter(e => e.tags.includes(options.tag!));
        }
        
        // 时间倒序
        results.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // 分页
        const offset = options.offset || 0;
        const limit = options.limit || results.length;
        results = results.slice(offset, offset + limit);
        
        resolve(results);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取统计信息
   */
  async getStats(type?: AIType): Promise<KnowledgeStats> {
    await this.init();

    const entries = await this.queryEntries({ type });
    
    const totalCases = entries.length;
    const successCases = entries.filter(e => e.status === 'success').length;
    const failureCases = entries.filter(e => e.status === 'failure').length;
    const pendingCases = entries.filter(e => e.status === 'pending').length;
    
    const avgConfidence = totalCases > 0
      ? entries.reduce((sum, e) => sum + e.aiOutput.confidence, 0) / totalCases
      : 0;
    
    const acceptedCases = entries.filter(e => 
      e.humanAction?.action === 'accept'
    ).length;
    const acceptanceRate = totalCases > 0 ? acceptedCases / totalCases : 0;
    
    // 统计热门标签
    const tagCounts = new Map<string, number>();
    entries.forEach(e => {
      e.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalCases,
      successCases,
      failureCases,
      pendingCases,
      avgConfidence,
      acceptanceRate,
      topTags,
    };
  }

  /**
   * 删除条目
   */
  async deleteEntry(id: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空数据
   */
  async clearAll(): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 导出所有数据
   */
  async exportAll(): Promise<AIKnowledgeEntry[]> {
    return this.queryEntries();
  }

  /**
   * 导入数据
   */
  async import(entries: AIKnowledgeEntry[]): Promise<void> {
    await this.init();
    
    for (const entry of entries) {
      await this.addEntry(entry);
    }
  }
}

// ============================================
// 单例导出
// ============================================

export const aiKnowledgeDB = new AIKnowledgeDB();
