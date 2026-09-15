import * as React from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { useDispatch } from "react-redux"
import { bulkUploadTickets } from "./ticketSlice"
import { downloadCsv } from "../../utils/csv"

const TEMPLATE_HEADERS = [
    "Customer Name",
    "Site Name",
    "Vendor Circuit ID",
    "Problem Type",
    "Priority",
    "Description",
    "Customer Reference",
    "Problem Start Date",
    "Power Available",
    "Physical Connection Check",
    "Site Access Hours",
    "Site Access Hours Other Text",
]

export default function BulkUploadTickets() {
    const dispatch = useDispatch()
    const [selectedFile, setSelectedFile] = React.useState(null)
    const [uploading, setUploading] = React.useState(false)
    const [failedRows, setFailedRows] = React.useState([])
    const [feedback, setFeedback] = React.useState(null)
    const fileInputRef = React.useRef(null)

    const handleDownloadTemplate = () => {
        downloadCsv("ticket-bulk-upload-template.csv", TEMPLATE_HEADERS, [])
    }

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0] || null)
        setFailedRows([])
    }

    const handleDownloadAuditReport = () => {
        downloadCsv(
            "ticket-bulk-upload-audit-report.csv",
            ["Row", "Customer Name", "Site Name", "Vendor Circuit ID", "Errors"],
            failedRows.map((row) => [row.row, row.customerName, row.siteName, row.vendorCircuitId, row.errors])
        )
    }

    const handleUpload = async () => {
        if (!selectedFile) {
            setFeedback({ severity: "error", message: "Please choose a CSV file first" })
            return
        }
        setUploading(true)
        setFailedRows([])
        try {
            const result = await dispatch(bulkUploadTickets(selectedFile)).unwrap()
            if (result.success) {
                setFeedback({ severity: "success", message: `Uploaded ${result.insertedCount} ticket(s) successfully` })
                setSelectedFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
            } else {
                setFailedRows(result.failedRows)
                setFeedback({ severity: "error", message: `${result.failedRows.length} row(s) failed validation - no tickets were uploaded` })
            }
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to upload file" })
        } finally {
            setUploading(false)
        }
    }

    return (
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
            <Typography variant="h5" gutterBottom>Bulk Upload Tickets</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download the blank template, fill in one row per ticket, then upload it here. Each row identifies
                its Circuit by Customer Name + Site Name + Vendor Circuit ID, which must match an existing active
                circuit. Unlike other bulk uploads, repeated rows for the same circuit are not treated as
                duplicates - creating several tickets against one circuit is normal. If any row fails validation,
                the entire file is rejected and nothing is uploaded.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3, flexWrap: "wrap" }}>
                <Button variant="outlined" onClick={handleDownloadTemplate}>Download Blank Template</Button>
                <Button variant="outlined" component="label">
                    Choose File
                    <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleFileChange} />
                </Button>
                {selectedFile && <Typography variant="body2">{selectedFile.name}</Typography>}
                <Button variant="contained" onClick={handleUpload} disabled={uploading || !selectedFile}>
                    {uploading ? "Uploading..." : "Upload"}
                </Button>
            </Box>

            {failedRows.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="h6" color="error">Validation failed - {failedRows.length} row(s)</Typography>
                        <Button variant="outlined" onClick={handleDownloadAuditReport}>Download Audit Report</Button>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Row</TableCell>
                                    <TableCell>Customer Name</TableCell>
                                    <TableCell>Site Name</TableCell>
                                    <TableCell>Vendor Circuit ID</TableCell>
                                    <TableCell>Errors</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {failedRows.map((row) => (
                                    <TableRow key={row.row}>
                                        <TableCell>{row.row}</TableCell>
                                        <TableCell>{row.customerName}</TableCell>
                                        <TableCell>{row.siteName}</TableCell>
                                        <TableCell>{row.vendorCircuitId}</TableCell>
                                        <TableCell>{row.errors}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Snackbar open={!!feedback} autoHideDuration={5000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Box>
    )
}
