/**
 * Payment Database Service
 * Handles all database operations for payment system
 */

import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "salwa",
  password: process.env.DB_PASSWORD || "",
});

class PaymentDatabaseService {
  /**
   * Create payment transaction record
   */
  async createTransaction({ userId, orderId, grossAmount }) {
    const query = `
      INSERT INTO payment_transactions (
        user_id, invoice_number, amount, status, currency, gateway, transaction_type, created_at
      ) VALUES ($1, $2, $3, 'pending', 'IDR', 'midtrans', 'one_time', NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [userId, orderId, grossAmount]);
    return result.rows[0];
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus({
    orderId,
    transactionStatus,
    paymentType,
    transactionTime,
    settlementTime,
    midtransTransactionId,
    midtransResponse,
  }) {
    const query = `
      UPDATE payment_transactions
      SET 
        status = $1,
        payment_method = $2,
        paid_at = $3,
        gateway_transaction_id = $4,
        gateway_response = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE invoice_number = $6
      RETURNING *
    `;

    const result = await pool.query(query, [
      transactionStatus,
      paymentType,
      transactionTime,
      midtransTransactionId,
      JSON.stringify(midtransResponse),
      orderId,
    ]);

    return result.rows[0];
  }

  /**
   * Get transaction by order ID
   */
  async getTransactionByOrderId(orderId) {
    const query =
      "SELECT * FROM payment_transactions WHERE invoice_number = $1";
    const result = await pool.query(query, [orderId]);
    return result.rows[0];
  }

  /**
   * Get user's payment history
   */
  async getUserTransactions(userId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get latest pending transaction for user (if any)
   */
  async getLatestPendingTransaction(userId) {
    const query = `
      SELECT * FROM payment_transactions
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Check whether access record exists for a transaction
   */
  async hasAccessForTransaction(transactionId) {
    const query =
      "SELECT 1 FROM user_package_access WHERE transaction_id = $1 LIMIT 1";
    const result = await pool.query(query, [transactionId]);
    return result.rowCount > 0;
  }

  /**
   * Grant package access to user
   */
  async grantPackageAccess({ userId, transactionId, packageIds }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Idempotency: if access already granted for this transaction, return it.
      const existingAccess = await client.query(
        "SELECT * FROM user_package_access WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1",
        [transactionId]
      );

      if (existingAccess.rows[0]) {
        await client.query("COMMIT");
        return existingAccess.rows[0];
      }

      // Deactivate any existing active access
      await client.query(
        "UPDATE user_package_access SET is_active = false WHERE user_id = $1 AND is_active = true",
        [userId]
      );

      // Grant new access (30 days)
      const accessEnd = new Date();
      accessEnd.setDate(accessEnd.getDate() + 30);

      const query = `
        INSERT INTO user_package_access (
          user_id, transaction_id, package_ids, access_end
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await client.query(query, [
        userId,
        transactionId,
        packageIds,
        accessEnd,
      ]);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's active package access
   */
  async getUserActiveAccess(userId) {
    // First, deactivate expired access
    await pool.query("SELECT deactivate_expired_access()");

    const query = `
      SELECT 
        upa.*,
        pt.invoice_number as order_id,
        pt.amount as gross_amount,
        pt.payment_method as payment_type
      FROM user_package_access upa
      LEFT JOIN payment_transactions pt ON upa.transaction_id = pt.id
      WHERE upa.user_id = $1 
        AND upa.is_active = true
        AND upa.access_end > CURRENT_TIMESTAMP
      ORDER BY upa.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Check if user has active access
   */
  async hasActiveAccess(userId) {
    const access = await this.getUserActiveAccess(userId);
    return !!access;
  }

  /**
   * Get accessible frame IDs for user
   */
  async getUserAccessibleFrames(userId) {
    const access = await this.getUserActiveAccess(userId);

    if (!access || !access.package_ids) {
      return [];
    }

    const query = `
      SELECT frame_ids 
      FROM frame_packages 
      WHERE id = ANY($1) AND is_active = true
    `;

    const result = await pool.query(query, [access.package_ids]);

    // Flatten array of frame_ids
    const frameIds = result.rows.reduce((acc, row) => {
      return acc.concat(row.frame_ids);
    }, []);

    return frameIds;
  }

  /**
   * Create or update frame package
   */
  async createPackage({ name, description, frameIds }) {
    if (frameIds.length > 10) {
      throw new Error("A package can contain maximum 10 frames");
    }

    const query = `
      INSERT INTO frame_packages (name, description, frame_ids)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [name, description, frameIds]);
    return result.rows[0];
  }

  /**
   * Get all active packages
   */
  async getAllPackages() {
    const query =
      "SELECT * FROM frame_packages WHERE is_active = true ORDER BY id";
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get package by ID
   */
  async getPackageById(packageId) {
    const query = "SELECT * FROM frame_packages WHERE id = $1";
    const result = await pool.query(query, [packageId]);
    return result.rows[0];
  }

  /**
   * Update package
   */
  async updatePackage(packageId, { name, description, frameIds, isActive }) {
    if (frameIds && frameIds.length > 10) {
      throw new Error("A package can contain maximum 10 frames");
    }

    const query = `
      UPDATE frame_packages
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        frame_ids = COALESCE($3, frame_ids),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      description,
      frameIds,
      isActive,
      packageId,
    ]);

    return result.rows[0];
  }

  /**
   * Delete package
   */
  async deletePackage(packageId) {
    const query = "DELETE FROM frame_packages WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [packageId]);
    return result.rows[0];
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats() {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'settlement' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        SUM(CASE WHEN status = 'settlement' THEN amount ELSE 0 END) as total_revenue
      FROM payment_transactions
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}

export default new PaymentDatabaseService();
export { pool };
