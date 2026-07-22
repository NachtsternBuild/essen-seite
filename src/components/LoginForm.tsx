import { useState, type FormEvent } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { loginSchema } from '../lib/validation';
import { Spinner } from './shared/Spinner';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export function LoginForm({ onLogin, isLoading }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errs[String(issue.path[0])] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    await onLogin(email, password);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" aria-hidden="true"><UtensilsCrossed size={36} strokeWidth={1.75} /></div>
          <h1 className="login-title">Essensplaner</h1>
          <p className="login-subtitle">Bitte melde dich an</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              E-Mail
            </label>
            <input
              id="email"
              className={`form-input${errors.email ? ' form-input--error' : ''}`}
              type="email"
              autoComplete="email"
              placeholder="name@firma.de"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <span id="email-error" className="form-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              className={`form-input${errors.password ? ' form-input--error' : ''}`}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
              aria-describedby={errors.password ? 'pw-error' : undefined}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <span id="pw-error" className="form-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          <button
            className="btn btn--primary btn--full"
            type="submit"
            disabled={isLoading || !email || !password}
            aria-busy={isLoading}
          >
            {isLoading ? <Spinner size="sm" /> : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
