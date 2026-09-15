function escapeCsvValue(value) {
    const stringValue = value === null || value === undefined ? "" : String(value)
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, "\"\"")}"`
    }
    return stringValue
}

export function downloadCsv(filename, headers, rows) {
    const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(","))
    const csvContent = lines.join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
