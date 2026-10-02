// 로컬 화면 확인용 "예시 응답" 서버. 실제 AI(Anthropic)를 호출하지 않고, 서버가 보낸 프롬프트의 형식에 맞춰
// 짧은 예시 풀이를 돌려준다. 모든 예시에는 "[예시 결과 · 실제 AI 풀이가 아닙니다]" 표시가 붙는다.
//
// 사용 (터미널 2개):
//   1) node dev/sample-anthropic.js                      → 예시 응답 서버 (기본 포트 4010)
//   2) ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=sample node server.js
// 프롬프트를 파일로 남기려면 SAMPLE_LOG=경로 를 함께 지정한다.
const http = require('http');
const fs = require('fs');

const TAG = '[예시 결과 · 실제 AI 풀이가 아닙니다]';
const firstMatch = (s, re, d = '') => (s.match(re) || [])[1] || d;

function freeGunghab(p) {
  const A = firstMatch(p, /^\[(.+?)님\]$/m, '나');
  const labels = [...p.matchAll(/^===(.+?)===\n해설:/gm)].map(m => m[1]);
  const levels = [...p.matchAll(/→ 이 항목의 수준은 '(.+?)'으로/g)].map(m => m[1]);
  const bars = labels.map((l, i) => `===${l}===\n해설: (예시) '${levels[i] || '무난한 편'}' 수준에 맞춘 한 문장 해설이에요.\n팁: (예시) 오늘 바로 해볼 수 있는 행동 한 가지예요.`).join('\n\n');
  return `===관계 요약===\n${TAG} 두 사람은 서로 다른 속도로 움직이지만 보완이 되는 편이에요.\n\n${bars}\n\n===잘 맞는 점===\n(예시) 서로의 부족한 부분을 채워주는 경향이 있어요.\n\n===조율할 점===\n(예시) 방식의 차이를 인정하고 말로 확인해보면 좋아요.\n\n===대화 문장===\n"요즘 어떻게 지내는지 편하게 이야기해볼까요?"\n\n===공유 문장===\n${A}님은 1990년생인데 우리 관계는 이런 편이래. 너는 어때?`;
}
function freeMy(p) {
  const name = firstMatch(p, /^- 이름: (.+)$/m, '나');
  return `===나를 읽다===\n${TAG}\n\n📌 이 사람을 한 마디로\n(예시) 차분해 보이지만 속으로 꼼꼼히 따져보는 경향이 있어요.\n\n📌 왜 이런 성향이 나오는지\n(예시) 사주에서 안정을 중시하는 기운이 두드러질 수 있어요.\n\n===나의 강점===\n(예시) 한번 맡은 일을 끝까지 챙기는 꼼꼼함이 강점일 수 있어요.\n\n===주의할 습관===\n(예시) 혼자 오래 고민하다 결정을 미루는 습관이 나타날 수 있어요.\n\n===바로 실천할 팁===\n(예시) 오늘 미뤄둔 결정 하나를 10분 안에 정해보세요.\n\n===공유 문장===\n${name}님, 1990년생인 나는 천천히 확인하고 결정하는 방식이 편하대. 너는 어때?`;
}
function paid(p) {
  const titles = [...p.matchAll(/^===(.+?)===$/gm)].map(m => m[1]);
  return titles.map(t => `===${t}===\n${TAG}\n(예시) ${t}에 대한 상세 풀이 자리예요.`).join('\n\n');
}
function sampleFor(p) {
  if (p.includes('===관계 요약===') && p.includes('===공유 문장===')) return freeGunghab(p);
  if (p.includes('===나의 강점===') && p.includes('===바로 실천할 팁===')) return freeMy(p);
  if (p.includes('[핵심 항목 수준')) return paid(p);
  return `${TAG} 이 요청 유형은 예시 서버가 내용을 만들지 않아요.`;
}

const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

http.createServer((req, res) => {
  let raw = '';
  req.on('data', c => { raw += c; });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch {}
    const prompt = String(body.messages?.[0]?.content ?? '');
    if (process.env.SAMPLE_LOG) fs.appendFileSync(process.env.SAMPLE_LOG, JSON.stringify({ prompt }) + '\n');
    const text = sampleFor(prompt);
    const msg = { id: 'msg_sample', type: 'message', role: 'assistant', model: body.model || 'sample', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };
    if (!body.stream) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ...msg, content: [{ type: 'text', text }], stop_reason: 'end_turn' }));
    }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    res.write(sse('message_start', { type: 'message_start', message: msg }));
    res.write(sse('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));
    for (let i = 0; i < text.length; i += 40) {
      res.write(sse('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 40) } }));
    }
    res.write(sse('content_block_stop', { type: 'content_block_stop', index: 0 }));
    res.write(sse('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 10 } }));
    res.write(sse('message_stop', { type: 'message_stop' }));
    res.end();
  });
}).listen(Number(process.env.SAMPLE_PORT) || 4010, '127.0.0.1', () => console.log('예시 응답 서버: http://127.0.0.1:' + (process.env.SAMPLE_PORT || 4010)));
