import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Layout({ sidebarOpen, setSidebarOpen }: LayoutProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        <Sidebar onMobileClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-0 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 flex-1 overflow-x-hidden">
          <div className="max-w-full overflow-x-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}