const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

// MongoDB bağlantısı (Render-da environment variable-dan MongoDB URL al)
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster.mongodb.net/carbet?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB bağlıdır'))
  .catch(err => console.log('MongoDB xətası: ' + err));

const UserSchema = new mongoose.Schema({
  userId: String,
  balance: { type: Number, default: 0 },
  email: String
});

const User = mongoose.model('User', UserSchema);

// Balans artırma endpoint-i
app.post('/add-balance', async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount < 10) {
    return res.status(400).json({ error: 'Yanlış məlumat' });
  }

  try {
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, email: req.body.email || 'guest', balance: 0 });
    }

    user.balance += amount;
    await user.save();

    res.json({ success: true, newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NowPayments invoice yaratma endpoint-i
app.post('/create-nowpayments-invoice', async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || amount < 10) {
    return res.status(400).json({ error: 'Minimum 10 AZN' });
  }

  try {
    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: 'AZN',
        pay_currency: 'usd', // kart üçün USD, kripto üçün 'usdttrc20' dəyişə bilərsən
        order_id: userId || 'guest_' + Date.now(),
        order_description: 'Balans artırma - ' + amount + ' AZN'
      })
    });

    const data = await response.json();
    if (data.invoice_url) {
      res.json({ invoice_url: data.invoice_url });
    } else {
      res.status(400).json({ error: data.message || 'Invoice yaradılmadı' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IPN (ödəniş təsdiq endpoint-i) - NowPayments-dan gələn callback
app.post('/nowpayments-ipn', async (req, res) => {
  const { payment_status, price_amount, order_id } = req.body;

  if (payment_status === 'finished') {
    const amount = parseFloat(price_amount);
    const userId = order_id.split('_')[0];

    try {
      let user = await User.findOne({ userId });
      if (user) {
        user.balance += amount;
        await user.save();
        console.log(`Balans artıldı: ${userId} + ${amount} AZN`);
      }
    } catch (err) {
      console.log('IPN xətası: ' + err.message);
    }
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server işləyir');
});
