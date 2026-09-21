import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import Stepper from "@mui/material/Stepper"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import Chip from "@mui/material/Chip"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import PropTypes from "prop-types"
import _ from "lodash"
import { getFormattedDate } from "../../utils/dates"

// A ticket's Activity Log - every status change with who made it, when, and
// their comment. Opened from the Action/ Update column of the Tickets list
// (SCX roles only - see TicketsTable).
export default function ActivityLogDialog({ open, ticket, onClose }) {
    const history = _.get(ticket, "history", [])

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
            <DialogTitle>Activity Log{ticket ? ` - ${ticket.ticketId}` : ""}</DialogTitle>
            <DialogContent dividers>
                {history.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No activity yet</Typography>
                ) : (
                    <Stepper orientation="vertical" nonLinear>
                        {history.map((item, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <Step key={index} completed active>
                                <StepLabel>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Chip size="small" label={item.status} />
                                        <Typography variant="caption" color="text.secondary">
                                            {getFormattedDate(item.updatedAt)} - {_.get(item, "user.name", "")}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2">{item.comment}</Typography>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

ActivityLogDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    ticket: PropTypes.object,
    onClose: PropTypes.func.isRequired,
}

ActivityLogDialog.defaultProps = {
    ticket: null,
}
