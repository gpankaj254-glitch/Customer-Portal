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
// import CreateTickets from "./CreateTickets"
// import { Collapse } from "@mui/material"
// import { pageStatusVals } from "./utils"

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
            return    <TicketsTable pagination = {pagination} closed = {false}  />
        case 2:
            return    <TicketsTable pagination = {pagination} closed = {true}  />
        case 3:
            return isAdmin ? <BulkUploadTickets /> : <CreateTicket />
        default:
            return <CreateTicket></CreateTicket>
        }
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="user management">
                        <Tab label="Create New Ticket"/>
                        <Tab label="View Open Ticket"/>
                        <Tab label="View Closed Tickets"/>
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
