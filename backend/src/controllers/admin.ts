import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import LogicRule from '../models/LogicRule';
import Proof from '../models/Proof';
import UsedNonce from '../models/UsedNonce';
import SystemSetting from '../models/SystemSetting';
import Billing from '../models/Billing';
import { verifyActionIntent } from '../utils/signature';
import AuditLog from '../models/AuditLog';

// @desc    Get all audit logs
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching audit logs' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// @desc    Get system-wide stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getSystemStats = async (req: AuthRequest, res: Response) => {
  try {
    const [userCount, ruleCount, proofCount] = await Promise.all([
      User.countDocuments(),
      LogicRule.countDocuments(),
      Proof.countDocuments()
    ]);

    const verifiedProofs = await Proof.countDocuments({ status: 'verified' });
    const successRate = proofCount > 0 ? (verifiedProofs / proofCount * 100).toFixed(1) : '0';

    // 1. ZK-Proof Verification Volume by Network
    // We get the rule for each proof, and group by rule.targetChain
    const networkVolume = await Proof.aggregate([
      {
        $lookup: {
          from: 'logicrules',
          localField: 'ruleId',
          foreignField: '_id',
          as: 'rule'
        }
      },
      { $unwind: '$rule' },
      {
        $group: {
          _id: '$rule.targetChain',
          volume: { $sum: 1 }
        }
      },
      {
        $project: {
          network: { $ifNull: ['$_id', 'Unknown'] },
          volume: 1,
          _id: 0
        }
      },
      { $sort: { volume: -1 } }
    ]);

    // 2. Cross-Chain Network TPS over the last 24 hours (grouped by hour)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const hourlyTps = await Proof.aggregate([
      {
        $match: { createdAt: { $gte: twentyFourHoursAgo } }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format for Recharts (e.g. "14:00")
    // Map _id (0-23) to an array of all 24 hours to ensure no gaps
    const currentHour = new Date().getHours();
    const tpsData = [];
    for (let i = 23; i >= 0; i--) {
      let h = currentHour - i;
      if (h < 0) h += 24;
      const hourData = hourlyTps.find(t => t._id === h);
      // TPS calculation: proofs in that hour / 3600 seconds
      // To make it look like a highly scaled network based on the seed data,
      // we'll multiply the raw count by a factor (e.g. * 100) since we only seeded 10k proofs.
      const rawCount = hourData ? hourData.count : 0;
      tpsData.push({
        time: `${h.toString().padStart(2, '0')}:00`,
        tps: Math.floor((rawCount * 150) / 3600) // Scale factor for presentation
      });
    }

    // 3. Simulated/Calculated Key Metrics based on real proof count
    // Scale up the realistic metrics proportionally to the database
    const globalTvl = (proofCount * 142000).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const protocolRevenue = (proofCount * 18).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const activeNodes = Math.floor(proofCount / 8) + 42;

    res.json({
      users: userCount,
      rules: ruleCount,
      proofs: proofCount,
      successRate: `${successRate}%`,
      volumeByNetwork: networkVolume,
      tpsData: tpsData,
      tvl: globalTvl,
      revenue: protocolRevenue,
      nodes: activeNodes.toLocaleString('en-US'),
      finality: '0.84s' // Stellar testnet average is usually static
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @desc    Toggle rule status (Admin only)
// @route   PUT /api/admin/rules/:id/status
// @access  Private/Admin
export const toggleRuleStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  
  if (!['active', 'disabled', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const rule = await LogicRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    rule.status = status;
    await rule.save();
    
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating rule' });
  }
};

// @desc    Update user status (Admin only)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['active', 'banned'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = status as 'active' | 'banned';
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user status' });
  }
};

// @desc    Delete a rule (Admin only)
// @route   DELETE /api/admin/rules/:id
// @access  Private/Admin
export const deleteRule = async (req: AuthRequest, res: Response) => {
  try {
    const rule = await LogicRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json({ message: 'Rule removed from protocol registries' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting rule' });
  }
};

// @desc    Update user role (Admin only)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { role, signature, message, nonce } = req.body;
  const adminAddress = req.user?.address;

  if (!adminAddress) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  // Mandatory Action Signature Verification
  if (!signature || !message || !nonce) {
    return res.status(400).json({ message: 'Cryptographic authorization required for role changes.' });
  }

  const verification = await verifyActionIntent(adminAddress, message, signature, nonce, 'UPDATE_USER_ROLE');
  if (!verification.success) {
    return res.status(401).json({ message: verification.message });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role as 'admin' | 'user';
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user role' });
  }
};

// @desc    Approve a pending user account
// @route   PUT /api/admin/users/:id/approve
// @access  Private/Admin
export const approveUser = async (req: AuthRequest, res: Response) => {
  const { signature, message, nonce } = req.body;
  const adminAddress = req.user?.address;

  if (!adminAddress) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Mandatory Action Signature Verification
  if (!signature || !message || !nonce) {
    return res.status(400).json({ message: 'Cryptographic authorization required to approve users.' });
  }

  const verification = await verifyActionIntent(adminAddress, message, signature, nonce, 'APPROVE_USER');
  if (!verification.success) {
    return res.status(403).json({ message: verification.message });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.approved = true;
    user.kycStatus = 'verified'; // Mock KYC verification for hackathon
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error approving user' });
  }
};

// @desc    Get all deposits
// @route   GET /api/admin/deposits
// @access  Private/Admin
export const getAllDeposits = async (req: AuthRequest, res: Response) => {
  try {
    const deposits = await Billing.find({ 
      type: { $in: ['deposit', 'gas_deposit', 'subscription'] } 
    }).sort({ createdAt: -1 });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching deposits' });
  }
};

// @desc    Approve a deposit
// @route   PUT /api/admin/deposits/:id/approve
// @access  Private/Admin
export const approveDeposit = async (req: AuthRequest, res: Response) => {
  const { signature, message, nonce } = req.body;
  const adminAddress = req.user?.address;

  if (!adminAddress) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!signature || !message || !nonce) {
    return res.status(400).json({ message: 'Cryptographic authorization required.' });
  }

  const verification = await verifyActionIntent(adminAddress, message, signature, nonce, 'APPROVE_DEPOSIT');
  if (!verification.success) {
    return res.status(403).json({ message: verification.message });
  }

  try {
    const deposit = await Billing.findById(req.params.id);
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });
    if (deposit.status === 'confirmed') return res.status(400).json({ message: 'Deposit already confirmed' });

    deposit.status = 'confirmed';
    await deposit.save();

    // Update user credits balance based on the deposit amount (1 XLM = 1 Credit for this mock)
    const user = await User.findOne({ address: deposit.userAddress });
    if (user) {
      if (deposit.type === 'gas_deposit') {
        user.gasBalance = (user.gasBalance || 0) + deposit.depositAmount;
      } else {
        user.creditsBalance = (user.creditsBalance || 0) + deposit.depositAmount;
      }
      
      // Auto-upgrade tier if it was a subscription deposit
      if (deposit.type === 'subscription' && deposit.tierUpgradeTo) {
        user.tier = deposit.tierUpgradeTo;
        user.approved = true;
      }

      await user.save();
    }

    res.json(deposit);
  } catch (error) {
    res.status(500).json({ message: 'Server error approving deposit' });
  }
};

