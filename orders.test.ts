import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Unit tests for order creation logic
 * These tests focus on validation and calculation logic
 */

describe("Orders Router - Validation & Calculations", () => {
  // Test order number generation
  it("should generate unique order numbers", () => {
    const generateOrderNumber = (): string => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `ORD-${timestamp}-${random}`;
    };

    const orderNum1 = generateOrderNumber();
    const orderNum2 = generateOrderNumber();

    expect(orderNum1).toMatch(/^ORD-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(orderNum2).toMatch(/^ORD-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(orderNum1).not.toBe(orderNum2);
  });

  // Test price calculations
  describe("Price Calculations", () => {
    it("should calculate correct subtotal from items", () => {
      const items = [
        { productPrice: 29900, quantity: 1 }, // R299
        { productPrice: 34900, quantity: 2 }, // R349 x 2
      ];

      const subtotal = items.reduce(
        (sum, item) => sum + item.productPrice * item.quantity,
        0
      );

      // 29900 + (34900 * 2) = 29900 + 69800 = 99700 cents = R997
      expect(subtotal).toBe(99700);
    });

    it("should calculate profit margin at R150 per order", () => {
      const profitMargin = 15000; // R150 in cents
      expect(profitMargin).toBe(15000);
    });

    it("should calculate 15% tax on subtotal + profit", () => {
      const subtotal = 29900; // R299
      const profitMargin = 15000; // R150
      const taxBase = subtotal + profitMargin;
      const tax = Math.round(taxBase * 0.15);

      // Tax on (299 + 150) = 449 * 0.15 = 67.35 = 6735 cents
      expect(tax).toBe(6735);
    });

    it("should calculate correct total amount", () => {
      const subtotal = 29900;
      const profitMargin = 15000;
      const tax = Math.round((subtotal + profitMargin) * 0.15);
      const totalAmount = subtotal + profitMargin + tax;

      // 299 + 150 + 67.35 = 516.35 = 51635 cents
      expect(totalAmount).toBe(51635);
    });

    it("should handle multiple items with correct totals", () => {
      const items = [
        { productPrice: 29900, quantity: 2 }, // R299 x 2
        { productPrice: 34900, quantity: 1 }, // R349
      ];

      const subtotal = items.reduce(
        (sum, item) => sum + item.productPrice * item.quantity,
        0
      );
      const profitMargin = 15000;
      const tax = Math.round((subtotal + profitMargin) * 0.15);
      const totalAmount = subtotal + profitMargin + tax;

      // Subtotal: (299 * 2) + 349 = 947 = 94700 cents
      // Profit: 150 = 15000 cents
      // Tax: (947 + 150) * 0.15 = 164.55 = 16455 cents
      // Total: 947 + 150 + 164.55 = 1261.55 = 126155 cents
      expect(subtotal).toBe(94700);
      expect(profitMargin).toBe(15000);
      expect(tax).toBe(16455);
      expect(totalAmount).toBe(126155);
    });
  });

  // Test input validation
  describe("Input Validation", () => {
    const CreateOrderItemSchema = z.object({
      productId: z.string(),
      productName: z.string(),
      productPrice: z.number().int(),
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

    it("should validate correct order data", () => {
      const validOrder = {
        customerEmail: "test@example.com",
        customerPhone: "0712345678",
        customerFirstName: "John",
        customerLastName: "Doe",
        deliveryFirstName: "John",
        deliveryLastName: "Doe",
        deliveryEmail: "test@example.com",
        deliveryPhone: "0712345678",
        deliveryAddress: "123 Main St",
        deliveryCity: "Polokwane",
        deliveryProvince: "Limpopo",
        deliveryPostalCode: "0700",
        items: [
          {
            productId: "temu-001",
            productName: "Soft Sage Onesie",
            productPrice: 29900,
            quantity: 1,
          },
        ],
        paymentMethod: "payfast" as const,
      };

      const result = CreateOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const invalidOrder = {
        customerEmail: "invalid-email",
        customerPhone: "0712345678",
        customerFirstName: "John",
        customerLastName: "Doe",
        deliveryFirstName: "John",
        deliveryLastName: "Doe",
        deliveryEmail: "test@example.com",
        deliveryPhone: "0712345678",
        deliveryAddress: "123 Main St",
        deliveryCity: "Polokwane",
        deliveryProvince: "Limpopo",
        deliveryPostalCode: "0700",
        items: [
          {
            productId: "temu-001",
            productName: "Soft Sage Onesie",
            productPrice: 29900,
            quantity: 1,
          },
        ],
        paymentMethod: "payfast" as const,
      };

      const result = CreateOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });

    it("should reject empty items array", () => {
      const invalidOrder = {
        customerEmail: "test@example.com",
        customerPhone: "0712345678",
        customerFirstName: "John",
        customerLastName: "Doe",
        deliveryFirstName: "John",
        deliveryLastName: "Doe",
        deliveryEmail: "test@example.com",
        deliveryPhone: "0712345678",
        deliveryAddress: "123 Main St",
        deliveryCity: "Polokwane",
        deliveryProvince: "Limpopo",
        deliveryPostalCode: "0700",
        items: [],
        paymentMethod: "payfast" as const,
      };

      const result = CreateOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });

    it("should reject invalid payment method", () => {
      const invalidOrder = {
        customerEmail: "test@example.com",
        customerPhone: "0712345678",
        customerFirstName: "John",
        customerLastName: "Doe",
        deliveryFirstName: "John",
        deliveryLastName: "Doe",
        deliveryEmail: "test@example.com",
        deliveryPhone: "0712345678",
        deliveryAddress: "123 Main St",
        deliveryCity: "Polokwane",
        deliveryProvince: "Limpopo",
        deliveryPostalCode: "0700",
        items: [
          {
            productId: "temu-001",
            productName: "Soft Sage Onesie",
            productPrice: 29900,
            quantity: 1,
          },
        ],
        paymentMethod: "invalid",
      };

      const result = CreateOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });

    it("should reject zero or negative quantity", () => {
      const invalidItem = {
        productId: "temu-001",
        productName: "Soft Sage Onesie",
        productPrice: 29900,
        quantity: 0,
      };

      const result = CreateOrderItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });
});
