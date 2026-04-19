import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // If the user is already authenticated (e.g. they hit refresh), send them back to their dashboard
    if (!loading && user) {
      if (user.role === 'DONOR') navigate('/donor');
      else if (user.role === 'RECIPIENT') navigate('/recipient');
    }
  }, [user, loading, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'DONOR',
    organizationName: '',
  });

  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    let result;

    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register(formData);
    }

    if (result.success) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user.role === 'DONOR') navigate('/donor');
      else if (user.role === 'RECIPIENT') navigate('/recipient');
    } else {
      setError(result.message);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="page-wrapper flex-center" style={{ minHeight: '100vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="heading-lg text-gradient" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          ResQ Plate
        </h2>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {isLogin ? 'Welcome back to the rescue network' : 'Join the food rescue network'}
        </p>

        {error && (
          <div className="btn-danger" style={{ marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <>
              <input type="text" name="name" placeholder="Full Name" required onChange={handleChange} />
              <input type="text" name="organizationName" placeholder="Organization name (optional)" onChange={handleChange} />
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="DONOR">Donor (Give surplus food)</option>
                <option value="RECIPIENT">Recipient (Claim food)</option>
              </select>
            </>
          )}

          <input type="email" name="email" placeholder="Email Address" required onChange={handleChange} />
          <input type="password" name="password" placeholder="Password" required onChange={handleChange} />

          <button className="btn-primary" type="submit" style={{ marginTop: '1rem' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <span className="text-muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
            {isLogin ? 'Register' : 'Login'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
