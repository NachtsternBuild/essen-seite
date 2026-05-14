import { useState, type FormEvent } from 'react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export function LoginForm({ onLogin, isLoading }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email && password) onLogin(email, password);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🍽</div>
          <h1 className="login-title">Essensplaner</h1>
          <p className="login-subtitle">Bitte melde dich an</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              className="form-input"
              type="email"
              autoComplete="email"
              placeholder="name@firma.de"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Passwort</label>
            <input
              id="password"
              className="form-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            className="btn btn--primary btn--full"
            type="submit"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? <span className="spinner" /> : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
