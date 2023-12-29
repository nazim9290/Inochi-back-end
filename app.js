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
// Set up multer storage for documents
// Set up multer storage for documents


// Set up multer for handling document uploads

// ... (existing code)


const DocumentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  studentNid: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  markSheetSSC: {
    type: Buffer,
    required: true,
  },
  markSheetHSC: {
    type: Buffer,
    required: true,
  },
  // Add other fields for additional documents

  // Timestamps to track creation and update times
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Document = mongoose.model('Document', DocumentSchema);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderPath = "document-uploads/";

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Set up multer for handling document uploads
const documentUpload = multer({ storage: documentStorage });

// ... (existing code)

// Add a new endpoint for document uploads

// document showing
// document showing
// document showing
app.post('/api/uploadDocument', documentUpload.fields([
  { name: 'markSheetSSC', maxCount: 1 },
  { name: 'markSheetHSC', maxCount: 1 },
  // Add more fields for other documents
]), async (req, res) => {
  try {
    const { name, studentNid, branch } = req.body;
    console.log('Size of markSheetSSC:', req.files['markSheetSSC'][0].size, 'bytes');
    console.log('Size of markSheetHSC:', req.files['markSheetHSC'][0].size, 'bytes');
    
    // Read file contents as Buffer
    const markSheetSSCBuffer = fs.readFileSync(req.files['markSheetSSC'][0].path);
    const markSheetHSCBuffer = fs.readFileSync(req.files['markSheetHSC'][0].path);

    // Save document details to MongoDB
    const document = new Document({
      name,
      studentNid,
      branch,
      markSheetSSC: markSheetSSCBuffer,
      markSheetHSC: markSheetHSCBuffer,
      // Set other fields for other documents
    });

    // Save the document to the database
    await document.save();

    console.log(`Size of markSheetSSC in MongoDB: ${document.markSheetSSC.length} bytes`);
    console.log(`Size of markSheetHSC in MongoDB: ${document.markSheetHSC.length} bytes`);

    res.status(200).json({ message: 'Document saved successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// Define a route to fetch all documents

// ... (rest of the existing code)
const sharp = require('sharp');

async function getAllData() {
  try {
    // Find all documents in the collection
    const documents = await Document.find();

    // If no documents found, you can handle it based on your application's requirements
    if (!documents || documents.length === 0) {
      return { message: 'No documents found.' };
    }

    // Process each document to get relevant information
    const processedData = await Promise.all(
      documents.map(async (doc) => {
        const { name, branch, markSheetSSC, markSheetHSC } = doc;

        // Check if markSheetSSC and markSheetHSC are not null before processing
        if (markSheetSSC && markSheetHSC) {
          try {
            // Use sharp to process the image buffers (e.g., convert to JPEG format)
            const processedSSCBuffer = await sharp(markSheetSSC)
              .toFormat('jpeg') // Change 'jpeg' to the desired output format
              .toBuffer();

            const processedHSCBuffer = await sharp(markSheetHSC)
              .toFormat('jpeg') // Change 'jpeg' to the desired output format
              .toBuffer();

            return {
              name,
              branch,
              markSheetSSC: processedSSCBuffer,
              markSheetHSC: processedHSCBuffer,
              // Add other fields as needed
            };
          } catch (error) {
            console.error(`Error processing document ${doc._id}:`, error);
            return null; // or handle it in another way
          }
        } else {
          console.error(`Missing image data for document ${doc._id}`);
          return null; // or handle it in another way
        }
      })
    );

    // Filter out null values (documents with missing or null image data)
    const validProcessedData = processedData.filter((data) => data !== null);

    return validProcessedData;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Propagate the error to the caller or handle it as needed
  }
}

// Example usage:

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


