/** 脱敏：日志、分享文、错误摘要共用，避免 API Key 残留 */

const PATTERNS: RegExp[] = [
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /\bsk-or-[a-zA-Z0-9_-]{8,}\b/gi,
  /\bgsk_[a-zA-Z0-9_-]{8,}\b/gi,
  /\bBearer\s+[^\s]+/gi,
  /\bAuthorization:\s*[^\s]+/gi,
  // 常见云厂商 / OpenRouter 类长 token
  /\b(?:api[_-]?key|apikey|token)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{16,}["']?/gi,
  /\b[A-Za-z0-9_\-]{32,}\.[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{16,}\b/g, // JWT-ish
]

export function scrubSecrets(text: string, maxLen = 800): string {
  let out = String(text || '')
  for (const re of PATTERNS) {
    out = out.replace(re, '[已清除]')
  }
  if (maxLen > 0 && out.length > maxLen) out = out.slice(0, maxLen)
  return out
}
