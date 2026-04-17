import express from 'express'
import Car from '../models/Car.js'
import verifyToken from '../middleware/verifyToken.js'
import { attachPlanContext, checkFeature } from '../middleware/checkFeature.js'
import { asyncHandler } from '../utils/api.js'
import { getPlanLabel } from '../utils/subscriptionHelpers.js'

const router = express.Router()

const compareFields = ['name', 'brand', 'price', 'mileage', 'engine', 'fuel', 'transmission', 'seating', 'rating']

const formatCarForCompare = (car) => ({
    _id: car._id,
    name: car.name,
    brand: car.brand,
    price: car.price,
    mileage: car.mileage,
    engine: car.engine,
    fuel: car.fuel,
    transmission: car.transmission,
    seating: car.seating,
    rating: car.rating,
    reviewCount: car.reviewCount,
    type: car.type,
})

const numericValue = (car, key) => Number(car?.[key] || 0)

const getBestCars = (cars, key, preference = 'higher') => {
    const values = cars.map((car) => ({ carId: String(car._id), value: numericValue(car, key) }))
    const bestValue = preference === 'lower'
        ? Math.min(...values.map((item) => item.value))
        : Math.max(...values.map((item) => item.value))

    return values.filter((item) => item.value === bestValue).map((item) => item.carId)
}

const buildSmartCompareAnalysis = (cars) => {
    const performanceWinners = getBestCars(cars, 'engine', 'higher')
    const priceWinners = getBestCars(cars, 'price', 'lower')
    const mileageWinners = getBestCars(cars, 'mileage', 'higher')
    const featureWinners = getBestCars(cars, 'rating', 'higher')

    const scores = cars.map((car) => ({
        car,
        score:
            numericValue(car, 'rating') * 10 +
            numericValue(car, 'mileage') +
            numericValue(car, 'engine') / 50 -
            numericValue(car, 'price') / 100000,
    }))
    const topCar = scores.sort((a, b) => b.score - a.score)[0]?.car

    return {
        categoryWinners: {
            performance: performanceWinners,
            price: priceWinners,
            mileage: mileageWinners,
            features: featureWinners,
        },
        overallRecommendation: topCar
            ? `${topCar.name} stands out overall because it balances price, rating, performance, and day-to-day usability better than the rest.`
            : 'The selected cars are closely matched.',
        bestFor: cars.map((car) => ({
            carId: String(car._id),
            label:
                numericValue(car, 'price') === Math.min(...cars.map((item) => numericValue(item, 'price')))
                    ? 'Best for budget'
                    : numericValue(car, 'mileage') === Math.max(...cars.map((item) => numericValue(item, 'mileage')))
                        ? 'Best for city driving'
                        : numericValue(car, 'engine') === Math.max(...cars.map((item) => numericValue(item, 'engine')))
                            ? 'Best for long trips'
                            : 'Best all-rounder',
        })),
        prosCons: cars.map((car) => ({
            carId: String(car._id),
            pros: [
                `${car.mileage || 0} kmpl mileage`,
                `${car.engine || 0} cc engine`,
                `${car.seating || 0}-seat practicality`,
            ],
            cons: [
                numericValue(car, 'price') > Math.min(...cars.map((item) => numericValue(item, 'price')))
                    ? 'Pricier than the most budget-friendly option'
                    : 'Limited premium differentiation',
                numericValue(car, 'rating') < Math.max(...cars.map((item) => numericValue(item, 'rating')))
                    ? 'Not the highest-rated option in this set'
                    : 'Needs more real-world reviews',
            ],
        })),
    }
}

const parseIds = (value) => String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const sortCarsByIds = (cars, ids) => {
    const order = new Map(ids.map((id, index) => [String(id), index]))
    return [...cars].sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0))
}

router.get('/cars', asyncHandler(async (_req, res) => {
    const cars = await Car.find({}).sort({ createdAt: -1 })
    return res.json({ success: true, data: cars })
}))

router.get('/car/:id', asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id)
    if (!car) {
        return res.status(404).json({ success: false, message: 'Car not found' })
    }

    return res.json({ success: true, data: car })
}))

