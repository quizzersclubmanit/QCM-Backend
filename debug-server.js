import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test routes
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ success: true, message: 'Backend is working!' });
});

app.post('/api/auth/signup', (req, res) => {
  console.log('Signup endpoint hit with body:', req.body);
  res.json({ success: true, message: 'Signup endpoint working', body: req.body });
});

app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Test it at: http://localhost:${PORT}/api/test`);
});
