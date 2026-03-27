'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Users, FileImage, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user, token]);

  const fetchAdminData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
      const [userRes, scanRes] = await Promise.all([
        axios.get(`${apiUrl}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/api/admin/scans`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(userRes.data.users);
      setScans(scanRes.data.scans);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
      await axios.delete(`${apiUrl}/api/admin/user/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      alert('Failed to delete user. They might be the current admin.');
    }
  };

  const deleteScan = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scan?')) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
      await axios.delete(`${apiUrl}/api/admin/scan/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setScans(scans.filter((s) => s.id !== id));
    } catch (err) {
      alert('Failed to delete scan.');
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
    <div className="relative z-[2] min-h-screen page-main-container">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="mb-10">
          <h1 className="font-playfair text-4xl font-bold mb-3">Admin Dashboard</h1>
          <p className="text-[var(--muted)]">Manage users and platform data globally.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--glass)] flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[rgba(255,140,0,0.1)] text-[var(--orange)] border border-[rgba(255,140,0,0.2)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-[var(--muted)] mb-1">Total Users</div>
              <div className="text-3xl font-mono font-bold">{users.length}</div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--glass)] flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[rgba(255,140,0,0.1)] text-[var(--orange)] border border-[rgba(255,140,0,0.2)]">
              <FileImage className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-[var(--muted)] mb-1">Total Scans</div>
              <div className="text-3xl font-mono font-bold">{scans.length}</div>
            </div>
          </motion.div>
        </div>

        {loading ? (
          <div className="text-center text-[var(--muted)] py-10">Loading data...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Users Table */}
            <div className="bg-[var(--bg2)] rounded-3xl border border-[var(--border)] overflow-hidden flex flex-col h-[500px]">
              <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--glass)]">
                <h3 className="font-playfair text-xl font-bold">Registered Users</h3>
              </div>
              <div className="flex-1 overflow-y-auto w-full">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] text-[var(--muted)] z-10">
                    <tr>
                      <th className="px-5 py-4 font-medium">Name / Email</th>
                      <th className="px-5 py-4 font-medium">Role</th>
                      <th className="px-5 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-medium text-cream">{u.name}</div>
                          <div className="text-xs text-[var(--muted)]">{u.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-mono ${u.role === 'admin' ? 'bg-[rgba(255,140,0,0.2)] text-[var(--orange)]' : 'bg-[var(--border)] text-gray-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button 
                            type="button"
                            title="Delete user"
                            aria-label="Delete user"
                            onClick={() => deleteUser(u.id)} 
                            disabled={u.role === 'admin'} 
                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4 ml-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-[var(--muted)] py-6">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scans Table */}
            <div className="bg-[var(--bg2)] rounded-3xl border border-[var(--border)] overflow-hidden flex flex-col h-[500px]">
              <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--glass)]">
                <h3 className="font-playfair text-xl font-bold">All Platform Scans</h3>
              </div>
              <div className="flex-1 overflow-y-auto w-full">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] text-[var(--muted)] z-10">
                    <tr>
                      <th className="px-5 py-4 font-medium">Prediction</th>
                      <th className="px-5 py-4 font-medium">User ID</th>
                      <th className="px-5 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-medium text-cream">{s.disease}</div>
                          <div className="text-xs text-[var(--muted)]">{(s.disease_confidence * 100).toFixed(1)}% Conf</div>
                        </td>
                        <td className="px-5 py-4 font-mono text-[var(--muted)]">#{s.user_id}</td>
                        <td className="px-5 py-4 text-right">
                          <button 
                            type="button"
                            title="Delete scan"
                            aria-label="Delete scan"
                            onClick={() => deleteScan(s.id)} 
                            className="text-red-400 hover:text-red-300 transition-colors cursor-none"
                          >
                            <Trash2 className="w-4 h-4 ml-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {scans.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-[var(--muted)] py-6">No scans found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}
