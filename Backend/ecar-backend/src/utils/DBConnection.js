const mongoose = require("mongoose")

const dbConnection = () => {
    mongoose.connect("mongodb://127.0.0.1:27017/ecar_db")
    .then(() => {
        console.log("E-CAR database connected...")
    })
    .catch((err) => {
        console.log("database not connected..", err)
    })
}

module.exports = dbConnection