'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Filter,
  Loader2
} from "lucide-react";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Types
interface OverviewMetric {
  value: number;
  change: number;
  trend: 'up' | 'down';
}

interface ReportsData {
  overview: {
    total_tickets: OverviewMetric;
    resolution_rate: OverviewMetric;
    avg_response_time: OverviewMetric;
    customer_satisfaction: OverviewMetric;
  };
  ticket_volume: Array<{
    month: string;
    tickets: number;
    resolved: number;
  }>;
  status_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  priority_distribution: Array<{
    priority: string;
    count: number;
  }>;
  response_time: Array<{
    week: string;
    avgResponse: number;
  }>;
  agent_performance: Array<{
    agent: string;
    solved: number;
    satisfaction: number;
  }>;
  satisfaction: {
    overall_rating: number;
    response_rate: number;
    resolution_rate: number;
    trends: {
      overall_rating: number;
      response_rate: number;
      resolution_rate: number;
    };
  };
}

const Reports: React.FC = () => {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30days');
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch reports data from Laravel backend
  const fetchReportsData = async (range: string = dateRange) => {
    try {
      setLoading(true);
      setError(null);

      // Use secure token retrieval for Next.js
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${API_BASE_URL}/reports?date_range=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reportsData: ReportsData = await response.json();
      setData(reportsData);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports data');
    } finally {
      setLoading(false);
    }
  };

  // Export reports
  const handleExport = async () => {
    try {
      setExporting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${API_BASE_URL}/reports/export?date_range=${dateRange}&format=csv`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reports_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export reports');
    } finally {
      setExporting(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (newRange: string) => {
    setDateRange(newRange);
    fetchReportsData(newRange);
  };

  // Load data on component mount
  useEffect(() => {
    fetchReportsData();
  }, []);

  // Render metric card
  const renderMetricCard = (title: string, metric: OverviewMetric, suffix: string = '') => {
    const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
    const trendColor = title === 'Avg Response Time' 
      ? (metric.trend === 'down' ? 'text-green-600' : 'text-red-600')
      : (metric.trend === 'up' ? 'text-green-600' : 'text-red-600');

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{metric.value}{suffix}</p>
              <div className="flex items-center mt-3">
                <TrendIcon className={`w-4 h-4 mr-1 ${trendColor}`} />
                <span className={`text-sm ${trendColor}`}>
                  {metric.change > 0 ? '+' : ''}{metric.change}% vs last period
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render tab button
  const renderTabButton = (value: string, label: string) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === value
          ? 'bg-blue-100 text-blue-700 border-blue-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  // Render badge
  const renderBadge = (text: string, variant: 'success' | 'warning' | 'error' | 'secondary' = 'secondary') => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      secondary: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
        {text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-700">Loading reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-full max-w-md">
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <button 
              onClick={() => fetchReportsData()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive insights into your helpdesk performance</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                  <option value="1year">Last year</option>
                </select>
                <Calendar className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button 
                onClick={handleExport} 
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {renderTabButton('overview', 'Overview')}
            {renderTabButton('tickets', 'Tickets')}
            {renderTabButton('agents', 'Agents')}
            {renderTabButton('satisfaction', 'Satisfaction')}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderMetricCard('Total Tickets', data.overview.total_tickets)}
              {renderMetricCard('Resolution Rate', data.overview.resolution_rate, '%')}
              {renderMetricCard('Avg Response Time', data.overview.avg_response_time, 'h')}
              {renderMetricCard('Customer Satisfaction', data.overview.customer_satisfaction)}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Ticket Volume Trend</h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.ticket_volume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tickets" fill="#3b82f6" name="Total Tickets" />
                      <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Ticket Status Distribution</h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.status_distribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      >
                        {data.status_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Priority Distribution</h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.priority_distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Average Response Time</h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.response_time}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="avgResponse" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Avg Response (hours)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Agent Performance</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">AGENT</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">TICKETS SOLVED</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">SATISFACTION SCORE</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.agent_performance.map((agent) => (
                        <tr key={agent.agent} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900 capitalize">{agent.agent}</td>
                          <td className="py-3 px-4 text-gray-900">{agent.solved}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{agent.satisfaction}</span>
                              {renderBadge(
                                agent.satisfaction >= 4.5 ? 'Excellent' : 
                                agent.satisfaction >= 4.0 ? 'Good' : 'Needs Improvement',
                                agent.satisfaction >= 4.5 ? 'success' : 
                                agent.satisfaction >= 4.0 ? 'warning' : 'error'
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {renderBadge('Active', 'success')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.agent_performance.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    No agent performance data available for the selected period.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Satisfaction Tab */}
        {activeTab === 'satisfaction' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Customer Satisfaction Metrics</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{data.satisfaction.overall_rating}</div>
                    <div className="text-gray-600">Overall Rating</div>
                    <div className="text-sm text-green-600 mt-1">
                      {data.satisfaction.trends.overall_rating > 0 ? '+' : ''}{data.satisfaction.trends.overall_rating} from last period
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{data.satisfaction.response_rate}%</div>
                    <div className="text-gray-600">Response Rate</div>
                    <div className="text-sm text-green-600 mt-1">
                      {data.satisfaction.trends.response_rate > 0 ? '+' : ''}{data.satisfaction.trends.response_rate}% from last period
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{data.satisfaction.resolution_rate}%</div>
                    <div className="text-gray-600">Resolution Rate</div>
                    <div className="text-sm text-green-600 mt-1">
                      {data.satisfaction.trends.resolution_rate > 0 ? '+' : ''}{data.satisfaction.trends.resolution_rate}% from last period
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;