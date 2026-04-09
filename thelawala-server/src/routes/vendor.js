const express = require('express');
const Vendor = require('../models/Vendor');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get current inventory (authenticated vendor only)
router.get('/inventory', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can access inventory' });
    }
    const vendor = await Vendor.findById(req.user.id).select('currentInventory');
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    return res.json({ inventory: vendor.currentInventory });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update daily inventory (authenticated vendor only)
router.post('/inventory', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can update inventory' });
    }

    const { inventory } = req.body;
    if (!Array.isArray(inventory)) {
      return res.status(400).json({ error: 'inventory must be an array' });
    }

    await Vendor.findByIdAndUpdate(req.user.id, { currentInventory: inventory });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
