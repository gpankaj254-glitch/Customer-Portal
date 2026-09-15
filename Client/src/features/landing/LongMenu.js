import * as React from "react"
import IconButton from "@mui/material/IconButton"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import MoreVertIcon from "@mui/icons-material/MoreVert"

import { useSelector, useDispatch } from "react-redux"
import { logout, selectRefreshToken } from "../auth/authSlice" 

const ITEM_HEIGHT = 48

export default function LongMenu() {

    const refreshToken = useSelector(selectRefreshToken)
    const dispatch = useDispatch()

    const [anchorEl, setAnchorEl] = React.useState(null)
    const open = Boolean(anchorEl)
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget)
    }
    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleSignOutClick = () => {
        setAnchorEl(null)
        const payload = {
            "refreshToken" : refreshToken.token
        }
        dispatch(logout(payload))
    }

    const handleMyAccountClick = () => {
        setAnchorEl(null)
    }

    return (
        <div>
            <IconButton
                color="inherit"
                onClick={handleClick}
            >
                <MoreVertIcon />
            </IconButton>
            <Menu
                id="long-menu"
                MenuListProps={{
                    "aria-labelledby": "long-button",
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    style: {
                        maxHeight: ITEM_HEIGHT * 4.5,
                        width: "20ch",
                    },
                }}
            >
                <MenuItem key="signOut" onClick={handleSignOutClick}>
            Sign Out
                </MenuItem>

                <MenuItem key="myAccount" onClick={handleMyAccountClick}>
            My Account
                </MenuItem>

            </Menu>
        </div>
    )
}
