// // lib/storage.ts
// import type { TransactionData } from '../types';

// // 内存存储（开发环境）
// class MemoryStorage {
//   private store = new Map<string, { value: string; expireAt?: number }>();

//   async set(key: string, value: string, expireSeconds?: number): Promise<void> {
//     const expireAt = expireSeconds ? Date.now() + (expireSeconds * 1000) : undefined;
//     this.store.set(key, { value, expireAt });
//   }

//   async get(key: string): Promise<string | null> {
//     const item = this.store.get(key);
    
//     if (!item) return null;
    
//     // 检查过期
//     if (item.expireAt && Date.now() > item.expireAt) {
//       this.store.delete(key);
//       return null;
//     }
    
//     return item.value;
//   }

//   async del(key: string): Promise<void> {
//     this.store.delete(key);
//   }

//   // 开发环境调试用
//   getAllKeys(): string[] {
//     const now = Date.now();
//     const validKeys: string[] = [];
    
//     for (const [key, item] of this.store) {
//       if (!item.expireAt || now < item.expireAt) {
//         validKeys.push(key);
//       } else {
//         this.store.delete(key); // 顺便清理过期项
//       }
//     }
    
//     return validKeys;
//   }
// }

// // 选择存储方式
// function createStorage() {
//   const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
  
//   if (isProduction) {
//     console.log('Using Vercel KV storage');
//     const { kv } = require('@vercel/kv');
//     return kv;
//   } else {
//     console.log('Using memory storage (development)');
//     return new MemoryStorage();
//   }
// }

// // 存储实例
// const storage = createStorage();

// // 公共接口
// export const storeTransaction = async (data: TransactionData): Promise<string> => {
//   const id = Math.random().toString(36).substring(2, 10);
//   await storage.set(`tx:${id}`, JSON.stringify(data), 900); // 15分钟
//   return id;
// };

// export const getTransaction = async (id: string): Promise<TransactionData | null> => {
//   const data = await storage.get(`tx:${id}`);
//   return data ? JSON.parse(data) : null;
// };

// export const deleteTransaction = async (id: string): Promise<void> => {
//   await storage.del(`tx:${id}`);
// };

// // 开发环境调试函数
// export const devGetAllTransactions = async (): Promise<Array<{id: string, data: TransactionData}>> => {
//   if (process.env.NODE_ENV === 'production') return [];
  
//   if (storage instanceof MemoryStorage) {
//     const keys = storage.getAllKeys().filter(key => key.startsWith('tx:'));
//     const transactions = [];
    
//     for (const key of keys) {
//       const data = await storage.get(key);
//       if (data) {
//         transactions.push({
//           id: key.replace('tx:', ''),
//           data: JSON.parse(data)
//         });
//       }
//     }
    
//     return transactions;
//   }
  
//   return [];
// };

// export const devClearAll = async (): Promise<number> => {
//   if (process.env.NODE_ENV === 'production') return 0;
  
//   const transactions = await devGetAllTransactions();
//   for (const tx of transactions) {
//     await storage.del(`tx:${tx.id}`);
//   }
  
//   return transactions.length;
// };

// lib/storage.ts
import type { TransactionData } from '../types';

// 内存存储（开发环境）
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

  // 开发环境调试用
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
}

// Redis 存储封装类
class RedisStorage {
  private redis: any;

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (expireSeconds) {
      await this.redis.set(key, value, { ex: expireSeconds });
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }
}

// 选择存储方式
function createStorage() {
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    console.log('Using Upstash Redis storage');
    const { Redis } = require('@upstash/redis');
    
    // 创建 Redis 客户端
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    return new RedisStorage(redis);
  } else {
    console.log('Using memory storage (development)');
    return new MemoryStorage();
  }
}

// 存储实例
const storage = createStorage();

// 公共接口
export const storeTransaction = async (data: TransactionData): Promise<string> => {
  const id = Math.random().toString(36).substring(2, 10);
  await storage.set(`tx:${id}`, JSON.stringify(data), 900); // 15分钟
  return id;
};

export const getTransaction = async (id: string): Promise<TransactionData | null> => {
  const data = await storage.get(`tx:${id}`);
  return data ? JSON.parse(data) : null;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await storage.del(`tx:${id}`);
};

// 开发环境调试函数
export const devGetAllTransactions = async (): Promise<Array<{id: string, data: TransactionData}>> => {
  if (process.env.NODE_ENV === 'production') return [];
  
  if (storage instanceof MemoryStorage) {
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
  }
  
  return [];
};

export const devClearAll = async (): Promise<number> => {
  if (process.env.NODE_ENV === 'production') return 0;
  
  const transactions = await devGetAllTransactions();
  for (const tx of transactions) {
    await storage.del(`tx:${tx.id}`);
  }
  
  return transactions.length;
};
