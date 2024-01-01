const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const shortid = require('shortid');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require("dotenv").config();
const multer = require('multer');
// const GridFsStorage=require("multer-grids-storage")
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://arefintalukder5:Arefin@cluster0.yrhgh55.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});
const app = express();
const port = 5000;

const corsOptions = {
  origin: '*', // replace with your frontend URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // enable set cookie
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.get('/',async(req,res)=>{
  // console.log("every thing ok");
  res.json({
    "serverName":"study app",
  "deveolper Name":"Arefin Talukder",
"developerEmail":"arefintalukder5@gmail.com"  })
})

// Set up multer storage


// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/api/getAllData', async (req, res) => {
  try {
    const data = await getAllData();
    console.log("data",data)
    res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error.message });
  }
});

// 
app.use('/api/', require('./route/userContactRoute'));
app.use('/api',require("./route/subscriber"))
app.use('/api',require("./route/blogRoute"));
app.use('/api',require("./route/data.js"));
app.use("/api",require("./route/questionRoute.js"))
app.use('/api',require("./route/userRoute"));

const imageSchema = new mongoose.Schema({
  url: String,
  public_id: String,
});



const Image = mongoose.model('Image', imageSchema);
// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const newImage = new Image({
      url: '',
      public_id: shortid.generate(), // Generate a unique public_id
    });

    // Save the uploaded file to the database
    newImage.url = 'data:image/png;base64,' + req.file.buffer.toString('base64');
    await newImage.save();

    res.status(201).json({ message: 'File uploaded successfully',public_id: newImage.public_id  });
    console.log("success");
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Define a route to get an image by public_id
app.get('/api/images/:public_id', async (req, res) => {
  try {
    const { public_id } = req.params;

    // Find the image in the database by public_id
    const image = await Image.findOne({ public_id });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Return the image data
    res.status(200).json({ url: image.url, public_id: image.public_id });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));





// Example usage:

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

