// import * as React from "react"
// import Grid from "@mui/material/Grid"
// import Card from "@mui/material/Card"
// import CardContent from "@mui/material/CardContent"
// import Typography from "@mui/material/Typography"

// import PropTypes from "prop-types"
// import CircuitTable from "./CircuitTable"

// function getContacts(contacts) { 
//     if (contacts.length == 0) {
//         return (<CardContent >
//             <Typography gutterBottom variant="body2" component="div">
// 				No contacts available
//             </Typography>
//         </CardContent>)
//     }
//     return contacts.map((contact) => 
//         <CardContent key = {contact.code}>
//             <Typography gutterBottom variant="body2" component="div">
//                 {contact.name}
//             </Typography>
//             {contact.phoneNumbers.map((number) =>
//                 <Typography key={number} gutterBottom variant="body2" component="div">
//                     {number}
//                 </Typography>
//             )} 
//             {contact.emailIds.map((email) =>
//                 <Typography key={email} gutterBottom variant="body2" component="div">
//                     {email}
//                 </Typography>
//             )} 
//         </CardContent>
//     )}

// function getCircuits(circuits) {
//     // if(contacts.isArray()){
//     if (circuits.length == 0) {
//         return (<CardContent >
//             <Typography gutterBottom variant="body2" component="div">
//                     No circuits available
//             </Typography>
//         </CardContent>)
//     }
//     return circuits.map(( circuit) =>
//         <CardContent key = {circuit.code}>
//             <Typography gutterBottom variant="body2" component="div">
//                     CIRCUIT
//             </Typography>
//             <Typography gutterBottom variant="body2" component="div">
// 					Order Reference Number : {circuit.orderReference}
//             </Typography>
//             <Typography gutterBottom variant="body2" component="div">
// 					Provider : {circuit.provider}
//             </Typography>
//             <Typography gutterBottom variant="body2" component="div">
// 					Provider Identifier : {circuit.providerCircuitId}
//             </Typography>
//         </CardContent>
//     )}

// function getLocationDetails(location) {
//     return <CardContent>
//         <Typography gutterBottom variant="body2" component="div">
//             {location.address}
//         </Typography>
//     </CardContent>
// }
    
// export default function SiteDetails(props) {

//     return (
//         <Grid container spacing={2} sx={{p:"0.9rem"}} >
//             <Grid item xs={12} md={12} align = "center" >
//                 <Card sx={{height : "100%", alignItems:"center"}}>
//                     {getLocationDetails(props.location)}
//                 </Card>
//             </Grid>
//             <Grid item xs={12} md={12} align = "center">
//                 <Card sx={{height : "100%", width : "100%", alignItems:"center", align : "center"}}>
//                     {/* {getCircuits(props.circuitList)} */}
//                     <CircuitTable circuitList={props.circuitList}></CircuitTable>
//                 </Card>
//             </Grid>
//             <Grid item xs={12} md={12} align = "center">
//                 <Card sx={{height : "100%", width : "100%", alignItems:"center", align : "center"}}>
//                     {getContacts(props.contactList)}
//                 </Card>
//             </Grid>

//         </Grid>
//     )}

// SiteDetails.propTypes = {
//     contactList: PropTypes.array,
//     circuitList: PropTypes.array,
//     location: PropTypes.object,
// }