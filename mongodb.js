const moongoose = require('mongoose');
const dotenv= require('dotenv');
dotenv.config();
moongoose.connect(process.env.MONGO_URL).then(() => {
  console.log('Connected to MongoDB');
}
).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
}   

);