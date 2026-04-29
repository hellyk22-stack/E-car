const mongoose = require('mongoose');

async function fixCoordinates() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/ecar_db');
        const Showroom = require('./src/models/ShowroomModel');
        
        await Showroom.updateOne(
            { name: 'Puneet Tata Motors' },
            { $set: { 'location.lat': 19.0195, 'location.lng': 72.8256 } }
        );
        
        await Showroom.updateOne(
            { name: 'Kia Car Showroom - Westcoast Kia, Ambawadi' },
            { $set: { 'location.lat': 23.0187, 'location.lng': 72.5414 } }
        );
        
        console.log('Successfully updated the database with exact coordinates!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

fixCoordinates();
