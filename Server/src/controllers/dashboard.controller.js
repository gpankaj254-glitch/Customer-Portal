const catchAsync = require("../utils/catchAsync");
const { dashboardService } = require("../services");

const getSummary = catchAsync(async (req, res) => {
  const summary = await dashboardService.getSummary(req.user);
  res.send(summary);
});

const getOpenTicketsAnalysis = catchAsync(async (req, res) => {
  const analysis = await dashboardService.getOpenTicketsAnalysis(req.user);
  res.send(analysis);
});

const getClosedTicketsAnalysis = catchAsync(async (req, res) => {
  const analysis = await dashboardService.getClosedTicketsAnalysis(req.body, req.user);
  res.send(analysis);
});

module.exports = {
  getSummary,
  getOpenTicketsAnalysis,
  getClosedTicketsAnalysis,
};
