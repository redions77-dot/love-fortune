import test from 'node:test'
import assert from 'node:assert/strict'
import { splitBirthtime } from './paymentReturn.js'

// App.jsx 의 birthtime 계산식(오전/오후·시·분 → HH:MM)을 그대로 옮긴 것
const toBirthtime = ({ hour, min, ampm }) => {
  let h = Number(hour)
  if (ampm === '오전' && h === 12) h = 0
  if (ampm === '오후' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

test('24시간 모든 시각이 변환 → 복원 → 변환에서 그대로 유지된다(정오·자정 포함)', () => {
  for (let h = 0; h < 24; h++) for (const m of [0, 10, 30, 59]) {
    const bt = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const s = splitBirthtime(bt)
    assert.equal(s.unknown, false, bt)
    assert.equal(toBirthtime(s), bt, bt)
  }
})
test('정오와 자정을 구분한다', () => {
  assert.deepEqual(splitBirthtime('12:00'), { hour: '12', min: '00', ampm: '오후', unknown: false })
  assert.deepEqual(splitBirthtime('00:00'), { hour: '12', min: '00', ampm: '오전', unknown: false })
  assert.deepEqual(splitBirthtime('00:30'), { hour: '12', min: '30', ampm: '오전', unknown: false })
  assert.deepEqual(splitBirthtime('13:10'), { hour: '1', min: '10', ampm: '오후', unknown: false })
  assert.deepEqual(splitBirthtime('23:50'), { hour: '11', min: '50', ampm: '오후', unknown: false })
})
test('빈 값·잘못된 값은 시간 모름으로 취급한다', () => {
  for (const bad of ['', null, undefined, 'abc', '24:00', '12:60', '1230']) assert.equal(splitBirthtime(bad).unknown, true, String(bad))
})
