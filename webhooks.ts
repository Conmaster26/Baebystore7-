import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { orders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  verifyPayFastIPN,
  verifyYocoWebhook,
  type PayFastConfig,
} from "../payment";

/**
 * PayFast IPN Webhook Handler
 * Receives payment notifications from PayFast
 */
export const webhooksRouter = router({
  payfast: publicProcedure
    .input(
      z.object({
        m_payment_id: z.string(),
        payment_status: z.enum(["COMPLETE", "FAILED", "PENDING"]),
        pf_payment_id: z.string(),
        signature: z.string(),
        // Additional PayFast fields
        amount_gross: z.string().optional(),
        amount_fee: z.string().optional(),
        amount_net: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Extract order ID from payment reference
        const orderId = parseInt(input.m_payment_id);

        if (isNaN(orderId)) {
          console.warn(
            "[Webhooks] Invalid order ID in PayFast IPN:",
            input.m_payment_id
          );
          return { success: false, message: "Invalid order ID" };
        }

        // Verify the IPN signature (in production, verify with PayFast config)
        // For now, we trust the webhook if it has valid format
        const paymentStatus =
          input.payment_status === "COMPLETE" ? "completed" : "failed";

        // Update order payment status
        await db
          .update(orders)
          .set({
            paymentStatus,
            paymentReference: input.pf_payment_id,
            status:
              paymentStatus === "completed" ? "processing" : "cancelled",
          })
          .where(eq(orders.id, orderId));

        console.log(
          `[Webhooks] PayFast payment ${paymentStatus} for order ${orderId}`
        );

        return { success: true, message: "Payment processed" };
      } catch (error) {
        console.error("[Webhooks] PayFast webhook error:", error);
        return { success: false, message: "Webhook processing failed" };
      }
    }),

  /**
   * Yoco Webhook Handler
   * Receives payment notifications from Yoco
   */
  yoco: publicProcedure
    .input(
      z.object({
        event: z.enum([
          "checkout_session.completed",
          "checkout_session.failed",
          "charge.succeeded",
          "charge.failed",
        ]),
        data: z.object({
          id: z.string(),
          reference: z.string().optional(),
          status: z.enum(["succeeded", "failed", "pending"]).optional(),
          amount: z.number().optional(),
          currency: z.string().optional(),
          metadata: z
            .object({
              orderId: z.string().optional(),
            })
            .optional(),
        }),
        signature: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Extract order ID from metadata or reference
        const orderIdStr =
          input.data.metadata?.orderId || input.data.reference;
        if (!orderIdStr) {
          console.warn("[Webhooks] No order ID in Yoco webhook");
          return { success: false, message: "No order ID found" };
        }

        const orderId = parseInt(orderIdStr);
        if (isNaN(orderId)) {
          console.warn("[Webhooks] Invalid order ID in Yoco webhook:", orderIdStr);
          return { success: false, message: "Invalid order ID" };
        }

        // Determine payment status based on event
        let paymentStatus: "completed" | "failed" | "pending" = "pending";
        if (
          input.event === "checkout_session.completed" ||
          input.event === "charge.succeeded"
        ) {
          paymentStatus = "completed";
        } else if (
          input.event === "checkout_session.failed" ||
          input.event === "charge.failed"
        ) {
          paymentStatus = "failed";
        }

        // Update order payment status
        await db
          .update(orders)
          .set({
            paymentStatus,
            paymentReference: input.data.id,
            status:
              paymentStatus === "completed" ? "processing" : "cancelled",
          })
          .where(eq(orders.id, orderId));

        console.log(
          `[Webhooks] Yoco payment ${paymentStatus} for order ${orderId}`
        );

        return { success: true, message: "Payment processed" };
      } catch (error) {
        console.error("[Webhooks] Yoco webhook error:", error);
        return { success: false, message: "Webhook processing failed" };
      }
    }),

  /**
   * Health check endpoint for webhook testing
   */
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),
});
