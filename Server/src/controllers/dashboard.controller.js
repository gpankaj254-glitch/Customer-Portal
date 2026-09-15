const catchAsync = require("../utils/catchAsync");
const { dashboardService } = require("../services");

const getSummary = catchAsync(async (req, res) => {
  const summary = await dashboardService.getSummary(req.user);
  res.send(summary);
});

const getClosedTicketsAnalysis = catchAsync(async (req, res) => {
  const analysis = await dashboardService.getClosedTicketsAnalysis(req.body, req.user);
  res.send(analysis);
});

module.exports = {
  getSummary,
  getClosedTicketsAnalysis,
};
