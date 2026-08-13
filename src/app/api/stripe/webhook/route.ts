// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { db } from "@/db"
import { orders } from "@/db/schema"
import { eq } from "drizzle-orm"
import { addPaidQuota } from "@/lib/api-quota"

export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    const body = await request.text()
    const sig = request.headers.get("stripe-signature")
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // 处理 checkout.session.completed 事件
    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const { orderId, userId, planId } = session.metadata || {}

      if (!orderId || !userId) {
        console.error("[Stripe Webhook] Missing metadata in session:", session.id)
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      try {
        // 更新订单状态
        if (db) {
          await db.update(orders)
            .set({ status: "paid", paidAt: new Date() })
            .where(eq(orders.id, orderId))

          // 获取订单以获取配额数量
          const [order] = await db.select().from(orders).where(eq(orders.id, orderId))
          if (order) {
            // 增加用户配额
            await addPaidQuota(userId, order.quotaAmount)
          }
        }

        console.log(`[Stripe Webhook] 支付成功: order=${orderId}, user=${userId}, plan=${planId}`)
      } catch (error) {
        console.error("[Stripe Webhook] 处理订单失败:", error)
        return NextResponse.json({ error: "Failed to process order" }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
