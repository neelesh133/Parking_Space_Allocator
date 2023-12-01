const User = require("../models/User");
const BookedTimeSlot = require('../models/BookedTimeSlot')
const ParkingLot = require('../models/ParkingLot')
const dayjs = require('dayjs')
const passwordHash = require('password-hash')
const { latLonValidator } = require('../validators/joi-validator')
const sendEmail2 = require('../Utils/sendEmail2')

exports.getUsersName = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
  try {
    const reqUser = await User.findById(req.userId);
    console.log(reqUser);
    //check if user making request is an admin
    if (reqUser.role !== "admin") {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    //get List of all user's firstName and lastName
    var users = await User.find(
      { role: "user" },
      { firstName: 1, lastName: 1 }
    );

    //send name concatenating both firstName and lastName
    users = users.map((user) => ({
      _id: user._id,
      name: user.firstName + " " + user.lastName,
    }));

    return res
      .status(200)
      .json({ msg: "Users List returned", usersName: users });
  } catch (err) {
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

exports.getUserHistory = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
  try {
    const reqUser = await User.findById(req.userId);
    console.log(reqUser);
    if (reqUser.role !== "admin") {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    //get all of slots booked by user
    var bookedTimeSlots = await BookedTimeSlot.find({
      booker: req.query._id,
      paid: true,
    });
    //if no slots return directly
    if (bookedTimeSlots.length == 0) {
      return res
        .status(200)
        .json({
          msg: "Booked slots returned for user",
          bookedTimeSlots: bookedTimeSlots,
        });
    }

    //get list of all the lotIDs where user has booked slot at least ones
    const lotIds = [];
    for (let slot of bookedTimeSlots) {
      if (!lotIds.includes(slot.parkingLot)) {
        lotIds.push(slot.parkingLot);
      }
    }
    console.log(lotIds);
    //get all the ParkingLot details of those lots which are included in lotIDs
    var parkingLots = await ParkingLot.find(
      {
        _id: {
          $in: lotIds,
        },
      },
      { lotImages: 0 }
    );

    //create a map from lotID to lotDetails for quick access of lockDetails
    var parkingLotMap = {};
    for (let lot of parkingLots) {
      parkingLotMap[lot._id] = {
        _id: lot._id,
        name: lot.name,
        address: lot.address,
        location: lot.location.coordinates,
        parkingChargesBike: lot.parkingChargesBike,
        parkingChargesCar: lot.parkingChargesCar,
        type: lot.type,
      };
    }

    bookedTimeSlots = bookedTimeSlots.map((timeSlot) => {
      if (timeSlot.vehicleType === "Bike") {
        //calculate charges
        const charges =
          parkingLotMap[timeSlot.parkingLot].type === "public"
            ? 0
            : ((timeSlot.endTime - timeSlot.startTime) / (1000 * 60 * 60)) *
              parkingLotMap[timeSlot.parkingLot].parkingChargesBike;
        //pas startTime and endTime as formatted strings
        //put details of parkingLot instead of just its ID
        return {
          ...timeSlot._doc,
          parkingLot: parkingLotMap[timeSlot.parkingLot],
          startTime: dayjs(timeSlot.startTime).format("YYYY-MM-DD HH:00"),
          endTime: dayjs(timeSlot.endTime).format("YYYY-MM-DD HH:00"),
          charges: charges,
        };
      } else {
        //calculate charges
        const charges =
          parkingLotMap[timeSlot.parkingLot].type === "public"
            ? 0
            : ((timeSlot.endTime - timeSlot.startTime) / (1000 * 60 * 60)) *
              parkingLotMap[timeSlot.parkingLot].parkingChargesCar;
        //pas startTime and endTime as formatted strings
        //put details of parkingLot instead of just its ID
        return {
          ...timeSlot._doc,
          parkingLot: parkingLotMap[timeSlot.parkingLot],
          startTime: dayjs(timeSlot.startTime).format("YYYY-MM-DD HH:00"),
          endTime: dayjs(timeSlot.endTime).format("YYYY-MM-DD HH:00"),
          charges: charges,
        };
      }
    });
    return res
      .status(200)
      .json({
        msg: "Booked slots returned for user",
        bookedTimeSlots: bookedTimeSlots,
      });
  } catch (err) {
    return res.status(500).json({ msg: "Something went wrong" });
  }
};
