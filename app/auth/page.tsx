'use client';

import { useState } from 'react';
import { User, Lock, Mail } from 'lucide-react';
import { useAppContext } from '@/context/Context';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import image1 from '../../public/images/image1.png';
import image2 from '../../public/images/image2.png';
interface LoginErrors {
  email: string;
  password: string;
}

interface RegisterErrors {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    passwordConfirmation: '' 
  });
  
  // États pour les erreurs
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({ email: '', password: '' });
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({ 
    name: '', 
    email: '', 
    password: '', 
    passwordConfirmation: '' 
  });

  const { login,user, register, isLoading } = useAppContext();
  const router = useRouter();

const switchToSignUp = () => {
  setIsSignUp(true);
  setLoginErrors({ email: '', password: '' });
  setRegisterErrors({ name: '', email: '', password: '', passwordConfirmation: '' });
};

const switchToSignIn = () => {
  setIsSignUp(false);
  setLoginErrors({ email: '', password: '' });
  setRegisterErrors({ name: '', email: '', password: '', passwordConfirmation: '' });
};
  // Validation email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation login
  const validateLoginForm = (): boolean => {
    const errors: LoginErrors = { email: '', password: '' };
    let isValid = true;

    if (!loginData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(loginData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    if (!loginData.password.trim()) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (loginData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setLoginErrors(errors);
    return isValid;
  };

  // Validation register
  const validateRegisterForm = (): boolean => {
    const errors: RegisterErrors = { name: '', email: '', password: '', passwordConfirmation: '' };
    let isValid = true;

    if (!registerData.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    } else if (registerData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (!registerData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(registerData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    if (!registerData.password.trim()) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (registerData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!registerData.passwordConfirmation.trim()) {
      errors.passwordConfirmation = 'Password confirmation is required';
      isValid = false;
    } else if (registerData.password !== registerData.passwordConfirmation) {
      errors.passwordConfirmation = 'Passwords do not match';
      isValid = false;
    }

    setRegisterErrors(errors);
    return isValid;
  };

  // Gestion des changements login
  const handleLoginChange = (field: keyof typeof loginData, value: string) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur quand l'utilisateur tape
    if (loginErrors[field]) {
      setLoginErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Gestion des changements register
  const handleRegisterChange = (field: keyof typeof registerData, value: string) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur quand l'utilisateur tape
    if (registerErrors[field]) {
      setRegisterErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

 const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  if (!validateLoginForm()) return;

  const result = await login(loginData.email, loginData.password);

  if (!result.success || !result.user) {
    toast.error(result.message ?? 'Email ou mot de passe incorrect');
    setLoginData(prev => ({ ...prev, password: '' }));
    return;
  }

  toast.success(result.message ?? 'Connexion réussie');

  // Redirection selon le rôle
  switch (result.user.role) {
    case 'super_admin':
      router.push('/superadmindashboard');
      break;
    case 'admin':
      router.push('/admindashboard');
      break;
    case 'agent':
      router.push('/agentdashboard');
      break;
    case 'client':
      router.push('/clientdashboard');
      break;
    default:
      router.push('/');
  }
};





  const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateRegisterForm()) return;

  const result = await register(registerData.name, registerData.email, registerData.password);

  if (!result.success || !result.user) {
    toast.error(result.message ?? 'Erreur lors de la création du compte');
    return;
  }

  toast.success(result.message ?? 'Compte créé avec succès');

  // Redirection selon le rôle
  switch (result.user.role) {
    case 'super_admin':
      router.push('/superadmindashboard');
      break;
    case 'admin':
      router.push('/admindashboard');
      break;
    case 'agent':
      router.push('/agentdashboard');
      break;
    case 'client':
      router.push('/clientdashboard');
      break;
    default:
      router.push('/');
  }

  // Reset form
  setRegisterData({ name: '', email: '', password: '', passwordConfirmation: '' });
  setRegisterErrors({ name: '', email: '', password: '', passwordConfirmation: '' });
  setIsSignUp(false);
};


  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-16">
      <div className={`relative w-[90%] max-w-[1100px] h-[700px] bg-white rounded-[20px] overflow-hidden shadow-lg transition-all duration-1000 ${isSignUp ? 'sign-up-mode' : ''}`}>
        
        {/* Background circle */}
        <div className={`absolute w-[2000px] h-[2000px] rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 transition-all duration-[1.8s] ease-in-out z-10 ${
          isSignUp 
            ? 'top-[-10%] right-[52%] translate-x-full -translate-y-1/2' 
            : 'top-[-10%] right-[48%] -translate-y-1/2'
        }`}></div>

        {isLoading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
              <span className="text-gray-700">
                {isSignUp ? 'Signing up...' : 'Signing in...'}
              </span>
            </div>
          </div>
        )}

        {/* Forms container */}
        <div className="absolute w-full h-full top-0 left-0">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-full flex items-center justify-center transition-all duration-1000 ease-in-out delay-300 z-20 ${
            isSignUp ? '-translate-x-full' : 'translate-x-0'
          }`}>
            
            {/* Sign In Form */}
            <div 
              className={`flex flex-col items-center justify-center px-8 w-full max-w-md transition-all duration-500 ${
                isSignUp ? 'opacity-0 z-10 pointer-events-none' : 'opacity-100 z-20 pointer-events-auto'
              }`}
            >
              <h2 className="text-4xl font-semibold text-gray-700 mb-8">Sign in</h2>
              
              <div className="w-full mb-3">
                <div className="w-full bg-gray-100 h-14 rounded-full grid grid-cols-[15%_85%] px-2 relative">
                  <Mail className="text-gray-400 text-lg self-center justify-self-center" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginData.email}
                    onChange={(e) => handleLoginChange('email', e.target.value)}
                    className="bg-transparent outline-none border-none text-lg font-semibold text-gray-700 placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-red-500 text-sm mt-1 ml-4">{loginErrors.email}</p>
                )}
              </div>

              <div className="w-full mb-3">
                <div className="w-full bg-gray-100 h-14 rounded-full grid grid-cols-[15%_85%] px-2 relative">
                  <Lock className="text-gray-400 text-lg self-center justify-self-center" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => handleLoginChange('password', e.target.value)}
                    className="bg-transparent outline-none border-none text-lg font-semibold text-gray-700 placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                {loginErrors.password && (
                  <p className="text-red-500 text-sm mt-1 ml-4">{loginErrors.password}</p>
                )}
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-36 bg-teal-500 border-none outline-none h-12 rounded-full text-white uppercase font-semibold my-4 cursor-pointer transition-colors duration-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Login'}
              </button>
             
            </div>

            {/* Sign Up Form */}
            <div 
              className={`flex flex-col items-center justify-center px-8 w-full max-w-md absolute transition-all duration-500 ${
                isSignUp ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-10 pointer-events-none'
              }`}
            >
              <h2 className="text-4xl font-semibold text-gray-700 mb-8">Sign up</h2>
              
              <div className="w-full mb-3">
                <div className="w-full bg-gray-100 h-14 rounded-full grid grid-cols-[15%_85%] px-2 relative">
                  <User className="text-gray-400 text-lg self-center justify-self-center" />
                  <input
                    type="text"
                    placeholder="Name"
                    value={registerData.name}
                    onChange={(e) => handleRegisterChange('name', e.target.value)}
                    className="bg-transparent outline-none border-none text-lg font-semibold text-gray-700 placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                {registerErrors.name && (
                  <p className="text-red-500 text-sm mt-1 ml-4">{registerErrors.name}</p>
                )}
              </div>

              <div className="w-full mb-3">
                <div className="w-full bg-gray-100 h-14 rounded-full grid grid-cols-[15%_85%] px-2 relative">
                  <Mail className="text-gray-400 text-lg self-center justify-self-center" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={registerData.email}
                    onChange={(e) => handleRegisterChange('email', e.target.value)}
                    className="bg-transparent outline-none border-none text-lg font-semibold text-gray-700 placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                {registerErrors.email && (
                  <p className="text-red-500 text-sm mt-1 ml-4">{registerErrors.email}</p>
                )}
              </div>

              <div className="w-full mb-3">
                <div className="w-full bg-gray-100 h-14 rounded-full grid grid-cols-[15%_85%] px-2 relative">
                  <Lock className="text-gray-400 text-lg self-center justify-self-center" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={registerData.password}
                    onChange={(e) => handleRegisterChange('password', e.target.value)}
                    className="bg-transparent outline-none border-none text-lg font-semibold text-gray-700 placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                {registerErrors.password && (
                  <p className="text-red-500 text-sm mt-1 ml-4">{registerErrors.password}</p>
                )}
              </div>

              <div className="w-full mb-3">
                <div className="w-full bg-gray-100 h-14 rounded-full grid grid-cols-[15%_85%] px-2 relative">
                  <Lock className="text-gray-400 text-lg self-center justify-self-center" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={registerData.passwordConfirmation}
                    onChange={(e) => handleRegisterChange('passwordConfirmation', e.target.value)}
                    className="bg-transparent outline-none border-none text-lg font-semibold text-gray-700 placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                {registerErrors.passwordConfirmation && (
                  <p className="text-red-500 text-sm mt-1 ml-4">{registerErrors.passwordConfirmation}</p>
                )}
              </div>

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-36 bg-teal-500 border-none outline-none h-12 rounded-full text-white uppercase font-semibold my-4 cursor-pointer transition-colors duration-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Sign up'}
              </button>
             
            </div>
          </div>
        </div>

        {/* Panels (unchanged) */}
        <div className="absolute h-full w-full top-0 left-0 grid grid-cols-2">
          {/* Left Panel */}
          <div className={`flex flex-col items-end justify-around text-center z-20 py-12 pr-[17%] pl-[12%] ${
            isSignUp ? 'pointer-events-none' : 'pointer-events-auto'
          }`}>
            <div className={`text-white transition-transform duration-900 delay-300 ${
              isSignUp ? '-translate-x-[800px]' : 'translate-x-0'
            }`}>
              <h3 className="font-semibold text-2xl leading-tight mb-4">New here ?</h3>
              <p className="text-sm py-3 leading-relaxed">
                Join with your account to use all the website features
                and if you don't have an account, register with your personal information to have a better user experience
              </p>
              <button
                onClick={switchToSignUp}
                disabled={isLoading}
                className="bg-transparent border-2 border-white w-32 h-10 font-semibold text-sm text-white rounded-full transition-all duration-300 hover:bg-white hover:text-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign up
              </button>
            </div>
            <div className={`w-full transition-transform duration-1100 delay-200 ${
              isSignUp ? '-translate-x-[800px]' : 'translate-x-0'
            }`}>
              <div className="w-full h-64 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                {/* decorative svg */}
               <img src={image1.src} alt="decorative"/>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className={`flex flex-col items-start justify-around text-center z-20 py-12 pl-[17%] pr-[12%] ${
            isSignUp ? 'pointer-events-auto' : 'pointer-events-none'
          }`}>
            <div className={`text-white transition-transform duration-900 delay-300 ${
              isSignUp ? 'translate-x-0' : 'translate-x-[800px]'
            }`}>
              <h3 className="font-semibold text-2xl leading-tight mb-4">One of us ?</h3>
              <p className="text-sm py-3 leading-relaxed">
                Join with your account to use all the website features
                and if you don't have an account, register with your personal information to have a better user experience.
              </p>
              <button
                onClick={switchToSignIn}
                disabled={isLoading}
                className="bg-transparent border-2 border-white w-32 h-10 font-semibold text-sm text-white rounded-full transition-all duration-300 hover:bg-white hover:text-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign in
              </button>
            </div>
            <div className={`w-full transition-transform duration-1100 delay-200 ${
              isSignUp ? 'translate-x-0' : 'translate-x-[800px]'
            }`}>
              <div className="w-full h-64 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                {/* decorative svg */}
                <img src={image2.src} alt="decorative"/>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ); 
}
