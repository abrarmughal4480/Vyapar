import UserInvite from '../models/userInvite.js';
import { sendEmail } from '../services/emailService.js';

export const sendUserInvite = async (req, res) => {
  try {
    const { email, role, companyName } = req.body;
    const requestedBy = req.user && (req.user._id || req.user.id);
    if (!email || !role || !companyName || !requestedBy) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Save invite to DB
    const invite = new UserInvite({ email, role, companyName, requestedBy });
    await invite.save();

    // Send email using emailService
    await sendEmail({
      to: email,
      subject: `Invitation to join ${companyName} as ${role}`,
      text: `You have been invited to join ${companyName} as a ${role} on Devease Digital. Please accept the invitation to proceed.`,
      html: `<p>You have been invited to join <b>${companyName}</b> as a <b>${role}</b> on <b>Devease Digital</b>.<br/>Please accept the invitation to proceed.</p>`,
      fromName: 'Devease Digital',
    });

    res.json({ success: true, message: 'Invite sent and saved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserInvites = async (req, res) => {
  try {
    const requestedBy = req.user && (req.user._id || req.user.id);
    if (!requestedBy) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const invites = await UserInvite.find({ requestedBy }).sort({ date: -1 });
    res.json({ success: true, data: invites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all invites for the logged-in user's email
export const getInvitesForMe = async (req, res) => {
  try {
    const userEmail = req.user && req.user.email;
    if (!userEmail) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const invites = await UserInvite.find({ email: userEmail }).sort({ date: -1 });
    res.json({ success: true, data: invites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Accept or reject an invite
export const respondToInvite = async (req, res) => {
  try {
    const userEmail = req.user && req.user.email;
    const { inviteId, action } = req.body; // action: 'Accepted' or 'Rejected'
    if (!userEmail || !inviteId || !['Accepted', 'Rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Missing or invalid fields' });
    }
    const invite = await UserInvite.findById(inviteId);
    if (!invite) return res.status(404).json({ success: false, message: 'Invite not found' });
    if (invite.email !== userEmail) return res.status(403).json({ success: false, message: 'Not allowed' });
    invite.status = action;
    await invite.save();
    res.json({ success: true, message: `Invite ${action.toLowerCase()}.`, data: invite });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 