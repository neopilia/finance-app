import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import Layout from './components/Layout';
import Dashboard from './features/dashboard/Dashboard';
import InputPage from './features/input/InputPage';
import Portfolio from './features/portfolio/Portfolio';
import Rebalancing from './features/rebalancing/Rebalancing';
import Simulation from './features/simulation/Simulation';
import ClaudePanel from './features/claude/ClaudePanel';
import Settings from './features/settings/Settings';

/** AppProvider와 라우팅을 구성하는 앱 루트 컴포넌트 */
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="input" element={<InputPage />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="rebalancing" element={<Rebalancing />} />
            <Route path="simulation" element={<Simulation />} />
            <Route path="claude" element={<ClaudePanel />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
