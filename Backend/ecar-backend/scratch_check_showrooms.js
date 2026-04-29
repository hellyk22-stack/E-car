
const mongoose = require('mongoose');
require('dotenv').config();

const dbConnection = require('./src/utils/DBConnection');
const Showroom = require('./src/models/ShowroomModel');

const analyzeShowrooms = async () => {
    try {
        await dbConnection();
        const showrooms = await Showroom.find({}).lean();
        
        console.log(`Total showrooms in database: ${showrooms.length}`);
        
        showrooms.forEach((s, i) => {
            console.log(`\n[${i+1}] ${s.name}`);
            console.log(`Email: ${s.email}`);
            console.log(`Status: ${s.status}`);
            console.log(`Address: ${s.address.street}, ${s.address.city}, ${s.address.state} ${s.address.pincode}`);
            console.log(`Location: Lat ${s.location?.lat}, Lng ${s.location?.lng}`);
            if (s.location?.lat === 0 && s.location?.lng === 0) {
                console.log('⚠️ WARNING: Coordinates are (0,0)');
            }
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

analyzeShowrooms();
