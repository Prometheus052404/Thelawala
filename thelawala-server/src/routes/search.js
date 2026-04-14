const express = require('express');
const Vendor = require('../models/Vendor');

const router = express.Router();

// Search vendor by thelaId
router.get('/vendor/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ thelaId: req.params.id }).select('-passwordHash');
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    if (!vendor.isBroadcasting) {
      return res.json({ status: 'offline', message: 'Vendor is currently offline/not broadcasting.' });
    }
    return res.json({
      status: 'online',
      vendorId: String(vendor._id),
      thelaId: vendor.thelaId,
      location: vendor.lastLocation,
      inventory: vendor.currentInventory,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Search vendors by item name
router.get('/item/:itemName', async (req, res) => {
  try {
    const query = req.params.itemName.toLowerCase();
    const vendors = await Vendor.find({ isBroadcasting: true }).select('-passwordHash');

    const matches = vendors
      .filter(v => v.currentInventory.some(item =>
        item.name && item.name.toLowerCase().includes(query) && item.quantity > 0
      ))
      .map(v => ({
        vendorId: String(v._id),
        thelaId: v.thelaId,
        location: v.lastLocation,
        inventory: v.currentInventory.filter(item =>
          item.name && item.name.toLowerCase().includes(query) && item.quantity > 0
        ),
      }));

    return res.json({ results: matches });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
