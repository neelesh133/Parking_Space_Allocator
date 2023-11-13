const { sendOTPValidator, verifyEmailValidator, loginValidator, feedbackValidator, resetMailValidator, resetPassValidator } = require("../validators/joi-validator")
const User = require('../models/User')
const { generateOTP } = require("../Utils/generateOTP")
const passwordHash = require('password-hash')
const jwt = require('jsonwebtoken')
const sendEmail = require('../Utils/sendEmail')
const sendEmail2 = require('../Utils/sendEmail2')
const webpush = require('web-push')
// const { instance } = require("../Utils/razorPayInstance")

exports.sendOTP = async (req, res) => {
    req.body.otp = "1"
    const { error } = sendOTPValidator.validate(req.body);
    console.log(error)
    try {

        if (error)
            return res.status(400).json({ msg: error.details[0].message })

        // const currTimeStamp= Date.now();
        const { email, password, confirmPassword,firstName,lastName,userName,mobileNo,selectedImg,currTimeStamp } = req.body
        //find existing user
        const existingUser = await User.findOne({ email: email })

        //if user already exists simply return
        if (existingUser) {
            return res.status(400).json({ msg: "User already exists" })
        }

        //if user doesn't exist create new one and send otp for its verification

        //check whether both passwords are same
        if (password !== confirmPassword) {
            console.log("No match")
            return res.status(400).json({ msg: "Password don't match" })
        }   
        //hash the password before storing it in database
        const hashedPassword = passwordHash.generate(password)
        
        //generate otp
        const otpGenerated = generateOTP();

        console.log("otp generated", otpGenerated)

        //save the user in database 
        //User creation (currently unverified)
        const newUser = await User.create({
            email: email, password: hashedPassword,
            firstName: firstName, lastName: lastName,
            userName:userName, mobileNo: mobileNo,
            profilePic: selectedImg,
            createdAt: new Date(currTimeStamp).toISOString(),
            otp: otpGenerated
        })

        console.log(newUser.email)

        if (!newUser) {
            return res.status(500).json({ msg: "Unable to sign up please try again later" })
        }

        //send the otp to user for verification
        const subject = "[Smart Parking] Welcome smart parker"
        const html = `
            Welcome to the club
                You are just one step away from becoming a smart parker
                    Please enter the sign up OTP to get started
                                ${otpGenerated}
                If you haven't made this request. simply ignore the mail and no changes will be made`
        const receiverMail =email

        await sendEmail2({ html, subject, receiverMail })
        return res.status(200).json({ msg: "Account Created, Verify OTP Sent to your email id to access your account" })
    } catch (err) {
        return res.status(500).json({ msg: "Something went wrong.." })
    }
}