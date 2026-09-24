import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
// import Chart from "./Chart"
// import Deposits from "./Deposits"
// import Orders from "./Orders"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TicketsTable from "./TicketsTable"
import { selectPagination, setSearch } from "./ticketSlice"
import { useSelector, useDispatch } from "react-redux"
import CreateTicket from "./CreateTicket"
import BulkUploadTickets from "./BulkUploadTickets"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"
import { fetchDeletedTickets, fetchRestoreTicket, fetchPermanentlyDeleteTicket } from "./ticketsAPI"
// import CreateTickets from "./CreateTickets"
// import { Collapse } from "@mui/material"
// import { pageStatusVals } from "./utils"

const deletedTicketColumns = [
    { id: "ticketId", label: "Ticket ID" },
    { id: "customerReference", label: "Customer Reference" },
    { id: "problemType", label: "Problem Type" },
    { id: "priority", label: "Priority" },
    { id: "status", label: "Status" },
]

// Smaller fonts for everything on the Tickets page (tab row, the Open/Closed/
// Completed lists, an expanded ticket's details, Create, Deleted and Bulk
// Upload). Applied here on the page container rather than in each component,
// so the shared ones (DeletedRecordsPanel etc.) stay untouched for other
// pages. Menus, dialogs and snackbars render outside this container, so they
// keep their normal size.
const compactSx = {
    "& .MuiTabs-root": { minHeight: 34 },
    "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.75rem" },
    "& .MuiTableCell-root": { fontSize: "0.75rem", padding: "6px 10px" },
    "& .MuiTypography-body1, & .MuiTypography-body2, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2, & .MuiTypography-h6": { fontSize: "0.75rem" },
    "& .MuiTypography-h5": { fontSize: "1rem" },
    "& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormControlLabel-label, & .MuiButton-root, & .MuiAlert-root, & .MuiFormHelperText-root": { fontSize: "0.75rem" },
    "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": { fontSize: "0.75rem" },
    "& .MuiOutlinedInput-input": { padding: "8px 12px" },
    "& .MuiChip-root": { height: 20 },
    "& .MuiChip-label": { fontSize: "0.68rem" },
    "& .MuiIconButton-root .MuiSvgIcon-root": { fontSize: "1.1rem" },
}

function TicketsContent() {

    // const [openCreateTickets, setOpenCreateTickets] = React.useState(false)
    // const [openTicketsTable, setOpenTicketsTable] = React.useState(true)
	

    const dispatch = useDispatch()
    const [value, setValue] = React.useState(0)
    // "Same issue - Ticket ID → NOC" - ScxDashboard's Ticket ID link seeds
    // Tickets' shared search (via focusTicket) to jump straight to one
    // ticket, but that search then stuck around in Redux indefinitely, even
    // after navigating away and back. "View Open Ticket" is always index 0
    // (the tab a Ticket ID link lands on - see the tabs array below), so a
    // direct click back onto it always starts from the full, unfiltered
    // list instead - same fix already applied to Inventory's Circuit tabs
    // and Sales Opportunities' Opportunity List tab.
    const handleChange = (event, newValue) => {
        if (newValue === 0) {
            dispatch(setSearch(""))
        }
        setValue(newValue)
    }

    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    // Customers don't get a Completed tab - "Completed" is SCX's final
    // bookkeeping step after a ticket is closed, so for them a completed
    // ticket simply stays under View Closed Tickets (see getClosedTickets).
    const isCustomer = currentUser.role === roles.CUSTOMER_ADMIN || currentUser.role === roles.CUSTOMER_USER
    // SCX Management's Tickets access is read-only (no createTickets right) -
    // the tab is left out entirely (see the tabs array below), same as every
    // other read-only role/module in this app (Inventory/Sites/Customers'
    // Create tabs, Deleted/Bulk Upload below) - not shown-but-disabled, which
    // read as a bug ("Create Ticket Tab (blocked) visible to Management
    // user").
    const isManagement = currentUser.role === roles.SCLOUDX_MANAGEMENT

    // function handleToggleCreateTickets(){
    // 	setOpenCreateTickets(!openCreateTickets)
    // 	if (openCreateTickets) {
    // 		setOpenTicketsTable(false)
    // 	}
    // }

    // function handleToggleTicketsTable(){
    //     setOpenTicketsTable(!openTicketsTable)
    // }

    // const dispatch = useDispatch()
    // const error = useSelector(selectGetTicketsError)
    // const pageStatus = useSelector(selectPageStatus)
    // dispatch(getTickets())

    const pagination = useSelector(selectPagination)

    // Built up conditionally (same pattern as Inventory.js/Sites.js's own
    // tabs array) rather than a fixed-index switch, so a role that doesn't
    // get one of these tabs (Management's Create, a Customer's Completed,
    // non-Admin's Deleted/Bulk Upload) simply never sees it - no gap, no
    // index mismatch between the Tab row and its content below.
    const tabs = [
        { label: "View Open Ticket", content: <TicketsTable pagination={pagination} mode="open" /> },
    ]
    if (!isManagement) {
        tabs.push({ label: "Create New Ticket", content: <CreateTicket /> })
    }
    tabs.push({ label: "View Closed Tickets", content: <TicketsTable pagination={pagination} mode="closed" /> })
    if (!isCustomer) {
        tabs.push({ label: "Completed Tickets", content: <TicketsTable pagination={pagination} mode="completed" /> })
    }
    if (isAdmin) {
        tabs.push({
            label: "Deleted Tickets",
            content: (
                <DeletedRecordsPanel
                    columns={deletedTicketColumns}
                    fetchDeleted={fetchDeletedTickets}
                    restoreRecord={fetchRestoreTicket}
                    permanentlyDeleteRecord={fetchPermanentlyDeleteTicket}
                    entityLabel="ticket"
                />
            ),
        })
        tabs.push({ label: "Bulk Upload Tickets", content: <BulkUploadTickets /> })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, ...compactSx }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="user management">
                        {tabs.map((tab) => (
                            <Tab key={tab.label} label={tab.label} />
                        ))}
                    </Tabs>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
                        {tabs[value] ? tabs[value].content : tabs[0].content}
                    </Paper>
                </Grid>
                {/* <Grid item xs={12}>
						<Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
							// {/* {pageStatus == pageStatusVals.idle && (<TicketsTable />)} 
							<CreateTickets open = {openCreateTickets} handleToggle = {handleToggleCreateTickets} />
						</Paper>
					</Grid> */}
            </Grid>
        </Container>
    )
}

export default function Tickets() {
    return <TicketsContent />
}
