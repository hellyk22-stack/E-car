const mongoose = require('mongoose')
require('dotenv').config()

const CarModel = require('./src/models/CarModel')
const UserModel = require('./src/models/UserModel')
const dbConnection = require('./src/utils/DBConnection')

const indianCars = [
    { name: 'Maruti Swift', brand: 'Maruti', type: 'Hatchback', price: 699000, mileage: 23.76, engine: 1197, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.3 },
    { name: 'Maruti Baleno', brand: 'Maruti', type: 'Hatchback', price: 850000, mileage: 22.35, engine: 1197, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.4 },
    { name: 'Hyundai i20', brand: 'Hyundai', type: 'Hatchback', price: 915000, mileage: 20.35, engine: 1197, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.3 },
    { name: 'Tata Altroz', brand: 'Tata', type: 'Hatchback', price: 875000, mileage: 19.39, engine: 1199, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.2 },
    { name: 'Honda Jazz', brand: 'Honda', type: 'Hatchback', price: 945000, mileage: 16.09, engine: 1199, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.1 },
    { name: 'Volkswagen Polo', brand: 'Volkswagen', type: 'Hatchback', price: 1020000, mileage: 16.47, engine: 999, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.3 },

    { name: 'Maruti Dzire', brand: 'Maruti', type: 'Sedan', price: 899000, mileage: 23.26, engine: 1197, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.3 },
    { name: 'Honda Amaze', brand: 'Honda', type: 'Sedan', price: 895000, mileage: 18.6, engine: 1199, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.1 },
    { name: 'Hyundai Aura', brand: 'Hyundai', type: 'Sedan', price: 899000, mileage: 20.5, engine: 1197, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.1 },
    { name: 'Skoda Slavia', brand: 'Skoda', type: 'Sedan', price: 1499000, mileage: 16.34, engine: 999, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.4 },
    { name: 'Honda City', brand: 'Honda', type: 'Sedan', price: 1500000, mileage: 17.8, engine: 1498, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.5 },
    { name: 'Hyundai Verna', brand: 'Hyundai', type: 'Sedan', price: 1500000, mileage: 20.6, engine: 1497, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.4 },

    { name: 'Maruti Brezza', brand: 'Maruti', type: 'SUV', price: 1199000, mileage: 17.38, engine: 1462, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.3 },
    { name: 'Hyundai Venue', brand: 'Hyundai', type: 'SUV', price: 1100000, mileage: 17.5, engine: 1197, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.2 },
    { name: 'Kia Sonet', brand: 'Kia', type: 'SUV', price: 1100000, mileage: 18.2, engine: 1197, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.3 },
    { name: 'Tata Nexon', brand: 'Tata', type: 'SUV', price: 1100000, mileage: 17.01, engine: 1199, seating: 5, fuel: 'Petrol', transmission: 'Manual', rating: 4.5 },
    { name: 'MG Astor', brand: 'MG', type: 'SUV', price: 1570000, mileage: 15.02, engine: 1349, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.3 },
    { name: 'Kia Seltos', brand: 'Kia', type: 'SUV', price: 1800000, mileage: 16.5, engine: 1497, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.5 },
    { name: 'Hyundai Creta', brand: 'Hyundai', type: 'SUV', price: 1600000, mileage: 16.8, engine: 1482, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.5 },
    { name: 'Mahindra XUV700', brand: 'Mahindra', type: 'SUV', price: 2000000, mileage: 15.05, engine: 1997, seating: 7, fuel: 'Diesel', transmission: 'Automatic', rating: 4.6 },
    { name: 'Tata Harrier', brand: 'Tata', type: 'SUV', price: 2200000, mileage: 14.6, engine: 1956, seating: 5, fuel: 'Diesel', transmission: 'Automatic', rating: 4.4 },
    { name: 'Toyota Fortuner', brand: 'Toyota', type: 'SUV', price: 3800000, mileage: 10.02, engine: 2755, seating: 7, fuel: 'Diesel', transmission: 'Automatic', rating: 4.6 },
    { name: 'Jeep Compass', brand: 'Jeep', type: 'SUV', price: 2400000, mileage: 15.07, engine: 1956, seating: 5, fuel: 'Diesel', transmission: 'Automatic', rating: 4.2 },

    { name: 'Tata Nexon EV', brand: 'Tata', type: 'SUV', price: 1600000, mileage: 0, engine: 0, seating: 5, fuel: 'Electric', transmission: 'Automatic', rating: 4.4 },
    { name: 'Tata Tiago EV', brand: 'Tata', type: 'Hatchback', price: 999000, mileage: 0, engine: 0, seating: 5, fuel: 'Electric', transmission: 'Automatic', rating: 4.3 },
    { name: 'MG ZS EV', brand: 'MG', type: 'SUV', price: 2500000, mileage: 0, engine: 0, seating: 5, fuel: 'Electric', transmission: 'Automatic', rating: 4.3 },
    { name: 'Hyundai Kona Electric', brand: 'Hyundai', type: 'SUV', price: 2399000, mileage: 0, engine: 0, seating: 5, fuel: 'Electric', transmission: 'Automatic', rating: 4.2 },
    { name: 'BYD Atto 3', brand: 'BYD', type: 'SUV', price: 3399000, mileage: 0, engine: 0, seating: 5, fuel: 'Electric', transmission: 'Automatic', rating: 4.3 },

    { name: 'BMW 3 Series', brand: 'BMW', type: 'Luxury', price: 5500000, mileage: 12.2, engine: 1998, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.7 },
    { name: 'Mercedes C-Class', brand: 'Mercedes', type: 'Luxury', price: 6000000, mileage: 11.5, engine: 1991, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.7 },
    { name: 'Audi A4', brand: 'Audi', type: 'Luxury', price: 5200000, mileage: 13.06, engine: 1984, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.6 },
    { name: 'BMW 5 Series', brand: 'BMW', type: 'Luxury', price: 8500000, mileage: 10.86, engine: 2998, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.8 },
    { name: 'Mercedes E-Class', brand: 'Mercedes', type: 'Luxury', price: 9000000, mileage: 10.5, engine: 1991, seating: 5, fuel: 'Petrol', transmission: 'Automatic', rating: 4.8 },
]

async function seed() {
    await dbConnection()
    await mongoose.connection.asPromise()
    console.log('Connected to MongoDB')

    const admin = await UserModel.findOne({ role: 'admin' })
    if (!admin) {
        console.error('No admin user found. Create an admin user first.')
        process.exit(1)
    }

    let inserted = 0
    for (const car of indianCars) {
        const exists = await CarModel.findOne({ name: car.name })
        if (exists) {
            console.log(`Skip (exists): ${car.name}`)
            continue
        }

        await CarModel.create({
            ...car,
            userId: admin._id,
            status: 'active',
        })
        inserted++
        console.log(`Added: ${car.name}`)
    }

    console.log(`Done. Inserted ${inserted} new cars.`)
    process.exit(0)
}

seed().catch((err) => {
    console.error(err)
    process.exit(1)
})
