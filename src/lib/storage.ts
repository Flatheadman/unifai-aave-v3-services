import type { TransactionData } from '../types';

// 内存存储
class MemoryStorage {
  private store = new Map<string, { value: string; expireAt?: number }>();

  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    const expireAt = expireSeconds ? Date.now() + (expireSeconds * 1000) : undefined;
    this.store.set(key, { value, expireAt });
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    
    if (!item) return null;
    
    // 检查过期
    if (item.expireAt && Date.now() > item.expireAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  // 获取所有key（调试用）
  getAllKeys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];
    
    for (const [key, item] of this.store) {
      if (!item.expireAt || now < item.expireAt) {
        validKeys.push(key);
      } else {
        this.store.delete(key); // 顺便清理过期项
      }
    }
    
    return validKeys;
  }

  // 获取存储统计
  getStats() {
    return {
      totalKeys: this.store.size,
      validKeys: this.getAllKeys().length
    };
  }
}

// 全局存储实例
const storage = new MemoryStorage();

// 定期清理过期数据（可选）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    storage.getAllKeys(); // 这会触发过期数据的清理
  }, 5 * 60 * 1000); // 每5分钟清理一次
}

console.log('Using memory storage for all environments');

// 公共接口
export const storeTransaction = async (data: TransactionData): Promise<string> => {
  const id = Math.random().toString(36).substring(2, 10);
  await storage.set(`tx:${id}`, JSON.stringify(data), 900); // 15分钟
  console.log(`Stored transaction: ${id}`);
  return id;
};

export const getTransaction = async (id: string): Promise<TransactionData | null> => {
  const data = await storage.get(`tx:${id}`);
  if (data) {
    console.log(`Retrieved transaction: ${id}`);
    return JSON.parse(data);
  }
  console.log(`Transaction not found: ${id}`);
  return null;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await storage.del(`tx:${id}`);
  console.log(`Deleted transaction: ${id}`);
};

// 调试函数 - 现在在所有环境都可用
export const devGetAllTransactions = async (): Promise<Array<{id: string, data: TransactionData}>> => {
  const keys = storage.getAllKeys().filter(key => key.startsWith('tx:'));
  const transactions = [];
  
  for (const key of keys) {
    const data = await storage.get(key);
    if (data) {
      transactions.push({
        id: key.replace('tx:', ''),
        data: JSON.parse(data)
      });
    }
  }
  
  return transactions;
};

export const devClearAll = async (): Promise<number> => {
  const transactions = await devGetAllTransactions();
  for (const tx of transactions) {
    await storage.del(`tx:${tx.id}`);
  }
  
  console.log(`Cleared ${transactions.length} transactions`);
  return transactions.length;
};

// 获取存储统计信息
export const getStorageStats = () => {
  return storage.getStats();
};


