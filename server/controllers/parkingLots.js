const BookedTimeSlot = require("../models/BookedTimeSlot.js");
const ParkingLot = require("../models/ParkingLot");
const ParkingSlot = require("../models/ParkingSlot");
const User = require("../models/User");
const dayjs = require("dayjs");
const {
  postParkingValidator,
  getParkingValidator,
} = require("../validators/joi-validator");
const sendEmail2 = require("../Utils/sendEmail2");

// admin adds a new parking lot
exports.postParkingLot = async (req, res) => {
    if (!req.userId) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    if (req.body.type === "private") {
      const { error } = postParkingValidator.validate(req.body);
      if (error) {
        return res.status(400).json({ msg: error.details[0].message });
      }
    } else {
      req.body.ownerName = "1";
      req.body.emailID = "abc@gmail.com";
      req.body.mobileNo = "1";
      const { error } = postParkingValidator.validate(req.body);
      if (error) {
        return res.status(400).json({ msg: error.details[0].message });
      }
    }
  
    console.log("In post parking lot");
  
    try {
      //get current user
      const reqUser = await User.findById(req.userId);
  
      //if user is admin
      if (reqUser.role !== "admin") {
        return res.status(401).json({ msg: "Unauthorized" });
      }
  
      var {
        parkName,
        noOfCarSlots,
        noOfBikeSlots,
        address,
        parkingChargesCar,
        parkingChargesBike,
        lat,
        lng,
        openTime,
        closeTime,
        imgFiles,
        currTimeStamp,
        ownerName,
        mobileNo,
        emailID,
        type,
      } = req.body;
      console.log(
        parkName,
        noOfCarSlots,
        noOfBikeSlots,
        address,
        parkingChargesCar,
        parkingChargesBike,
        lat,
        lng,
        openTime,
        closeTime,
        currTimeStamp,
        ownerName,
        mobileNo,
        emailID,
        type
      );
  
      //convert details to desired format
      noOfBikeSlots = parseInt(noOfBikeSlots);
      noOfCarSlots = parseInt(noOfCarSlots);
      parkingChargesBike = parseInt(parkingChargesBike);
      parkingChargesCar = parseInt(parkingChargesCar);
      openTime = Number(openTime);
      closeTime = Number(closeTime);
  
      //put locPoint in format according to schema
      const loc = [];
      loc.push(parseFloat(lat));
      loc.push(parseFloat(lng));
      const locPoint = { type: "Point", coordinates: loc };
      var newParkingLot;
      if (type == "public") {
        parkingChargesCar = 0;
        parkingChargesBike = 0;
        //save parking lot in database
        newParkingLot = await ParkingLot.create({
          name: parkName,
          noOfCarSlots,
          noOfBikeSlots,
          address,
          parkingChargesCar,
          parkingChargesBike,
          location: locPoint,
          openTime: openTime,
          closeTime: closeTime,
          lotImages: imgFiles,
          type,
        });
      } else {
        //save parking lot in database
        newParkingLot = await ParkingLot.create({
          name: parkName,
          noOfCarSlots,
          noOfBikeSlots,
          address,
          parkingChargesCar,
          parkingChargesBike,
          location: locPoint,
          openTime: openTime,
          closeTime: closeTime,
          lotImages: imgFiles,
          ownerName,
          ownerEmail: emailID,
          ownermobileNo: mobileNo,
          type,
        });
      }
  
      const carParkingSlotsIDs = [];
      const bikeParkingSlotsIDs = [];
      //save bike parking slots in database and push each slot id to array
      for (i = 0; i < noOfBikeSlots; i++) {
        let parkingSlot = await ParkingSlot.create({
          parkingLot: newParkingLot._id,
          vehicleType: "Bike",
        });
        bikeParkingSlotsIDs.push(parkingSlot._id);
      }
      //save car parking slots in database and push each slot id to array
      for (i = 0; i < noOfCarSlots; i++) {
        let parkingSlot = await ParkingSlot.create({
          parkingLot: newParkingLot._id,
          vehicleType: "Car",
        });
        carParkingSlotsIDs.push(parkingSlot._id);
      }
      //save bike and car slot IDs to ParkingLot
      await ParkingLot.findByIdAndUpdate(newParkingLot._id, {
        bikeParkingSlots: bikeParkingSlotsIDs,
        carParkingSlots: carParkingSlotsIDs,
      });
  
      if (type === "private") {
        const subject = "[Smart Parker] Your Parking Lot is now live";
        const html = `
          Dear ${ownerName},
              Congratulations! Our Team has verified the details you submitted regarding your parking lot ${parkName}. Your parking lot is now live on our website. 
              Our customers can book a parking slot in your parking lot . A notification email will be sent to you each time a booking at your parking lot will happen.
          From,
          Smart Parking Team`;
        const receiverMail = emailID;
        await sendEmail2({ subject, html, receiverMail });
      }
  
      return res.status(200).json({ msg: "Parking Lot Added" });
    } catch (err) {
      return res.status(500).json({ msg: "Something went wrong.." });
    }
  };


