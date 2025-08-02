import React, { useState } from 'react';
import ExecutiveDashboard from './ExecutiveDashboard';
import UserBehaviorAnalytics from './UserBehaviorAnalytics';
import PredictiveAnalytics from './PredictiveAnalytics';
import { generateCustomReport, exportAnalyticsData, type CustomReportData } from '../../api/admin';

interface TabConfig {
  key: string;
  label: string;
  icon: string;
  component: React.ReactNode;
  description: string;
}

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('executive');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const tabs: TabConfig[] = [
    {
      key: 'executive',
      label: 'Executive Dashboard',
      icon: '📊',
      component: <ExecutiveDashboard />,
      description: 'High-level KPIs and business metrics for executive decision making',
    },
    {
      key: 'behavior',
      label: 'User Behavior',
      icon: '👥',
      component: <UserBehaviorAnalytics />,
      description: 'Detailed user engagement patterns and behavioral insights',
    },
    {
      key: 'predictive',
      label: 'Predictive Analytics',
      icon: '🔮',
      component: <PredictiveAnalytics />,
      description: 'AI-powered forecasting and churn prediction models',
    },
  ];

  const handleExportReport = async (reportType: string, format: 'csv' | 'excel' | 'pdf') => {
    try {
      setIsExporting(true);
      setExportStatus(`Generating ${format.toUpperCase()} report...`);

      const blob = await exportAnalyticsData({
        reportType,
        format,
        filters: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportStatus(`${format.toUpperCase()} report downloaded successfully!`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setExportStatus(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateCustomReport = async (reportType: string) => {
    try {
      setExportStatus(`Generating custom ${reportType} report...`);

      const report: CustomReportData = await generateCustomReport(reportType, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      });

      // Convert to CSV and download
      const csvContent = convertToCSV(report.data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.reportId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportStatus(`Custom report "${report.title}" downloaded successfully!`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      setExportStatus(
        `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setTimeout(() => setExportStatus(null), 5000);
    }
  };

  const convertToCSV = (data: Array<Record<string, any>>): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return String(value || '');
        })
        .join(','),
    );

    return [csvHeaders, ...csvRows].join('\n');
  };

  const currentTab = tabs.find((tab) => tab.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-content">Advanced Analytics</h1>
          <p className="text-tertiary mt-1">
            Comprehensive business intelligence and data insights platform
          </p>
        </div>

        {/* Export Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select
              onChange={(e) => {
                const [action, ...params] = e.target.value.split(':');
                if (action === 'export') {
                  const [reportType, format] = params;
                  handleExportReport(reportType, format as 'csv' | 'excel' | 'pdf');
                } else if (action === 'custom') {
                  const [reportType] = params;
                  handleGenerateCustomReport(reportType);
                }
                e.target.value = '';
              }}
              disabled={isExporting}
              className="bg-surface border border-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            >
              <option value="">Export Reports</option>
              <optgroup label="Standard Exports">
                <option value="export:user_activity:csv">User Activity (CSV)</option>
                <option value="export:financial_summary:csv">Financial Summary (CSV)</option>
                <option value="export:user_activity:excel">User Activity (Excel)</option>
                <option value="export:financial_summary:excel">Financial Summary (Excel)</option>
              </optgroup>
              <optgroup label="Custom Reports">
                <option value="custom:user_activity">Custom User Report</option>
                <option value="custom:financial_summary">Custom Financial Report</option>
              </optgroup>
            </select>
          </div>

          {exportStatus && (
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                exportStatus.includes('failed')
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : exportStatus.includes('success')
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {exportStatus}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-muted">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-3 py-4 px-1 border-b-2 font-medium text-sm transition group ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-tertiary hover:text-content hover:border-muted'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <div className="text-left">
                <div>{tab.label}</div>
                <div className="text-xs text-tertiary group-hover:text-content transition">
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">{currentTab?.component}</div>

      {/* Analytics Info Footer */}
      <div className="bg-surface border border-muted rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-content mb-2">Data Sources</h3>
            <ul className="text-sm text-tertiary space-y-1">
              <li>• User activity and engagement metrics</li>
              <li>• Financial transactions and betting data</li>
              <li>• Prediction and badge system analytics</li>
              <li>• Real-time system performance metrics</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-content mb-2">Update Frequency</h3>
            <ul className="text-sm text-tertiary space-y-1">
              <li>• Real-time metrics: Every 30 seconds</li>
              <li>• User behavior: Hourly aggregation</li>
              <li>• Financial data: Real-time transactions</li>
              <li>• Predictive models: Daily recalculation</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-content mb-2">Analytics Features</h3>
            <ul className="text-sm text-tertiary space-y-1">
              <li>• Executive KPI dashboards</li>
              <li>• Behavioral pattern analysis</li>
              <li>• Churn prediction and forecasting</li>
              <li>• Custom report generation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
