const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB bağlantısı - BURAYA SƏNİN REAL ATLAS CONNECTION STRING-İNİ QOY
mongoose.connect('mongodb+srv://kalikali:Pasword@taxibet.lzyqrgu.mongodb.net/taxidb?retryWrites=true&w=majority')
  .then(() => console.log('MongoDB bağlıdır'))
  .catch(err => console.log('MongoDB xətası:', err));

// User modeli (balans saxlamaq üçün)
const userSchema = new mongoose.Schema({
  userId: String,          // istifadəçi ID (məsələn telefon nömrəsi və ya email)
  balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// Root route (brauzerdə linkə girəndə nə göstərsin)
app.get('/', (req, res) => {
  res.send('Taxi Server işləyir! API endpoint-ləri: /balance/:userId və /add-balance');
});

// İstifadəçinin balansını əldə et
app.get('/balance/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    res.json({ balance: user ? user.balance : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Xəta baş verdi' });
  }
});

// Balans artır (ödəniş təsdiqlənəndə bu endpoint çağrılacaq)
app.post('/add-balance', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId və amount lazımdır' });
    }

    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, balance: 0 });
    }

    user.balance += parseFloat(amount);
    await user.save();

    res.json({ success: true, newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ error: 'Balans artırma xətası' });
  }
});

// Serveri işə sal
app.listen(port, () => {
  console.log(`Server http://localhost:${port} üzərində işləyir`);
});
