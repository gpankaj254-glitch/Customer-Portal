import * as React from "react"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Typography from "@mui/material/Typography"

import PropTypes from "prop-types"
import { Grid } from "@mui/material"



export default function ContactCard(props) {
    return (
                 <Card sx={{height : "100%", width : "100%", alignItems:"center", align : "center"}}>
                                        <CardContent key = {props.name}>

                                            <Grid container spacing={2}>
                                            <Grid item xs={12} sm={12}>
{/* 
<Typography  variant="h5">
    {props.title}
</Typography> */}

</Grid>

                                            <Grid item xs={12} sm={4}>

            <Typography  variant="body2" component="span">
                {props.name} 
            </Typography>

            </Grid>

            <Grid item xs={12} sm={4}>

            {props.phoneNumbers.map((number) =>
                <Typography key={number}  variant="body2" component="span">
                    {number} 
                </Typography>
            )} 
            </Grid>
            <Grid item xs={12} sm={4}>

            {props.emailIds.map((email) =>
                <Typography key={email}  variant="body2" component="span">
                    {email}
                </Typography>
            )} 
                        </Grid>

            </Grid>
        </CardContent>
                </Card>
    )}

ContactCard.propTypes = {
    // title: PropTypes.string,
    name: PropTypes.string,
    phoneNumbers: PropTypes.array,
    emailIds: PropTypes.array,
}