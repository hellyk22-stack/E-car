const { resolveReviewRating, resolveSafetyRating } = require('./CarRatingUtil')

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`

const formatMetric = (value, suffix = '') => {
    if (value === null || typeof value === 'undefined' || Number.isNaN(Number(value))) return 'N/A'
    return `${value}${suffix}`
}

const pickBy = (cars, selector, direction = 'max') => {
    if (!Array.isArray(cars) || !cars.length) return null

    return cars.reduce((best, car) => {
        if (!car) return best
        if (!best) return car

        try {
            const currentValue = selector(car)
            const bestValue = selector(best)

            if (typeof currentValue === 'undefined' || currentValue === null) return best
            if (typeof bestValue === 'undefined' || bestValue === null) return car

            return direction === 'min'
                ? currentValue < bestValue ? car : best
                : currentValue > bestValue ? car : best
        } catch (e) {
            return best
        }
    }, null)
}

const buildFallbackComparisonAnalysis = (cars = []) => {
    if (!cars.length) {
        return {
            summary: 'No cars were available for comparison.',
            highlights: [],
            verdict: 'Add at least two cars to generate smart comparison insights.',
            generatedBy: 'fallback',
        }
    }

    const cheapest = pickBy(cars, (car) => Number(car.price || 0), 'min')
    const mostEfficient = pickBy(cars, (car) => Number(car.mileage || 0), 'max')
    const safest = pickBy(cars, (car) => resolveSafetyRating(car), 'max')
    const bestReviewed = pickBy(cars, (car) => resolveReviewRating(car), 'max')
    const familyPick = pickBy(cars, (car) => Number(car.seating || 0), 'max')

    const summary = [
        cheapest ? `${cheapest.name} is the value pick at ${formatCurrency(cheapest.price)}` : null,
        safest ? `${safest.name} leads on safety with ${resolveSafetyRating(safest)}/5` : null,
        bestReviewed ? `${bestReviewed.name} has the strongest review rating at ${resolveReviewRating(bestReviewed)}/5` : null,
    ].filter(Boolean).join('. ') + '.'

    const highlights = [
        cheapest ? {
            type: 'value',
            carId: cheapest._id || cheapest.id,
            carName: cheapest.name,
            text: `Best value for money with the lowest price point at ${formatCurrency(cheapest.price)}.`,
        } : null,
        mostEfficient ? {
            type: 'efficiency',
            carId: mostEfficient._id || mostEfficient.id,
            carName: mostEfficient.name,
            text: `Most efficient option with ${formatMetric(mostEfficient.mileage, ' kmpl')}.`,
        } : null,
        safest ? {
            type: 'safety',
            carId: safest?._id || safest?.id,
            carName: safest?.name,
            text: `Top safety score in this set at ${resolveSafetyRating(safest)}/5.`,
        } : null,
        bestReviewed ? {
            type: 'reviews',
            carId: bestReviewed._id || bestReviewed.id,
            carName: bestReviewed.name,
            text: `Best owner sentiment with a ${resolveReviewRating(bestReviewed)}/5 review rating.`,
        } : null,
        familyPick ? {
            type: 'space',
            carId: familyPick._id || familyPick.id,
            carName: familyPick.name,
            text: `Most family-friendly seating capacity at ${formatMetric(familyPick.seating, ' seats')}.`,
        } : null,
    ].filter(Boolean)

    const verdict = [
        cheapest ? `Choose ${cheapest.name} if budget is your priority.` : null,
        safest && safest.name !== cheapest?.name ? `Choose ${safest.name} if safety comes first.` : null,
        bestReviewed && ![cheapest?.name, safest?.name].includes(bestReviewed.name) ? `Choose ${bestReviewed.name} for the strongest customer feedback.` : null,
    ].filter(Boolean).join(' ')

    return {
        summary,
        highlights,
        verdict,
        generatedBy: 'fallback',
    }
}

const extractTextFromAnthropic = (data) => {
    const text = Array.isArray(data?.content)
        ? data.content
            .filter((part) => part?.type === 'text' && part.text)
            .map((part) => part.text.trim())
            .filter(Boolean)
            .join('\n')
        : ''

    return text || 'No AI analysis generated.'
}

const getComparisonAnalysis = async (cars = []) => {
    const fallback = buildFallbackComparisonAnalysis(cars)
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey || !cars.length) {
        return fallback
    }

    try {
        const inventorySummary = cars.map((car) => ({
            name: car.name,
            brand: car.brand,
            price: car.price,
            mileage: car.mileage,
            engine: car.engine,
            seating: car.seating,
            fuel: car.fuel,
            transmission: car.transmission,
            safetyRating: resolveSafetyRating(car),
            reviewRating: resolveReviewRating(car),
        }))

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 700,
                system: 'You are an expert car comparison assistant for an Indian car marketplace. Give concise, practical comparison guidance.',
                messages: [{
                    role: 'user',
                    content: `Compare these cars and respond with 3 short paragraphs: summary, standout strengths, and buyer recommendation.\n${JSON.stringify(inventorySummary, null, 2)}`,
                }],
            }),
        })

        const data = await response.json()
        if (!response.ok) {
            console.error('Anthropic comparison analysis error:', data)
            return fallback
        }

        return {
            ...fallback,
            summary: extractTextFromAnthropic(data),
            generatedBy: 'anthropic',
        }
    } catch (error) {
        console.error('Comparison analysis error:', error)
        return fallback
    }
}

module.exports = { getComparisonAnalysis, buildFallbackComparisonAnalysis }
