import React, { useState, useEffect } from 'react'
import axios from 'axios'
import CarCard from '../../components/user/CarCard'

const CompareCars = () => {
  const [allCars, setAllCars] = useState([])
  const [sortBy, setSortBy] = useState('price')
  const [selected, setSelected] = useState([])
  const [showTable, setShowTable] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAllCars()
  }, [])

  const fetchAllCars = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/car/cars")
      setAllCars(res.data.data)
    } catch (err) {
      console.log("error fetching cars", err)
    }
    setLoading(false)
  }

  const sortedCars = [...allCars].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price
    if (sortBy === 'mileage') return b.mileage - a.mileage
    if (sortBy === 'rating') return b.rating - a.rating
    if (sortBy === 'engine') return b.engine - a.engine
    return 0
  })

  const handleSelect = (car) => {
    if (selected.find(c => c._id === car._id)) {
      setSelected(selected.filter(c => c._id !== car._id))
    } else {
      setSelected([...selected, car])
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Compare Cars</h2>
      <p className="text-gray-500 mb-6">Sort by priority, select cars and compare side by side.</p>

      {/* Sort Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center gap-4">
        <label className="font-medium">Sort by:</label>
        <select
          className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="price">Price (Low to High)</option>
          <option value="mileage">Mileage (High to Low)</option>
          <option value="rating">Rating (High to Low)</option>
          <option value="engine">Engine Size (High to Low)</option>
        </select>
        {selected.length >= 2 && (
          <button
            className="ml-auto bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition font-medium"
            onClick={() => setShowTable(true)}
          >
            Compare {selected.length} Cars
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <p className="text-gray-500">Loading cars...</p>
        </div>
      )}

      {/* Car Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {sortedCars.map(car => (
            <CarCard
              key={car._id}
              car={car}
              selectable={true}
              selected={!!selected.find(c => c._id === car._id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Comparison Table */}
      {showTable && selected.length >= 2 && (
        <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold">Comparison Result</h4>
            <button
              className="border px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm"
              onClick={() => { setShowTable(false); setSelected([]) }}
            >
              Reset
            </button>
          </div>
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="p-3 text-left">Feature</th>
                {selected.map(car => <th key={car._id} className="p-3">{car.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Brand', 'brand'],
                ['Type', 'type'],
                ['Price', 'price'],
                ['Mileage', 'mileage'],
                ['Engine', 'engine'],
                ['Fuel', 'fuel'],
                ['Transmission', 'transmission'],
                ['Seating', 'seating'],
                ['Rating', 'rating'],
              ].map(([label, key]) => (
                <tr key={key} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-left">{label}</td>
                  {selected.map(car => (
                    <td key={car._id} className="p-3">
                      {key === 'price' ? `₹${car[key].toLocaleString()}` :
                       key === 'mileage' ? `${car[key]} kmpl` :
                       key === 'engine' ? `${car[key]} cc` :
                       key === 'rating' ? `⭐ ${car[key]}` :
                       car[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CompareCars