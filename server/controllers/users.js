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

exports.resendOTP = async(req,res)=>{
    console.log(req.body)

    try{
        if(!req.body.email){
            return res.status(200).json({msg:"Please enter email"})
        }

        //check if the user already exists
        const existingUser = await User.findOne({ email: req.body.email })

        //if user already exists simply return
        if (!existingUser) {
            return res.status(400).json({ msg: "No account with this email ID, Create an Account first" })
        }else if(existingUser.verified){
            return res.status(200).json({msg: "You are already verified, you can login directly"})
        }

       //generate otp
       const otpGenerated = generateOTP();
       console.log("otp generated", otpGenerated)

       if(!otpGenerated){
        return res.status(400).json({msg:"Error in generating OTP"})
       }

       //send email to user with otp
       const subject = "[Smart Parking] Welcome smart parker"
        const html = `
            Welcome to the club
            You are just one step away from becoming a smart parker
                Please enter the sign up OTP to get started
                            ${otpGenerated}
            If you haven't made this request. simply ignore the mail and no changes will be made`
        const receiverMail = req.body.email
        await sendEmail2({html,subject,receiverMail})

        //store otp in user schema
        await User.findByIdAndUpdate(existingUser._id,{otp:otpGenerated})
        
        return res.status(200).json({msg:"Vefiy OTP sent to your email To Access Your Account"})

    }catch(err){
        return res.status(500).json({ msg: "Something went wrong.." })
    }
}

exports.verifyEmail = async (req, res) => {
    console.log(req.body)

    const { error } = verifyEmailValidator.validate(req.body);

    try {
        const { email, otp } = req.body;

        //check if user even exists or not
        const user = await User.findOne({ email })
       
        if (!user) {
            return res.status(400).json({ msg: "Fill all the details first" })
        }
        console.log(user.otp, " and ", otp)
        //check if received and generated otp's are same
        if (user && user.otp !== otp) {
            return res.status(400).json({ msg: "Invalid OTP" })
        }

        //updating user as verified
        const updatedUser = await User.findByIdAndUpdate(user._id, { verified: true })

        return res.status(200).json({ msg: "You're Registered Successfully, Login Now"  })
    } catch (err) {
        return res.status(500).json({ msg: "Something went wrong.." })
    }
}

exports.signIn = async (req, res) => {
    const { email, password } = req.body
    const { error } = loginValidator.validate({ email, password })
    console.log(error)
    try {
        if (error)
            return res.status(400).json({ msg: error.details[0].message })

        //check if user with this email even exists
        const oldUser = await User.findOne({ email: email })
        //if no user exists
        if (!oldUser)
            return res.status(404).json({ msg: "User doesn't exist" })
        
        //if user not verified tell to verify first
        if (!oldUser.verified)
            return res.status(400).json({ msg: "Please verify your account first! Check the otp sent on mail during registration" })
        
        //Verify if passowrd is correct
        const isMatch = passwordHash.verify(password,oldUser.password)
        
        //if password doesn't match
        if (!isMatch)
            return res.status(400).json({ msg: "Invalid credentials" })
        console.log("password matched")
        
        //sign a token for user to login into his account and send it frontend where token will be stored in localstorage
        const payload = {
            email: oldUser.email,
            id: oldUser._id,
            role:oldUser.role
        }
        const token = jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: "3h" })
        
        console.log("token signed")

        return res.status(200).json(token)
    } catch (err) {
        return res.status(500).json({ msg: "Something went wrong.." })
    }

}