router.get('/car/:id/price-history', verifyToken, attachPlanContext, checkFeature('priceHistory'), asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id)
    if (!car) {
        return res.status(404).json({ success: false, message: 'Car not found' })
    }

    return res.json({ success: true, data: car.priceHistory || [] })
}))

router.get('/compare', asyncHandler(async (req, res) => {
    const ids = parseIds(req.query.ids)
    const cars = sortCarsByIds(await Car.find({ _id: { $in: ids } }), ids)

    return res.json({
        success: true,
        data: {
            mode: 'basic',
            cars: cars.map(formatCarForCompare),
            fields: compareFields,
        },
    })
}))

router.get('/smart-compare', verifyToken, attachPlanContext, asyncHandler(async (req, res) => {
    const ids = parseIds(req.query.ids)
    const smartCompareLimit = req.planLimits.smartCompareLimit

    if (ids.length > smartCompareLimit) {
        return res.status(403).json({
            success: false,
            message: 'Smart compare limit exceeded',
            limit: smartCompareLimit,
            userPlan: req.accountUser.plan,
            requiredPlan: ids.length <= 4 ? 'pro_buyer' : 'elite',
        })
    }

    const cars = sortCarsByIds(await Car.find({ _id: { $in: ids } }), ids)

    return res.json({
        success: true,
        data: {
            mode: 'smart',
            plan: req.accountUser.plan,
            planLabel: getPlanLabel(req.accountUser.plan),
            limit: smartCompareLimit,
            cars: cars.map(formatCarForCompare),
            analysis: buildSmartCompareAnalysis(cars),
        },
    })
}))

router.get('/compare/export-pdf', verifyToken, attachPlanContext, checkFeature('exportPDF'), asyncHandler(async (req, res) => {
    const ids = parseIds(req.query.ids)
    const cars = sortCarsByIds(await Car.find({ _id: { $in: ids } }), ids)
    const pdfModule = await import('pdfkit')
    const PDFDocument = pdfModule.default || pdfModule

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="ecar-compare.pdf"')

    const doc = new PDFDocument({ margin: 32 })
    doc.pipe(res)
    doc.fontSize(20).text('E-CAR Comparison Export')
    doc.moveDown()

    cars.forEach((car) => {
        doc.fontSize(14).text(`${car.name} (${car.brand})`)
        doc.fontSize(11).text(`Price: Rs ${Math.round(car.price || 0).toLocaleString('en-IN')}`)
        doc.text(`Mileage: ${car.mileage || 0} kmpl | Engine: ${car.engine || 0} cc | Fuel: ${car.fuel || '--'}`)
        doc.text(`Transmission: ${car.transmission || '--'} | Seating: ${car.seating || 0} | Rating: ${car.rating || 0}/5`)
        doc.moveDown()
    })

    doc.end()
}))

router.get('/compare/export-excel', verifyToken, attachPlanContext, checkFeature('exportExcel'), asyncHandler(async (req, res) => {
    const ids = parseIds(req.query.ids)
    const cars = sortCarsByIds(await Car.find({ _id: { $in: ids } }), ids)
    const excelModule = await import('exceljs')
    const Workbook = excelModule.Workbook || excelModule.default?.Workbook
    const workbook = new Workbook()
    const sheet = workbook.addWorksheet('Comparison')

    sheet.columns = [
        { header: 'Car', key: 'name', width: 24 },
        { header: 'Brand', key: 'brand', width: 20 },
        { header: 'Price', key: 'price', width: 16 },
        { header: 'Mileage', key: 'mileage', width: 14 },
        { header: 'Engine', key: 'engine', width: 14 },
        { header: 'Fuel', key: 'fuel', width: 14 },
        { header: 'Transmission', key: 'transmission', width: 18 },
        { header: 'Seating', key: 'seating', width: 12 },
        { header: 'Rating', key: 'rating', width: 12 },
    ]

    cars.forEach((car) => {
        sheet.addRow(formatCarForCompare(car))
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="ecar-compare.xlsx"')
    await workbook.xlsx.write(res)
    res.end()
}))

export default router
