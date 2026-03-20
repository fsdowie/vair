import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUsers();
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchUsers = async () => {
    try {
      // Call Edge Function to get all users
      const { data, error } = await supabase.functions.invoke('list-users');

      if (error) {
        throw error;
      }

      if (data && data.users) {
        setUsers(data.users);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Admin Login</h1>
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              name="email"
              type="email"
              placeholder="Admin Email"
              style={styles.input}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              style={styles.input}
              required
            />
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.button}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>VAIR Admin - User Accounts</h1>
          <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>

        <div style={styles.stats}>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{users.length}</div>
            <div style={styles.statLabel}>Total Users</div>
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Created At</th>
              <th style={styles.th}>Last Sign In</th>
              <th style={styles.th}>Confirmed</th>
              <th style={styles.th}>User ID</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      color: user.email_confirmed_at ? '#4caf50' : '#ff9800',
                      fontWeight: 'bold'
                    }}>
                      {user.email_confirmed_at ? '✓' : '✗'}
                    </span>
                  </td>
                  <td style={styles.td} title={user.id}>{user.id.substring(0, 8)}...</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1628, #0d2137)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    background: 'rgba(13,33,55,0.8)',
    borderRadius: 16,
    padding: 40,
    maxWidth: 900,
    width: '100%',
    border: '1px solid rgba(76,175,80,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
    margin: 0,
  },
  logoutBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(76,175,80,0.3)',
    background: 'rgba(76,175,80,0.1)',
    color: '#4caf50',
    cursor: 'pointer',
    fontSize: 14,
  },
  stats: {
    display: 'flex',
    gap: 20,
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    background: 'rgba(76,175,80,0.1)',
    padding: 20,
    borderRadius: 12,
    border: '1px solid rgba(76,175,80,0.2)',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(232,245,233,0.6)',
    marginTop: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 20,
  },
  th: {
    textAlign: 'left',
    padding: 12,
    borderBottom: '2px solid rgba(76,175,80,0.3)',
    color: '#4caf50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tr: {
    borderBottom: '1px solid rgba(76,175,80,0.1)',
  },
  td: {
    padding: 12,
    color: '#e8f5e9',
    fontSize: 14,
  },
  note: {
    padding: 16,
    background: 'rgba(255,193,7,0.1)',
    border: '1px solid rgba(255,193,7,0.3)',
    borderRadius: 8,
    color: '#ffc107',
    fontSize: 13,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid rgba(76,175,80,0.3)',
    background: 'rgba(10,30,15,0.5)',
    color: '#e8f5e9',
    fontSize: 16,
    outline: 'none',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
    color: '#e8f5e9',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    padding: 12,
    borderRadius: 8,
    background: 'rgba(211,47,47,0.1)',
    border: '1px solid rgba(211,47,47,0.3)',
    color: '#ef5350',
    fontSize: 14,
  },
};
