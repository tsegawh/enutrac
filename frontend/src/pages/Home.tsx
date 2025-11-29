import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Shield, Clock, BarChart3, CheckCircle, ArrowRight, Menu, X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  deviceLimit: number;
  durationDays: number;
  price: number;
  description: string;
}

// Mock data for supported devices (based on Traccar documentation)
const supportedDevices = [
  { name: "Teltonika FMB920", protocols: ["GPS", "GSM"], features: "Vehicle tracking, geofencing" },
  { name: "Queclink GV300", protocols: ["GPS", "GSM"], features: "Real-time tracking, fuel monitoring" },
  { name: "CobancGPS 303", protocols: ["GPS"], features: "Vehicle and motorcycle tracking" },
  { name: "Ruptela Eco4", protocols: ["GPS", "GSM"], features: "Fleet management, driver behavior" },
  // Add more devices as needed
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const [stats, setStats] = useState<{ activeUsers: number; activeDevices: number }>({ activeUsers: 0, activeDevices: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    fetchPlans();
    fetchStats();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/subscription/plans');
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/stats');
    const data = response.data.stats;
setStats({
      activeUsers: data.activeUsers,
      activeDevices: data.activeDevices
    });
    } catch (error) {
      console.error('Error fetching site stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    if (!user) { navigate('/login'); return; }
    setPurchasing(planId);
    try {
      const upgradeResponse = await axios.post('/subscription/upgrade', { planId });
      if (upgradeResponse.data.requiresPayment) {
        const paymentResponse = await axios.post('/payment/pay', { planId });
        if (paymentResponse.data.checkoutUrl) window.location.href = paymentResponse.data.checkoutUrl;
      } else {
        toast.success('Subscription activated successfully!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to process subscription';
      toast.error(message);
    } finally {
      setPurchasing(null);
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">EnuTrac</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Home</Link>
            <a href="#supported-devices" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Supported Devices</a>
            <Link to="/about" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">About</Link>
            {user ? (
              <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Sign In</Link>
                <Link to="/register" className="btn-primary">Get Started</Link>
              </>
            )}
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={toggleMenu} className="text-gray-600 hover:text-gray-900">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              <Link to="/" className="block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium" onClick={toggleMenu}>Home</Link>
              <a href="#supported-devices" className="block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium" onClick={toggleMenu}>Supported Devices</a>
              <Link to="/about" className="block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium" onClick={toggleMenu}>About</Link>
              {user ? (
                <Link to="/dashboard" className="block btn-primary text-center" onClick={toggleMenu}>Go to Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium" onClick={toggleMenu}>Sign In</Link>
                  <Link to="/register" className="block btn-primary text-center" onClick={toggleMenu}>Get Started</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">Professional GPS Tracking <span className="text-primary-600">Made Simple</span></h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">Monitor your vehicles, assets, and fleet in real-time across Ethiopia. Get insights, improve efficiency, and ensure security with EnuTrac.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8 py-3 flex items-center justify-center">
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2"/>
            </Link>
            <a href="#pricing" className="btn-secondary text-lg px-8 py-3">View Pricing</a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose EnuTrac?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Designed for Ethiopian businesses with robust Traccar-based tracking and local support.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full text-primary-600 mb-4">
              <MapPin className="w-6 h-6"/>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time GPS Tracking</h3>
            <p className="text-gray-600">Track vehicles, motorcycles, and other assets anywhere in Ethiopia.</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full text-primary-600 mb-4">
              <Shield className="w-6 h-6"/>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Security</h3>
            <p className="text-gray-600">Enterprise-grade encryption ensures your tracking data is always safe.</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full text-primary-600 mb-4">
              <Clock className="w-6 h-6"/>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">24/7 Monitoring & Alerts</h3>
            <p className="text-gray-600">Instant alerts via email and mobile app to stay informed anytime.</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full text-primary-600 mb-4">
              <BarChart3 className="w-6 h-6"/>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reporting</h3>
            <p className="text-gray-600">Comprehensive reports to optimize routes, reduce fuel cost, and increase efficiency.</p>
          </div>
        </div>
      </section>

      {/* Supported Devices Section */}
      <section id="supported-devices" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Supported Devices</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            EnuTrac supports a wide range of GPS devices compatible with Traccar, ensuring flexibility for your tracking needs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportedDevices.map((device, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6 text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{device.name}</h3>
                <p className="text-gray-600 mb-2"><strong>Protocols:</strong> {device.protocols.join(", ")}</p>
                <p className="text-gray-600"><strong>Features:</strong> {device.features}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <a href="https://www.traccar.org/devices/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              View full list of supported devices
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Flexible subscription plans with Telebirr payment</p>
        </div>
        {loadingPlans ? (
          <div className="flex justify-center"><div className="loading-spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, idx) => (
              <div key={plan.id} className={`relative rounded-2xl border-2 p-8 ${idx === 1 ? 'border-primary-500 bg-primary-50 scale-105' : 'border-gray-200 bg-white'} transition-all hover:border-primary-300 hover:shadow-lg`}>
                {idx === 1 && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2"><span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span></div>}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price === 0 ? 'Free' : `birr ${plan.price}`}</span>
                  {plan.price > 0 && <span className="text-gray-600">/{plan.durationDays} days</span>}
                </div>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="space-y-2 mb-8">
                  <div className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-2"/> Up to {plan.deviceLimit} devices</div>
                  <div className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-2"/> Real-time tracking</div>
                  <div className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-2"/> Mobile app access</div>
                  <div className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-2"/> Email notifications</div>
                </div>
                <button onClick={() => handlePurchase(plan.id)} disabled={purchasing === plan.id} className={`w-full py-3 px-6 rounded-lg font-semibold ${idx === 1 ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-900 text-white hover:bg-gray-800'} disabled:opacity-50`}>
                  {purchasing === plan.id ? 'Processing...' : plan.price === 0 ? 'Start Free' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Statistics */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="text-5xl font-bold text-primary-600 mb-2">{loadingStats ? '...' : stats.activeUsers}</div>
            <div className="text-gray-600">Active Users</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-primary-600 mb-2">{loadingStats ? '...' : stats.activeDevices}</div>
            <div className="text-gray-600">Active Devices</div>
          </div>
        </div>
      </section>

      {/* FAQ & Support */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">FAQs & Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">What devices are supported?</h3>
              <p>All Traccar-supported GPS devices, including vehicles, motorcycles, and trackers compatible with GSM/GPS protocols.</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">How do I pay?</h3>
              <p>Pay securely via <span className="font-semibold">Telebirr</span> or local bank transfers for premium subscriptions.</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">Where can I find help?</h3>
              <p>Check our <a href="https://www.traccar.org/documentation/" className="text-primary-600 underline">Traccar documentation</a> or contact our 24/7 support for guidance.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}