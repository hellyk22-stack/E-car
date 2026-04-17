const multer = require("multer")

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"]
    const isCsvName = file.originalname?.toLowerCase().endsWith(".csv")

    if (allowedMimeTypes.includes(file.mimetype) || isCsvName) {
        cb(null, true)
    } else {
        cb(new Error("Only CSV files are allowed"), false)
    }
}

const uploadCsv = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } })

module.exports = uploadCsv