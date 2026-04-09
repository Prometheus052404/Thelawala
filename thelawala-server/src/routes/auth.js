const express = require('express');
const Vendor = require('../models/Vendor');
const Client = require('../models/Client');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// ──────────── Vendor Auth ────────────

router.post('/vendor/login', async (req, res) => {
  try {
    const { thelaId, password } = req.body;
    if (!thelaId || !password) {
      return res.status(400).json({ error: 'thelaId and password are required' });
    }

    const vendor = await Vendor.findOne({ thelaId });
    if (!vendor) {
      return res.status(404).json({ error: 'not_found', message: 'Account not found. Would you like to register?' });
    }

    const valid = await vendor.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = generateToken({ id: vendor._id, thelaId: vendor.thelaId, role: 'vendor' });
    return res.json({ token, vendor: { thelaId: vendor.thelaId, id: vendor._id } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/vendor/register', async (req, res) => {
  try {
    const { thelaId, password } = req.body;
    if (!thelaId || !password) {
      return res.status(400).json({ error: 'thelaId and password are required' });
    }

    const exists = await Vendor.findOne({ thelaId });
    if (exists) {
      return res.status(409).json({ error: 'Vendor with this thelaId already exists' });
    }

    const passwordHash = await Vendor.hashPassword(password);
    const vendor = await Vendor.create({ thelaId, passwordHash });

    const token = generateToken({ id: vendor._id, thelaId: vendor.thelaId, role: 'vendor' });
    return res.status(201).json({ token, vendor: { thelaId: vendor.thelaId, id: vendor._id } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ──────────── Client Auth ────────────

router.post('/client/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'phoneNumber and password are required' });
    }

    const client = await Client.findOne({ phoneNumber });
    if (!client) {
      return res.status(404).json({ error: 'not_found', message: 'Account not found. Would you like to register?' });
    }

    const valid = await client.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = generateToken({ id: client._id, phoneNumber: client.phoneNumber, role: 'client' });
    return res.json({ token, client: { phoneNumber: client.phoneNumber, id: client._id } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/client/register', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'phoneNumber and password are required' });
    }

    const exists = await Client.findOne({ phoneNumber });
    if (exists) {
      return res.status(409).json({ error: 'Client with this phone number already exists' });
    }

    const passwordHash = await Client.hashPassword(password);
    const client = await Client.create({ phoneNumber, passwordHash });

    const token = generateToken({ id: client._id, phoneNumber: client.phoneNumber, role: 'client' });
    return res.status(201).json({ token, client: { phoneNumber: client.phoneNumber, id: client._id } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
