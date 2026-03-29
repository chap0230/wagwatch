import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/history', icon: '📅', label: 'History' },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/profile', icon: '🐕', label: 'Dog' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50">
      {tabs.map(tab => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs py-1 px-3 ${isActive ? 'text-blue-600' : 'text-gray-500'}`
          }>
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