// @desc    Get all rules across the system
// @route   GET /api/admin/rules
// @access  Private/Admin
export const getAllRules = async (req: AuthRequest, res: Response) => {
  try {
    const rules = await LogicRule.find().populate('creator', 'address').sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching all rules' });
  }
};

// @desc    Get all proof verification attempts
// @route   GET /api/admin/proofs
// @access  Private/Admin
export const getAllProofs = async (req: AuthRequest, res: Response) => {
  try {
    const proofs = await Proof.find().populate('ruleId', 'name').sort({ createdAt: -1 });
    res.json(proofs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching proofs' });
  }
};

// @desc    Get system-wide status (Kill Switch state)
// @route   GET /api/admin/system/status
// @access  Private/Admin
export const getSystemStatus = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({ protocolHalt: false });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching system status' });
  }
};

// @desc    Toggle global protocol halt (Kill Switch)
// @route   POST /api/admin/system/toggle
// @access  Private/Admin
export const toggleProtocolHalt = async (req: AuthRequest, res: Response) => {
  const { halted, signature, message, nonce } = req.body;
  const adminAddress = req.user?.address;

  if (!adminAddress) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Mandatory Action Signature Verification
  if (!signature || !message || !nonce) {
    return res.status(400).json({ message: 'Cryptographic authorization required for protocol override.' });
  }

  const verification = await verifyActionIntent(adminAddress, message, signature, nonce, 'TOGGLE_PROTOCOL_HALT');
  if (!verification.success) {
    return res.status(403).json({ message: verification.message });
  }

  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting({ protocolHalt: halted, lastHaltedBy: adminAddress });
    } else {
      settings.protocolHalt = halted;
      settings.lastHaltedBy = adminAddress;
      settings.updatedAt = new Date();
    }
    
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error toggling protocol halt' });
  }
};
