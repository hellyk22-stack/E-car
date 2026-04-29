export const normalizeBrandName = (value) => String(value || '').trim().toLowerCase()

const BRAND_ALIASES = {
    mg: ['mg', 'morris garages', 'morris garage', 'mg motor', 'mg motors'],
    'morris garages': ['mg', 'morris garages', 'morris garage', 'mg motor', 'mg motors'],
    'morris garage': ['mg', 'morris garages', 'morris garage', 'mg motor', 'mg motors'],
    'mg motor': ['mg', 'morris garages', 'morris garage', 'mg motor', 'mg motors'],
    'mg motors': ['mg', 'morris garages', 'morris garage', 'mg motor', 'mg motors'],
    skoda: ['skoda'],
    volkswagen: ['volkswagen', 'vw'],
    vw: ['volkswagen', 'vw'],
}

const expandBrandAliases = (brand) => {
    const normalized = normalizeBrandName(brand)
    return BRAND_ALIASES[normalized] || [normalized]
}

const normalizeBrandEntry = (brand) => {
    if (typeof brand === 'string') return brand.trim()
    if (brand && typeof brand === 'object') {
        return String(brand.name || brand.brand || brand.label || brand.value || '').trim()
    }
    return ''
}

const normalizeCarRecord = (car) => {
    if (!car || typeof car !== 'object') return null

    return {
        ...car,
        _id: car._id || car.id || '',
        name: car.name || car.model || car.title || '',
        brand: car.brand || car.make || '',
    }
}

export const getShowroomBrandList = (showroom) => (
    Array.isArray(showroom?.brands)
        ? showroom.brands
            .map(normalizeBrandEntry)
            .filter(Boolean)
        : String(showroom?.brands || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
)

export const getShowroomBrandSet = (showroom) => new Set(
    getShowroomBrandList(showroom).flatMap(expandBrandAliases)
)

export const doesCarMatchShowroomBrands = (car, showroom) => {
    const brandSet = getShowroomBrandSet(showroom)
    if (!brandSet.size) return true

    const normalizedBrand = normalizeBrandName(car?.brand || car?.make)
    if (!normalizedBrand) return true

    return expandBrandAliases(normalizedBrand).some((brand) => brandSet.has(brand))
}

export const filterCarsForShowroomBrands = (cars = [], showroom) => (
    (cars || [])
        .map(normalizeCarRecord)
        .filter(Boolean)
        .filter((car) => doesCarMatchShowroomBrands(car, showroom))
)

const normalizeInventoryEntry = (item, catalogMap, showroom) => {
    const carRef = item?.carId && typeof item.carId === 'object' ? item.carId : null
    const linkedId = carRef?._id || carRef?.id || item?.carId || item?._id || item?.id || ''
    const catalogCar = linkedId ? catalogMap.get(String(linkedId)) : null

    const baseCar = normalizeCarRecord(carRef || item || catalogCar)
    if (!baseCar) return null
    if (!baseCar._id && linkedId) {
        baseCar._id = String(linkedId)
    }
    if (!baseCar._id) return null
    if (!doesCarMatchShowroomBrands(baseCar, showroom)) return null

    return {
        ...catalogCar,
        ...baseCar,
        image: baseCar.image || catalogCar?.image || item?.image || '',
        price: item?.customPrice || baseCar.price || catalogCar?.price,
        fuel: baseCar.fuel || catalogCar?.fuel || item?.fuel || '',
        type: baseCar.type || catalogCar?.type || item?.type || '',
        transmission: baseCar.transmission || catalogCar?.transmission || item?.transmission || '',
        mileage: baseCar.mileage || catalogCar?.mileage || item?.mileage || '',
        engine: baseCar.engine || catalogCar?.engine || item?.engine || '',
        seating: baseCar.seating || catalogCar?.seating || item?.seating || '',
    }
}

export const mergeShowroomInventoryWithCatalog = (showroom, catalog = [], options = {}) => {
    const { fallbackToBrandCatalog = true } = options
    const normalizedCatalogCars = (catalog || []).map(normalizeCarRecord).filter(Boolean)
    const allowedCatalogCars = filterCarsForShowroomBrands(normalizedCatalogCars, showroom)
    const catalogMap = new Map(
        normalizedCatalogCars
            .filter((car) => car?._id)
            .map((car) => [String(car._id), car])
    )

    const inventoryCars = (showroom?.cars || [])
        .map((item) => normalizeInventoryEntry(item, catalogMap, showroom))
        .filter(Boolean)

    if (inventoryCars.length) {
        return inventoryCars
    }

    if (!fallbackToBrandCatalog) {
        return []
    }

    return allowedCatalogCars
}
