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

// "Change Live Circuits Vendor wise and Live Circuits Country wise in
// Horizontal Bars" - these two can run to 80+/30+ categories; rotated
// labels on a vertical bar chart's X axis get unreadable at that count,
// while a horizontal layout puts each full name on its own row (Y axis,
// never rotated/truncated) - so the chart grows tall (one row per
// category) rather than wide. Not the default - every other CountChart
// usage has few enough categories that the normal vertical layout still
// reads fine and stays compact.
export function CountChart({ title, data, compact, horizontal }) {
    // ~18-20px per category row is enough for the row's own label plus its
    // bar; floor matches the normal vertical chart's own fixed height so a
    // near-empty horizontal chart isn't oddly short.
    const height = horizontal ? Math.max(compact ? 190 : 220, data.length * (compact ? 16 : 20) + 40) : (compact ? 190 : 220)
    return (
        <Paper sx={{ p: 1, height, display: "flex", flexDirection: "column" }}>
            <TileTitle compact={compact}>{title}</TileTitle>
            {data.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: compact ? "0.8rem" : "1.3rem" }}>No data</Typography>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    {/* "In all bar Charts, Display Number on top of each bar" -
                        extra top margin makes room for the label above the
                        tallest bar so it doesn't get clipped by the chart edge
                        (vertical layout only - horizontal's own labels sit to
                        the right of each bar instead, needing extra right
                        margin rather than top). Recharts' own "layout" prop is
                        named from the bar's growth axis, confusingly:
                        "vertical" bars grow left-to-right (horizontal on
                        screen), not top-to-bottom. */}
                    <BarChart
                        data={data}
                        layout={horizontal ? "vertical" : "horizontal"}
                        margin={horizontal ? { top: 8, right: 28, left: 8, bottom: 8 } : { top: 16, right: 8, left: 0, bottom: 32 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        {horizontal ? (
                            <>
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: compact ? 8 : 9 }} />
                                <YAxis type="category" dataKey="name" width={100} interval={0} tick={{ fontSize: compact ? 8 : 9 }} />
                            </>
                        ) : (
                            <>
                                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={40} tick={{ fontSize: compact ? 8 : 9 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: compact ? 8 : 9 }} />
                            </>
                        )}
                        <Tooltip contentStyle={compact ? { fontSize: "0.75rem" } : undefined} />
                        <Bar
                            dataKey="count"
                            fill="#1976d2"
                            isAnimationActive={false}
                            label={{ position: horizontal ? "right" : "top", fontSize: compact ? 8 : 9, fill: "#333" }}
                        />
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
    horizontal: PropTypes.bool,
}

CountChart.defaultProps = {
    horizontal: false,
}
