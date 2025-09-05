import nodemailer from 'nodemailer';

// For testing: Hardcoded credentials (replace pass with your new app password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'abrarmughal4481@gmail.com',
    pass: 'pmvhrmrndipyddbv', // <--- Put your new app password here (16 chars, no spaces)
  },
});

/**
 * Send an email with optional attachments
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {string} options.fromName - Custom sender name (optional)
 * @param {Array} options.attachments - Array of attachment objects (optional)
 * @returns {Promise} - Promise resolving to mail send info
 */
export const sendEmail = async (options) => {
  try {
    const fromName = options.fromName || 'Devease Digital';
    const mailOptions = {
      from: `"${fromName}" <abrarmughal4481@gmail.com>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || '',
    };

    // Add attachments if any
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}; 