// Simple in-memory rate limiter for authentication endpoints
// For production, consider using Redis or a dedicated rate limiting service

interface RateLimitEntry {
    count: number
    resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key)
        }
    }
}, 60000) // Clean up every minute

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: number
    retryAfter?: number // seconds until reset
}

export function checkRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 60000 // 1 minute default
): RateLimitResult {
    const now = Date.now()
    const key = identifier

    let entry = rateLimitStore.get(key)

    // If no entry or expired, create new one
    if (!entry || entry.resetAt < now) {
        entry = {
            count: 1,
            resetAt: now + windowMs,
        }
        rateLimitStore.set(key, entry)
        return {
            allowed: true,
            remaining: maxAttempts - 1,
            resetAt: entry.resetAt,
        }
    }

    // Increment count
    entry.count++
    rateLimitStore.set(key, entry)

    // Check if rate limited
    if (entry.count > maxAttempts) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        }
    }

    return {
        allowed: true,
        remaining: maxAttempts - entry.count,
        resetAt: entry.resetAt,
    }
}

// Reset rate limit for an identifier (e.g., after successful login)
export function resetRateLimit(identifier: string): void {
    rateLimitStore.delete(identifier)
}

// Get rate limit status without incrementing
export function getRateLimitStatus(
    identifier: string,
    maxAttempts: number = 5
): { count: number; remaining: number; isLimited: boolean } {
    const entry = rateLimitStore.get(identifier)
    const now = Date.now()

    if (!entry || entry.resetAt < now) {
        return { count: 0, remaining: maxAttempts, isLimited: false }
    }

    return {
        count: entry.count,
        remaining: Math.max(0, maxAttempts - entry.count),
        isLimited: entry.count >= maxAttempts,
    }
}

// Create a rate limiter with specific config
export function createRateLimiter(maxAttempts: number, windowMs: number) {
    return {
        check: (identifier: string) => checkRateLimit(identifier, maxAttempts, windowMs),
        reset: (identifier: string) => resetRateLimit(identifier),
        status: (identifier: string) => getRateLimitStatus(identifier, maxAttempts),
    }
}

// Pre-configured rate limiters for common use cases
export const authRateLimiter = createRateLimiter(5, 60000) // 5 attempts per minute
export const emailRateLimiter = createRateLimiter(3, 300000) // 3 emails per 5 minutes
export const passwordResetRateLimiter = createRateLimiter(3, 3600000) // 3 resets per hour
