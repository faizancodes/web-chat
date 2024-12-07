import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
    url: process.env.REDIS_URL || '',
    token: process.env.REDIS_TOKEN || '',
})

// Rate limit configuration
const RATE_LIMIT_WINDOW = 20 // 20 seconds
const MAX_REQUESTS = 5 // maximum requests per window

export async function middleware(request: NextRequest) {
  try {
    // Get IP address from the request
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'anonymous'
    const pathname = request.nextUrl.pathname
    
    // Create a unique key for this IP
    const key = `rate_limit:${ip}`
    
    // Get the current count for this IP
    const currentCount = await redis.get(key)
    
    if (currentCount === null) {
      // First request from this IP
      await redis.setex(key, RATE_LIMIT_WINDOW, 1)
    } else if (parseInt(currentCount as string) >= MAX_REQUESTS) {
      // Rate limit exceeded
      console.log(`Rate limit exceeded for IP: ${ip}`)
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': RATE_LIMIT_WINDOW.toString(),
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
        },
      })
    } else {
      // Increment the counter
      await redis.incr(key)
    }

    // Clone the request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-middleware-cache', 'no-cache')

    console.log(`Middleware: Processing request to ${pathname} from ${ip}`)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error('Rate limiting error:', error)
    // On Redis error, allow the request to proceed
    return NextResponse.next()
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 