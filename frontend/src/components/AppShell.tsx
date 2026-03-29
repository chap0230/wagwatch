import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <main className="pt-14 pb-20 px-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
