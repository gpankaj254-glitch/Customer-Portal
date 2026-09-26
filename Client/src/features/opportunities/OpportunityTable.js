import * as React from "react"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import IconButton from "@mui/material/IconButton"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import HistoryIcon from "@mui/icons-material/History"
import Collapse from "@mui/material/Collapse"
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import Snackbar from "@mui/material/Snackbar"

import PropTypes from "prop-types"
import { getFormattedDateTime as formatDateTime } from "../../utils/dates"

// eslint-disable-next-line no-unused-vars
import { changeLimit, changePage, getOpportunities, selectGetOpportunitiesError, selectOpportunityList, deactivateOpportunity, updateOpportunity } from "./opportunitySlice"
import { quoteStatusOptions, linkTypeOptions, ipRequirementOptions, interfaceOptions } from "../../consts/opportunityCommOptions"
import { currencyOptions } from "../../consts/currencyOptions"
import { useCircuitFieldOptions } from "../inventory/circuitActions"
import { countryOptions } from "../../consts/countryOptions"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Typography } from "@mui/material"
import _ from "lodash"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"
import StatusHistoryDialog from "../../components/StatusHistoryDialog"
import OpportunityDetails from "./OpportunityDetails"

function displayCustomerOrProspect(row) {
    return _.get(row, "customer.name") || row.prospectName || ""
}

// "Sales Opportunity List, remove Currency, NRC, MRC; Display Link type,
// Download BW, Site Address+City+Country" - Currency/NRC/MRC stay editable
// (Edit Opportunity dialog below and the Opportunity Details tab), just no
// longer shown as their own list columns; the three new ones are Customer
// Request fields already captured at creation, just not previously listed.
// "Add PIN Code In Address+City+Country+PIN" - zipCode appended the same way.
function displaySiteLocation(row) {
    return [
        _.get(row, "customerRequest.siteAddress"),
        _.get(row, "customerRequest.city"),
        _.get(row, "customerRequest.country"),
        _.get(row, "customerRequest.zipCode"),
    ].filter(Boolean).join(", ")
}

const columns = [
    { id: "opportunityId", label: "Opportunity #" },
    { id: "name", label: "Name" },
    { id: "customerOrProspect", label: "Customer / Prospect", render: displayCustomerOrProspect },
    {
        id: "customerRequest.requestDate",
        label: "Request Date",
        render: (row) => formatDateTime(_.get(row, "customerRequest.requestDate")),
    },
    { id: "customerRequest.quoteStatus", label: "Quote Status" },
    { id: "customerRequest.linkType", label: "Link Type" },
    { id: "customerRequest.downBandwidth", label: "Download BW" },
    { id: "siteLocation", label: "Site Address / City / Country / PIN", render: displaySiteLocation },
]

const currencySelectOptions = currencyOptions.map((option) => ({
    value: option.code,
    label: `${option.code} - ${option.name}`,
}))
const countrySelectOptions = countryOptions.map((option) => ({ value: option, label: option }))
// A plain option list ("Primary"/"Secondary" etc.) rendered as EditDialog
// select options, with an explicit None first choice - every one of these
// Customer Request fields is optional, same as on Create Opportunity's own
// (raw MUI Select, each with its own "<em>None</em>" item) equivalents.
function withNone(options) {
    return [{ value: "", label: "None" }, ...options.map((option) => ({ value: option, label: option }))]
}

