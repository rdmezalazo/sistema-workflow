import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, LogIn, Eye, EyeOff, Building2 } from 'lucide-react';
import { z } from 'zod';
import logoCA from '@/assets/logo-ca-full.png';
import { supabase } from '@/integrations/supabase/client';
import { clearStoredActiveSedeId, getStoredActiveSedeId, setStoredActiveSedeId } from '@/lib/activeSede';
import { shouldAutoRedirectAuthenticatedUser, verifySelectedSedeAccess } from '@/lib/authFlow';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const Auth = () => {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sede selection
  const [sedes, setSedes] = useState<Array<{ id: string; nombre: string; codigo: string }>>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');

  useEffect(() => {
    if (shouldAutoRedirectAuthenticatedUser({ user, authLoading, loginInProgress: loading })) {
      navigate('/');
    }
  }, [user, authLoading, loading, navigate]);

  useEffect(() => {
    const loadSedes = async () => {
      const { data } = await supabase
        .from('sedes' as any)
        .select('id, nombre, codigo, activa, orden')
        .eq('activa', true)
        .order('orden', { ascending: true });
      if (data) setSedes(data as any);
    };
    loadSedes();
    // Restore last selection
    const stored = getStoredActiveSedeId();
    if (stored) setSelectedSedeId(stored);
  }, []);

  const persistSedeSelection = () => {
    setStoredActiveSedeId(selectedSedeId || null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    if (!selectedSedeId) {
      toast.error('Selecciona una sede');
      return;
    }

    // Persist sede selection BEFORE signIn so SedeContext picks the right one
    // when the auth state change triggers navigation to "/".
    setStoredActiveSedeId(selectedSedeId);

    setLoading(true);
    const { error, user: signedInUser } = await signIn(loginEmail, loginPassword);

    if (error) {
      setLoading(false);
      clearStoredActiveSedeId();
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Credenciales inválidas');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Validate sede assignment
    const userId = signedInUser?.id;
    if (!userId) {
      setLoading(false);
      toast.error('No se pudo verificar la sesión');
      return;
    }

    const hasSedeAccess = await verifySelectedSedeAccess(supabase, userId, selectedSedeId);

    if (!hasSedeAccess) {
      await supabase.auth.signOut();
      setLoading(false);
      clearStoredActiveSedeId();
      toast.error('No tienes acceso a la sede seleccionada');
      return;
    }

    persistSedeSelection();
    setLoading(false);
    toast.success('Sesión iniciada correctamente');
    navigate('/');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
      fullName: signupFullName,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupFullName);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Cuenta creada. Por favor verifica tu email para continuar.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, hsl(220 20% 97%) 0%, hsl(30 30% 85%) 50%, hsl(30 40% 75%) 100%)',
        }}
      />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-secondary/20 to-transparent blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-3xl -z-10" />

      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2 pt-8">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={logoCA} 
                alt="C&A Contadores" 
                className="h-24 w-auto object-contain"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground">Bienvenido</h1>
            <p className="text-muted-foreground text-sm">Sistema de Gestión Contable</p>
          </CardHeader>

          <Tabs defaultValue="login" className="w-full">
            <CardContent className="pt-4 pb-6">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/60">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      Correo electrónico
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-11 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-11 pr-10 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-sede" className="text-sm font-medium">
                      Sede
                    </Label>
                    <Select value={selectedSedeId} onValueChange={setSelectedSedeId}>
                      <SelectTrigger id="login-sede" className="h-11 border-border/60">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Selecciona una sede" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {sedes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label 
                      htmlFor="remember" 
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Recordarme
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25" 
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    Iniciar sesión
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium">
                      Nombre Completo
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                      className="h-11 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">
                      Correo electrónico
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="h-11 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">
                      Contraseña
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="h-11 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-sm font-medium">
                      Confirmar Contraseña
                    </Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      className="h-11 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Crear Cuenta
                  </Button>
                </form>
              </TabsContent>

              {/* Footer */}
              <p className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t border-border/50">
                © 2024 C&A Contadores. Todos los derechos reservados.
              </p>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
