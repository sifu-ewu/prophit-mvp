import { NextRequest, NextResponse } from 'next/server'
import { DataCollector } from '@/lib/data-collector'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const significance = searchParams.get('significance')

    const movements = await DataCollector.getRecentMovements(limit)
    
    // Filter by significance if specified
    const filteredMovements = significance 
      ? movements.filter(m => m.significance === significance)
      : movements

    return NextResponse.json({
      success: true,
      data: filteredMovements,
      total: filteredMovements.length
    })
  } catch (error) {
    console.error('Error fetching movements:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch movements' },
      { status: 500 }
    )
  }
}
