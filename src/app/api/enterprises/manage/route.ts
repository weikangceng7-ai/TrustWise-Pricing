import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { enterprises } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: '数据库未连接' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    if (code) {
      const result = await db
        .select()
        .from(enterprises)
        .where(eq(enterprises.code, code))
        .limit(1)
      
      if (result.length === 0) {
        return NextResponse.json({ error: '企业不存在' }, { status: 404 })
      }
      
      return NextResponse.json({ enterprise: result[0] })
    }

    let query = db.select().from(enterprises)
    
    if (activeOnly) {
      query = query.where(eq(enterprises.isActive, true)) as typeof query
    }
    
    const result = await query.orderBy(desc(enterprises.createdAt))
    
    return NextResponse.json({ 
      enterprises: result,
      total: result.length 
    })
  } catch (error) {
    console.error('获取企业列表失败:', error)
    return NextResponse.json({ error: '获取企业列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: '数据库未连接' }, { status: 500 })
    }

    const body = await request.json()
    
    const existingEnterprise = await db
      .select()
      .from(enterprises)
      .where(eq(enterprises.code, body.code))
      .limit(1)
    
    if (existingEnterprise.length > 0) {
      return NextResponse.json({ error: '企业代码已存在' }, { status: 400 })
    }

    const result = await db
      .insert(enterprises)
      .values({
        code: body.code,
        name: body.name,
        location: body.location || null,
        province: body.province || null,
        capacity: body.capacity || null,
        transportMode: body.transportMode || null,
        mainProducts: body.mainProducts || [],
        customerRegions: body.customerRegions || [],
        inventoryStrategy: body.inventoryStrategy || 'moderate',
        description: body.description || null,
        tailwindColor: body.tailwindColor || 'cyan',
        shortDescription: body.shortDescription || null,
        basePrice: body.basePrice || null,
        volatility: body.volatility || null,
        trend: body.trend || null,
        modelAccuracy: body.modelAccuracy || null,
        currentStock: body.currentStock || null,
        maxCapacity: body.maxCapacity || null,
        safetyDays: body.safetyDays || null,
        avgConsumption: body.avgConsumption || null,
        turnoverRate: body.turnoverRate || null,
        lastPurchaseDate: body.lastPurchaseDate || null,
        nextPurchaseDate: body.nextPurchaseDate || null,
        supplierCount: body.supplierCount || null,
        portDistance: body.portDistance || null,
        isActive: body.isActive ?? true,
      })
      .returning()
    
    return NextResponse.json({ 
      message: '企业创建成功',
      enterprise: result[0] 
    }, { status: 201 })
  } catch (error) {
    console.error('创建企业失败:', error)
    return NextResponse.json({ error: '创建企业失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: '数据库未连接' }, { status: 500 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 })
    }

    const result = await db
      .update(enterprises)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(enterprises.id, id))
      .returning()
    
    if (result.length === 0) {
      return NextResponse.json({ error: '企业不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      message: '企业更新成功',
      enterprise: result[0] 
    })
  } catch (error) {
    console.error('更新企业失败:', error)
    return NextResponse.json({ error: '更新企业失败' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: '数据库未连接' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 })
    }

    const result = await db
      .delete(enterprises)
      .where(eq(enterprises.id, parseInt(id)))
      .returning()
    
    if (result.length === 0) {
      return NextResponse.json({ error: '企业不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ message: '企业删除成功' })
  } catch (error) {
    console.error('删除企业失败:', error)
    return NextResponse.json({ error: '删除企业失败' }, { status: 500 })
  }
}
