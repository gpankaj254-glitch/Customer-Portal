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
import { useDispatch, useSelector } from "react-redux"
import { bulkUploadSites, getSites, selectPagination, selectSearch } from "./siteSlice"
import { downloadCsv } from "../../utils/csv"

const TEMPLATE_HEADERS = ["Customer Name", "Site Name", "End User", "Address", "Town", "Postal Code", "Country"]

export default function BulkUploadSites() {
    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)
    const [selectedFile, setSelectedFile] = React.useState(null)
    const [uploading, setUploading] = React.useState(false)
    const [failedRows, setFailedRows] = React.useState([])
    const [feedback, setFeedback] = React.useState(null)
    const fileInputRef = React.useRef(null)

    const handleDownloadTemplate = () => {
        downloadCsv("site-bulk-upload-template.csv", TEMPLATE_HEADERS, [])
    }

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0] || null)
        setFailedRows([])
    }

    const handleDownloadAuditReport = () => {
        downloadCsv(
            "site-bulk-upload-audit-report.csv",
            ["Row", "Customer Name", "Site Name", "Errors"],
            failedRows.map((row) => [row.row, row.customerName, row.siteName, row.errors])
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
            const result = await dispatch(bulkUploadSites(selectedFile)).unwrap()
            if (result.success) {
                setFeedback({ severity: "success", message: `Uploaded ${result.insertedCount} site(s) successfully` })
                setSelectedFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
                dispatch(getSites({ limit: pagination.limit, page: pagination.page + 1, search }))
            } else {
                setFailedRows(result.failedRows)
                setFeedback({ severity: "error", message: `${result.failedRows.length} row(s) failed validation - no sites were uploaded` })
            }
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to upload file" })
        } finally {
            setUploading(false)
        }
    }

    return (
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
            <Typography variant="h5" gutterBottom>Bulk Upload Sites</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download the blank template, fill in one row per site, then upload it here. Customer Name must
                exactly match an existing customer, and duplicate sites (same Customer + Site Name) are rejected.
                If any row fails validation, the entire file is rejected and nothing is uploaded.
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
                                    <TableCell>Errors</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {failedRows.map((row) => (
                                    <TableRow key={row.row}>
                                        <TableCell>{row.row}</TableCell>
                                        <TableCell>{row.customerName}</TableCell>
                                        <TableCell>{row.siteName}</TableCell>
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
