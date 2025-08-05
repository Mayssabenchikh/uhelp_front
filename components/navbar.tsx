"use client";

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Brand */}
        <a href="/" className="text-xl font-bold">
          MyNextApp
        </a>

        {/* Hamburger button (Mobile) */}
        <button
          id="menu-toggle"
          className="lg:hidden focus:outline-none"
          onClick={() => {
            const menu = document.getElementById("menu");
            menu?.classList.toggle("hidden");
          }}
        >
          <svg
            className="w-6 h-6 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Menu Items */}
        <div id="menu" className="hidden lg:flex lg:items-center space-x-4">
          {/* Authenticated user */}
          <a href="/dashboard" className="hover:text-gray-200">
            Dashboard
          </a>
          <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
            Logout
          </button>

          {/* Not authenticated - replace above block if needed */}
          {/*
          <a href="/" className="hover:text-gray-200">Home</a>
          <a href="/auth" className="hover:text-gray-200">Login</a>
          */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
