const escapeCsvValue = (value) => {
    if (value === null || typeof value === "undefined") return ""
    const stringValue = String(value).replace(/\r?\n|\r/g, " ").trim()
    if (/[",]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
}

const buildCsv = (headers, rows) => {
    const headerRow = headers.map((header) => escapeCsvValue(header.label)).join(",")
    const dataRows = rows.map((row) => headers.map((header) => escapeCsvValue(row[header.key])).join(","))
    return [headerRow, ...dataRows].join("\n")
}

const sendCsv = (res, filename, headers, rows) => {
    const csv = buildCsv(headers, rows)
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    return res.status(200).send(csv)
}

module.exports = {
    buildCsv,
    sendCsv,
}