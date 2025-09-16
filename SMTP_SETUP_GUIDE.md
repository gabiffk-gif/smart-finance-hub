# Smart Finance Hub - SMTP Email Setup Guide

This guide explains how to configure the contact form to work with Zoho Mail SMTP for professional email delivery.

## Overview

The contact form system has been updated to use Zoho Mail SMTP instead of PHP's basic `mail()` function, providing:
- Professional email delivery through Zoho Mail
- Automatic email routing based on inquiry type
- HTML email templates with Smart Finance Hub branding
- Delivery confirmation and error handling
- Email logging and analytics

## Files Created/Updated

### New Files
- `api/SMTPMailer.php` - Custom SMTP client for Zoho Mail
- `api/config.php` - Configuration file for SMTP and email settings
- `api/test_smtp.php` - SMTP connection testing script
- `composer.json` - Dependency management (optional)

### Updated Files
- `api/contact.php` - Completely rewritten with SMTP support

## Configuration Steps

### 1. Zoho Mail Setup

First, ensure your Zoho Mail account is properly configured:

1. **Create Zoho Mail Account** (if not already done)
   - Go to [mail.zoho.com](https://mail.zoho.com)
   - Set up your `info@smartfinancehub.vip` account

2. **Enable SMTP Access**
   - Log in to Zoho Mail
   - Go to Settings → Mail → POP/IMAP
   - Enable "IMAP Access" (this also enables SMTP)

3. **Generate App Password** (Recommended for security)
   - Go to Zoho Account → Security → App Passwords
   - Create a new app password for "Smart Finance Hub Contact Form"
   - Save this password - you'll need it in step 2

### 2. Server Configuration

1. **Edit Configuration File**
   ```bash
   nano api/config.php
   ```

2. **Set SMTP Password**
   Find this line:
   ```php
   define('SMTP_PASSWORD', ''); // Set your Zoho Mail password here
   ```
   
   Replace with:
   ```php
   define('SMTP_PASSWORD', 'your_zoho_password_or_app_password');
   ```

3. **Verify Other Settings** (should be correct by default)
   ```php
   define('SMTP_HOST', 'smtp.zoho.com');
   define('SMTP_PORT', 587);
   define('SMTP_USERNAME', 'info@smartfinancehub.vip');
   ```

### 3. Test SMTP Connection

1. **Run Test Script**
   ```bash
   cd /path/to/your/project/api
   php test_smtp.php
   ```

2. **Expected Output**
   ```
   === Smart Finance Hub SMTP Test ===

   1. Checking configuration...
      SMTP Host: smtp.zoho.com
      SMTP Port: 587
      Username: info@smartfinancehub.vip
      Password: ✅ SET

   2. Testing SMTP connection...
   ✅ SMTP connection successful!

   === Test Complete ===
   ```

3. **Troubleshooting Connection Issues**
   - Ensure IMAP/SMTP is enabled in Zoho Mail settings
   - Use app password instead of account password if 2FA is enabled
   - Check firewall settings (port 587 must be open)
   - Verify your server can make outbound SMTP connections

## Email Routing System

The contact form now automatically routes emails based on the inquiry subject:

| Subject Type | Routes To | Response Time |
|-------------|-----------|---------------|
| `privacy` | privacy@smartfinancehub.vip | 48 hours |
| `legal` | legal@smartfinancehub.vip | 48 hours |
| `support` | support@smartfinancehub.vip | 24 hours |
| `technical` | support@smartfinancehub.vip | 24 hours |
| `general` | info@smartfinancehub.vip | 24 hours |
| `business` | info@smartfinancehub.vip | 24 hours |
| All others | info@smartfinancehub.vip | 24 hours |

## Email Templates

### Admin Notification Email
- Professional HTML template with Smart Finance Hub branding
- Includes all form data in structured format
- Contact details for easy reply
- Submission metadata (IP, user agent, timestamp)

### Customer Confirmation Email
- Branded thank you message
- Response time commitment
- Reference ID for tracking
- Direct contact information for urgent matters
- Links to privacy policy and terms of service

## Security Features

### Rate Limiting
- Maximum 3 submissions per 5-minute window
- Session-based tracking
- Automatic cleanup of old submissions

### Anti-Spam Protection
- Honeypot fields detection
- Keyword-based spam filtering
- Content length validation
- Email format validation

### Data Sanitization
- HTML entity encoding
- Email address validation
- Input trimming and cleaning
- XSS prevention

## Monitoring and Logging

### Email Delivery Tracking
- Success/failure status for both admin and customer emails
- Delivery confirmation in API response
- Error logging with detailed messages

### Contact Log
- JSON log file: `api/contact_log.json`
- Includes all submission details
- Delivery status tracking
- Department routing information

### Debug Mode
Enable debug mode for development:
```php
define('DEBUG_MODE', true);
```

This will:
- Enable detailed SMTP logging
- Show connection details
- Log all SMTP commands and responses

## API Response Format

### Successful Submission
```json
{
    "success": true,
    "message": "Message sent successfully",
    "delivery_status": {
        "admin_notified": true,
        "confirmation_sent": true,
        "recipient_department": "Privacy & Data Protection"
    },
    "response_time": 48,
    "timestamp": "2025-03-10T15:30:45+00:00"
}
```

### Error Response
```json
{
    "success": false,
    "message": "An error occurred while processing your message.",
    "error_id": "contact_error_123456",
    "support_email": "info@smartfinancehub.vip"
}
```

## Performance Considerations

### SMTP Connection Pooling
- Each form submission creates a new SMTP connection
- Connection is properly closed after use
- Consider implementing connection pooling for high-volume sites

### Email Queue (Future Enhancement)
For high-traffic sites, consider implementing:
- Background email processing
- Queue-based email sending
- Retry mechanism for failed deliveries

## Troubleshooting

### Common Issues

1. **"SMTP configuration incomplete"**
   - Check that `SMTP_PASSWORD` is set in `config.php`
   - Verify password is correct

2. **"Unable to connect to email server"**
   - Check internet connectivity
   - Verify SMTP settings in Zoho Mail
   - Ensure port 587 is accessible
   - Try using app password instead of account password

3. **"SMTP Error: 535 Authentication failed"**
   - Wrong username or password
   - 2FA may require app password
   - Check if SMTP is enabled in Zoho Mail

4. **"Failed to enable TLS encryption"**
   - Server doesn't support TLS/SSL
   - OpenSSL extension may not be installed
   - Check PHP configuration

### Testing Email Delivery

1. **Basic Connection Test**
   ```bash
   php api/test_smtp.php
   ```

2. **Full Email Test** (edit test script first)
   - Uncomment the email sending section in `test_smtp.php`
   - Set a real email address
   - Run the script to send a test email

3. **Contact Form Test**
   - Use browser developer tools
   - Submit test form with network monitoring
   - Check response for delivery status

## Security Best Practices

### Credentials Management
- Never commit passwords to version control
- Use app passwords instead of account passwords
- Consider environment variables for sensitive data
- Regularly rotate passwords

### Server Security
- Restrict access to `config.php`
- Use HTTPS for all form submissions
- Implement proper error handling
- Monitor email logs for suspicious activity

### Email Security
- Use DKIM signing (configure in Zoho Mail)
- Implement SPF records for your domain
- Add DMARC policy for email authentication
- Monitor delivery rates and spam scores

## Maintenance

### Regular Tasks
- Monitor `contact_log.json` for issues
- Check email delivery rates
- Update spam keyword filters
- Review error logs weekly

### Updates
- Keep SMTP settings synchronized with Zoho Mail changes
- Update email templates as needed
- Monitor PHP version compatibility
- Test form functionality after server updates

## Advanced Configuration

### Custom Email Templates
Edit the HTML template functions in `contact.php`:
- `createAdminEmailHTML()` - Admin notification template
- `createCustomerEmailHTML()` - Customer confirmation template

### Additional Email Addresses
Add new departments to `config.php`:
```php
define('MARKETING_EMAIL', 'marketing@smartfinancehub.vip');
```

Update routing in `contact.php`:
```php
$subject_routing = [
    'marketing' => MARKETING_EMAIL,
    // ... existing routes
];
```

### Custom Response Times
Modify the response time array in the `getResponseTime()` function:
```php
$response_times = [
    'urgent' => 2,     // 2 hours
    'standard' => 24,  // 24 hours
    'complex' => 72,   // 72 hours
];
```

## Support

If you encounter issues with the SMTP setup:

1. Check the troubleshooting section above
2. Review server error logs
3. Test SMTP connection with the provided test script
4. Verify Zoho Mail configuration
5. Contact your hosting provider for server-specific issues

For Smart Finance Hub specific questions:
- Email: info@smartfinancehub.vip
- Documentation: This guide and inline code comments
- Logs: Check `api/contact_log.json` for delivery details