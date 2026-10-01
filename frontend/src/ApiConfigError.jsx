export default function ApiConfigError({ message }) {
  return (
    <div role="alert" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F5F7', padding: 24 }}>
      <div style={{ maxWidth: 480, background: '#fff', border: '1px solid #DEDFE5', borderRadius: 12, padding: '24px 22px', color: '#24232B', lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#633B50', marginBottom: 10 }}>서버 연결 설정이 필요합니다</h1>
        <p style={{ fontSize: 14, marginBottom: 10 }}>{message}</p>
        <p style={{ fontSize: 12, color: '#62616C' }}>운영 서버로 잘못 연결되는 것을 막기 위해 앱을 시작하지 않았습니다.</p>
      </div>
    </div>
  )
}
