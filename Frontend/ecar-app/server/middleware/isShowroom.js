const isShowroom = (req, res, next) => {
    if (req.user?.role !== 'showroom') {
        return res.status(403).json({ success: false, message: 'Showroom access required' })
    }

    return next()
}

export default isShowroom
