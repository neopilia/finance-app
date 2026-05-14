import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

/** 좌측 NavBar + 우측 페이지 콘텐츠로 구성되는 앱 레이아웃 */
export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <NavBar />
      <main
        style={{
          flex: 1,
          padding: 28,
          overflowY: 'auto',
          maxWidth: 1100,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
