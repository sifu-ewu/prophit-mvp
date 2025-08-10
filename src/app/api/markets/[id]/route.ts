import { NextRequest, NextResponse } from 'next/server'
import { DataCollector } from '@/lib/data-collector'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params.id
    
    if (!marketId) {
      return NextResponse.json(
        { success: false, error: 'Market ID is required' },
        { status: 400 }
      )
    }

    const market = await DataCollector.getMarketDetails(marketId)
    
    if (!market) {
      return NextResponse.json(
        { success: false, error: 'Market not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: market
    })
  } catch (error) {
    console.error('Error fetching market details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market details' },
      { status: 500 }
    )
  }
}
