import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  Settings,
  Users,
  CreditCard,
  Database,
  BarChart3,
  //Smartphone,
  User,
  ShoppingCart,
} from 'lucide-react';

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Devices', href: '/dashboard/devices', icon: MapPin },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Account', href: '/dashboard/account', icon: User },
];

const adminNavItems = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/dashboard/users', icon: Users },
  { name: 'Subscriptions', href: '/admin/dashboard/subscriptions', icon: CreditCard },
  { name: 'Devices', href: '/admin/dashboard/devices', icon: MapPin },
  { name: 'Payments', href: '/admin/dashboard/payments', icon: Database },
  
{ name: 'Orders', href: '/admin/dashboard/adminorders', icon: ShoppingCart },
  { name: ' Route Reports', href: '/admin/dashboard/reports', icon: BarChart3 },
  { name: 'Settings', href: '/admin/dashboard/settings', icon: Settings },

 ];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === 'ADMIN';
  const isAdminRoute = location.pathname.startsWith('/admin');

  const navItems = isAdminRoute ? adminNavItems : userNavItems;

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Enuga</h1>
            <p className="text-xs text-gray-500">GPS Tracking</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin/User Toggle */}
      {isAdmin && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <NavLink
              to="/dashboard"
              className={() =>
                `flex-1 px-3 py-2 text-xs font-medium rounded-lg text-center transition-colors ${
                  !isAdminRoute
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              User View
            </NavLink>
            <NavLink
              to="/admin/dashboard"
              className={() =>
                `flex-1 px-3 py-2 text-xs font-medium rounded-lg text-center transition-colors ${
                  isAdminRoute
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              Admin View
            </NavLink>
          </div>
        </div>
      )}

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}