export default function OpportunityTable(props) {
    const errorMessage = useSelector(selectGetOpportunitiesError)
    const opportunityList = useSelector(selectOpportunityList)
    const currentUser = useSelector(selectUser)
    const canDelete = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_SALES_ADMIN
    // SCX Management has viewOpportunities only (no editOpportunities), so
    // the Edit icon here - unconditional for every other viewer of this
    // page, who all do have that right - is hidden for it specifically.
    // Also passed down as OpportunityDetails' readOnly, which closes the
    // same gap for Supplier Communication's own Add/Edit/Delete/Save
    // controls ("remove Sales Opportunity Edit Option from Management
    // Login, they should only view the opportunity and see the activity
    // log") - Management still gets the row's Activity Log and Attachments
    // view icons, just not anything that writes.
    const canEdit = currentUser.role !== roles.SCLOUDX_MANAGEMENT
    // "Create Product Management Function for SCX Admin ... these values
    // should be visible in various dropdown menus" - Product/Bandwidth
    // dropdowns in the Edit Opportunity dialog below now read the merged
    // (static + admin-added) list.
    const { productOptions, bandwidthOptions } = useCircuitFieldOptions()

    const pagination = props.pagination
    const { autoExpandOpportunityId, onAutoExpanded } = props
    const dispatch = useDispatch()

    const [opportunityToDelete, setOpportunityToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [opportunityToEdit, setOpportunityToEdit] = React.useState(null)
    const [opportunityToViewLog, setOpportunityToViewLog] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)
    const [open, setOpen] = React.useState(false)

    const handleRowExpand = (rowId) => {
        setOpen(open === rowId ? false : rowId)
    }

    // Auto-expand a just-created opportunity's row once it shows up in the
    // (re-fetched) list, then clear the request so it doesn't re-trigger.
    React.useEffect(() => {
        if (autoExpandOpportunityId && opportunityList.some((row) => row.id === autoExpandOpportunityId)) {
            setOpen(autoExpandOpportunityId)
            onAutoExpanded()
        }
    }, [autoExpandOpportunityId, opportunityList, onAutoExpanded])

    const handleChangePage = (event, newPage) => {
        dispatch(changePage(newPage))
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateOpportunity(opportunityToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Opportunity "${opportunityToDelete.name}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete opportunity" })
        } finally {
            setDeleting(false)
            setOpportunityToDelete(null)
        }
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            const payload = {
                opportunityId: opportunityToEdit.id,
                stage: values.stage,
                description: values.description,
                // customerRequest is merged server-side, not replaced, so
                // sending just these fields doesn't wipe out the rest of
                // customerRequest that Create Opportunity captured.
                // "New Tab ... Opportunity Details - Display all information
                // captured under create opportunity with Edit option" - every
                // Create Opportunity Customer Request field is now editable
                // here too, not just the original Quote Submit Date/Status/
                // Currency/NRC/MRC subset.
                customerRequest: {
                    requestId: values.requestId,
                    requestDate: values.requestDate,
                    linkType: values.linkType,
                    siteAddress: values.siteAddress,
                    city: values.city,
                    state: values.state,
                    zipCode: values.zipCode,
                    country: values.country,
                    product: values.product,
                    ipRequirement: values.ipRequirement,
                    interface: values.interface,
                    downBandwidth: values.downBandwidth,
                    upBandwidth: values.upBandwidth,
                    contractTerm: values.contractTerm,
                    quoteSubmitDate: values.quoteSubmitDate,
                    quoteStatus: values.quoteStatus,
                    currency: values.currency,
                    nrc: values.nrc !== "" && values.nrc !== undefined ? Number(values.nrc) : null,
                    mrc: values.mrc !== "" && values.mrc !== undefined ? Number(values.mrc) : null,
                },
            }
            if (values.stage === "Converted") {
                payload.convertedOrder = {
                    orderNumber: values.orderNumber || "",
                    orderValue: values.orderValue !== "" && values.orderValue !== undefined
                        ? Number(values.orderValue)
                        : undefined,
                }
            }
            await dispatch(updateOpportunity(payload)).unwrap()
            setFeedback({ severity: "success", message: `Opportunity "${values.name}" updated successfully` })
            setOpportunityToEdit(null)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update opportunity" })
        } finally {
            setSaving(false)
        }
    }

    const editFields = (values) => {
        const fields = [
            { name: "name", label: "Opportunity Name", disabled: true },
            // "Edit Opportunity - Description - Make it words wrap, bigger
            // window scrollable" - multiline grows with content up to
            // maxRows, then scrolls within itself rather than endlessly
            // stretching the dialog.
            { name: "description", label: "Description", multiline: true, minRows: 4, maxRows: 10 },
            { name: "requestId", label: "Request ID" },
            { name: "requestDate", label: "Request Date", type: "date" },
            { name: "linkType", label: "Link Type", type: "select", options: withNone(linkTypeOptions) },
            { name: "siteAddress", label: "Site Address" },
            { name: "city", label: "City" },
            { name: "state", label: "State" },
            { name: "zipCode", label: "ZIP Code" },
            { name: "country", label: "Country", type: "autocomplete", options: countrySelectOptions },
            { name: "product", label: "Product", type: "select", options: withNone(productOptions) },
            { name: "ipRequirement", label: "IP Requirement", type: "select", options: withNone(ipRequirementOptions) },
            { name: "interface", label: "Interface", type: "select", options: withNone(interfaceOptions) },
            { name: "downBandwidth", label: "Down Bandwidth", type: "select", options: withNone(bandwidthOptions) },
            { name: "upBandwidth", label: "Up Bandwidth", type: "select", options: withNone(bandwidthOptions) },
            { name: "contractTerm", label: "Contract Term" },
            {
                name: "quoteStatus",
                label: "Quote Status",
                type: "select",
                options: quoteStatusOptions.map((status) => ({ value: status, label: status })),
            },
            { name: "quoteSubmitDate", label: "Quote Submit Date", type: "date" },
            { name: "currency", label: "Currency", type: "autocomplete", options: currencySelectOptions },
            { name: "nrc", label: "NRC" },
            { name: "mrc", label: "MRC" },
        ]
        if (_.get(values, "stage") === "Converted") {
            fields.push(
                { name: "orderNumber", label: "Order Number" },
                { name: "orderValue", label: "Order Value" },
            )
        }
        return fields
    }

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    }
    else {
        return (
            <Paper sx={{ width: "100%", overflow: "hidden" }}>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader size="small" aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell key={column.id}>
                                        <Typography variant="subtitle2">{column.label}</Typography>
                                    </TableCell>
                                ))}
                                <TableCell align="right">
                                    <Typography variant="subtitle2">Actions</Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {opportunityList.map((row) => (
                                <React.Fragment key={row.id}>
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableCell key={`${row.id}${column.id}`}>
                                                <Typography variant="body2">
                                                    {column.render ? column.render(row) : _.get(row, column.id, "")}
                                                </Typography>
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">
                                            {canEdit && (
                                                <IconButton
                                                    size="small"
                                                    aria-label={`edit ${row.name}`}
                                                    onClick={() => setOpportunityToEdit(row)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            {canDelete && (
                                                <IconButton
                                                    size="small"
                                                    aria-label={`delete ${row.name}`}
                                                    onClick={() => setOpportunityToDelete(row)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            <IconButton
                                                size="small"
                                                aria-label={`log ${row.name}`}
                                                onClick={() => setOpportunityToViewLog(row)}
                                            >
                                                <HistoryIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                aria-label={`communications ${row.name}`}
                                                onClick={() => handleRowExpand(row.id)}
                                            >
                                                {open === row.id ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columns.length + 1}>
                                            <Collapse in={open === row.id}>
                                                {open === row.id && (
                                                <OpportunityDetails
                                                    opportunity={row}
                                                    readOnly={!canEdit}
                                                    onEdit={canEdit ? () => setOpportunityToEdit(row) : undefined}
                                                />
                                            )}
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={false}
                    component="div"
                    count={pagination.totalResults}
                    rowsPerPage={pagination.limit}
                    page={pagination.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
                <ConfirmDialog
                    open={!!opportunityToDelete}
                    title="Delete opportunity"
                    message={`Are you sure you want to delete "${opportunityToDelete && opportunityToDelete.name}"? This cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setOpportunityToDelete(null)}
                    loading={deleting}
                />
                <EditDialog
                    open={!!opportunityToEdit}
                    title="Edit opportunity"
                    fields={editFields}
                    initialValues={{
                        name: opportunityToEdit ? opportunityToEdit.name : "",
                        stage: opportunityToEdit ? opportunityToEdit.stage : "New",
                        description: opportunityToEdit ? opportunityToEdit.description : "",
                        orderNumber: _.get(opportunityToEdit, "convertedOrder.orderNumber") || "",
                        orderValue: _.get(opportunityToEdit, "convertedOrder.orderValue") || "",
                        requestId: _.get(opportunityToEdit, "customerRequest.requestId") || "",
                        requestDate: _.get(opportunityToEdit, "customerRequest.requestDate") || "",
                        linkType: _.get(opportunityToEdit, "customerRequest.linkType") || "",
                        siteAddress: _.get(opportunityToEdit, "customerRequest.siteAddress") || "",
                        city: _.get(opportunityToEdit, "customerRequest.city") || "",
                        state: _.get(opportunityToEdit, "customerRequest.state") || "",
                        zipCode: _.get(opportunityToEdit, "customerRequest.zipCode") || "",
                        country: _.get(opportunityToEdit, "customerRequest.country") || "",
                        product: _.get(opportunityToEdit, "customerRequest.product") || "",
                        ipRequirement: _.get(opportunityToEdit, "customerRequest.ipRequirement") || "",
                        interface: _.get(opportunityToEdit, "customerRequest.interface") || "",
                        downBandwidth: _.get(opportunityToEdit, "customerRequest.downBandwidth") || "",
                        upBandwidth: _.get(opportunityToEdit, "customerRequest.upBandwidth") || "",
                        contractTerm: _.get(opportunityToEdit, "customerRequest.contractTerm") || "",
                        quoteSubmitDate: _.get(opportunityToEdit, "customerRequest.quoteSubmitDate") || "",
                        quoteStatus: _.get(opportunityToEdit, "customerRequest.quoteStatus") || "Pending",
                        currency: _.get(opportunityToEdit, "customerRequest.currency") || "",
                        nrc: _.get(opportunityToEdit, "customerRequest.nrc") ?? "",
                        mrc: _.get(opportunityToEdit, "customerRequest.mrc") ?? "",
                    }}
                    onSave={handleSaveEdit}
                    onCancel={() => setOpportunityToEdit(null)}
                    loading={saving}
                    dense
                    maxWidth="md"
                />
                <StatusHistoryDialog
                    open={!!opportunityToViewLog}
                    title="Opportunity Status Log"
                    history={_.get(opportunityToViewLog, "customerRequest.statusHistory", [])}
                    onClose={() => setOpportunityToViewLog(null)}
                />
                <Snackbar
                    open={!!feedback}
                    autoHideDuration={4000}
                    onClose={() => setFeedback(null)}
                >
                    {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
                </Snackbar>
            </Paper>
        )
    }
}

OpportunityTable.propTypes = {
    pagination: PropTypes.object,
    autoExpandOpportunityId: PropTypes.string,
    onAutoExpanded: PropTypes.func,
}

OpportunityTable.defaultProps = {
    autoExpandOpportunityId: null,
    onAutoExpanded: () => {},
}
