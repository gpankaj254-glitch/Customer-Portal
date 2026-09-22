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

// A delivery order's Activity Log - every real Status transition (plus
// automatic Circuit creation on completion) with who made it, when, and a
// description. "Activity Log function for Service Delivery Process as
// created and managed in NOC Management" - same feature/shape as Ticket's
// own Activity Log (see tickets/ActivityLogDialog.js), reused here for
// Delivery Orders. Opened from the Service Delivery Management list
// (DeliveryOrderTable).
export default function ActivityLogDialog({ open, order, onClose }) {
    const history = _.get(order, "history", [])

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
            <DialogTitle>Activity Log{order ? ` - ${order.orderId}` : ""}</DialogTitle>
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
    order: PropTypes.object,
    onClose: PropTypes.func.isRequired,
}

ActivityLogDialog.defaultProps = {
    order: null,
}
