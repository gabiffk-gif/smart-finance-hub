<?php
/**
 * Smart Finance Hub - Configuration Template
 * Copy this file to config.php and fill in your actual credentials
 */

// IMPORTANT: Copy this file to config.php and set your actual Zoho Mail password
// Never commit the actual config.php file with real credentials to version control

// Email Configuration
define('SMTP_HOST', 'smtp.zoho.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'info@smartfinancehub.vip');
define('SMTP_PASSWORD', 'YOUR_ZOHO_MAIL_PASSWORD_HERE'); // ⚠️ Set your Zoho Mail password or app password
define('SMTP_FROM_NAME', 'Smart Finance Hub');

// Email Routing Configuration
define('ADMIN_EMAIL', 'info@smartfinancehub.vip');
define('PRIVACY_EMAIL', 'privacy@smartfinancehub.vip');
define('LEGAL_EMAIL', 'legal@smartfinancehub.vip');
define('SUPPORT_EMAIL', 'support@smartfinancehub.vip');
define('TEAM_EMAIL', 'team@smartfinancehub.vip');

// Security Configuration
define('RATE_LIMIT_WINDOW', 300); // 5 minutes
define('MAX_SUBMISSIONS', 3);
define('MAX_MESSAGE_LENGTH', 2000);
define('MIN_MESSAGE_LENGTH', 10);

// Debug Configuration - Set to false in production
define('DEBUG_MODE', false); // Set to true for development testing
define('LOG_EMAILS', true);  // Set to false to disable email logging

// Email Templates Configuration
define('ENABLE_HTML_EMAILS', true);
define('EMAIL_LOGO_URL', 'https://smartfinancehub.vip/assets/images/logo.png');
define('WEBSITE_URL', 'https://smartfinancehub.vip');

/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Copy this file to config.php:
 *    cp config.template.php config.php
 * 
 * 2. Edit config.php and set SMTP_PASSWORD to your Zoho Mail password
 * 
 * 3. For security, use an app-specific password:
 *    - Go to Zoho Account → Security → App Passwords
 *    - Create password for "Smart Finance Hub Contact Form"
 * 
 * 4. Test the configuration:
 *    php test_smtp.php
 * 
 * 5. Secure the config file (recommended):
 *    chmod 600 config.php
 * 
 * ZOHO MAIL REQUIREMENTS:
 * - IMAP/SMTP must be enabled in Zoho Mail settings
 * - Use app password if 2-factor authentication is enabled
 * - Verify your domain is properly configured in Zoho
 */
?>