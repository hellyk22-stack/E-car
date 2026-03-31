import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const ManageCars = () => {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editCar, setEditCar] = useState(null)
  const [form, setForm] = useState({
    name: '', brand: '', type: '', price: '',
    mileage: '', engine: '', seating: '',
    fuel: '', transmission: '', rating: ''
  })

  useEffect(() => {
    fetchCars()
  }, [])

  const fetchCars = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/car/cars")
      setCars(res.data.data)
    } catch (err) {
      toast.error("Error fetching cars")
    }
    setLoading(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editCar) {
        await axios.put(`/car/car/${editCar._id}`, form)
        toast.success("Car updated successfully")
      } else {
        await axios.post("/car/car", form)
        toast.success("Car added successfully")
      }
      setShowForm(false)
      setEditCar(null)
      setForm({ name: '', brand: '', type: '', price: '', mileage: '', engine: '', seating: '', fuel: '', transmission: '', rating: '' })
      fetchCars()
    } catch (err) {
      toast.error("Error saving car")
    }
  }

  const handleEdit = (car) => {
    setEditCar(car)
    setForm({
      name: car.name, brand: car.brand, type: car.type,
      price: car.price, mileage: car.mileage, engine: car.engine,
      seating: car.seating, fuel: car.fuel,
      transmission: car.transmission, rating: car.rating
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this car?")) {
      try {
        await axios.delete(`/car/car/${id}`)
        toast.success("Car deleted successfully")
        fetchCars()
      } catch (err) {
        toast.error("Error deleting car")
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Manage Cars</h2>
          <p className="text-gray-500">Add, edit or remove cars</p>
        </div>
        <button
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          onClick={() => { setShowForm(!showForm); setEditCar(null); setForm({ name: '', brand: '', type: '', price: '', mileage: '', engine: '', seating: '', fuel: '', transmission: '', rating: '' }) }}
        >
          {showForm ? 'Cancel' : '+ Add Car'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h3 className="text-lg font-bold mb-4">{editCar ? 'Edit Car' : 'Add New Car'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Luxury">Luxury</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (₹)</label>
              <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mileage (kmpl)</label>
              <input name="mileage" type="number" value={form.mileage} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Engine (cc)</label>
              <input name="engine" type="number" value={form.engine} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Seating</label>
              <input name="seating" type="number" value={form.seating} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fuel</label>
              <select name="fuel" value={form.fuel} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Transmission</label>
              <select name="transmission" value={form.transmission} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rating</label>
              <input name="rating" type="number" step="0.1" max="5" value={form.rating} onChange={handleChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition">
                {editCar ? 'Update Car' : 'Add Car'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cars Table */}
      {loading ? (
        <p className="text-gray-500">Loading cars...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Brand</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Fuel</th>
                <th className="p-3 text-left">Rating</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cars.map(car => (
                <tr key={car._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{car.name}</td>
                  <td className="p-3">{car.brand}</td>
                  <td className="p-3">{car.type}</td>
                  <td className="p-3">₹{car.price.toLocaleString()}</td>
                  <td className="p-3">{car.fuel}</td>
                  <td className="p-3">⭐ {car.rating}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      className="bg-yellow-400 text-white px-3 py-1 rounded-lg hover:bg-yellow-500 transition text-xs"
                      onClick={() => handleEdit(car)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition text-xs"
                      onClick={() => handleDelete(car._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ManageCars