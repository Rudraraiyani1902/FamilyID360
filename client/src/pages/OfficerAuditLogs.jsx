import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { getAuditLogs } from '../api/officer.api';
import { formatDate } from '../utils/formatters';

const ENTITY_TYPES = ['', 'FAMILY', 'APPLICATION', 'DUPLICATE'];

export default function OfficerAuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [entityType, setEntityType] = useState(searchParams.get('entityType') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const page = Number(searchParams.get('page')) || 1;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAuditLogs({ search, entityType, page, limit: 20 });
      setLogs(response.data?.data || []);
      setPagination(response.data?.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.clientMessage || err.response?.data?.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [entityType, page, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilters = (event) => {
    event.preventDefault();
    const params = { page: 1 };
    if (search.trim()) params.search = search.trim();
    if (entityType) params.entityType = entityType;
    setSearchParams(params);
  };

  const goToPage = (targetPage) => setSearchParams({ page: targetPage, ...(search ? { search } : {}), ...(entityType ? { entityType } : {}) });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div><span className="eyebrow">Governance record</span><h1 className="page-title">Audit Log</h1><p className="page-subtitle">A read-only history of officer actions across the beneficiary registry.</p></div>
        <Link to="/officer/applications" className="btn-secondary text-xs py-2 px-4">Application management</Link>
      </div>
      <ErrorMessage message={error} onClose={() => setError(null)} />
      <div className="card"><form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end"><div><label className="label" htmlFor="audit-search">Search</label><input id="audit-search" className="input text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Action, entity, or officer" /></div><div><label className="label" htmlFor="audit-entity">Entity</label><select id="audit-entity" className="input text-sm" value={entityType} onChange={(event) => setEntityType(event.target.value)}>{ENTITY_TYPES.map((item) => <option key={item} value={item}>{item || 'All entities'}</option>)}</select></div><button className="btn-primary text-sm py-2.5 px-5" type="submit">Apply filters</button></form></div>
      {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : logs.length === 0 ? <div className="card text-center py-16 border-2 border-dashed border-gray-200"><h2 className="font-bold text-gray-900">No audit events found</h2><p className="text-sm text-gray-500 mt-1">Recorded officer activity will appear here.</p></div> : <div className="card p-0 overflow-hidden"><div className="table-wrapper border-0 rounded-none"><table className="table min-w-[950px]"><thead><tr><th>Timestamp</th><th>Officer</th><th>Action</th><th>FamilyID</th><th>Entity</th><th>Old value</th><th>New value</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td className="text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td><td className="text-xs">{log.officerName || log.officer?.email || log.officer?.mobileNumber || 'Government Officer'}</td><td className="text-xs font-semibold text-gray-800">{log.action.replace(/_/g, ' ')}</td><td className="font-mono text-xs">{log.familyId || '—'}</td><td><span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">{log.entityType}</span></td><td className="max-w-48 text-xs text-gray-500">{log.previousState ? JSON.stringify(log.previousState) : '—'}</td><td className="max-w-48 text-xs text-gray-700">{log.newState ? JSON.stringify(log.newState) : '—'}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500"><span>{pagination.total} events</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Previous</button><span>Page {page} of {pagination.totalPages || 1}</span><button disabled={page >= pagination.totalPages} onClick={() => goToPage(page + 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next</button></div></div></div>}
    </div>
  );
}
