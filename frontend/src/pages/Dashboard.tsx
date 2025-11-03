import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Calendar, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import axios from 'axios';
import axiosInstance from '../utils/axiosInstance';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { StripeCheckoutModal } from '../components/StripeCheckoutModal';

interface SubscriptionPlan {
  id: string;
  name: string;
  deviceLimit: number;
  durationDays: number;
  price: number;
  description: string;
}

interface Usage {
  devicesUsed: number;
  deviceLimit: number;
  canAddDevice: boolean;
  utilizationPercentage: number;
}

export default function Dashboard() {
  const { user, refreshUser,  token, loading: authLoading  } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);

  useEffect(() => {
 if (!authLoading && token) {
    fetchData();
}
  }, [authLoading, token]); // ✅ run only when auth is ready and token exists

  const fetchData = async () => {
    try {
      const [plansResponse, usageResponse] = await Promise.all([
        axiosInstance.get('/subscription/plans'),
       axiosInstance.get('/subscription/usage'),
      ]);

      setPlans(plansResponse.data.plans);
      setUsage(usageResponse.data.usage);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string, paymentGateway: 'stripe' | 'telebirr' = 'stripe') => {
    setUpgrading(planId);

    try {
      const response = await axios.post('/subscription/upgrade', { planId });

      if (response.data.requiresPayment) {
        if (paymentGateway === 'stripe') {
          const plan = plans.find(p => p.id === planId);
          if (plan) {
            setSelectedPlan(plan);
            setShowStripeModal(true);
            setUpgrading(null);
          }
          return;
        }

        const paymentResponse = await axios.post('/payment/pay', {
          planId,
          paymentGateway,
          useEmbedded: false
        });
        
        if (paymentResponse.data.checkoutUrl) {
          // Redirect to Telebirr checkout
          window.location.href = paymentResponse.data.checkoutUrl;
        }
      } else {
        // Free upgrade
        toast.success('Subscription upgraded successfully!');
        await refreshUser();
        fetchData();
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to upgrade subscription';
      toast.error(message);
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
      </div>
    );
  }

  const subscription = user?.subscription;
  const daysRemaining = subscription 
    ? Math.max(0, differenceInDays(new Date(subscription.endDate), new Date()))
    : 0;

  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining === 0;

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Manage your GPS tracking subscription and devices</p>
      </div>

      {/* Alerts */}
      {(isExpiringSoon || isExpired) && (
        <div className={`card border-l-4 ${isExpired ? 'border-l-error-500 bg-error-50' : 'border-l-warning-500 bg-warning-50'}`}>
          <div className="flex items-start space-x-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 ${isExpired ? 'text-error-600' : 'text-warning-600'}`} />
            <div>
              <h3 className={`font-medium ${isExpired ? 'text-error-900' : 'text-warning-900'}`}>
                {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
              </h3>
              <p className={`text-sm ${isExpired ? 'text-error-700' : 'text-warning-700'}`}>
                {isExpired 
                  ? 'Your subscription has expired. Upgrade now to continue tracking your devices.'
                  : `Your subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Consider upgrading to avoid service interruption.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Plan */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className="text-lg font-semibold text-gray-900">
                {subscription?.plan.name || 'No Plan'}
              </p>
            </div>
          </div>
        </div>

        {/* Devices Used */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Devices</p>
              <p className="text-lg font-semibold text-gray-900">
                {usage?.devicesUsed || 0} / {usage?.deviceLimit || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Days Remaining */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isExpired ? 'bg-error-100' : isExpiringSoon ? 'bg-warning-100' : 'bg-primary-100'
            }`}>
              <Calendar className={`w-5 h-5 ${
                isExpired ? 'text-error-600' : isExpiringSoon ? 'text-warning-600' : 'text-primary-600'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Days Remaining</p>
              <p className={`text-lg font-semibold ${
                isExpired ? 'text-error-900' : isExpiringSoon ? 'text-warning-900' : 'text-gray-900'
              }`}>
                {daysRemaining}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Percentage */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Usage</p>
              <p className="text-lg font-semibold text-gray-900">
                {usage?.utilizationPercentage || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Details */}
      {subscription && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Current Plan</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium">{subscription.plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Device Limit:</span>
                  <span className="font-medium">{subscription.plan.deviceLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`badge ${
                    subscription.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires:</span>
                  <span className="font-medium">
                    {format(new Date(subscription.endDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Usage</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Devices Used</span>
                    <span className="font-medium">
                      {usage?.devicesUsed} / {usage?.deviceLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        (usage?.utilizationPercentage || 0) >= 100
                          ? 'bg-error-600'
                          : (usage?.utilizationPercentage || 0) >= 80
                          ? 'bg-warning-600'
                          : 'bg-success-600'
                      }`}
                      style={{ width: `${Math.min(usage?.utilizationPercentage || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plans */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upgrade Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan.id === plan.id;
            const isDowngrade = subscription && plan.price < subscription.plan.price;
            
            return (
              <div
                key={plan.id}
                className={`border rounded-lg p-6 ${
                  isCurrent
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                } transition-colors`}
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">/{plan.durationDays} days</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Devices:</span>
                    <span className="font-medium">{plan.deviceLimit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{plan.durationDays} days</span>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  {isCurrent ? (
                    <div className="btn-primary w-full opacity-50 cursor-not-allowed">
                      Current Plan
                    </div>
                  ) : isDowngrade ? (
                    <div className="btn-secondary w-full opacity-50 cursor-not-allowed">
                      Downgrade Not Available
                    </div>
                  ) : (
                    <>
                      {plan.price > 0 ? (
                        <>
                          <button
                            onClick={() => handleUpgrade(plan.id, 'stripe')}
                            disabled={upgrading === plan.id}
                            className="btn-primary w-full"
                          >
                            {upgrading === plan.id ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Processing...</span>
                              </div>
                            ) : (
                              'Pay with Card (Stripe)'
                            )}
                          </button>
                          <button
                            onClick={() => handleUpgrade(plan.id, 'telebirr')}
                            disabled={upgrading === plan.id}
                            className="btn-secondary w-full"
                          >
                            Pay with Telebirr
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={upgrading === plan.id}
                          className="btn-primary w-full"
                        >
                          Downgrade
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {selectedPlan && (
        <StripeCheckoutModal
          plan={selectedPlan}
          isOpen={showStripeModal}
          onClose={() => {
            setShowStripeModal(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </>
  );
}