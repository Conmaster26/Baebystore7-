import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  customers,
  orders,
  orderItems,
  profitLedger,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Validation schemas
const CreateOrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productPrice: z.number().int(), // in cents
  quantity: z.number().int().min(1),
});

const CreateOrderSchema = z.object({
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  customerFirstName: z.string(),
  customerLastName: z.string(),
  deliveryFirstName: z.string(),
  deliveryLastName: z.string(),
  deliveryEmail: z.string().email(),
  deliveryPhone: z.string(),
  deliveryAddress: z.string(),
  deliveryCity: z.string(),
  deliveryProvince: z.string(),
  deliveryPostalCode: z.string(),
  items: z.array(CreateOrderItemSchema).min(1),
  paymentMethod: z.enum(["payfast", "yoco"]),
});

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/**
 * Generate a unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create a new order with customer and items
 */
export const ordersRouter = router({
  createOrder: publicProcedure
    .input(CreateOrderSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Calculate totals
        const subtotal = input.items.reduce(
          (sum, item) => sum + item.productPrice * item.quantity,
          0
        );
        const profitMargin = 15000; // R150 in cents
        const tax = Math.round((subtotal + profitMargin) * 0.15);
        const totalAmount = subtotal + profitMargin + tax;

        // Create or get customer
        const existingCustomer = await db
          .select()
          .from(customers)
          .where(eq(customers.email, input.customerEmail))
          .limit(1);

        let customerId: number;

        if (existingCustomer.length > 0) {
          customerId = existingCustomer[0].id;
        } else {
          const result = await db.insert(customers).values({
            email: input.customerEmail,
            phone: input.customerPhone,
            firstName: input.customerFirstName,
            lastName: input.customerLastName,
          });
          customerId = Number((result as any).insertId);
        }

        // Create order
        const orderNumber = generateOrderNumber();
        const orderResult = await db.insert(orders).values({
          customerId,
          orderNumber,
          status: "pending",
          deliveryFirstName: input.deliveryFirstName,
          deliveryLastName: input.deliveryLastName,
          deliveryEmail: input.deliveryEmail,
          deliveryPhone: input.deliveryPhone,
          deliveryAddress: input.deliveryAddress,
          deliveryCity: input.deliveryCity,
          deliveryProvince: input.deliveryProvince,
          deliveryPostalCode: input.deliveryPostalCode,
          subtotal: (subtotal / 100).toString(),
          profitMargin: (profitMargin / 100).toString(),
          tax: (tax / 100).toString(),
          totalAmount: (totalAmount / 100).toString(),
          paymentMethod: input.paymentMethod,
          paymentStatus: "pending",
        });

        const orderId = Number((orderResult as any).insertId);

        // Create order items
        for (const item of input.items) {
          const itemTotal = item.productPrice * item.quantity;
          await db.insert(orderItems).values({
            orderId,
            productId: item.productId,
            productName: item.productName,
            productPrice: (item.productPrice / 100).toString(),
            quantity: item.quantity,
            totalPrice: (itemTotal / 100).toString(),
          });
        }

        // Create profit ledger entry
        await db.insert(profitLedger).values({
          orderId,
          profitAmount: (profitMargin / 100).toString(),
          bankAccount: "1996092373",
          transferStatus: "pending",
        });

        return {
          success: true,
          orderId,
          orderNumber,
          totalAmount: totalAmount / 100,
        };
      } catch (error) {
        console.error("[Orders] Error creating order:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to create order"
        );
      }
    }),

  /**
   * Get order details by order ID
   */
  getOrder: publicProcedure
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

        return {
          ...order[0],
          items,
        };
      } catch (error) {
        console.error("[Orders] Error fetching order:", error);
        throw new Error("Failed to fetch order");
      }
    }),

  /**
   * Get order by order number
   */
  getOrderByNumber: publicProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const order = await db
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, input.orderNumber))
          .limit(1);

        if (order.length === 0) {
          return null;
        }

        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order[0].id));

        return {
          ...order[0],
          items,
        };
      } catch (error) {
        console.error("[Orders] Error fetching order:", error);
        throw new Error("Failed to fetch order");
      }
    }),

  /**
   * Update order payment status (called by webhook)
   */
  updatePaymentStatus: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
        paymentStatus: z.enum(["completed", "failed", "refunded"]),
        paymentReference: z.string().optional(),
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
          .set({
            paymentStatus: input.paymentStatus,
            paymentReference: input.paymentReference,
            status:
              input.paymentStatus === "completed" ? "processing" : "cancelled",
          })
          .where(eq(orders.id, input.orderId));

        return { success: true };
      } catch (error) {
        console.error("[Orders] Error updating payment status:", error);
        throw new Error("Failed to update payment status");
      }
    }),
});
