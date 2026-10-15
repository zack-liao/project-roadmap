import { describe, it, expect, beforeAll } from 'vitest'
import { generateKeyPair, SignJWT } from 'jose'
import { authenticate } from './auth.js'
import worker from './index.js'

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
const ENV = { GOOGLE_CLIENT_ID: CLIENT_ID }

let keys

beforeAll(async () => {
  keys = await generateKeyPair('RS256')
})

// 用本地金鑰簽一張長得像 Google ID token 的票,再把對應的公鑰餵給 authenticate
async function signToken({ claims = {}, issuer = 'https://accounts.google.com', audience = CLIENT_ID, expiresIn = '5m', subject = 'google-sub-1' } = {}) {
  let jwt = new SignJWT({
    email: 'zack@hexschool.com',
    email_verified: true,
    hd: 'hexschool.com',
    name: 'Zack Liao',
    picture: 'https://example.com/avatar.png',
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)

  if (subject !== null) jwt = jwt.setSubject(subject)
  return jwt.sign(keys.privateKey)
}

function request(token) {
  return new Request('https://example.com/api/state', {
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })
}

const verify = (token, env = ENV) => authenticate(request(token), env, keys.publicKey)

async function expect401(promise, pattern) {
  await expect(promise).rejects.toMatchObject({ status: 401 })
  if (pattern) await expect(promise).rejects.toThrow(pattern)
}

describe('通過的情況', () => {
  it('公司帳號的有效 token 回傳使用者', async () => {
    await expect(verify(await signToken())).resolves.toEqual({
      id: 'google-sub-1',
      email: 'zack@hexschool.com',
      name: 'Zack Liao',
      picture: 'https://example.com/avatar.png',
    })
  })

  it('兩種 iss 寫法都接受', async () => {
    for (const issuer of ['accounts.google.com', 'https://accounts.google.com']) {
      await expect(verify(await signToken({ issuer }))).resolves.toMatchObject({ id: 'google-sub-1' })
    }
  })

  it('用 sub 當使用者 ID,不是 email', async () => {
    const user = await verify(await signToken({ subject: 'sub-abc', claims: { email: 'someone@hexschool.com' } }))
    expect(user.id).toBe('sub-abc')
  })

  it('name / picture 缺席時給空字串而不是 undefined', async () => {
    const user = await verify(await signToken({ claims: { name: undefined, picture: undefined } }))
    expect(user.name).toBe('')
    expect(user.picture).toBe('')
  })
})

describe('擋下的情況', () => {
  it('沒有 Authorization 標頭', async () => {
    await expect401(authenticate(request(), ENV, keys.publicKey), /Authorization/)
  })

  it('標頭格式不對', async () => {
    const req = new Request('https://example.com/api/state', { headers: { authorization: 'Token abc' } })
    await expect401(authenticate(req, ENV, keys.publicKey), /Authorization/)
  })

  it('aud 不是我的 Client ID', async () => {
    await expect401(verify(await signToken({ audience: '別人的-client-id' })))
  })

  it('iss 不是 Google', async () => {
    await expect401(verify(await signToken({ issuer: 'https://evil.example.com' })))
  })

  it('token 已過期', async () => {
    await expect401(verify(await signToken({ expiresIn: Math.floor(Date.now() / 1000) - 60 })))
  })

  it('簽章對不上（別人的金鑰簽的）', async () => {
    const other = await generateKeyPair('RS256')
    const forged = await new SignJWT({ hd: 'hexschool.com', email_verified: true })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('https://accounts.google.com').setAudience(CLIENT_ID)
      .setSubject('x').setIssuedAt().setExpirationTime('5m')
      .sign(other.privateKey)
    await expect401(verify(forged))
  })

  it('不是 hexschool.com 的帳號', async () => {
    await expect401(verify(await signToken({ claims: { hd: 'gmail.com' } })), /hexschool\.com/)
  })

  it('個人 gmail（完全沒有 hd 欄位）', async () => {
    await expect401(verify(await signToken({ claims: { hd: undefined } })), /hexschool\.com/)
  })

  it('email 尚未驗證', async () => {
    await expect401(verify(await signToken({ claims: { email_verified: false } })), /尚未驗證/)
  })

  it('email_verified 是字串 "true" 也不算通過', async () => {
    await expect401(verify(await signToken({ claims: { email_verified: 'true' } })), /尚未驗證/)
  })

  it('缺少 sub', async () => {
    await expect401(verify(await signToken({ subject: null })), /使用者識別碼/)
  })

  it('伺服器沒設定 GOOGLE_CLIENT_ID 時一律擋下,不是放行', async () => {
    const token = await signToken()
    await expect401(verify(token, {}), /GOOGLE_CLIENT_ID/)
    await expect401(verify(token, { GOOGLE_CLIENT_ID: '' }), /GOOGLE_CLIENT_ID/)
  })
})

describe('Worker 進入點', () => {
  // 任何屬性存取都會炸,用來證明驗證沒過時根本沒碰到 D1
  const explodingDb = new Proxy({}, {
    get() { throw new Error('驗證沒過就不該碰 D1') },
  })

  it('沒帶 token 回 401,而且不碰 D1', async () => {
    const res = await worker.fetch(request(), { DB: explodingDb, GOOGLE_CLIENT_ID: CLIENT_ID })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Authorization/)
  })

  it('token 無效回 401,而且不碰 D1', async () => {
    const res = await worker.fetch(request('not.a.real.token'), { DB: explodingDb, GOOGLE_CLIENT_ID: CLIENT_ID })
    expect(res.status).toBe(401)
  })

  it('沒設定 GOOGLE_CLIENT_ID 回 401,而且不碰 D1', async () => {
    const res = await worker.fetch(request(await signToken()), { DB: explodingDb })
    expect(res.status).toBe(401)
  })

  it('非 /api 路徑不會被當成 API 來驗證', async () => {
    const res = await worker.fetch(new Request('https://example.com/whatever'), { DB: explodingDb })
    expect(res.status).toBe(404)
  })
})
