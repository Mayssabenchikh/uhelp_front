'use client';

import React from 'react';

type LoginData = { email: string; password: string };
type RegisterData = { name: string; email: string; password: string; passwordConfirmation: string };

type Props = {
  isSignUp: boolean;
  loginData: LoginData;
  registerData: RegisterData;
  loginErrors: Partial<Record<keyof LoginData, string>>;
  registerErrors: Partial<Record<keyof RegisterData, string>>;
  onLoginChange: (field: keyof LoginData, value: string) => void;
  onRegisterChange: (field: keyof RegisterData, value: string) => void;
  onLogin: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRegister: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading: boolean;
  toggleMode: (toSignUp: boolean) => void;
};

export default function AuthMobile({
  isSignUp,
  loginData,
  registerData,
  loginErrors,
  registerErrors,
  onLoginChange,
  onRegisterChange,
  onLogin,
  onRegister,
  isLoading,
  toggleMode,
}: Props) {
  return (
    <div className="md:hidden p-6 relative z-30">
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">{isSignUp ? 'Sign up' : 'Sign in'}</h2>
        {isSignUp ? (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Name"
              value={registerData.name}
              onChange={e => onRegisterChange('name', e.target.value)}
              className="w-full bg-gray-100 h-12 rounded-md px-3 text-sm outline-none"
              disabled={isLoading}
            />
            {registerErrors.name && <p className="text-red-500 text-sm">{registerErrors.name}</p>}

            <input
              type="email"
              placeholder="Email"
              value={registerData.email}
              onChange={e => onRegisterChange('email', e.target.value)}
              className="w-full bg-gray-100 h-12 rounded-md px-3 text-sm outline-none"
              disabled={isLoading}
            />
            {registerErrors.email && <p className="text-red-500 text-sm">{registerErrors.email}</p>}

            <input
              type="password"
              placeholder="Password"
              value={registerData.password}
              onChange={e => onRegisterChange('password', e.target.value)}
              className="w-full bg-gray-100 h-12 rounded-md px-3 text-sm outline-none"
              disabled={isLoading}
            />
            {registerErrors.password && <p className="text-red-500 text-sm">{registerErrors.password}</p>}

            <input
              type="password"
              placeholder="Confirm Password"
              value={registerData.passwordConfirmation}
              onChange={e => onRegisterChange('passwordConfirmation', e.target.value)}
              className="w-full bg-gray-100 h-12 rounded-md px-3 text-sm outline-none"
              disabled={isLoading}
            />
            {registerErrors.passwordConfirmation && <p className="text-red-500 text-sm">{registerErrors.passwordConfirmation}</p>}

            <button
              type="button"
              onClick={onRegister}
              disabled={isLoading}
              className="w-full bg-teal-500 h-12 rounded-md text-white font-semibold mt-4 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Sign up'}
            </button>

            <div className="text-center mt-4 text-sm text-gray-600">
              <span>Already have an account? </span>
              <button type="button" onClick={() => toggleMode(false)} className="text-teal-500 font-semibold">
                Sign in
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={loginData.email}
              onChange={e => onLoginChange('email', e.target.value)}
              className="w-full bg-gray-100 h-12 rounded-md px-3 text-sm outline-none"
              disabled={isLoading}
            />
            {loginErrors.email && <p className="text-red-500 text-sm">{loginErrors.email}</p>}

            <input
              type="password"
              placeholder="Password"
              value={loginData.password}
              onChange={e => onLoginChange('password', e.target.value)}
              className="w-full bg-gray-100 h-12 rounded-md px-3 text-sm outline-none"
              disabled={isLoading}
            />
            {loginErrors.password && <p className="text-red-500 text-sm">{loginErrors.password}</p>}

            <button
              type="button"
              onClick={onLogin}
              disabled={isLoading}
              className="w-full bg-teal-500 h-12 rounded-md text-white font-semibold mt-4 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Login'}
            </button>

            <div className="text-center mt-4 text-sm text-gray-600">
              <span>Don't have an account? </span>
              <button type="button" onClick={() => toggleMode(true)} className="text-teal-500 font-semibold">
                Sign up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
