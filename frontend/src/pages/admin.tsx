import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Socket } from 'socket.io-client';
import SocketService from '../services/socket';
import Navbar from '../components/Navbar';
import Preloader from '../components/Preloader';
import AuthGuard from '../components/AuthGuard';
import PayloadModal from '../components/PayloadModal';
import ProfileCard from '../components/ProfileCard';
import { API_BASE, fetchSystemSettings, toggleProtocolHalt } from '../services/api';
import { signActionRequest } from '../services/signing';
import { useWallet } from '../hooks/useWallet';
import { useSound } from '../hooks/useSound';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ------------------------------------------------------------------------
 * DESIGN TOKENS
 * A single spacing/radius/type scale used everywhere below so every card,
 * table, and section reads as one system instead of several stitched
 * together. Change these strings once to re-skin the whole page.
 * ---------------------------------------------------------------------- */
const T = {
  card: 'rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03]',
  cardPad: 'p-6 md:p-7',
  sectionHead: 'px-7 py-5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]',
  rowPad: 'px-7 py-6',
  eyebrow: 'text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase',
  title: 'text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase',
  pill: 'text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full',
  btn: 'px-4 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap',
  gap: 'gap-6',
};

interface UserData {
  _id: string;
  address: string;
  role: string;
  status: 'active' | 'banned';
  accountType?: string;
  kycStatus?: string;
  approved?: boolean;
  createdAt: string;
}

interface Stats {
  users: number;
  rules: number;
  proofs: number;
  successRate: string;
  volumeByNetwork?: { network: string, volume: number }[];
  tpsData?: { time: string, tps: number }[];
  tvl?: string;
  revenue?: string;
  nodes?: string;
  finality?: string;
}

