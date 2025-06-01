import 'dotenv/config';
import { Pool } from 'pg';
import type { TransactionData } from '../types';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(10) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at_db TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at TIMESTAMPTZ,
        is_successful BOOLEAN DEFAULT FALSE NOT NULL,
        tx_hash TEXT,
        approval_tx_hash TEXT
      );
    `);
    console.log("Database table 'transactions' initialized or already exists.");
  } catch (err) {
    console.error("Error initializing database table:", err);
    // Depending on the error, you might want to exit the process
    // For now, we'll just log it.
  } finally {
    client.release();
  }
}

// Call initialization at startup
initializeDb().catch(console.error);


export const storeTransaction = async (data: TransactionData): Promise<string> => {
  const id = Math.random().toString(36).substring(2, 10);
  const expireSeconds = 900; // 15 minutes
  const expiresAt = new Date(Date.now() + expireSeconds * 1000);

  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO transactions (id, data, expires_at) VALUES ($1, $2, $3)',
      [id, JSON.stringify(data), expiresAt]
    );
    console.log(`Stored transaction to DB: ${id}`);
    return id;
  } catch (error) {
    console.error(`Failed to store transaction ${id}:`, error);
    throw error; // Re-throw to be handled by the caller
  } finally {
    client.release();
  }
};

export const getTransaction = async (id: string): Promise<TransactionData | null> => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT data, expires_at FROM transactions WHERE id = $1',
      [id]
    );

    if (res.rows.length === 0) {
      console.log(`Transaction not found in DB: ${id}`);
      return null;
    }

    const transactionRecord = res.rows[0];
    
    // Check if the link should be considered expired (but don't delete from DB)
    if (transactionRecord.expires_at && new Date(transactionRecord.expires_at) < new Date()) {
      console.log(`Transaction link expired for: ${id}`);
      return null; 
    }
    
    console.log(`Retrieved transaction from DB: ${id}`);
    // The 'data' column in PostgreSQL (JSONB) is automatically parsed by 'pg' if it's JSON
    // but here we stored it as a string, so we need to parse it.
    // If we stored as JSONB directly and cast in query, it would be an object.
    // For consistency with how it was stringified, let's parse.
    // Fix the JSON parsing error by checking the type first
    if (typeof transactionRecord.data === 'string') {
      return JSON.parse(transactionRecord.data) as TransactionData;
    } else {
      // Already an object, return directly
      return transactionRecord.data as TransactionData;
    }
  } catch (error) {
    console.error(`Failed to retrieve transaction ${id}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

export const markTransactionSuccessful = async (
  id: string, 
  txHash: string, 
  approvalTxHash?: string
): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE transactions 
       SET is_successful = TRUE, tx_hash = $2, approval_tx_hash = $3 
       WHERE id = $1`,
      [id, txHash, approvalTxHash]
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(`Marked transaction successful in DB: ${id}`);
      return true;
    }
    console.log(`Transaction not found to mark successful: ${id}`);
    return false;
  } catch (error) {
    console.error(`Failed to mark transaction ${id} as successful:`, error);
    throw error;
  } finally {
    client.release();
  }
};


export const deleteTransaction = async (id: string): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM transactions WHERE id = $1', [id]);
    console.log(`Deleted transaction from DB: ${id}`);
  } catch (error) {
    console.error(`Failed to delete transaction ${id}:`, error);
    // Decide if this should throw or just log
  } finally {
    client.release();
  }
};

export const devGetAllTransactions = async (): Promise<Array<{id: string, data: TransactionData}>> => {
  const client = await pool.connect();
  try {
    // Optionally, you could filter by !is_successful or non-expired links if needed
    const res = await client.query('SELECT id, data FROM transactions');
    return res.rows.map(row => ({
      id: row.id,
      data: JSON.parse(row.data) as TransactionData,
    }));
  } catch (error) {
    console.error('Failed to get all transactions for dev:', error);
    return [];
  } finally {
    client.release();
  }
};

export const devClearAll = async (): Promise<number> => {
  const client = await pool.connect();
  try {
    const res = await client.query('DELETE FROM transactions');
    console.log(`Cleared ${res.rowCount} transactions from DB`);
    return res.rowCount || 0;
  } catch (error) {
    console.error('Failed to clear all transactions:', error);
    return 0;
  } finally {
    client.release();
  }
};

export const getStorageStats = async () => {
  const client = await pool.connect();
  try {
    const totalRes = await client.query('SELECT COUNT(*) AS total_keys FROM transactions');
    const validRes = await client.query(
      "SELECT COUNT(*) AS valid_keys FROM transactions WHERE expires_at IS NULL OR expires_at > NOW()"
    );
    return {
      totalKeys: parseInt(totalRes.rows[0].total_keys, 10),
      validKeys: parseInt(validRes.rows[0].valid_keys, 10), // Active links
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return { totalKeys: 0, validKeys: 0 };
  } finally {
    client.release();
  }
};

// The old setInterval for cleanup is no longer needed as data persists 
// and `getTransaction` handles link expiry logic.
console.log('Using PostgreSQL storage for all environments.');

// Optional: Close the pool when the application exits (e.g., in a graceful shutdown handler)
// process.on('SIGINT', async () => {
//   console.log('Closing database pool...');
//   await pool.end();
//   process.exit(0);
// });

