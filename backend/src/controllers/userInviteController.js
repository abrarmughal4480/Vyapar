import UserInvite from '../models/userInvite.js';
import User from '../models/user.js';
import { sendEmail } from '../services/emailService.js';

export const sendUserInvite = async (req, res) => {
  try {
    const { email, role } = req.body;
    const requestedBy = req.user && (req.user._id || req.user.id);
    if (!email || !role || !requestedBy) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Get the business name from the requesting user
    const requestingUser = await User.findById(requestedBy);
    if (!requestingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the user being invited by email
    const invitedUser = await User.findOne({ email });
    const requestedTo = invitedUser ? invitedUser._id : null;

    // Save invite to DB with business name and requestedTo
    const invite = new UserInvite({ 
      email, 
      role, 
      companyName: requestingUser.businessName, 
      requestedBy,
      requestedTo 
    });
    await invite.save();

    // Send email using emailService
    await sendEmail({
      to: email,
      subject: `Invitation to join ${requestingUser.businessName} as ${role}`,
      text: `You have been invited to join ${requestingUser.businessName} as a ${role} on Devease Digital. Please accept the invitation to proceed.`,
      html: `<p>You have been invited to join <b>${requestingUser.businessName}</b> as a <b>${role}</b> on <b>Devease Digital</b>.<br/>Please accept the invitation to proceed.</p>`,
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

    // If accepted, update the joinedCompanies array for both users
    if (action === 'Accepted' && invite.requestedTo && invite.requestedBy) {
      // Add the company (requestedBy) to the invited user's joinedCompanies
      await User.findByIdAndUpdate(
        invite.requestedTo,
        { $addToSet: { joinedCompanies: invite.requestedBy } }
      );
      
      // Add the invited user to the company's joinedCompanies (optional - for tracking)
      await User.findByIdAndUpdate(
        invite.requestedBy,
        { $addToSet: { joinedCompanies: invite.requestedTo } }
      );
    }

    res.json({ success: true, message: `Invite ${action.toLowerCase()}.`, data: invite });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update user's company context when they join a company
export const updateUserCompanyContext = async (req, res) => {
  try {
    const { inviteId, companyId, userId } = req.body;
    const currentUserId = req.user && (req.user._id || req.user.id);
    
    if (!inviteId || !companyId || !userId || !currentUserId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify the invite exists and belongs to the current user
    const invite = await UserInvite.findById(inviteId);
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    if (invite.email !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this invite' });
    }

    // Update the user's joinedCompanies array
    await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { joinedCompanies: companyId } }
    );

    // Update the company's joinedCompanies array (optional - for tracking)
    await User.findByIdAndUpdate(
      companyId,
      { $addToSet: { joinedCompanies: currentUserId } }
    );

    // Update the invite to include the user's ID as requestedTo
    invite.requestedTo = currentUserId;
    await invite.save();

    console.log(`User ${currentUserId} joined company ${companyId}`);

    res.json({ 
      success: true, 
      message: 'User company context updated successfully',
      data: {
        userId: currentUserId,
        companyId: companyId,
        inviteId: inviteId
      }
    });
  } catch (err) {
    console.error('Error updating user company context:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete user invite
export const deleteUserInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const requestedBy = req.user && (req.user._id || req.user.id);
    
    console.log('=== DELETE INVITE START ===');
    console.log('Invite ID:', inviteId);
    console.log('Requested by user:', requestedBy);
    
    if (!inviteId || !requestedBy) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Find the invite and verify ownership
    const invite = await UserInvite.findById(inviteId);
    if (!invite) {
      console.log('Invite not found');
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    console.log('Found invite:', {
      id: invite._id,
      email: invite.email,
      status: invite.status,
      requestedTo: invite.requestedTo,
      requestedBy: invite.requestedBy
    });

    // Only the person who sent the invite can delete it
    if (invite.requestedBy.toString() !== requestedBy.toString()) {
      console.log('Authorization failed: User not authorized to delete this invite');
      return res.status(403).json({ success: false, message: 'Not authorized to delete this invite' });
    }

    // Allow deletion of all invites regardless of status
    // Removed the restriction: if (invite.status === 'Accepted') { ... }

    // If the invite was for a specific user (has requestedTo), remove their access and invalidate token
    if (invite.requestedTo) {
      console.log('=== REMOVING USER ACCESS AND INVALIDATING TOKEN ===');
      console.log('User ID to remove access:', invite.requestedTo);
      
      try {
        // Get user's current state BEFORE removal
        const userBefore = await User.findById(invite.requestedTo);
        console.log('User BEFORE access removal:', {
          id: userBefore?._id,
          email: userBefore?.email,
          currentToken: userBefore?.currentToken ? 'EXISTS' : 'NONE',
          joinedCompanies: userBefore?.joinedCompanies || []
        });

        // Remove user from this company's joinedCompanies and clear their token
        const updateResult = await User.findByIdAndUpdate(
          invite.requestedTo,
          { 
            $pull: { joinedCompanies: invite.requestedBy },
            $unset: { currentToken: 1 }
          },
          { new: true }
        );
        
        console.log('User access removal result:', updateResult);
        
        // Also remove this user from the company's joinedCompanies (if they were added)
        await User.findByIdAndUpdate(
          invite.requestedBy,
          { $pull: { joinedCompanies: invite.requestedTo } }
        );
        
        console.log('User removed from company joinedCompanies');
        
        // Get user's state AFTER removal
        const userAfter = await User.findById(invite.requestedTo);
        console.log('User AFTER access removal:', {
          id: userAfter?._id,
          email: userAfter?.email,
          currentToken: userAfter?.currentToken ? 'EXISTS' : 'NONE',
          joinedCompanies: userAfter?.joinedCompanies || []
        });
        
        console.log('User access removal and token invalidation successful for user:', invite.requestedTo);
        
      } catch (tokenError) {
        console.error('=== ERROR DURING USER ACCESS REMOVAL ===');
        console.error('Error removing user access:', tokenError);
        console.error('Error stack:', tokenError.stack);
        // Continue with invite deletion even if access removal fails
      }
    } else {
      console.log('=== REMOVING USER ACCESS BY EMAIL ===');
      console.log('No specific user ID, searching by email:', invite.email);
      
      // If no specific user ID, try to find user by email and remove their access
      try {
        const userByEmail = await User.findOne({ email: invite.email });
        if (userByEmail) {
          console.log('Found user by email:', {
            id: userByEmail._id,
            email: userByEmail.email,
            currentToken: userByEmail.currentToken ? 'EXISTS' : 'NONE',
            joinedCompanies: userByEmail.joinedCompanies || []
          });
          
          // Get user's current state BEFORE removal
          const userBefore = await User.findById(userByEmail._id);
          console.log('User BEFORE access removal (by email):', {
            id: userBefore?._id,
            email: userBefore?.email,
            currentToken: userBefore?.currentToken ? 'EXISTS' : 'NONE',
            joinedCompanies: userBefore?.joinedCompanies || []
          });

          // Remove user from this company's joinedCompanies and clear their token
          const updateResult = await User.findByIdAndUpdate(
            userByEmail._id,
            { 
              $pull: { joinedCompanies: invite.requestedBy },
              $unset: { currentToken: 1 }
            },
            { new: true }
          );
          
          console.log('User access removal result (by email):', updateResult);
          
          // Also remove this user from the company's joinedCompanies (if they were added)
          await User.findByIdAndUpdate(
            invite.requestedBy,
            { $pull: { joinedCompanies: userByEmail._id } }
          );
          
          console.log('User removed from company joinedCompanies (by email)');
          
          // Get user's state AFTER removal
          const userAfter = await User.findById(userByEmail._id);
          console.log('User AFTER access removal (by email):', {
            id: userAfter?._id,
            email: userAfter?.email,
            currentToken: userAfter?.currentToken ? 'EXISTS' : 'NONE',
            joinedCompanies: userAfter?.joinedCompanies || []
          });
          
          console.log('User access removal and token invalidation successful for user (by email):', userByEmail._id);
          
        } else {
          console.log('No user found with email:', invite.email);
        }
      } catch (emailTokenError) {
        console.error('=== ERROR DURING EMAIL USER ACCESS REMOVAL ===');
        console.error('Error removing user access by email:', emailTokenError);
        console.error('Error stack:', emailTokenError.stack);
        // Continue with invite deletion even if access removal fails
      }
    }

    console.log('=== DELETING INVITE ===');
    // Delete the invite
    const deleteResult = await UserInvite.findByIdAndDelete(inviteId);
    console.log('Invite deletion result:', deleteResult);

    console.log('=== DELETE INVITE COMPLETE ===');
    res.json({ success: true, message: 'Invite deleted successfully' });
  } catch (err) {
    console.error('=== ERROR IN DELETE INVITE ===');
    console.error('Error deleting user invite:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
}; 