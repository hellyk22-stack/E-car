import axiosInstance from './axiosInstance'

const getFilenameFromHeaders = (headers, fallback) => {
    const contentDisposition = headers?.['content-disposition'] || headers?.['Content-Disposition']
    const match = contentDisposition?.match(/filename="?([^"]+)"?/)
    return match?.[1] || fallback
}

export const downloadCsvReport = async (path, fallbackFilename = 'report.csv') => {
    const response = await axiosInstance.get(path, { responseType: 'blob' })
    const filename = getFilenameFromHeaders(response.headers, fallbackFilename)
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}
