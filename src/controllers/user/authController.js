const jwt = require('jsonwebtoken');
const User = require('../../models/User');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    // Note: In production, use hashed password comparison
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret_key_9972d5bd55a';
    const token = jwt.sign(
      { id: user._id, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData,
      data: {
        token,
        user: userData,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.json({
      success: true,
      user: userData,
      data: userData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};
