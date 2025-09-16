<?php
/**
 * SMTP Connection Test Script
 * Test the Zoho Mail SMTP configuration
 */

require_once 'config.php';
require_once 'SMTPMailer.php';

echo "=== Smart Finance Hub SMTP Test ===\n\n";

// Check configuration
echo "1. Checking configuration...\n";
echo "   SMTP Host: " . SMTP_HOST . "\n";
echo "   SMTP Port: " . SMTP_PORT . "\n";
echo "   Username: " . SMTP_USERNAME . "\n";
echo "   Password: " . (empty(SMTP_PASSWORD) ? "❌ NOT SET" : "✅ SET") . "\n\n";

if (empty(SMTP_PASSWORD)) {
    echo "❌ ERROR: SMTP password is not configured in config.php\n";
    echo "Please set the SMTP_PASSWORD constant to your Zoho Mail password.\n\n";
    exit(1);
}

// Test connection
echo "2. Testing SMTP connection...\n";
try {
    $mailer = new SMTPMailer(SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_NAME);
    $mailer->setDebug(true);
    
    if ($mailer->testConnection()) {
        echo "✅ SMTP connection successful!\n\n";
    } else {
        echo "❌ SMTP connection failed!\n\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "❌ SMTP connection error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test email sending (optional - uncomment to test)
/*
echo "3. Testing email sending...\n";
try {
    $test_email = 'test@example.com'; // Change this to a real email for testing
    $result = $mailer->sendMail(
        $test_email,
        'Test Recipient',
        'Smart Finance Hub - SMTP Test Email',
        '<h2>SMTP Test Successful!</h2><p>This is a test email from Smart Finance Hub contact form system.</p><p>If you receive this, the SMTP configuration is working correctly.</p>',
        SMTP_USERNAME,
        true
    );
    
    if ($result) {
        echo "✅ Test email sent successfully to $test_email\n\n";
    } else {
        echo "❌ Failed to send test email\n\n";
    }
} catch (Exception $e) {
    echo "❌ Email sending error: " . $e->getMessage() . "\n\n";
}
*/

echo "=== Test Complete ===\n";
echo "If connection test passed, your SMTP configuration is ready!\n";
echo "Remember to set your actual Zoho Mail password in config.php\n\n";

// Configuration instructions
echo "Configuration Steps:\n";
echo "1. Edit api/config.php\n";
echo "2. Set SMTP_PASSWORD to your Zoho Mail app password\n";
echo "3. Make sure your Zoho Mail account has IMAP/SMTP enabled\n";
echo "4. Use an app-specific password if 2FA is enabled\n\n";

echo "Zoho Mail SMTP Settings Confirmed:\n";
echo "- Server: smtp.zoho.com\n";
echo "- Port: 587\n";
echo "- Security: STARTTLS\n";
echo "- Authentication: Required\n\n";
?>