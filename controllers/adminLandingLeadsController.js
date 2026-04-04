const mongoose = require("mongoose");
const LandingLead = require("../models/LandingLead");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const listLeads = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const landingPageId = req.query.landingPageId ? normalizeString(req.query.landingPageId) : null;
    const status = req.query.status ? normalizeString(req.query.status) : null;
    const search = req.query.search ? normalizeString(req.query.search) : null;

    const filter = {};
    if (landingPageId && mongoose.Types.ObjectId.isValid(landingPageId)) {
      filter.landingPageId = landingPageId;
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { vehicleModel: searchRegex },
      ];
    }

    const total = await LandingLead.countDocuments(filter);
    const leads = await LandingLead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("landingPageId", "title slug")
      .lean();

    res.status(200).json({
      ok: true,
      data: leads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateLeadStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid id");
      error.statusCode = 400;
      throw error;
    }

    const { status } = req.body;
    if (!status) {
      const error = new Error("Status is required");
      error.statusCode = 400;
      throw error;
    }

    const validStatuses = ["new", "contacted", "qualified", "closed", "lost"];
    if (!validStatuses.includes(status)) {
      const error = new Error("Invalid status");
      error.statusCode = 400;
      throw error;
    }

    const lead = await LandingLead.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!lead) {
      const error = new Error("Lead not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      ok: true,
      data: lead,
      message: "Lead status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listLeads,
  updateLeadStatus,
};
