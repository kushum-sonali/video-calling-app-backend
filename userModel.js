const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    userName:{
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    firebaseId:{
    type:String,
    required:false,
    default: null
    }
   
},
{
    timestamps: true
}
);
const User= mongoose.model('User',userSchema);
module.exports = User;
