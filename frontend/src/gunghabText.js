// 관계 궁합 결과 글을 화면에 보이기 전에 다듬는다. 문장 내용은 바꾸지 않고 표시 기호·호칭만 정리한다.
//  1) AI 가 금지에도 내보내는 마크다운(**, ---)을 지운다.
//  2) 이름을 비워서 서버가 'A'·'B' 로 채운 경우 'A님'·'B님' 대신 '당신'·'상대방' 으로 보여 준다.
//  3) '어머니' 처럼 '님'을 붙이면 어색한 호칭은 '님'을 붙이지 않는다(조사는 받침에 맞게 바꾼다).
import { stripStrayMarkdown } from './markdownStrip.js'

const SERVER_DEFAULT = { a: 'A', b: 'B' }
const READER = { a: '당신', b: '상대방' }
const LABEL = { a: '나', b: '상대방' }
// 이름 칸에 호칭을 적은 경우. '님'을 또 붙이면 어색하다(어머니님·엄마님). 부장님·팀장님·형님 처럼 '님'이 자연스러운 호칭은 넣지 않는다.
const NO_NIM = /(어머니|아버지|엄마|아빠|할머니|할아버지|아들|딸|누나|언니|오빠|동생|남편|아내|와이프|자기|님)$/

const clean = (n) => String(n == null ? '' : n).trim()
export const isDefaultName = (name, who) => !clean(name) || clean(name) === SERVER_DEFAULT[who]
export const needsNoNim = (name) => NO_NIM.test(clean(name))

// 화면 라벨: 사주 표 위, 부제목 등.  who: 'a'(읽는 사람) | 'b'(상대)
export function nameLabel(name, who) {
  if (isDefaultName(name, who)) return LABEL[who]
  const n = clean(name)
  return needsNoNim(n) ? n : n + '님'
}

const batchim = (ch) => { const c = (ch || '').charCodeAt(0) - 0xAC00; return c >= 0 && c <= 11171 ? c % 28 : -1 }   // -1: 한글 아님, 0: 받침 없음
function fixParticle(p, last) {
  if (!p) return ''
  const b = batchim(last)
  if (b < 0) return p
  const has = b !== 0
  switch (p) {
    case '은': case '는': return has ? '은' : '는'
    case '이': case '가': return has ? '이' : '가'
    case '을': case '를': return has ? '을' : '를'
    case '과': case '와': return has ? '과' : '와'
    case '으로': case '로': return !has || b === 8 ? '로' : '으로'
    case '이에요': return has ? '이에요' : '예요'
    default: return p
  }
}

// '<이름>님' + 조사 → '<이름>' + (받침에 맞는 조사). 이름은 정규식이 아니라 문자열로 찾는다.
function replaceName(t, name) {
  const key = name + '님', parts = t.split(key)
  if (parts.length === 1) return t
  const P = ['이에요', '으로', '께서', '에게', '은', '는', '이', '가', '을', '를', '과', '와', '로']
  let out = parts[0]
  for (let i = 1; i < parts.length; i++) {
    let rest = parts[i], p = P.find((x) => rest.startsWith(x)) || ''
    out += name + fixParticle(p, name.slice(-1)) + rest.slice(p.length)
  }
  return out
}

// text: 결과 글. names: { a, b } 서버가 정한 이름(비었으면 'A'·'B')
export function cleanGunghabText(text, names = {}) {
  let t = stripStrayMarkdown(String(text || ''))
  for (const who of ['a', 'b']) {
    const name = clean(names[who])
    if (isDefaultName(name, who)) {
      const d = SERVER_DEFAULT[who]
      t = t.replace(new RegExp('(?<![A-Za-z])' + d + '님', 'g'), READER[who])   // 님·당신·상대방 모두 받침이 있어 뒤 조사는 그대로 맞다
    } else if (needsNoNim(name)) {
      if (name.endsWith('님')) t = t.split(name + '님').join(name)
      else t = replaceName(t, name)
    }
  }
  return t
}
