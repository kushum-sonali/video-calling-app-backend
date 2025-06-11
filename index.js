const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt= require("bcrypt")
const app = express();
app.use(cors());
app.use(express.json());
require('./mongodb');
const User = require('./userModel');
const { set } = require('mongoose');

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Replace with your frontend URL
    methods: ["GET", "POST"]
  }
});

// Store active rooms and their users
const rooms = new Map();
const users = {};
const messageNotify=[];
io.on('connection', (socket) => {
  // console.log('New client connected:', socket.id);
socket.on('join-room',async({roomId,name,streamId, handRaised, cameraStatus})=>{
  if(socket.roomId){
    socket.leave(socket.roomId);
  }
  socket.join(roomId);  
  socket.roomId=roomId;

  socket.user = {
    name,
    streamId ,
    handRaised,
    cameraStatus
  }
  
  // Add user to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
 
const socketId = socket.id;
rooms.get(roomId).add(socket.id);

const sockets = (await io.in(socket.roomId).fetchSockets()).map((s) => {
  return {
    id: s.id,
    name: s.user.name,
    streamId: s.user.streamId,
    handRaised: s.user.handRaised,
    cameraStatus: s.user.cameraStatus
  };
});



  io.in(socket.roomId).emit('user-joined', {userId:socketId, users:sockets});
//  io.in(socket.roomId).emit('all-users', sockets)
})
socket.on("handRaised",(data)=>{
  const {userId,handRaised} = data;

  socket.user = {
    ...socket.user,
    handRaised: handRaised
  };

  io.in(socket.roomId).emit("handRaised",{users:socket.user});
})
socket.on("camera-status",(data)=>{
  const {streamId,cameraStatus} = data;
  socket.user={
    ...socket.user,
    cameraStatus:cameraStatus
  }
  io.in(socket.roomId).emit("camera-status",{users:socket.user});
})

socket.on("mic-status",(data)=>{
  const {streamId,micStatus} = data;
  socket.user={
    ...socket.user,
    micStatus:micStatus
  }
  io.in(socket.roomId).emit("mic-status",{users:socket.user});
}
)

  socket.on('offer', ({ to, offer }) => {
    socket.to(to).emit('offer', { from: socket.id, offer,name:socket.name });
  }
  );


  socket.on('answer', ({ to, answer ,name}) => {
    socket.to(to).emit('answer', { from: socket.id, answer,name:socket.name });
  });

  socket.on('ice-candidate', ({ to, candidate,name }) => { 
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate,name });
  });
 
  // Handle chat messages
  socket.on('chat-message', (message) => {
    // Add the message to the newMessages array
  
   
    // Broadcast the message to all users in the same room
    io.in(socket.roomId).emit('chat-message', message);
  });
  socket.on('send name',(username)=>{
    io.emit('send name',(username));
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(socket.roomId);
        }
      }
      socket.to(socket.roomId).emit('user-left', socket.id);
    }
  });
  socket.on('leave-room', () => {
    if (socket.roomId) {
      socket.leave(socket.roomId);
      const room = rooms.get(socket.roomId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(socket.roomId);
        }
      }
      socket.to(socket.roomId).emit('user-left', socket.id);
    }
    socket.roomId = null;
  });
  socket.on('handRaised', (data) => {
    socket.to(socket.roomId).emit('handRaised', data);
  });
  socket.on('handDown', (data) => {
    socket.to(socket.roomId).emit('handDown', data);
  });
});

app.post("/signup",async(req,res)=>{
  try{
  const {userName,email,password}=req.body;
  if(!userName || !email || !password ){
    return res.status(400).json({message:"All fields are required"});
  }
  const saltRound= 10;
  const hashpass= await bcrypt.hash(password,saltRound);
  const newData= new User({
    userName,
    email,
    newPass:hashpass
  });
 const result= await newData.save();
  if(result){
    return res.status(201).json({message:"User created successfully", user: result});
  }
}

catch(err){
    console.error("Error in signup:", err);
    return res.status(500).json({message:"Internal server error"}); 
  }

}
)

app.post("/firebaseuser", async (req, res, next) => {
  try {
    

    const {userName,email,fireBaseId}=req.body;
    console.log("Data received:", userName, email, fireBaseId);
    if (!userName || !email || !fireBaseId) {
      return res.status(400).send({ message: "All fields are required" });
    }
    const existingUser= await User.findOne({email});
    if(existingUser){
      return res.status(200).send({message:"user already exists",user:existingUser});
    }
      const newUser= new User({
        userName,
        email,
        fireBaseId,
        isGoogleSignin: true
      })
      console.log("New user object:", newUser);
      const userToSave= await newUser.save();
      return res.status(201).send({ message: "User registered successfully", user: userToSave });
    }

   catch (e) {
    console.error(e);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 