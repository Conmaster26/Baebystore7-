import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { orders, profitLedger, customers, orderItems } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Admin Dashboard Router
 * Requires admin role for all procedures
 */

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  /**
   * Get dashboard summary statistics
   */
  getDashboardStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      // Get all orders
      const allOrders = await db.select().from(orders);

      // Calculate statistics
      const totalOrders = allOrders.length;
      const completedOrders = allOrders.filter(
        (o) => o.paymentStatus === "completed"
      ).length;
      const totalRevenue = allOrders.reduce(
        (sum, o) => sum + parseFloat(o.totalAmount),
        0
      );

      // Get profit ledger
      const profitEntries = await db.select().from(profitLedger);
      const totalProfit = profitEntries.reduce(
        (sum, p) => sum + parseFloat(p.profitAmount),
        0
      );
      const transferredProfit = profitEntries
        .filter((p) => p.transferStatus === "completed")
        .reduce((sum, p) => sum + parseFloat(p.profitAmount), 0);

      return {
        totalOrders,
        completedOrders,
        pendingOrders: totalOrders - completedOrders,
        totalRevenue,
        totalProfit,
        transferredProfit,
        pendingProfit: totalProfit - transferredProfit,
      };
    } catch (error) {
      console.error("[Admin] Error fetching dashboard stats:", error);
      throw new Error("Failed to fetch dashboard statistics");
    }
  }),

  /**
   * Get all orders with pagination
   */
  getOrders: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
        status: z
          .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
          .optional(),
        paymentStatus: z
          .enum(["pending", "completed", "failed", "refunded"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Get all orders with optional filters
        let allOrders = await db.select().from(orders);

        // Apply filters in memory
        if (input.status) {
          allOrders = allOrders.filter((o) => o.status === input.status);
        }
        if (input.paymentStatus) {
          allOrders = allOrders.filter(
            (o) => o.paymentStatus === input.paymentStatus
          );
        }
        const total = allOrders.length;

        // Apply pagination
        const offset = (input.page - 1) * input.limit;
        const paginatedOrders = allOrders.slice(offset, offset + input.limit);

        // Get customer info for each order
        const ordersWithCustomers = await Promise.all(
          paginatedOrders.map(async (order) => {
            const customer = await db
              .select()
              .from(customers)
              .where(eq(customers.id, order.customerId))
              .limit(1);

            return {
              ...order,
              customer: customer[0] || null,
            };
          })
        );

        return {
          orders: ordersWithCustomers,
          total,
          page: input.page,
          limit: input.limit,
          pages: Math.ceil(total / input.limit),
        };
      } catch (error) {
        console.error("[Admin] Error fetching orders:", error);
        throw new Error("Failed to fetch orders");
      }
    }),

  /**
   * Get order details with items
   */
  getOrderDetails: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const order = await db
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .limit(1);

        if (order.length === 0) {
          return null;
        }

        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, input.orderId));

        const customer = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order[0].customerId))
          .limit(1);

        return {
          ...order[0],
          items,
          customer: customer[0] || null,
        };
      } catch (error) {
        console.error("[Admin] Error fetching order details:", error);
        throw new Error("Failed to fetch order details");
      }
    }),

  /**
   * Update order status
   */
  updateOrderStatus: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        status: z.enum([
          "pending",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        await db
          .update(orders)
          .set({ status: input.status })
          .where(eq(orders.id, input.orderId));

        return { success: true };
      } catch (error) {
        console.error("[Admin] Error updating order status:", error);
        throw new Error("Failed to update order status");
      }
    }),

  /**
   * Get profit ledger
   */
  getProfitLedger: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
        transferStatus: z
          .enum(["pending", "completed", "failed"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Get all ledger entries
        let allLedgers = await db.select().from(profitLedger);

        // Apply filters in memory
        if (input.transferStatus) {
          allLedgers = allLedgers.filter(
            (l) => l.transferStatus === input.transferStatus
          );
        }
        const total = allLedgers.length;

        const offset = (input.page - 1) * input.limit;
        const paginatedLedgers = allLedgers.slice(
          offset,
          offset + input.limit
        );

        return {
          ledgers: paginatedLedgers,
          total,
          page: input.page,
          limit: input.limit,
          pages: Math.ceil(total / input.limit),
        };
      } catch (error) {
        console.error("[Admin] Error fetching profit ledger:", error);
        throw new Error("Failed to fetch profit ledger");
      }
    }),

  /**
   * Mark profit as transferred
   */
  markProfitTransferred: adminProcedure
    .input(
      z.object({
        profitIds: z.array(z.number()),
        transferReference: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const transferDate = new Date();

        for (const profitId of input.profitIds) {
          await db
            .update(profitLedger)
            .set({
              transferStatus: "completed",
              transferDate,
              transferReference: input.transferReference,
            })
            .where(eq(profitLedger.id, profitId));
        }

        return { success: true, count: input.profitIds.length };
      } catch (error) {
        console.error("[Admin] Error marking profit transferred:", error);
        throw new Error("Failed to mark profit as transferred");
      }
    }),

  /**
   * Get profit summary by date range
   */
  getProfitSummary: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Get all ledger entries
        let ledgers = await db.select().from(profitLedger);

        // Apply date filters in memory
        if (input.startDate) {
          ledgers = ledgers.filter((l) => l.createdAt >= input.startDate!);
        }
        if (input.endDate) {
          ledgers = ledgers.filter((l) => l.createdAt <= input.endDate!);
        }

        // Calculate summary
        const totalProfit = ledgers.reduce(
          (sum, l) => sum + parseFloat(l.profitAmount),
          0
        );
        const transferredProfit = ledgers
          .filter((l) => l.transferStatus === "completed")
          .reduce((sum, l) => sum + parseFloat(l.profitAmount), 0);
        const pendingProfit = ledgers
          .filter((l) => l.transferStatus === "pending")
          .reduce((sum, l) => sum + parseFloat(l.profitAmount), 0);

        return {
          totalProfit,
          transferredProfit,
          pendingProfit,
          count: ledgers.length,
          bankAccount: "1996092373",
        };
      } catch (error) {
        console.error("[Admin] Error fetching profit summary:", error);
        throw new Error("Failed to fetch profit summary");
      }
    }),
});
