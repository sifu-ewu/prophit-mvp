import { NextResponse } from 'next/server'
import { dataCollector } from '@/lib/data-collector'

export async function POST() {
  try {
    dataCollector.start()
    
    return NextResponse.json({
      success: true,
      message: 'Data collector started successfully'
    })
  } catch (error) {
    console.error('Error starting data collector:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start data collector' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    dataCollector.stop()
    
    return NextResponse.json({
      success: true,
      message: 'Data collector stopped successfully'
    })
  } catch (error) {
    console.error('Error stopping data collector:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to stop data collector' },
      { status: 500 }
    )
  }
}
