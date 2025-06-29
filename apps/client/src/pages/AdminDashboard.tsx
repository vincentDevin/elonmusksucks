// TODO: Add route in your router (e.g., App.tsx):
// <Route path='/admin' element={<AdminDashboard />} />

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface Prediction {
  id: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

const fetchUsers = async (): Promise<User[]> => {
  // TODO: implement API call to GET /admin/users
  return [];
};

const fetchPendingPredictions = async (): Promise<Prediction[]> => {
  // TODO: implement API call to GET /admin/predictions/pending
  return [];
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers().then(setUsers);
      fetchPendingPredictions().then(setPredictions);
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return <div>Access denied. Admins only.</div>;
  }

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold mb-4'>Admin Dashboard</h1>

      <section>
        <h2 className='text-xl font-semibold'>User Management</h2>
        {/* TODO: display user list, search, ban/unban actions */}
      </section>

      <section className='mt-6'>
        <h2 className='text-xl font-semibold'>Prediction Approval Queue</h2>
        {/* TODO: display pending predictions, approve/reject actions */}
      </section>

      <section className='mt-6'>
        <h2 className='text-xl font-semibold'>Content Moderation</h2>
        {/* TODO: display flagged content, silent mode, manual overrides */}
      </section>

      <section className='mt-6'>
        <h2 className='text-xl font-semibold'>Event Overrides</h2>
        {/* TODO: manual event resolution, create/edit predictions */}
      </section>

      <section className='mt-6'>
        <h2 className='text-xl font-semibold'>Settings</h2>
        {/* TODO: site-wide settings, roles management, feature toggles */}
      </section>
    </div>
  );
};

export default AdminDashboard;
