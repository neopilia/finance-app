import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/input', label: '자산입력', icon: '📥' },
  { to: '/portfolio', label: '포트폴리오', icon: '💼' },
  { to: '/rebalancing', label: '리밸런싱', icon: '⚖️' },
  { to: '/simulation', label: '시뮬레이션', icon: '📈' },
  { to: '/claude', label: 'Claude분석', icon: '🤖' },
  { to: '/settings', label: '설정', icon: '⚙️' },
];

const navStyle: React.CSSProperties = {
  width: 200,
  minHeight: '100vh',
  background: 'var(--color-surface)',
  borderRight: '1px solid var(--color-border)',
  padding: '24px 0',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const logoStyle: React.CSSProperties = {
  padding: '0 20px 24px',
  borderBottom: '1px solid var(--color-border)',
  marginBottom: 8,
};

/** 좌측 고정 네비게이션 바 */
export default function NavBar() {
  return (
    <nav style={navStyle}>
      <div style={logoStyle}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>💰 자산관리</div>
      </div>
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: isActive ? 'rgba(108,142,247,0.1)' : 'transparent',
            borderRight: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            transition: 'all 0.15s',
          })}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
