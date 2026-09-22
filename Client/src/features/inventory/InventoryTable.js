/* eslint-disable no-unused-vars */
import * as React from "react"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import PropTypes from "prop-types"
import {changeLimit, changePage, getSites, selectGetSiteError, selectSiteList, selectPageStatus, selectFocusSiteId, clearFocusSite} from "./inventorySlice"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Collapse, IconButton, Typography} from "@mui/material"
import { pageStatusVals} from "./utils"
import _ from "lodash"
import {  KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import CircuitTable from "./CircuitTable"
import { combineAddress } from "../../utils/address"

const columns = [
    { id: "icon", label: ""},
    { id: "customer", label: "Customer Name"},
    { id: "endUser", label: "End User"},
    { id: "siteId", label: "Site Name"},
    { id: "address", label: "Site Address", maxWidth: 2},
    { id: "circuits", label: "Circuit Count"},

]

function createDisplayData (data) {
    return {
        customer : _.get(data, "customer.name", ""),
        region : _.get(data, "region.name", ""),
        endUser : _.get(data, "customerSiteIdentifier", ""),
        siteId : _.get(data, "name", ""),
        circuits : _.get(data, "circuitCount", ""),
        address : combineAddress(_.get(data, "location", {})),

    }

}


export default function InventoryTable(props) {

    const status = useSelector(selectPageStatus)
    const errorMessage = useSelector(selectGetSiteError)
    const siteList = useSelector(selectSiteList)
    const pagination = props.pagination
    const details = props.details

    const [open, setOpen] = React.useState(false)
    // const [details, setDetails] = React.useState(true)

    const dispatch = useDispatch()
    const focusSiteId = useSelector(selectFocusSiteId)

    // Arriving from another page for a specific site (see the Finance
    // dashboard's Site Name link, via inventorySlice's focusSite): expand
    // its circuits as soon as its row is in the (search-filtered) list.
    React.useEffect(() => {
        if (!focusSiteId) {
            return
        }
        const match = siteList.find((site) => site.id === focusSiteId)
        if (match) {
            setOpen(match.id)
            dispatch(clearFocusSite())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteList, focusSiteId])

    const handleChangePage = (event, newPage) => {    
        const data = {
            limit: pagination.limit,
            page: pagination.page +1
        }
        dispatch(changePage(newPage))
        dispatch(getSites(data))
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
    }

    const handleRowClick = (event, rowId) => {
        console.log("event"+ JSON.stringify(rowId))
        if (open === rowId){
            setOpen(false)
        } else {
            setOpen(rowId)
        }
    }

    function createDataRow (row) {
        const displayData = createDisplayData(row)
        return (<TableRow key={row.id} >
             {details && (<TableCell>
                <IconButton onClick={(event) => handleRowClick(event, row.id)}
                >
                    {open === row.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
            </TableCell>)}
            {
                columns.map((column) => (
                    <TableCell
                        key={`${row.id}${column.id}`}
                    >
                        <Typography variant="body2">{_.get(displayData, column.id, "")}
                        </Typography>
                    </TableCell>
                ))}
        </TableRow>)


    }

    // React.useEffect(() => {
    //     const data = {
    //         limit: pagination.limit,
    //         page: pagination.page +1
    //     }
    //     dispatch(getSites(data))
    // }, [])

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    } else if (status === pageStatusVals.loading) {
        return <div>loading</div>
    } else if (status === pageStatusVals.fetched) {
        return (
            <Paper sx={{ width: "100%", overflow: "hidden" }}>
                <TableContainer sx={{ height: 1 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                {details && (<TableCell>
                                </TableCell>)}
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        // align="left"
                                        style={{ minWidth: column.minWidth}}
                                    >
                                        <Typography variant="h6">{column.label}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {siteList.map((row) => (
                                <React.Fragment key={`${row.code}-div`}>
                                    {createDataRow(row)}
                                    {details && <TableRow key={`${row.id}-collapse`} >
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0, maxWidth: 1 }} colSpan={columns.length + 1}>
                                            <Collapse in = {open === row.id}>
                                            <CircuitTable circuitList={row.circuitList} site={row}></CircuitTable>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>}
                                </React.Fragment>
                            ))}

                        </TableBody>
                    </Table>
                    {/* {payload.results} */}
                </TableContainer>
                {details && <TablePagination
                    rowsPerPageOptions={false}
                    component="div"
                    count={pagination.totalResults}
                    rowsPerPage={pagination.limit}
                    page={pagination.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />}
            </Paper>
        )
    }
}

InventoryTable.propTypes = {
    pagination: PropTypes.object,
    open: PropTypes.bool,
    details: PropTypes.bool,
    handleToggle: PropTypes.func
}