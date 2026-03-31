import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import CarCard from '../../components/user/CarCard'

const SearchCars = () => {
  const { register, handleSubmit, reset } = useForm()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Fetch all cars on page load
  useEffect(() => {
    fetchAllCars()
  }, [])

  const fetchAllCars = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/car/cars")
      setResults(res.data.data)
    } catch (err) {
      console.log("error fetching cars", err)
    }
    setLoading(false)
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await axios.get("/car/search", { params: data })
      setResults(res.data.data)
      setSearched(true)
    } catch (err) {
      console.log("error searching cars", err)
    }
    setLoading(false)
  }

  const handleReset = () => {
    reset()
    setSearched(false)
    fetchAllCars()
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Search Cars</h2>
      <p className="text-gray-500 mb-6">Filter cars based on your preferences.</p>

      {/* Filter Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Brand</label>
          <input className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="e.g. Honda" {...register('brand')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" {...register('type')}>
            <option value="">All</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fuel Type</label>
          <select className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" {...register('fuel')}>
            <option value="">All</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Transmission</label>
          <select className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" {...register('transmission')}>
            <option value="">All</option>
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Price (₹)</label>
          <input type="number" className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="e.g. 1000000" {...register('maxPrice')} />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">Search</button>
          <button type="button" className="border px-6 py-2 rounded-lg hover:bg-gray-100 transition" onClick={handleReset}>Reset</button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <p className="text-gray-500">Loading cars...</p>
        </div>
      )}

      {/* Results Count */}
      {searched && !loading && (
        <p className="text-gray-500 mb-4">
          {results.length > 0 ? `Showing ${results.length} result${results.length > 1 ? 's' : ''}` : 'No cars match your filters.'}
        </p>
      )}

      {/* Car Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {results.map(car => (
            <CarCard key={car._id} car={car} />
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchCars