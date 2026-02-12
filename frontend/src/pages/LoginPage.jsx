import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { login as apiLogin } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      loginUser(res.token, res.user);
      toast.success('Welcome back');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
      {/* Subtle gradient wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(900px circle at 10% 0%, rgba(13,95,104,0.08), transparent 55%), radial-gradient(700px circle at 85% 10%, rgba(70,152,157,0.06), transparent 55%)',
        }}
      />

      <Card className="w-full max-w-[400px] shadow-[var(--shadow-md)] border-border/50 relative z-10" data-testid="login-card">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(187,79%,23%)] flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold tracking-[-0.01em]">Welcome back</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sign in to Clarity Protocol Manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@clarity.com"
                data-testid="login-email-input"
                required
                autoFocus
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                data-testid="login-password-input"
                required
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              Demo: admin@clarity.com / admin123 or hc@clarity.com / hc123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
