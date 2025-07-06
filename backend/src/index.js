import express from 'express';
import routes from './routes/index.js';
import config from './config/config.js';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
dbConnect();
async function dbConnect() {
  try {
    await mongoose.connect(config.dbUrl);
    console.log('Successfully connected to the database');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// CORS configuration - Allow both localhost and live frontend
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://vyapaarr.vercel.app', // Live frontend URL
  process.env.FRONTEND_URL // Environment variable for additional URLs
].filter(Boolean); // Remove any undefined values

const app = express();
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use('/', routes);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS allowed origins:', allowedOrigins);
}); 