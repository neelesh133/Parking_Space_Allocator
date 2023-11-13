const mongoose = require('mongoose')


const UserSchema = mongoose.Schema({
    firstName:{
        type:String,
        required:true,
        min:2
    },
    lastName:{
        type:String,
        required:true,
        min:2
    },
    userName:{
        type:String,
        required:true,
        min:5
    },
    email:{
        type:String,
        required:true,
    },
    mobileNo:{
        type:String,
        requried:true,
    },
    password:{
        type:String,
        required:true,
        min:6
    },
    profilePic:{
        type:String,
    },
    verified:{
        type:Boolean,
        default:false
    },
    subscription:{
        type:Object,
    },
    otp:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:["user","admin"],
        default:"user"
    },
    createdAt:{
        type:Date,
        default:Date.now()
    }
})

const User = mongoose.model('User',UserSchema)
module.exports = User