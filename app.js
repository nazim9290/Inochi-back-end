require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const Fingerprint = require('express-fingerprint');
const { nanoid } = require('nanoid');

const { sequelize, Image } = require('./models');

const app = express();
const port = process.env.PORT || 8080;

// CORS — open by default; tighten via env if needed
const corsOptions = { origin: '*' };
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  Fingerprint({
    parameters: [Fingerprint.useragent, Fingerprint.acceptHeaders, Fingerprint.geoip],
  })
);

// Health
app.get('/', (req, res) => {
  res.json({
    serverName: 'Inochi Global Education Institute',
    status: 'ok',
  });
});

app.get('/fingerprint', (req, res) => {
  res.json({ fingerprint: req.fingerprint, clientIp: req.clientIp });
});

// Routes
app.use('/api', require('./routes/userContactRoute'));
app.use('/api', require('./routes/subscriber'));
app.use('/api', require('./routes/blogRoute'));
app.use('/api', require('./routes/data'));
app.use('/api', require('./routes/questionRoute'));
app.use('/api', require('./routes/userRoute'));
app.use('/api', require('./routes/siteContent'));
app.use('/api', require('./routes/applications'));
app.use('/api', require('./routes/reviews'));
app.use('/api', require('./routes/imageLibrary'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/auditLog'));
app.use('/api', require('./routes/blogReactionRoute'));
app.use('/api', require('./routes/blogCommentRoute'));
app.use('/api', require('./routes/meRoute'));

// Image upload (kept inline because it's a single endpoint pair)
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const publicId = nanoid(10);
    const url = 'data:image/png;base64,' + req.file.buffer.toString('base64');
    await Image.create({ url, publicId });
    res.status(201).json({ message: 'File uploaded successfully', public_id: publicId });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/api/images/:public_id', async (req, res) => {
  try {
    const image = await Image.findOne({ where: { publicId: req.params.public_id } });
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.status(200).json({ url: image.url, public_id: image.publicId });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');

    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Schema synced (alter mode)');
    }

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();
