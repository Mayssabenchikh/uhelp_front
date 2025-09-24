'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { 
  Calendar,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Users,
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageCircle,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// Types
interface MetricCardProps {
  title: string
  value: string | number
  change: string
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
}

interface FilterState {
  dateRange: string
  format: string
}

interface ReportsData {
  overview: {
    total_tickets: { value: number; change: number; trend: string }
    resolution_rate: { value: number; change: number; trend: string }
    avg_response_time: { value: number; change: number; trend: string }
  }
  ticket_volume: Array<{ month: string; tickets: number; resolved: number }>
  status_distribution: Array<{ name: string; value: number; color: string }>
  priority_distribution: Array<{ priority: string; count: number }>
  response_time: Array<{ week: string; avgResponse: number }>
  agent_performance: Array<{ agent: string; solved: number; satisfaction: number }>
  satisfaction: {
    overall_rating: number
    response_rate: number
    resolution_rate: number
    trends: { overall_rating: number; response_rate: number; resolution_rate: number }
  }
}

// Components
const MetricCard = ({ title, value, change, changeType, icon }: MetricCardProps) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="p-3 bg-cyan-50 rounded-full">
        {icon}
      </div>
    </div>
    <div className="mt-4 flex items-center">
      {changeType === 'increase' ? (
        <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
      ) : changeType === 'decrease' ? (
        <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
      ) : (
        <TrendingUp className="w-4 h-4 mr-1 text-gray-500" />
      )}
      <span className={cn(
        "text-sm font-medium",
        changeType === 'increase' ? 'text-green-600' : 
        changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
      )}>
        {change}
      </span>
    </div>
  </div>
)

const FilterDropdown = ({ 
  label, 
  value, 
  options, 
  onChange 
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

export default function ReportsPage() {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '30days',
    format: 'json'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [reportsData, setReportsData] = useState<ReportsData | null>(null)

  // Fetch reports data
  const fetchReportsData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports?date_range=${filters.dateRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch reports data')
      }

      const data = await response.json()
      setReportsData(data)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load reports data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReportsData()
  }, [filters.dateRange])

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/export?date_range=${filters.dateRange}&format=${filters.format}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      if (filters.format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        const contentDisposition = response.headers.get('Content-Disposition')
        let fileName = `reports_export_${new Date().toISOString().split('T')[0]}.csv`
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+)"?/)
          if (match && match[1]) fileName = match[1]
        }
        
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        const jsonStr = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `reports_export_${new Date().toISOString().split('T')[0]}.json`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      }
      
      toast.success('Report exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  const filterOptions = {
    dateRange: [
      { value: '7days', label: 'Last 7 days' },
      { value: '30days', label: 'Last 30 days' },
      { value: '90days', label: 'Last 3 months' },
      { value: '1year', label: 'Last year' }
    ],
    format: [
      { value: 'json', label: 'JSON' },
      { value: 'csv', label: 'CSV' }
    ]
  }

  const getMetricChangeType = (trend: string): 'increase' | 'decrease' | 'neutral' => {
    return trend === 'up' ? 'increase' : trend === 'down' ? 'decrease' : 'neutral'
  }

  const formatChangeText = (change: number, isResponseTime = false): string => {
    const absChange = Math.abs(change)
    if (isResponseTime) {
      return change <= 0 ? `${absChange}% faster` : `${absChange}% slower`
    }
    return change >= 0 ? `+${change}% from last month` : `${change}% from last month`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!reportsData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h3>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FilterDropdown
            label="Date Range"
            value={filters.dateRange}
            options={filterOptions.dateRange}
            onChange={(value) => updateFilter('dateRange', value)}
          />
          <FilterDropdown
            label="Export Format"
            value={filters.format}
            options={filterOptions.format}
            onChange={(value) => updateFilter('format', value)}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
        <MetricCard
          title="Total Tickets"
          value={reportsData.overview.total_tickets.value.toLocaleString()}
          change={formatChangeText(reportsData.overview.total_tickets.change)}
          changeType={getMetricChangeType(reportsData.overview.total_tickets.trend)}
          icon={<Ticket className="w-6 h-6 text-cyan-600" />}
        />
        {/*<MetricCard
          title="Resolution Rate"
          value={`${reportsData.overview.resolution_rate.value}%`}
          change={formatChangeText(reportsData.overview.resolution_rate.change)}
          changeType={getMetricChangeType(reportsData.overview.resolution_rate.trend)}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${reportsData.overview.avg_response_time.value}h`}
          change={formatChangeText(reportsData.overview.avg_response_time.change, true)}
          changeType={getMetricChangeType(reportsData.overview.avg_response_time.trend)}
          icon={<Clock className="w-6 h-6 text-orange-600" />}
        />*/}
      
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportsData.status_distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportsData.status_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Priority</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportsData.priority_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#06B6D4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time Analysis 
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Response Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportsData.response_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}h`, 'Avg Response Time']} />
              <Line type="monotone" dataKey="avgResponse" stroke="#06B6D4" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>*/}
      </div>

      {/* Agent Performance */}
      {reportsData.agent_performance.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportsData.agent_performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="agent" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="solved" fill="#06B6D4" name="Tickets Solved" />
              <Line yAxisId="right" type="monotone" dataKey="satisfaction" stroke="#F59E0B" name="Satisfaction" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      
    </div>
  )
}