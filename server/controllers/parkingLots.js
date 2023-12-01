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