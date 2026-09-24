import * as React from "react"
import PropTypes from "prop-types"
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
import Divider from "@mui/material/Divider"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { useDispatch } from "react-redux"
import { bulkUploadOpportunities, bulkUploadSupplierResponses } from "./opportunitySlice"
import { downloadCsv } from "../../utils/csv"

const OPPORTUNITY_TEMPLATE_HEADERS = [
    "Opportunity Name",
    "Customer Name",
    "Prospect Name",
    "Description",
    "Request ID",
    "Request Date",
    "Link Type",
    "Site Address",
    "City",
    "State",
    "Zip Code",
    "Country",
    "Product",
    "IP Requirement",
    "Interface",
    "Down Bandwidth",
    "Up Bandwidth",
    "Contract Term",
    "Quote Submit Date",
    "Quote Status",
    "Currency",
    "NRC",
    "MRC",
]

const SUPPLIER_RESPONSE_TEMPLATE_HEADERS = [
    "Customer Name",
    "Request Date",
    "Request Ref",
    "Link Category",
    "Address",
    "Supplier",
    "Quote Request Date",
    "LEC",
    "Currency",
    "NRC",
    "MRC",
    "Bandwidth",
    "Quote Submit Date",
    "Quote Status",
    "Remarks",
]

// Shared shape for both uploaders below - only the thunk, template headers,
// and failed-row table columns differ.
function BulkUploadSection({ title, description, templateHeaders, templateFilename, auditFilename, auditColumns, uploadThunk, successLabel }) {
    const dispatch = useDispatch()
    const [selectedFile, setSelectedFile] = React.useState(null)
    const [uploading, setUploading] = React.useState(false)
    const [failedRows, setFailedRows] = React.useState([])
    const [feedback, setFeedback] = React.useState(null)
    const fileInputRef = React.useRef(null)

    const handleDownloadTemplate = () => {
        downloadCsv(templateFilename, templateHeaders, [])
    }

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0] || null)
        setFailedRows([])
    }

    const handleDownloadAuditReport = () => {
        downloadCsv(
            auditFilename,
            auditColumns.map((column) => column.label),
            failedRows.map((row) => auditColumns.map((column) => row[column.id]))
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
            const result = await dispatch(uploadThunk(selectedFile)).unwrap()
            if (result.success) {
                setFeedback({ severity: "success", message: successLabel(result) })
                setSelectedFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
            } else {
                setFailedRows(result.failedRows)
                setFeedback({ severity: "error", message: `${result.failedRows.length} row(s) failed validation - nothing was uploaded` })
            }
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to upload file" })
        } finally {
            setUploading(false)
        }
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
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
                        <Typography variant="subtitle1" color="error">Validation failed - {failedRows.length} row(s)</Typography>
                        <Button variant="outlined" onClick={handleDownloadAuditReport}>Download Audit Report</Button>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {auditColumns.map((column) => (
                                        <TableCell key={column.id}>{column.label}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {failedRows.map((row, index) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <TableRow key={index}>
                                        {auditColumns.map((column) => (
                                            <TableCell key={column.id}>{row[column.id]}</TableCell>
                                        ))}
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

BulkUploadSection.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    templateHeaders: PropTypes.arrayOf(PropTypes.string).isRequired,
    templateFilename: PropTypes.string.isRequired,
    auditFilename: PropTypes.string.isRequired,
    auditColumns: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })).isRequired,
    uploadThunk: PropTypes.func.isRequired,
    successLabel: PropTypes.func.isRequired,
}

const opportunityAuditColumns = [
    { id: "row", label: "Row" },
    { id: "name", label: "Opportunity Name" },
    { id: "customerName", label: "Customer Name" },
    { id: "requestId", label: "Request ID" },
    { id: "errors", label: "Errors" },
]

const supplierResponseAuditColumns = [
    { id: "row", label: "Row" },
    { id: "customerName", label: "Customer Name" },
    { id: "requestRef", label: "Request Ref" },
    { id: "supplier", label: "Supplier" },
    { id: "errors", label: "Errors" },
]

export default function BulkUploadOpportunities() {
    return (
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
            <BulkUploadSection
                title="Bulk Upload Opportunities"
                description={
                    "Download the blank template, fill in one row per opportunity, then upload it here. Each row's " +
                    "Customer Name + Request Date + Request ID + Link Type + Site Address must be unique - a row that " +
                    "matches an existing opportunity, or another row in the same file, is rejected as a duplicate. A " +
                    "system-generated Opportunity ID is assigned to every row that passes. Quote Submit Date/Currency/" +
                    "NRC/MRC are optional and seed the Customer Request's own initial quote; Quote Status defaults to " +
                    "Pending if left blank. If any row fails validation, the entire file is rejected and nothing is " +
                    "uploaded."
                }
                templateHeaders={OPPORTUNITY_TEMPLATE_HEADERS}
                templateFilename="opportunity-bulk-upload-template.csv"
                auditFilename="opportunity-bulk-upload-audit-report.csv"
                auditColumns={opportunityAuditColumns}
                uploadThunk={bulkUploadOpportunities}
                successLabel={(result) => `Uploaded ${result.insertedCount} opportunity(ies) successfully`}
            />

            <Divider sx={{ my: 4 }} />

            <BulkUploadSection
                title="Upload Supplier Responses"
                description={
                    "Download the blank template, fill in one row per supplier quote, then upload it here. Each row " +
                    "is linked to an existing opportunity by Customer Name + Request Date + Request Ref + Link " +
                    "Category + Address - the same combination used to create it. If a row's Supplier already has an " +
                    "entry on that opportunity, its quote details are updated in place; otherwise a new Supplier " +
                    "Communication entry is added. Bandwidth and Remarks are optional. If any row fails validation " +
                    "or can't be matched to exactly one opportunity, the entire file is rejected and nothing is " +
                    "uploaded."
                }
                templateHeaders={SUPPLIER_RESPONSE_TEMPLATE_HEADERS}
                templateFilename="supplier-response-bulk-upload-template.csv"
                auditFilename="supplier-response-bulk-upload-audit-report.csv"
                auditColumns={supplierResponseAuditColumns}
                uploadThunk={bulkUploadSupplierResponses}
                successLabel={(result) => `Updated ${result.updatedCount} supplier response(s) across ${result.opportunitiesAffected} opportunity(ies)`}
            />
        </Box>
    )
}
