import cloudinary from '../config/cloudinary.js'

export const uploadToCloudinary = (file, folder = 'ecar') => new Promise((resolve, reject) => {
    if (!file?.buffer) {
        resolve(null)
        return
    }

    const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
            if (error) {
                reject(error)
                return
            }

            resolve(result?.secure_url || null)
        },
    )

    stream.end(file.buffer)
})
