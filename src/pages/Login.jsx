import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-bread-100 via-bread-50 to-crust-50">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-6 w-20 h-20 bg-bread-300/40 rounded-full blur-2xl"></div>
      <div className="absolute top-32 right-8 w-16 h-16 bg-crust-300/30 rounded-full blur-xl"></div>
      <div className="absolute bottom-40 left-10 w-24 h-24 bg-bread-400/20 rounded-full blur-2xl"></div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
        {/* Logo & Title */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-bread-400 to-bread-600 rounded-3xl shadow-bread-lg flex items-center justify-center transform -rotate-6">
            <span className="text-5xl" role="img" aria-label="pane">🍞</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-bread-800">
            Consegne Pane
          </h1>
          <p className="text-bread-600 mt-2 font-medium">
            Gestisci le tue consegne con facilità
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up stagger-2">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-bread text-center font-medium animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              Indirizzo Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-bread-400" size={22} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="autista@panificio.it"
                className="input-field pl-12"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-bread-400" size={22} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-12"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-8"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Accesso in corso...
              </>
            ) : (
              <>
                <LogIn size={24} />
                Accedi
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-bread-500 text-sm mt-8 animate-fade-in stagger-3">
          Contatta l'amministratore se hai bisogno di accesso
        </p>
      </div>
    </div>
  );
};

export default Login;

