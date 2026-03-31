import React from 'react'
import { useNavigate, Link } from 'react-router-dom'

const Home = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem("token")

  const handleSearch = () => {
    if (token) navigate('/user/search')
    else navigate('/login')
  }

  const handleCompare = () => {
    if (token) navigate('/user/compare')
    else navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-3 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-500">E-CAR 🚗</h1>
          <ul className="flex gap-6 items-center font-medium">
            <li><Link to="/" className="hover:text-blue-500">Home</Link></li>
            <li><Link to="/user/search" className="hover:text-blue-500">Search Cars</Link></li>
            <li><Link to="/user/compare" className="hover:text-blue-500">Compare Cars</Link></li>
            {token ? (
              <li>
                <button
                  className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600"
                  onClick={() => { localStorage.removeItem("token"); navigate('/login') }}
                >
                  Logout
                </button>
              </li>
            ) : (
              <li>
                <button
                  className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600"
                  onClick={() => navigate('/login')}
                >
                  Login
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-[500px]">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7"
          alt="hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="text-4xl font-bold mb-4">Find Your Perfect Car 🚗</h1>
          <p className="text-lg mb-8 text-gray-300">Search, compare and choose the best car based on your priorities</p>
          <div className="flex gap-4">
            <button
              className="bg-blue-500 px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition"
              onClick={handleSearch}
            >
              Search Cars
            </button>
            <button
              className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              onClick={handleCompare}
            >
              Compare Cars
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-5xl mx-auto py-16 px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold mb-2">Smart Search</h3>
          <p className="text-gray-500">Filter cars by brand, type, fuel, transmission and budget</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-4xl mb-4">⚖️</div>
          <h3 className="text-xl font-bold mb-2">Multi-Car Comparison</h3>
          <p className="text-gray-500">Compare as many cars as you want side by side</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-xl font-bold mb-2">Priority Sorting</h3>
          <p className="text-gray-500">Sort cars based on what matters most to you</p>
        </div>
      </div>
    </div>
  )
}

export default Home