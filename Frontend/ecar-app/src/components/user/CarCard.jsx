import React from 'react'
import { useNavigate } from 'react-router-dom'

const carImages = {
  'Maruti Swift': 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400',
  'Honda City': 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400',
  'Hyundai Creta': 'https://images.unsplash.com/photo-1633614620657-9dbd8b27613c?w=400',
  'Tata Nexon': 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=400',
  'Kia Seltos': 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400',
  'Maruti Baleno': 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400',
}

const defaultImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400'

const CarCard = ({ car, selectable, selected, onSelect }) => {
  const navigate = useNavigate()

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition border-2 
      ${selectable && selected ? 'border-blue-500' : 'border-transparent'}`}>
      
      {/* Car Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={carImages[car.name] || defaultImage}
          alt={car.name}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
        />
        {selectable && (
          <div className="absolute top-3 right-3">
            <input
              type="checkbox"
              className="w-5 h-5 accent-blue-500 cursor-pointer"
              checked={!!selected}
              onChange={() => onSelect(car)}
            />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
          <h5 className="text-white font-bold text-lg">{car.name}</h5>
          <p className="text-gray-300 text-sm">{car.type} | {car.brand}</p>
        </div>
      </div>

      {/* Car Details */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="bg-gray-50 p-2 rounded-lg">
            <p className="text-gray-400 text-xs">Price</p>
            <p className="font-semibold">₹{car.price.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <p className="text-gray-400 text-xs">Mileage</p>
            <p className="font-semibold">{car.mileage} kmpl</p>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <p className="text-gray-400 text-xs">Fuel</p>
            <p className="font-semibold">{car.fuel}</p>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <p className="text-gray-400 text-xs">Transmission</p>
            <p className="font-semibold">{car.transmission}</p>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <p className="text-gray-400 text-xs">Engine</p>
            <p className="font-semibold">{car.engine} cc</p>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <p className="text-gray-400 text-xs">Rating</p>
            <p className="font-semibold">⭐ {car.rating} / 5</p>
          </div>
        </div>

        <button
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition text-sm font-medium"
          onClick={() => navigate(`/user/car/${car._id}`)}
        >
          View Details
        </button>
      </div>
    </div>
  )
}

export default CarCard