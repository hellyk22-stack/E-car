import mongoose from 'mongoose'

export const connectDb = async () => {
    const mongoUri = process.env.MONGO_URL
    await mongoose.connect(mongoUri)
    console.log(`MongoDB connected: ${mongoose.connection.name}`)
}
