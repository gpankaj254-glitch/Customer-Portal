import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import PropTypes from "prop-types"
import moment from "moment"

function formatDateTime(value) {
    return value ? moment(value).format("MMM D, YYYY h:mm A") : ""
}

// Read-only table of {status, currency, nrc, mrc, changedAt, user} entries,
// most recent first - shared by the Opportunity-level Log (Customer
// Request's own status history) and each Supplier Communication entry's own
// log. Status stays the leftmost column and Changed At the rightmost, with
// the currency/nrc/mrc snapshot and who made the change in between. A new
// entry is logged for a price change alone, not just a status change (see
// opportunity.service.js) - so this doubles as a price-change audit trail,
// not just a status log.
export function StatusHistoryTable({ history }) {
    const sorted = [...history].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell><Typography variant="subtitle2">Status</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Currency</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">NRC</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">MRC</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Changed By</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Changed At</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sorted.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6}>
                                <Typography variant="body2" color="text.secondary">
                                    No status changes recorded yet
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                    {sorted.map((entry, index) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <TableRow key={index}>
                            <TableCell>{entry.status}</TableCell>
                            <TableCell>{entry.currency || ""}</TableCell>
                            <TableCell>{entry.nrc ?? ""}</TableCell>
                            <TableCell>{entry.mrc ?? ""}</TableCell>
                            <TableCell>{(entry.user || {}).name || ""}</TableCell>
                            <TableCell>{formatDateTime(entry.changedAt)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

StatusHistoryTable.propTypes = {
    history: PropTypes.array.isRequired,
}

export default function StatusHistoryDialog({ open, title, history, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontSize: "1.1rem" }}>{title}</DialogTitle>
            <DialogContent>
                <StatusHistoryTable history={history} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

StatusHistoryDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    title: PropTypes.string,
    history: PropTypes.array.isRequired,
    onClose: PropTypes.func.isRequired,
}

StatusHistoryDialog.defaultProps = {
    title: "Status Log",
}
