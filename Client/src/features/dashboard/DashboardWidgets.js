import * as React from "react"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import PropTypes from "prop-types"
import Title from "./Title"

// compact: smaller title/value fonts and shorter tiles/charts, used by the
// SCX dashboard (which packs in more tiles and charts than the rest).
function TileTitle({ compact, children }) {
    if (!compact) {
        return <Title>{children}</Title>
    }
    return (
        <Typography component="h2" variant="caption" color="primary" sx={{ fontWeight: 600, fontSize: "0.7rem", lineHeight: 1.3 }}>
            {children}
        </Typography>
    )
}

TileTitle.propTypes = {
    compact: PropTypes.bool,
    children: PropTypes.node,
}

export function StatTile({ title, value, compact }) {
    return (
        <Paper sx={{ p: 1, display: "flex", flexDirection: "column", height: compact ? 62 : 90, justifyContent: "center" }}>
            <TileTitle compact={compact}>{title}</TileTitle>
            <Typography component="p" variant="h3" sx={{ fontSize: compact ? "1.1rem" : "1.75rem" }}>{value}</Typography>
        </Paper>
    )
}

StatTile.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    compact: PropTypes.bool,
}

export function CountChart({ title, data, compact }) {
    return (
        <Paper sx={{ p: 1, height: compact ? 190 : 220, display: "flex", flexDirection: "column" }}>
            <TileTitle compact={compact}>{title}</TileTitle>
            {data.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: compact ? "0.8rem" : "1.3rem" }}>No data</Typography>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    {/* "In all bar Charts, Display Number on top of each bar" -
                        extra top margin makes room for the label above the
                        tallest bar so it doesn't get clipped by the chart edge. */}
                    <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={40} tick={{ fontSize: compact ? 8 : 9 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: compact ? 8 : 9 }} />
                        <Tooltip contentStyle={compact ? { fontSize: "0.75rem" } : undefined} />
                        <Bar dataKey="count" fill="#1976d2" isAnimationActive={false} label={{ position: "top", fontSize: compact ? 8 : 9, fill: "#333" }} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Paper>
    )
}

CountChart.propTypes = {
    title: PropTypes.string.isRequired,
    data: PropTypes.array.isRequired,
    compact: PropTypes.bool,
}
