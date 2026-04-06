// ============================================================
// carImageUtils.js — Central image resolver for E-CAR
// Usage: import { getCarImage } from '../../utils/carImageUtils'
//        then: getCarImage(car)
// Priority: car.image (Cloudinary) → name match → brand match → type match → default
// ============================================================

const CAR_IMAGES_BY_NAME = {
    // Maruti Suzuki
    'Maruti Swift':        'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Maruti Baleno':       'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Maruti Dzire':        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Maruti Ertiga':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Maruti Brezza':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Maruti Fronx':        'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Maruti Ignis':        'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Maruti Ciaz':         'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Maruti WagonR':       'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Maruti Alto':         'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Maruti Celerio':      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',

    // Honda
    'Honda City':          'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&q=80',
    'Honda Amaze':         'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&q=80',
    'Honda Elevate':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Honda WR-V':          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Honda Jazz':          'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',

    // Hyundai
    'Hyundai Creta':       'https://images.unsplash.com/photo-1633614620657-9dbd8b27613c?w=600&q=80',
    'Hyundai Venue':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Hyundai i20':         'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Hyundai Aura':        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Hyundai Tucson':      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Hyundai Alcazar':     'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Hyundai Exter':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Hyundai Verna':       'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&q=80',
    'Hyundai Ioniq 5':     'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',

    // Tata
    'Tata Nexon':          'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=600&q=80',
    'Tata Punch':          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Tata Tiago':          'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Tata Tigor':          'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Tata Harrier':        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Tata Safari':         'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Tata Nexon EV':       'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
    'Tata Tiago EV':       'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
    'Tata Curvv':          'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=600&q=80',

    // Kia
    'Kia Seltos':          'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&q=80',
    'Kia Sonet':           'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Kia Carens':          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Kia EV6':             'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',

    // MG
    'MG Hector':           'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'MG Astor':            'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'MG ZS EV':            'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
    'MG Comet EV':         'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
    'MG Windsor':          'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',

    // Toyota
    'Toyota Innova':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Toyota Fortuner':     'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Toyota Glanza':       'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Toyota Urban Cruiser': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Toyota Camry':        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',

    // Mahindra
    'Mahindra Scorpio':    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Mahindra XUV700':     'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Mahindra XUV300':     'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Mahindra Thar':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Mahindra BE 6e':      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
    'Mahindra XEV 9e':     'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',

    // Skoda / Volkswagen
    'Skoda Slavia':        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Skoda Kushaq':        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Skoda Octavia':       'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Volkswagen Virtus':   'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Volkswagen Taigun':   'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',

    // Luxury
    'BMW 3 Series':        'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
    'BMW 5 Series':        'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
    'BMW X1':              'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
    'BMW X5':              'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
    'Mercedes C-Class':    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
    'Mercedes E-Class':    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
    'Mercedes GLA':        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
    'Audi A4':             'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80',
    'Audi Q3':             'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80',
    'Audi Q5':             'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80',
}

const CAR_IMAGES_BY_BRAND = {
    'Maruti':      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Maruti Suzuki': 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Honda':       'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&q=80',
    'Hyundai':     'https://images.unsplash.com/photo-1633614620657-9dbd8b27613c?w=600&q=80',
    'Tata':        'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=600&q=80',
    'Kia':         'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&q=80',
    'MG':          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Toyota':      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Mahindra':    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Skoda':       'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'Volkswagen':  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'BMW':         'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
    'Mercedes':    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
    'Audi':        'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80',
    'Renault':     'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Nissan':      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Jeep':        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Ford':        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
}

const CAR_IMAGES_BY_TYPE = {
    'Hatchback': 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80',
    'Sedan':     'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    'SUV':       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
    'Luxury':    'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80'

/**
 * Main resolver — call this everywhere instead of inline carImages maps
 * @param {Object} car - car object from API
 * @returns {string} image URL
 */
export const getCarImage = (car) => {
    if (!car) return DEFAULT_IMAGE

    // 1. Cloudinary URL stored in DB (highest priority)
    if (car.image && car.image.trim() !== '') return car.image

    // 2. Exact name match
    const nameKey = Object.keys(CAR_IMAGES_BY_NAME).find(
        k => k.toLowerCase() === car.name?.toLowerCase()
    )
    if (nameKey) return CAR_IMAGES_BY_NAME[nameKey]

    // 3. Partial name match (e.g. "Swift ZXI+" matches "Maruti Swift")
    const partialKey = Object.keys(CAR_IMAGES_BY_NAME).find(
        k => car.name?.toLowerCase().includes(k.toLowerCase()) ||
             k.toLowerCase().includes(car.name?.toLowerCase())
    )
    if (partialKey) return CAR_IMAGES_BY_NAME[partialKey]

    // 4. Brand match
    const brandKey = Object.keys(CAR_IMAGES_BY_BRAND).find(
        k => k.toLowerCase() === car.brand?.toLowerCase()
    )
    if (brandKey) return CAR_IMAGES_BY_BRAND[brandKey]

    // 5. Type match
    if (car.type && CAR_IMAGES_BY_TYPE[car.type]) return CAR_IMAGES_BY_TYPE[car.type]

    // 6. Default fallback
    return DEFAULT_IMAGE
}

export default getCarImage