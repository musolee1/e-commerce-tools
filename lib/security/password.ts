// Password validation utilities for secure authentication

export interface PasswordValidationResult {
    isValid: boolean
    score: number // 0-4 (weak to very strong)
    errors: string[]
    suggestions: string[]
}

export const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
}

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~'

export function validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = []
    const suggestions: string[] = []
    let score = 0

    // Check minimum length
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Şifre en az ${PASSWORD_REQUIREMENTS.minLength} karakter olmalıdır`)
    } else {
        score++
        if (password.length >= 12) {
            score++ // Bonus for longer passwords
        }
    }

    // Check maximum length
    if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
        errors.push(`Şifre en fazla ${PASSWORD_REQUIREMENTS.maxLength} karakter olabilir`)
    }

    // Check uppercase
    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('En az bir büyük harf kullanmalısınız')
    } else if (/[A-Z]/.test(password)) {
        score += 0.5
    }

    // Check lowercase
    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('En az bir küçük harf kullanmalısınız')
    } else if (/[a-z]/.test(password)) {
        score += 0.5
    }

    // Check number
    if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
        errors.push('En az bir rakam kullanmalısınız')
    } else if (/[0-9]/.test(password)) {
        score += 0.5
    }

    // Check special character
    const hasSpecialChar = SPECIAL_CHARS.split('').some(char => password.includes(char))
    if (PASSWORD_REQUIREMENTS.requireSpecialChar && !hasSpecialChar) {
        errors.push('En az bir özel karakter kullanmalısınız (!@#$%^&* vb.)')
    } else if (hasSpecialChar) {
        score += 0.5
    }

    // Check for common patterns
    const commonPatterns = [
        /^12345/,
        /password/i,
        /qwerty/i,
        /abc123/i,
        /letmein/i,
        /admin/i,
        /welcome/i,
        /monkey/i,
        /dragon/i,
    ]

    if (commonPatterns.some(pattern => pattern.test(password))) {
        errors.push('Çok yaygın bir şifre kalıbı kullanıyorsunuz')
        score = Math.max(0, score - 1)
    }

    // Add suggestions
    if (password.length < 12) {
        suggestions.push('Daha uzun şifre daha güvenlidir')
    }
    if (!/[!@#$%^&*]/.test(password) && hasSpecialChar) {
        suggestions.push('Daha yaygın özel karakterler (!@#$%^&*) kullanın')
    }

    // Normalize score to 0-4 range
    const normalizedScore = Math.min(4, Math.max(0, Math.floor(score)))

    return {
        isValid: errors.length === 0,
        score: normalizedScore,
        errors,
        suggestions,
    }
}

export function getPasswordStrengthLabel(score: number): { label: string; color: string } {
    switch (score) {
        case 0:
            return { label: 'Çok Zayıf', color: 'bg-red-500' }
        case 1:
            return { label: 'Zayıf', color: 'bg-orange-500' }
        case 2:
            return { label: 'Orta', color: 'bg-yellow-500' }
        case 3:
            return { label: 'Güçlü', color: 'bg-emerald-500' }
        case 4:
            return { label: 'Çok Güçlü', color: 'bg-emerald-600' }
        default:
            return { label: 'Bilinmiyor', color: 'bg-gray-500' }
    }
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}
