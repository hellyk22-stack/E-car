import React from "react";
import { useParams } from "react-router-dom";

const CarDetail = () => {
  const { id } = useParams();

  // Dummy data (you can replace this with API later)
  const cars = [
    {
      id: "1",
      name: "BMW M4",
      price: "₹1.5 Cr",
      image: "https://via.placeholder.com/400",
      description: "High-performance luxury sports car.",
    },
    {
      id: "2",
      name: "Mercedes C-Class",
      price: "₹60 Lakh",
      image: "https://via.placeholder.com/400",
      description: "Premium sedan with comfort and style.",
    },
  ];

  const car = cars.find((c) => c.id === id);

  if (!car) {
    return <h2 className="text-center mt-10">Car not found</h2>;
  }

  return (
    <div className="max-w-4xl mx-auto p-5">
      <img
        src={car.image}
        alt={car.name}
        className="w-full h-80 object-cover rounded-xl"
      />

      <h1 className="text-3xl font-bold mt-5">{car.name}</h1>
      <p className="text-xl text-green-600 mt-2">{car.price}</p>
      <p className="mt-4 text-gray-700">{car.description}</p>

      <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Book Now
      </button>
    </div>
  );
};

export default CarDetail;