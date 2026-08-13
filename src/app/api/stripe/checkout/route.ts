// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { getPlanById } from "@/lib/pricing"
import { db } from "@/db"
import { orders } from "@/db/schema"
import { nanoid } from "nanoid"

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers as unknown as Record<string, string>,
    })

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: "支付服务暂未配置" },
        { status: 500 }
      )
    }

    const { planId } = await request.json()
    const plan = getPlanById(planId)
    if (!plan) {
      return NextResponse.json({ success: false, error: "无效的套餐" }, { status: 400 })
    }

    const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // 创建订单
    const orderId = `order_${nanoid(16)}`
    if (db) {
      await db.insert(orders).values({
        id: orderId,
        userId: session.user.id,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price * 100,
        quotaAmount: plan.quotaAmount,
        status: "pending",
      })
    }

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "alipay", "wechat_pay"],
      line_items: [
        {
          price_data: {
            currency: "cny",
            product_data: {
              name: `硫磺督价系统 - ${plan.name}`,
              description: `${plan.quotaAmount.toLocaleString()} 次 API 调用`,
            },
            unit_amount: plan.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/pricing?success=true&order=${orderId}`,
      cancel_url: `${baseUrl}/pricing?cancelled=true`,
      metadata: { orderId, userId: session.user.id, planId: plan.id },
    })

    // 更新订单关联 Stripe session
    if (db && stripeSession.id) {
      await db.update(orders)
        .set({ stripeSessionId: stripeSession.id })
        .where(eq(orders.id, orderId))
    }

    return NextResponse.json({
      success: true,
      data: { url: stripeSession.url },
    })
  } catch (error) {
    console.error("[Stripe Checkout] 创建失败:", error)
    return NextResponse.json(
      { success: false, error: "创建支付订单失败" },
      { status: 500 }
    )
  }
}
