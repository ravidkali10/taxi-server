const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// MongoDB bağlantısı (sonra connection string-i dəyişəcəyik)
// MongoDB bağlantısı
mongoose.connect("mongodb+srv://ravidkali10_db_user:ZptkpmJP652xFNgH@taxibet.lzyqrgu.mongodb.net/taxidb?retryWrites=true&w=majority")
  .then(() => console.log('MongoDB bağlıdır'))
  .catch(err => console.log('MongoDB xətası:', err));
// Sadə User modeli (balans saxlamaq üçün)
const userSchema = new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// Balans əldə et
app.get('/balance/:userId', async (req, res) => {
  const user = await User.findOne({ userId: req.params.userId });
  res.json({ balance: user ? user.balance : 0 });
});

// Balans artır (ödəniş təsdiqlənəndə)
app.post('/add-balance', async (req, res) => {
  const { userId, amount } = req.body;
  let user = await User.findOne({ userId });
  if (!user) user = new User({ userId, balance: 0 });
  user.balance += parseFloat(amount);
  await user.save();
  res.json({ success: true, newBalance: user.balance });
});

app.listen(port, () => {
  console.log(`Server http://localhost:${port} üzərində işləyir`);
});
