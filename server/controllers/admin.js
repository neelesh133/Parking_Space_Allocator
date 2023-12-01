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

exports.getParkingLotsNear = async (req, res) => {
  if (!req.userId) {
      return res.status(401).json({ msg: "Unauthorized" })
  }
  try {
      const reqUser = await User.findById(req.userId)
      console.log(reqUser)
      if (reqUser.role !== "admin") {
          return res.status(401).json({ msg: "Unauthorized" })
      }

      const { error } = latLonValidator.validate(req.query)
      if (error) {
          return res.status(400).json({ msg: error.details[0].message })
      }

      const { lat, lng } = req.query

      var parkingLots = await ParkingLot.aggregate([

          {
              $geoNear: {
                  "near": {
                      "type": "Point",
                      "coordinates": [lat, lng]
                  },
                  "distanceField": "distance",
                  "spherical": true,
                  "maxDistance": 7500
              },
          }
      ])

      parkingLots = parkingLots.map(lot => ({ name: lot.name }))

      return res.status(200).json({ msg: "ParkingLots near location returned", parkingLots: parkingLots })
  } catch (err) {
      return res.status(500).json({ msg: "Something went wrong" })
  }
}


//tested
/*get Names of all parking lots */
exports.getParkingLots = async (req, res) => {
  console.log("Here")
  if (!req.userId) {
      return res.status(401).json({ msg: "Unauthorized" })
  }
  try {
      const reqUser = await User.findById(req.userId)
      console.log(reqUser)
      if (reqUser.role !== "admin") {
          return res.status(401).json({ msg: "Unauthorized" })
      }

      //fetch all the parkingLot Names and whether they are active
      var parkingLots = await ParkingLot.find({}, { name: 1,isActive:1 });

      parkingLots = parkingLots.map(lot => lot._doc)

      return res.status(200).json({ msg: "ParkingLots returned", parkingLots: parkingLots })
  } catch (err) {
      return res.status(500).json({ msg: "Something went wrong" })
  }
}

exports.getParkingLotHistory = async (req, res) => {
  if (!req.userId) {
      return res.status(401).json({ msg: "Unauthorized" })
  }
  try {
      const reqUser = await User.findById(req.userId)
      console.log(reqUser)
      if (reqUser.role !== "admin") {
          return res.status(401).json({ msg: "Unauthorized" })
      }

      //get all the bookedSlots which are booked in this parkingLot
      var bookedTimeSlots = await BookedTimeSlot.find({
          parkingLot: req.query._id,
          paid:true
      })

      //get the details of parking Lot
      const parkingLot = await ParkingLot.findById(req.query._id)
      console.log(parkingLot)
  
      //if no slots booked till now in parkingLot
      if (bookedTimeSlots.length == 0) {
          return res.status(200).json({ msg: "Booked slots history returned for parking lot", bookedTimeSlots: bookedTimeSlots, parkingLotDetails: parkingLot })
      }

      //get all the userIds who have booker atleast one slot in that parkingLot
      const userIds = []
      for (var slot of bookedTimeSlots) {
          if (!userIds.includes(slot.booker)) {
              userIds.push(slot.booker)
          }
      }

      //get the firstName and lastName of users who booked the slots
      var users = await User.find({
          _id: {
              $in: userIds
          }
      }, {
          firstName: 1, lastName: 1
      })

      //create a userMap to access the user details corresponding to a userId
      var userMap = {}
      for (let user of users) {
          userMap[user._id] = { _id: user._id, name: user.firstName + " " + user.lastName }
      }
      console.log(userMap)


      bookedTimeSlots = bookedTimeSlots.map(timeSlot => {
          if (timeSlot.vehicleType == "Bike") {
              //calculate charges
              const charges = parkingLot.type==="public"?0:((timeSlot.endTime - timeSlot.startTime) / (1000 * 60 * 60)) * parkingLot.parkingChargesBike
              //pas startTime and endTime as formatted strings
              //put details of booker instead of just its ID
              return { ...timeSlot._doc, charges: charges,startTime:dayjs(timeSlot.startTime).format('YYYY-MM-DD HH:00'),endTime:dayjs(timeSlot.endTime).format('YYYY-MM-DD HH:00'), booker: userMap[timeSlot.booker] }
          } else {
              //calculate charges
              const charges = parkingLot.type==="public"?0:((timeSlot.endTime - timeSlot.startTime) / (1000 * 60 * 60)) * parkingLot.parkingChargesCar
              //pas startTime and endTime as formatted strings
              //put details of booker instead of just its ID
              return { ...timeSlot._doc, charges: charges,startTime:dayjs(timeSlot.startTime).format('YYYY-MM-DD HH:00'),endTime:dayjs(timeSlot.endTime).format('YYYY-MM-DD HH:00'), booker: userMap[timeSlot.booker] }
          }
      })
      console.log(bookedTimeSlots)

      return res.status(200).json({ msg: "Parking lots returned", bookedTimeSlots: bookedTimeSlots, parkingLotDetails: parkingLot })
  } catch (err) {
      return res.status(500).json({ msg: "Something went wrong" })
  }
}
