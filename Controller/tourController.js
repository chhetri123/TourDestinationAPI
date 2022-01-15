const { StatusCodes } = require("http-status-codes");

const Tour = require("./../model/tourModels");
const ApiFeatures = require("../utils/apiFeature");
exports.bestTours = async (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,ratingsAverage,price,summary,difficulty";
  next();
};

exports.getAllTours = async (req, res) => {
  try {
    const apiFeatures = new ApiFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .pagination();

    const tours = await apiFeatures.query;
    res.status(StatusCodes.OK).send({
      results: tours.length,
      tours,
    });
  } catch (err) {
    res.status(StatusCodes.NOT_FOUND).send({
      msg: err.message,
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    const tour = await Tour.create(req.body);

    res.status(StatusCodes.CREATED).send(tour);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    res.status(StatusCodes.MOVED_TEMPORARILY).send(tour);
  } catch (err) {
    res.status(StatusCodes.NOT_FOUND).send({ msg: err });
  }
};
exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(StatusCodes.OK).send({
      tour,
    });
  } catch (err) {
    res.status(StatusCodes.NOT_FOUND).send({ msg: err });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(StatusCodes.GONE).json({ message: "tour deleted " });
  } catch (err) {
    res.status(StatusCodes.NOT_FOUND).send({ msg: err });
  }
};
exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          _id: { $toUpper: "$difficulty" },
          avgRating: { $avg: "$ratingsAverage" },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          tours: { $sum: 1 },
        },
      },
      {
        $sort: { avgPrice: -1 },
      },
      // { $match: { _id: { $ne: "easy" } } },
    ]);
    res.status(StatusCodes.GONE).json({
      status: "Success",
      stats,
    });
  } catch (err) {
    res.status(StatusCodes.NOT_FOUND).json({ msg: err });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = +req.params.year;
    const plans = await Tour.aggregate([
      {
        $unwind: "$startDates",
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-1-1`),
          },
          startDates: {
            $lt: new Date(`${year}-12-30`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$startDates" },
          tourNumber: { $sum: 1 },
          tour: { $push: "$name" },
          avgPrice: { $avg: "$price" },
        },
      },
      { $sort: { tourNumber: -1 } },

      {
        $addFields: { month: "$_id" },
      },
      {
        $project: { _id: 0 },
      },
      { $limit: 6 },
    ]);
    if (plans.length <= 0) throw new Error("No tour found in that plan");
    res.status(StatusCodes.GONE).json({
      status: "Success",
      plans,
    });
  } catch (err) {
    res.status(StatusCodes.NOT_FOUND).json({ msg: err.message });
  }
};