// when user searches for free parking lots around a location
exports.getParkingLots = async (req, res) => {
    if (!req.userId) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    console.log("In get parking Lots");
    const { error } = getParkingValidator.validate(req.query);
  
    try {
      if (error) {
        return res.status(400).json({ msg: error.details[0].message });
      }
  
      //get the details
      var { lat, lng, startTime, endTime, vehicleType, currTime } = req.query;
      console.log(lat, lng, startTime, endTime, vehicleType, currTime);
      //get timestamps
      const storebookingStart = new Date(startTime).getTime();
      const storebookingEnd = new Date(endTime).getTime();
      const currTimeStamp = new Date(currTime).getTime();
  
      //check if this startTime and endTime pair are valid according to conditions
      const startTimeDayjs = dayjs(startTime);
      const endTimeDayjs = dayjs(endTime);
      console.log(startTimeDayjs.minute(), endTimeDayjs.minute());
      if (storebookingEnd - storebookingStart <= 0) {
        return res.status(400).json({ msg: "Please Enter a Valid time frame" });
      } else if (storebookingStart < currTimeStamp) {
        return res.status(400).json({ msg: "Cannot book slot in past" });
      } else if (
        new Date(startTime).getDate() >
        new Date(currTime).getDate() + 1
      ) {
        return res
          .status(400)
          .json({ msg: "Cannot book a slot starting after next day" });
      } else if ((storebookingEnd - storebookingStart) / (1000 * 60 * 60) > 3) {
        return res
          .status(400)
          .json({ msg: "Slot cannot be of more than three hours" });
      }
  
      console.log("Now finding booked..");
  
      //convert to desired format
      lat = parseFloat(lat);
      lng = parseFloat(lng);
  
      //get hours when parking is going to start and end
      let hrs1 = new Date(startTime).getHours();
      let hrs2 = new Date(endTime).getHours();
  
      //query the database to get active parkinglots inside 2km circle of a location
      var parkingLots = await ParkingLot.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [lat, lng],
            },
            distanceField: "distance",
            spherical: true,
            maxDistance: 7500,
          },
        },
        {
          $match: {
            isActive: true,
          },
        },
      ]);
  
      //get only those parkinglots which will be open in whole timeframe of parking
      parkingLots = parkingLots.filter((lot) => {
        console.log(lot.openTime, lot.closeTime);
        if (lot.openTime < lot.closeTime) {
          if ((lot.openTime <= hrs1) & (hrs2 <= lot.closeTime)) {
            return true;
          } else {
            return false;
          }
        } else {
          if (
            (lot.openTime <= hrs1 && hrs2 <= lot.closeTime) ||
            (lot.openTime <= hrs1 + 24 && hrs2 + 24 <= lot.closeTime + 24) ||
            (lot.openTime <= hrs1 && hrs2 <= lot.closeTime + 24)
          ) {
            return true;
          } else {
            return false;
          }
        }
      });
  
      //get all the booked slots in the timeframe selected
      //fetch only the parkingSlot which is booked
      let bookedParkingSlotsIDs = await BookedTimeSlot.find(
        {
          startTime: {
            $lt: storebookingEnd,
          },
          endTime: {
            $gt: storebookingStart,
          },
          vehicleType: vehicleType,
          cancelled: false,
          paid: true,
        },
        { _id: 0, parkingSlot: 1 }
      );
  
      bookedParkingSlotsIDs = bookedParkingSlotsIDs.map((slotID) =>
        slotID.toString()
      );
      console.log(bookedParkingSlotsIDs);
  
      //This will contain all the parking lots whose at least one parking slot is free in the selected time frame
      const freeParkingLots = [];
  
      const periodHours =
        (storebookingEnd - storebookingStart) / (1000 * 60 * 60);
      if (vehicleType == "Bike") {
        parkingLots.forEach((lot) => {
          //freeSlots are the one not included in bookedSlotIDs
          //engagedSlots are the one included in bookedSlotIDs
          const freeSlots = lot.bikeParkingSlots.filter(
            (slot) => !bookedParkingSlotsIDs.includes(slot._id.toString())
          );
          const engagedSlots = lot.bikeParkingSlots.filter((slot) =>
            bookedParkingSlotsIDs.includes(slot._id.toString())
          );
          //if at least one parking slot is free
          if (freeSlots.length > 0) {
            freeParkingLots.push({
              id: lot._id,
              name: lot.name,
              charges:
                lot.type === "public" ? 0 : lot.parkingChargesBike * periodHours,
              lotImages: lot.lotImages,
              freeSlots: freeSlots,
              engagedSlots: engagedSlots,
              address: lot.address,
              location: lot.location.coordinates,
              distance: lot.distance,
              type: lot.type,
            });
          }
        });
      } else {
        parkingLots.forEach((lot) => {
          //freeSlots are the one not included in bookedSlotIDs
          //engagedSlots are the one included in bookedSlotIDs
          const freeSlots = lot.carParkingSlots.filter(
            (slot) => !bookedParkingSlotsIDs.includes(slot._id.toString())
          );
          const engagedSlots = lot.carParkingSlots.filter((slot) =>
            bookedParkingSlotsIDs.includes(slot._id.toString())
          );
          //if at least one parking slot is free
          if (freeSlots.length > 0) {
            freeParkingLots.push({
              id: lot._id,
              name: lot.name,
              charges:
                lot.type === "public" ? 0 : lot.parkingChargesCar * periodHours,
              lotImages: lot.lotImages,
              freeSlots: freeSlots,
              engagedSlots: engagedSlots,
              address: lot.address,
              location: lot.location.coordinates,
              distance: lot.distance,
              type: lot.type,
            });
          }
        });
      }
  
      return res
        .status(200)
        .json({
          msg: "Free parking lots returned",
          freeParkingLots: freeParkingLots,
        });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ msg: "Something went wrong.." });
    }
  };