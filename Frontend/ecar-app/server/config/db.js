import mongoose from 'mongoose'

export const connectDb = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecar_db'
    await mongoose.connect(mongoUri)
    console.log(`MongoDB connected: ${mongoose.connection.name}`)
}
