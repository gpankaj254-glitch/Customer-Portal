import * as React from "react"
import TextField from "@mui/material/TextField"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"
import PropTypes from "prop-types"

// Drop-in replacement for <TextField type="password" .../> - adds a
// show/hide (eye) icon so the user can check what they typed. Every other
// TextField prop (value, onChange, label, error, helperText, required,
// margin, etc.) just passes through. Used everywhere a password is entered:
// Sign In, Forgot/Reset Password, Create User, Admin Reset Password.
export default function PasswordField({ InputProps, ...props }) {
    const [visible, setVisible] = React.useState(false)

    return (
        <TextField
            {...props}
            type={visible ? "text" : "password"}
            InputProps={{
                ...InputProps,
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                            aria-label={visible ? "Hide password" : "Show password"}
                            title={visible ? "Hide password" : "Show password"}
                            onClick={() => setVisible((prev) => !prev)}
                            edge="end"
                            tabIndex={-1}
                        >
                            {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                    </InputAdornment>
                ),
            }}
        />
    )
}

PasswordField.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    InputProps: PropTypes.object,
}

PasswordField.defaultProps = {
    InputProps: undefined,
}
