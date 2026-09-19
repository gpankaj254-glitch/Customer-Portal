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
import { selectPagination } from "./ticketSlice"
import { useSelector } from "react-redux"
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
	

    const [value, setValue] = React.useState(0)
    const handleChange = (event, newValue) => {
        console.log(newValue)
        setValue(newValue)
    }

    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN

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

    function toggleTabs() {
        switch (value) {
        case 1:
            return    <CreateTicket></CreateTicket>
        case 2:
            return    <TicketsTable pagination = {pagination} mode = "closed"  />
        case 3:
            return    <TicketsTable pagination = {pagination} mode = "completed"  />
        case 4:
            return isAdmin ? (
                <DeletedRecordsPanel
                    columns={deletedTicketColumns}
                    fetchDeleted={fetchDeletedTickets}
                    restoreRecord={fetchRestoreTicket}
                    permanentlyDeleteRecord={fetchPermanentlyDeleteTicket}
                    entityLabel="ticket"
                />
            ) : <TicketsTable pagination = {pagination} mode = "open"  />
        case 5:
            return isAdmin ? <BulkUploadTickets /> : <TicketsTable pagination = {pagination} mode = "open"  />
        default:
            return <TicketsTable pagination = {pagination} mode = "open"  />
        }
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, ...compactSx }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="user management">
                        <Tab label="View Open Ticket"/>
                        <Tab label="Create New Ticket"/>
                        <Tab label="View Closed Tickets"/>
                        <Tab label="Completed Tickets"/>
                        {isAdmin && <Tab label="Deleted Tickets"/>}
                        {isAdmin && <Tab label="Bulk Upload Tickets"/>}

                    </Tabs>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
                        {/* {pageStatus == pageStatusVals.idle && (<TicketsTable />)} */}
                        {/* <TicketsTable pagination = {pagination} open = {openTicketsTable} handleToggle = {handleToggleTicketsTable} /> */}
                        {toggleTabs()}

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
