"use client";

import { useEffect, useState } from "react";
import { API_BASE, getStoredToken } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { Search, Download, CreditCard, Eye, X, FileText, Calendar, DollarSign, Coins } from "lucide-react";
import { useTranslation } from 'react-i18next'

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  subscription?: {
    id: number;
    plan?: {
      id: number;
      name: string;
    };
  };
}

export default function BillingPage() {
  const { t } = useTranslation()
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const token = getStoredToken();

  const fetchPayments = async (search = "") => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/payments${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to load payments");
        return;
      }
      setPayments(data);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [token]);

  const handleSearch = () => {
    fetchPayments(searchTerm);
  };

  const handleDownloadInvoice = async (paymentId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/invoice/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Failed to download invoice");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      toast.error("Error downloading invoice");
    }
  };

  const handlePay = async (payment: Payment) => {
    setLoadingIds((prev) => [...prev, payment.id]);
    try {
      const bodyData: any = { currency: payment.currency || "TND" };
      if (payment.subscription?.id) {
        bodyData.subscription_id = payment.subscription.id;
      } else if (payment.subscription?.plan?.id) {
        bodyData.subscription_plan_id = payment.subscription.plan.id;
      } else {
        toast.error("No subscription or plan ID found for this payment");
        return;
      }
      const res = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Payment failed");
        return;
      }
      if (data.konnect?.payUrl) {
        toast.success("Redirecting to payment...");
        window.location.href = data.konnect.payUrl;
      } else {
        toast.error("No payment URL returned");
      }
    } catch (error) {
      console.error(error);
      toast.error("Payment error");
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== payment.id));
    }
  };

  const openDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPayment(null);
  };

  const getStatusBadge = (status: string) => {
    // normalize incoming status to be case-insensitive
    const key = String(status ?? '').toLowerCase();
    const statusConfig = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200"
    };
    return statusConfig[key as keyof typeof statusConfig] || "bg-gray-100 text-gray-800 border-gray-200";
  };
  
  // Format status label with translation fallback; normalizes status key
  const formatStatusLabel = (status: string | undefined | null) => {
    const key = String(status ?? '').toLowerCase();
    const translated = t(`billing.status_${key}`);
    if (translated && translated !== `billing.status_${key}`) return translated;
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : '';
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-cyan-50 to-indigo-50 rounded-2xl p-8 border border-cyan-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-cyan-100 rounded-xl">
            <CreditCard className="w-8 h-8 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('billing.paymentHistory') || 'Payment History'}</h2>
            <p className="text-gray-600">{t('billing.managePayments') || 'Manage your payments and download invoices'}</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('billing.searchPlaceholder') || 'Search by plan, status, or amount...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              {t('actions.search') || 'Search'}
             </button>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  fetchPayments();
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium">Loading payments...</span>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500 max-w-md">
              {searchTerm 
                ? (t('billing.noResultsSuggestion') || "Try adjusting your search criteria to find what you're looking for.") 
                : (t('billing.noPayments') || "You don't have any payment records yet. Your future transactions will appear here.")
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">{t('billing.plan') || 'Plan'}</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">{t('billing.amount') || 'Amount'}</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">{t('billing.status') || 'Status'}</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">{t('billing.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((pay) => {
                  const statusKey = String(pay.status ?? '').toLowerCase();
                  return (
                  <tr key={pay.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-50 rounded-lg">
                          <Calendar className="w-4 h-4 text-cyan-600" />
                        </div>
                        <span className="font-medium text-gray-900">
                          {pay.subscription?.plan?.name || (t('billing.na') || 'N/A')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Coins className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {pay.amount} {pay.currency}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(statusKey)}`}>
                        {formatStatusLabel(statusKey)}
                       </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openDetails(pay)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors duration-200 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          {t('actions.details') || 'Details'}
                         </button>

                        {pay.status === "completed" && (
                          <button
                            onClick={() => handleDownloadInvoice(pay.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors duration-200 text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            {t('billing.invoice') || 'Invoice'}
                           </button>
                        )}
                        
                        {pay.status === "pending" && (
                          <button
                            onClick={() => handlePay(pay)}
                            disabled={loadingIds.includes(pay.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            {loadingIds.includes(pay.id) ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {t('actions.processing') || 'Processing'}
                               </>
                            ) : (
                               <>
                                 <CreditCard className="w-4 h-4" />
                                {t('billing.payNow') || 'Pay Now'}
                               </>
                             )}
                           </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
               </tbody>
             </table>
           </div>
         )}
       </div>

      {/* Enhanced Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 scale-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 rounded-xl">
                  <FileText className="w-5 h-5 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Plan</span>
                  <span className="text-gray-900 font-semibold">
                    {selectedPayment.subscription?.plan?.name || "N/A"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Amount</span>
                  <span className="text-gray-900 font-semibold text-lg">
                    {selectedPayment.amount} {selectedPayment.currency}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Status</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(String(selectedPayment.status).toLowerCase())}`}>
                    {formatStatusLabel(String(selectedPayment.status).toLowerCase())}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600 font-medium">Subscription ID</span>
                  <span className="text-gray-900 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {selectedPayment.subscription?.id || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}