const Sparkline = ({ color = '#ffffff' }) => (
  <svg width="100%" height="36" viewBox="0 0 100 40" preserveAspectRatio="none" className="opacity-40">
    <path
      d="M0 35 Q 15 5, 30 20 T 60 10 T 100 15"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/** Reusable stat tile so every metric card in the dashboard shares the same padding, label size, and rhythm. */
const StatTile = ({ label, value, color, sparkline }: { label: string; value: React.ReactNode; color: string; sparkline?: boolean }) => (
  <div className={`${T.card} ${T.cardPad}`}>
    <h3 className={`${T.eyebrow} mb-3`}>{label}</h3>
    <div className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</div>
    {sparkline && <div className="mt-3"><Sparkline color={color} /></div>}
  </div>
);

/** Reusable section wrapper so every table/list panel shares one header + body pattern. */
const Panel = ({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) => (
  <section className={`${T.card} overflow-hidden`}>
    <div className={`${T.sectionHead} flex items-center justify-between gap-4`}>
      <h3 className={T.title}>{title}</h3>
      {meta}
    </div>
    {children}
  </section>
);

const StatusDot = ({ color }: { color: string }) => (
  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
);

export default function AdminDashboard() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { playHover, playClick, playSuccess, playError, playExecution, playEmergency } = useSound();
  const socketRef = useRef<Socket | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [ops, setOps] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'security' | 'entities' | 'governance' | 'cluster' | 'treasury'>('analytics');

  const [telemetry, setTelemetry] = useState<{ t: string, m: string, c: string }[]>([]);
  const [systemHealth, setSystemHealth] = useState({ connections: 0, load: 'LOW' });

  const [inspector, setInspector] = useState<{ isOpen: boolean, title: string, data: any }>({
    isOpen: false,
    title: '',
    data: null
  });

  const [systemPaused, setSystemPaused] = useState(false);
  const [halting, setHalting] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('zypher_token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);

    const socket = SocketService.getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit('join_protocol', 'ADMIN_ZONE');
    };

    const onSystemStats = (data: any) => {
      setSystemHealth({ connections: data.activeConnections, load: data.loadIndex });
    };

    socket.on('connect', onConnect);
    socket.on('system_stats', onSystemStats);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('system_stats', onSystemStats);
    };
  }, [router]);

  useEffect(() => {
    const loadAdminData = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [usersRes, statsRes, rulesRes, opsRes, depositsRes, auditLogsRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/users`, { headers }),
          fetch(`${API_BASE}/api/admin/stats`, { headers }),
          fetch(`${API_BASE}/api/admin/rules`, { headers }),
          fetch(`${API_BASE}/api/admin/proofs`, { headers }),
          fetch(`${API_BASE}/api/admin/deposits`, { headers }),
          fetch(`${API_BASE}/api/admin/audit-logs`, { headers })
        ]);

        if (!usersRes.ok || !statsRes.ok) throw new Error('Elevated permissions required.');

        setUsers(await usersRes.json());
        setStats(await statsRes.json());
        setRules(await rulesRes.json().catch(() => []));
        setOps(await opsRes.json().catch(() => []));
        setDeposits(await depositsRes.json().catch(() => []));

        const logs = await auditLogsRes.json().catch(() => []);
        const formattedLogs = logs.map((l: any) => {
          let color = 'text-slate-500';
          if (l.category === 'SECURITY') color = 'text-emerald-500';
          else if (l.category === 'SYSTEM') color = 'text-neutral-500';
          else if (l.category === 'GOVERNANCE') color = 'text-neutral-500';
          else if (l.category === 'USER') color = 'text-amber-500';

          return {
            t: new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            m: l.details || l.action,
            c: color
          };
        });
        setTelemetry(formattedLogs);
      } catch (err: any) {
        console.error(err);
        setTimeout(() => { router.push('/dashboard'); }, 2000);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();

    const loadSettings = async () => {
      if (!token) return;
      try {
        const settings = await fetchSystemSettings(token);
        setSystemPaused(settings.protocolHalt);
      } catch (err) {
        console.error('Failed to sync system status');
      }
    };
    loadSettings();

    if (router.query.tab) {
      setActiveTab(router.query.tab as any);
    }
  }, [token, router.query.tab]);

  const addTelemetryLog = (m: string, c: string = 'text-slate-500 dark:text-slate-400') => {
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTelemetry(prev => [{ t, m, c }, ...prev].slice(0, 50));
  };

  const handleUpdateUserStatus = async (userId: string, currentStatus: string) => {
    if (!token || !wallet.address) return;
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    try {
      const auth = await signActionRequest(wallet.address, 'UPDATE_USER_STATUS', `UserID: ${userId}\nNewStatus: ${newStatus}`);

      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, ...auth })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus as any } : u));
        addTelemetryLog(`GOV: Entity_${userId.slice(-6)} state changed to ${newStatus}`, 'text-amber-600 dark:text-amber-400');
        playExecution();
      } else {
        playError();
      }
    } catch (err) {
      playError();
    }
  };

  const handleApproveDeposit = async (depositId: string) => {
    if (!token || !wallet.address) return;
    try {
      const auth = await signActionRequest(wallet.address, 'APPROVE_DEPOSIT', `DepositID: ${depositId}`);

      const res = await fetch(`${API_BASE}/api/admin/deposits/${depositId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...auth })
      });
      if (res.ok) {
        setDeposits(prev => prev.map(d => d._id === depositId ? { ...d, status: 'confirmed' } : d));
        addTelemetryLog(`TREASURY: Deposit_${depositId.slice(-6)} verified and escrow funded.`, 'text-neutral-600 dark:text-neutral-400');
        playSuccess();
      } else {
        playError();
      }
    } catch (err) {
      playError();
    }
  };

  const handleToggleProtocolHalt = async () => {
    if (!token || !wallet.address || halting) return;
    const newState = !systemPaused;
    const statusMsg = newState ? 'CRITICAL_PROTOCOL_HALT' : 'RESUME_PROTOCOL_STATE';

    if (newState && !confirm('WARNING: This will freeze all protocol operations immediately. Proceed with signature?')) return;

    if (newState) playEmergency();

    setHalting(true);
    try {
      addTelemetryLog(`GOV: Preparing ${statusMsg}...`, 'text-neutral-600 dark:text-neutral-400');
      const auth = await signActionRequest(wallet.address, 'TOGGLE_PROTOCOL_HALT', `Status: ${statusMsg}`);

      const res = await toggleProtocolHalt(token, newState, auth);
      setSystemPaused(res.protocolHalt);
      addTelemetryLog(`GOV: Protocol state updated to ${newState ? 'HALTED' : 'OPERATIONAL'}`, newState ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-400');
      if (!newState) playExecution();
    } catch (err: any) {
      addTelemetryLog(`ERR: Protocol override failed - ${err.message}`, 'text-red-600');
      playError();
    } finally {
      setHalting(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, currentRole: string) => {
    if (!token || !wallet.address) return;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const auth = await signActionRequest(wallet.address, 'UPDATE_USER_ROLE', `UserID: ${userId}\nNewRole: ${newRole}`);

      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole, ...auth })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole as any } : u));
        addTelemetryLog(`SEC: Entity_${userId.slice(-6)} role updated to ${newRole}`, 'text-neutral-600 dark:text-neutral-400');
        playExecution();
      } else {
        playError();
      }
    } catch (err) {
      playError();
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (!token || !wallet.address) return;
    try {
      addTelemetryLog(`SEC: Initiating KYC verification for Entity_${userId.slice(-6)}...`, 'text-neutral-600 dark:text-neutral-400');
      const auth = await signActionRequest(wallet.address, 'APPROVE_USER', `UserID: ${userId}\nAction: VERIFY_KYC`);

      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...auth })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, approved: true, kycStatus: 'verified' } : u));
        addTelemetryLog(`SEC: Entity_${userId.slice(-6)} approved and identity verified on-chain.`, 'text-emerald-600 dark:text-emerald-400');
        playSuccess();
      } else {
        playError();
      }
    } catch (err) {
      playError();
    }
  };

  const handlePurgeRule = async (ruleId: string) => {
    if (!token || !wallet.address || !confirm('Permanently decommission this logic registry?')) return;
    try {
      const auth = await signActionRequest(wallet.address, 'DELETE_RULE', `RuleID: ${ruleId}`);

      const res = await fetch(`${API_BASE}/api/admin/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...auth })
      });
      if (res.ok) {
        setRules(prev => prev.filter(r => r._id !== ruleId));
        addTelemetryLog(`SEC: Registry_${ruleId.slice(-6)} purged from protocol.`, 'text-red-600 dark:text-red-400');
        playExecution();
      } else {
        playError();
      }
    } catch (err) {
      playError();
    }
  };

  const openInspector = (title: string, data: any) => {
    setInspector({ isOpen: true, title, data });
  };

  if (loading) return <Preloader />;

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'security', label: 'Security' },
    { id: 'entities', label: 'Entities' },
    { id: 'governance', label: 'Governance' },
    { id: 'cluster', label: 'Cluster' },
    { id: 'treasury', label: 'Treasury' },
  ];

  return (
    <AuthGuard requireAdmin allowedAccountTypes={['DAOAdmin']}>
      <div className="min-h-screen bg-white dark:bg-zypher-bg text-slate-900 dark:text-slate-200 transition-colors duration-300">
        <Navbar />

        <PayloadModal
          isOpen={inspector.isOpen}
          onClose={() => setInspector({ ...inspector, isOpen: false })}
          title={inspector.title}
          data={inspector.data}
        />

        <main className="container mx-auto px-4 md:px-6 py-10 max-w-[1440px]">

          {/* ---------------------------------------------------------------
           * PAGE HEADER — status strip, title, tab rail, and health readout
           * all share one vertical rhythm (mb-10 between blocks, gap-3
           * within a block) instead of the mixed mb-4/mb-8/gap-8 before.
           * ------------------------------------------------------------- */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-red-500/20">
                Admin Override Active
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Protocol Sovereignty Enabled
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sovereign Command
              </h1>

              <div className={`flex items-center divide-x divide-slate-200 dark:divide-white/10 ${T.card} px-6 py-3.5 self-start lg:self-auto`}>
                <div className="text-center font-mono px-6 first:pl-0 last:pr-0">
                  <div className="text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Health Index</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">OPTIMAL_1.0</div>
                </div>
                <div className="text-center font-mono px-6 first:pl-0 last:pr-0">
                  <div className="text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Verification Load</div>
                  <div className="text-slate-900 dark:text-white font-bold text-sm">{stats?.proofs ?? 0} OPS</div>
                </div>
                <div className="text-center font-mono px-6 first:pl-0 last:pr-0">
                  <div className="text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Live Connections</div>
                  <div className="text-slate-900 dark:text-white font-bold text-sm">{systemHealth.connections}</div>
                </div>
              </div>
            </div>

            <nav className="flex gap-1.5 overflow-x-auto mt-7 pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  onMouseEnter={playHover}
                  onClick={() => { playClick(); setActiveTab(id); }}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ${activeTab === id
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </header>

          {/* -----------------------------------------------------------
           * BODY — one consistent flex column layout
           * --------------------------------------------------------- */}
          <div className={`flex flex-col ${T.gap}`}>
            <div className={`flex flex-col ${T.gap}`}>
              <AnimatePresence mode="wait">
                {activeTab === 'analytics' && (
                  <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className={`flex flex-col ${T.gap}`}>

                    <div className={`grid grid-cols-1 md:grid-cols-5 ${T.gap}`}>
                      <div className={`${T.card} ${T.cardPad} md:col-span-3`}>
                        <h3 className={`${T.eyebrow} mb-5`}>Cross-Chain Network TPS</h3>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.tpsData || []}>
                              <defs>
                                <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                              <Area type="monotone" dataKey="tps" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorTps)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className={`${T.card} ${T.cardPad} md:col-span-2`}>
                        <h3 className={`${T.eyebrow} mb-5`}>ZK-Proof Verification Volume</h3>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.volumeByNetwork || []} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis type="number" hide />
                              <YAxis dataKey="network" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={60} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                              <Bar dataKey="volume" fill="#ffffff" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className={`grid grid-cols-2 md:grid-cols-4 ${T.gap}`}>
                      <StatTile label="Active Relayer Nodes" value={stats?.nodes || '0'} color="#10b981" />
                      <StatTile label="Global TVL" value={stats?.tvl || '$0'} color="#ffffff" />
                      <StatTile label="Avg Finality Time" value={stats?.finality || '0s'} color="#f59e0b" />
                      <StatTile label="Protocol Revenue (24h)" value={stats?.revenue || '$0'} color="#a3a3a3" />
                    </div>

                    <div className={`grid grid-cols-1 lg:grid-cols-2 ${T.gap}`}>
                      <Panel title="Recent Transactions" meta={<span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{ops.length} total</span>}>
                        <div className="divide-y divide-slate-200 dark:divide-white/5">
                          {ops.slice(0, 5).map(op => (
                            <div key={op._id} className={`${T.rowPad} flex items-center justify-between gap-4 group hover:bg-neutral-600/[0.02] transition-colors`}>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                  <StatusDot color={op.status === 'verified' ? '#10b981' : op.status === 'failed' ? '#dc2626' : '#ffffff'} />
                                  <span className="font-mono tracking-tight">OP_{op._id.slice(-8)}</span>
                                </div>
                                <div className="text-[9px] text-slate-500 mt-2 uppercase tracking-[0.15em] font-bold opacity-60 flex flex-wrap gap-x-4 gap-y-1">
                                  <span>Rule: {op.ruleId?.name || 'GENERIC_INFRA'}</span>
                                  <span>Status: {op.status}</span>
                                  {op.txHash && <span className="text-neutral-600 dark:text-neutral-400">TX: {op.txHash.slice(0, 16)}...</span>}
                                </div>
                              </div>
                              <button onClick={() => openInspector('Operation Trace', op)} className={`${T.btn} bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white flex-shrink-0`}>
                                Inspect
                              </button>
                            </div>
                          ))}
                          {ops.length === 0 && <div className="px-7 py-10 text-center text-xs text-slate-400 italic">No transactions recorded yet.</div>}
                        </div>
                      </Panel>

                      <section className={`${T.card} overflow-hidden flex flex-col h-full min-h-[400px]`}>
                        <div className={T.sectionHead}>
                          <h3 className={T.eyebrow}>Protocol Audit Logs</h3>
                        </div>
                        <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto bg-slate-100/50 dark:bg-black/20 font-mono text-[10px]" style={{ scrollbarWidth: 'none' }}>
                          {telemetry.map((log, i) => (
                            <div key={i} className="flex gap-3 items-start border-l-2 border-slate-200 dark:border-white/5 pl-3">
                              <span className="opacity-40 flex-shrink-0 font-bold">{log.t}</span>
                              <span className={`${log.c} font-bold leading-relaxed break-all`}>{log.m}</span>
                            </div>
                          ))}
                          {telemetry.length === 0 && <div className="opacity-30 italic text-slate-500">Awaiting stream...</div>}
                        </div>
                        <div className="px-6 py-4 bg-red-600/5 text-center border-t border-slate-200 dark:border-white/5 font-mono text-[8px] font-bold text-red-600 dark:text-red-500 tracking-wider">
                          IMMUTABLE_LOG_STREAM: ENABLED
                        </div>
                      </section>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className={`flex flex-col ${T.gap}`}>
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${T.gap}`}>
                      <StatTile label="Network Wallets" value={stats?.users || 0} color="#ffffff" sparkline />
                      <StatTile label="Global Registries" value={stats?.rules || 0} color="#a3a3a3" sparkline />
                      <StatTile label="Active Verifications" value={stats?.proofs || 0} color="#ec4899" sparkline />
                      <StatTile label="Protocol Finality" value={stats?.successRate || '0%'} color="#10b981" sparkline />
                    </div>

                    <div className={`${T.card} ${T.cardPad}`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)] animate-pulse" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">Emergency Protocol Override</h3>
                      </div>

                      <div className="p-5 bg-white dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-6">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs mb-1.5">Proofs Verification Halt</div>
                          <p className="text-[11px] text-slate-500 font-medium max-w-sm leading-relaxed">Universal kill-switch to immediately freeze all on-chain cryptographic state attestations.</p>
                        </div>
                        <button onClick={handleToggleProtocolHalt} disabled={halting} className={`w-16 h-8 rounded-full transition-all relative flex-shrink-0 ${halting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${systemPaused ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                          <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all shadow-md transform ${systemPaused ? 'translate-x-8' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'entities' && (
                  <motion.div key="entities" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                    <Panel title="Wallet Ecosystem" meta={<span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full">{users.length} attesters</span>}>
                      <div className="divide-y divide-slate-200 dark:divide-white/5">
                        {users.map(u => (
                          <div key={u._id} className={`${T.rowPad} flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-red-500/[0.02] transition-colors`}>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <StatusDot color={u.status === 'banned' ? '#dc2626' : !u.approved ? '#f59e0b' : '#ffffff'} />
                                <span className="font-mono tracking-tight truncate">{u.address.slice(0, 28)}...</span>
                              </div>
                              <div className="text-[9px] text-slate-500 mt-2 uppercase tracking-[0.15em] font-bold opacity-60 flex flex-wrap gap-x-4 gap-y-1">
                                <span>Role: {u.role}</span>
                                <span>Status: {u.status}</span>
                                <span className={u.approved ? 'text-neutral-600 dark:text-neutral-400' : 'text-amber-600 dark:text-amber-500'}>KYC: {u.kycStatus || 'unverified'}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-shrink-0">
                              {!u.approved && (
                                <button
                                  onClick={() => handleApproveUser(u._id)}
                                  className={`${T.btn} bg-neutral-600/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20 hover:bg-neutral-600 hover:text-white`}
                                >
                                  Verify KYC
                                </button>
                              )}
                              <button onClick={() => handleUpdateUserRole(u._id, u.role)} className={`${T.btn} ${u.role === 'admin' ? 'bg-neutral-600/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/5 hover:border-neutral-500/30'}`}>
                                {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                              </button>
                              <button onClick={() => handleUpdateUserStatus(u._id, u.status)} className={`${T.btn} ${u.status === 'banned' ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white'}`}>
                                {u.status === 'banned' ? 'Revoke Ban' : 'Restrict ID'}
                              </button>
                            </div>
                          </div>
                        ))}
                        {users.length === 0 && <div className="px-7 py-10 text-center text-xs text-slate-400 italic">No wallets registered yet.</div>}
                      </div>
                    </Panel>
                  </motion.div>
                )}

                {activeTab === 'governance' && (
                  <motion.div key="governance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <Panel title="Logic Repositories">
                      <div className="divide-y divide-slate-200 dark:divide-white/5">
                        {rules.map(r => (
                          <div key={r._id} className={`${T.rowPad} flex items-center justify-between gap-4 group hover:bg-neutral-600/[0.02] transition-colors`}>
                            <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3 min-w-0">
                              <span className="truncate">{r.name}</span>
                              <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded uppercase tracking-tight opacity-60 flex-shrink-0">{r.status}</span>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => openInspector('Rule Detailed View', r)} className={`${T.btn} bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white`}>Audit</button>
                              <button onClick={() => handlePurgeRule(r._id)} className={`${T.btn} bg-red-600/10 text-red-600 dark:text-red-500 hover:bg-red-600 hover:text-white`}>Purge</button>
                            </div>
                          </div>
                        ))}
                        {rules.length === 0 && <div className="px-7 py-10 text-center text-xs text-slate-400 italic">No logic registries deployed.</div>}
                      </div>
                    </Panel>
                  </motion.div>
                )}

                {activeTab === 'treasury' && (
                  <motion.div key="treasury" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <Panel title="Protocol Treasury">
                      <div className="divide-y divide-slate-200 dark:divide-white/5">
                        {deposits.map(d => (
                          <div key={d._id} className={`${T.rowPad} flex items-center justify-between gap-4 group hover:bg-neutral-600/[0.02] transition-colors`}>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                <span>{d.depositAmount} {d.currency}</span>
                                <span className={`text-[8px] font-bold px-2 py-0.5 border rounded uppercase tracking-tight flex-shrink-0 ${d.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>{d.status}</span>
                              </div>
                              <div className="text-[9px] text-slate-500 dark:text-slate-600 mt-1.5 uppercase font-mono truncate">TX: {d.txHash}</div>
                            </div>
                            {d.status === 'pending' && (
                              <button onClick={() => handleApproveDeposit(d._id)} className={`${T.btn} bg-neutral-600/10 text-neutral-600 dark:text-neutral-500 hover:bg-neutral-600 hover:text-white flex-shrink-0`}>
                                Approve & Fund
                              </button>
                            )}
                          </div>
                        ))}
                        {deposits.length === 0 && <div className="px-7 py-10 text-center text-xs text-slate-400 italic">No deposits in escrow.</div>}
                      </div>
                    </Panel>
                  </motion.div>
                )}

                {activeTab === 'cluster' && (
                  <motion.div key="cluster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <Panel title="Cryptographic Operations">
                      <div className="divide-y divide-slate-200 dark:divide-white/5">
                        {ops.map(op => (
                          <div key={op._id} className={`${T.rowPad} flex items-center justify-between gap-4 group hover:bg-neutral-600/[0.01] transition-colors`}>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <StatusDot color={op.status === 'verified' ? '#10b981' : op.status === 'failed' ? '#dc2626' : '#ffffff'} />
                                <span className="font-mono tracking-tight">OP_{op._id.slice(-8)}</span>
                              </div>
                              <div className="text-[9px] text-slate-500 mt-2 uppercase tracking-[0.15em] font-bold opacity-60 flex flex-wrap gap-x-4 gap-y-1">
                                <span>Rule: {op.ruleId?.name || 'GENERIC_INFRA'}</span>
                                <span>Status: {op.status}</span>
                                {op.txHash && <span className="text-neutral-600 dark:text-neutral-400">TX: {op.txHash.slice(0, 16)}...</span>}
                              </div>
                            </div>
                            <button onClick={() => openInspector('Operation Trace', op)} className={`${T.btn} bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white flex-shrink-0`}>
                              Inspect Proof
                            </button>
                          </div>
                        ))}
                        {ops.length === 0 && <div className="px-7 py-10 text-center text-xs text-slate-400 italic">No cryptographic operations logged.</div>}
                      </div>
                    </Panel>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}