import { useState } from 'react';
import StatCard from '../components/StatCard';
import { GUJARAT_SCHEMES } from '../data/schemes';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-red-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold border border-red-500/30 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              State System Super Administrator
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              FamilyID 360 System Administration
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Statewide system governance, role permissions, scheme rule configurations, and security audit logs.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs flex items-center gap-3 self-start sm:self-auto">
            <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
              AD
            </div>
            <div>
              <span className="font-semibold block text-slate-200">Root Administrator</span>
              <span className="text-[11px] text-slate-400 font-mono">Gujarat Data Center</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total System Users"
          value="48,312"
          sub="Citizens, Officers & Admins"
          color="indigo"
          icon={<span className="text-lg">👥</span>}
        />
        <StatCard
          label="Active Database Tables"
          value="7 Models"
          sub="PostgreSQL + Sequelize"
          color="blue"
          icon={<span className="text-lg">🗄️</span>}
        />
        <StatCard
          label="Seeded Gujarat Schemes"
          value={GUJARAT_SCHEMES.length}
          sub="Real Govt Schemes Active"
          color="green"
          icon={<span className="text-lg">📜</span>}
        />
        <StatCard
          label="Rule Engine Status"
          value="Online (100%)"
          sub="Sub-10ms evaluation latency"
          color="amber"
          icon={<span className="text-lg">⚡</span>}
        />
      </div>

      {/* Admin Controls */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">System Governance & Schemes Registry</h2>
            <p className="text-xs text-gray-500">Real-time state entitlement configuration and audit records</p>
          </div>
          <span className="badge-green">Cluster: Operational</span>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Scheme Code</th>
                <th>Scheme Name</th>
                <th>Department</th>
                <th>Income Ceiling</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {GUJARAT_SCHEMES.map((scheme) => (
                <tr key={scheme.code}>
                  <td className="font-mono text-xs font-bold text-gray-800">{scheme.code}</td>
                  <td className="text-xs font-semibold text-gray-900">{scheme.name}</td>
                  <td className="text-xs text-gray-600">{scheme.department}</td>
                  <td className="text-xs font-medium text-gray-700">
                    {scheme.incomeLimit ? `₹${scheme.incomeLimit.toLocaleString('en-IN')}` : 'None'}
                  </td>
                  <td>
                    <span className="badge-green">ACTIVE</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
