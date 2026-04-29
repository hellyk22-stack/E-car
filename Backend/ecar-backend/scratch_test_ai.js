
const { resolveReviewRating, resolveSafetyRating } = require('./src/utils/CarRatingUtil')

const sanitizeMessages = (messages) => (
    Array.isArray(messages)
        ? messages
            .filter((message) => message && (message.role === 'user' || message.role === 'assistant'))
            .map((message) => ({
                role: message.role,
                content: String(message.content || '').trim(),
            }))
            .filter((message) => message.content)
        : []
)

const buildInventorySummary = (carInventory) => (
    Array.isArray(carInventory) && carInventory.length
        ? carInventory.map((car) => ({
            name: car.name,
            brand: car.brand,
            type: car.type,
            price: car.price,
            mileage: car.mileage,
            engine: car.engine,
            seating: car.seating,
            fuel: car.fuel,
            transmission: car.transmission,
            rating: resolveReviewRating(car),
            reviewRating: resolveReviewRating(car),
            safetyRating: resolveSafetyRating(car),
        }))
        : []
)

const getMockReply = (messages, carInventory) => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content?.toLowerCase() || ''
    
    if (lastUserMessage.includes('budget') || lastUserMessage.includes('price') || lastUserMessage.includes('lakh')) {
        const affordableCars = carInventory.filter(c => c.price < 1500000).slice(0, 3)
        if (affordableCars.length) {
            return `Based on your budget, I recommend checking out the ${affordableCars.map(c => `${c.brand} ${c.name}`).join(', ')}. These fit your price range well!`
        }
    }
    
    const randomCar = carInventory[Math.floor(Math.random() * carInventory.length)]
    return `[Demo Mode] Interesting request! Since I'm currently in development mode, I'd suggest starting with something popular like the ${randomCar?.brand} ${randomCar?.name}. Tell me more about your requirements!`
}

const test = () => {
    const messages = [{ role: 'user', content: 'Best mileage hatchback' }]
    const inventory = [{ brand: 'Maruti', name: 'Swift', price: 600000, type: 'Hatchback', fuel: 'Petrol' }]
    
    const safe = sanitizeMessages(messages)
    console.log('Safe messages:', safe)
    
    const mock = getMockReply(safe, inventory)
    console.log('Mock reply:', mock)
}

test()
