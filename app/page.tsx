import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Bienvenue sur votre application
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Cliquez sur le bouton ci-dessous pour accéder à la page d'authentification
        </p>
        <Link 
          href="/auth"
          className="inline-block bg-cyan-500 text-white px-8 py-3 rounded-lg hover:bg-cyan-600 transition-colors font-medium"
        >
          Aller à la page d'authentification
        </Link>
      </div>
    </div>
  );
}