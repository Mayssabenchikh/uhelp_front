"use client";

import { useEffect, useState } from "react";
import { API_BASE, getStoredToken } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { Check, Crown, Zap, Shield, Star } from "lucide-react";
import { useRouter } from "next/navigation"
import { useTranslation } from 'react-i18next'

interface Plan {
  id: number;
  name: string;
  price: number;
  billing_cycle: string;
  features?: string[];
}

interface Subscription {
  id: number;
  subscription_plan_id: number;
  status: string;
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter()
  const { t } = useTranslation()

  const token = getStoredToken();

  useEffect(() => {
    if (!token) return;

    Promise.all([
      fetch(`${API_BASE}/api/subscription-plans`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_BASE}/api/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([plansData, subsData]) => {
        setPlans(plansData);
        // On prend la première souscription active
        const active = subsData.find((s: Subscription) => s.status === "active");
        setCurrentSub(active || null);
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubscribe = async (planId: number) => {
    setSubscribingId(planId);
    try {
      const res = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription_plan_id: planId,
          currency: "TND",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to start payment");
        return;
      }

      toast.success("Redirecting to payment...");
      if (data.konnect?.payUrl) {
        window.location.href = data.konnect.payUrl;
      }
    } catch (error) {
      console.error(error);
      toast.error("Payment initiation failed.");
    } finally {
      setSubscribingId(null);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/subscription/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        toast.error(data?.message || "Failed to cancel subscription");
        return;
      }

      toast.success(data?.message || "Subscription cancelled");
      setCurrentSub(null);
    } catch (error) {
      console.error(error);
      toast.error("Error cancelling subscription");
    } finally {
      setCancelling(false);
    }
  };

  const getPlanIcon = (index: number) => {
    const icons = [Shield, Zap, Crown];
    return icons[index] || Star;
  };

  const getPlanColor = (index: number, isCurrent: boolean) => {
    if (isCurrent) return "from-gradient-to-r from-cyan-500 to-teal-500";
    const colors = [
      "from-blue-500 to-blue-600",
      "from-purple-500 to-purple-600", 
      "from-amber-500 to-orange-500"
    ];
    return colors[index] || "from-gray-500 to-gray-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-lg font-medium">{t('subscription.loadingPlans') || 'Loading subscription plans...'}</p>
        </div>
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-xl text-gray-600">{t('subscription.noPlans') || 'No subscription plans available'}</p>
          <p className="text-gray-500 mt-2">{t('subscription.checkBack') || 'Please check back later for available plans.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('subscription.choosePlan') || 'Choose Your Perfect Plan'}</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">{t('subscription.subtitle') || 'Unlock powerful features and take your experience to the next level with our flexible subscription options.'}</p>
      </div>

      {/* Current Subscription Alert */}
      {currentSub && (
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Subscription</h3>
              <p className="text-gray-600">{t('subscription.activeMessage') || 'You currently have an active subscription. You can upgrade, downgrade, or cancel anytime.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, index) => {
          const isCurrent = currentSub?.subscription_plan_id === plan.id;
          const PlanIcon = getPlanIcon(index);
          const isPopular = index === 1; // Middle plan is popular

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                isCurrent 
                  ? "border-cyan-500 ring-4 ring-cyan-100" 
                  : isPopular
                  ? "border-purple-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Popular Badge */}
              {isPopular && !isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">{t('subscription.mostPopular') || 'Most Popular'}</div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">{t('subscription.currentPlan') || 'Current Plan'}</div>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${getPlanColor(index, isCurrent)} flex items-center justify-center shadow-lg`}>
                    <PlanIcon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-500">TND</div>
                      <div className="text-sm text-gray-500">/ {plan.billing_cycle}</div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  {plan.features?.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isCurrent ? (
                    <>
                      <button
                        disabled
                        className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg cursor-not-allowed opacity-75"
                      >
                        ✨ Active Plan
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:from-red-600 hover:to-red-700 disabled:opacity-50"
                      >
                        {cancelling ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Cancelling...</span>
                          </div>
                        ) : (
                          "Cancel Subscription"
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribingId === plan.id}
                      className={`w-full px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 ${
                        isPopular
                          ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700"
                          : "bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-900 hover:to-black"
                      }`}
                    >
                      {subscribingId === plan.id ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        "Subscribe & Pay"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Info */}
      <div className="mt-12 text-center w-full">
        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Need Help Choosing?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our team is here to help you find the perfect plan for your needs. Contact us anytime for personalized recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            
                <button
      onClick={() => router.push("/clientdashboard/faq")}
      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-teal-600 transition-all duration-200"
    >
      {t('subscription.viewFaq') || 'View FAQ'}
     </button>
          </div>
        </div>
      </div>
    </div>
  );
}