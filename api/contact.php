<?php
/**
 * Smart Finance Hub - Contact Form Handler
 * Professional contact form processing with Zoho SMTP integration
 */

// Include configuration and SMTP mailer
require_once 'config.php';
require_once 'SMTPMailer.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://smartfinancehub.vip');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Rate limiting
session_start();
$current_time = time();

if (!isset($_SESSION['form_submissions'])) {
    $_SESSION['form_submissions'] = [];
}

// Clean old submissions
$_SESSION['form_submissions'] = array_filter(
    $_SESSION['form_submissions'],
    function($timestamp) use ($current_time) {
        return ($current_time - $timestamp) < RATE_LIMIT_WINDOW;
    }
);

// Check rate limit
if (count($_SESSION['form_submissions']) >= MAX_SUBMISSIONS) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Too many submissions. Please wait before sending another message.'
    ]);
    exit;
}

try {
    // Get and validate JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data');
    }

    // Validation
    $required_fields = ['name', 'email', 'subject', 'message', 'consent_required'];
    $errors = [];

    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            $errors[] = "Field '$field' is required";
        }
    }

    // Email validation
    if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email address';
    }

    // Name validation
    if (!empty($data['name']) && !preg_match('/^[A-Za-z\s\-\']{2,100}$/', $data['name'])) {
        $errors[] = 'Invalid name format';
    }

    // Phone validation (if provided)
    if (!empty($data['phone']) && !preg_match('/^[\+]?[0-9\s\-\(\)]{10,17}$/', $data['phone'])) {
        $errors[] = 'Invalid phone number format';
    }

    // Message length validation
    if (!empty($data['message']) && (strlen($data['message']) < MIN_MESSAGE_LENGTH || strlen($data['message']) > MAX_MESSAGE_LENGTH)) {
        $errors[] = "Message must be between " . MIN_MESSAGE_LENGTH . " and " . MAX_MESSAGE_LENGTH . " characters";
    }

    // Consent validation
    if (empty($data['consent_required']) || $data['consent_required'] !== true) {
        $errors[] = 'Privacy consent is required';
    }

    // Anti-spam checks
    if (!empty($data['website']) || !empty($data['email_confirm'])) {
        // Silent fail for honeypot spam
        echo json_encode(['success' => true]);
        exit;
    }

    // Spam content check
    $spam_keywords = [
        'viagra', 'casino', 'lottery', 'winner', 'congratulations',
        'click here', 'buy now', 'limited time', 'act now',
        'make money fast', 'work from home', 'guaranteed income'
    ];
    
    $message_lower = strtolower($data['message']);
    foreach ($spam_keywords as $keyword) {
        if (strpos($message_lower, $keyword) !== false) {
            $errors[] = 'Message appears to contain spam content';
            break;
        }
    }

    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $errors
        ]);
        exit;
    }

    // Sanitize data
    $clean_data = [
        'name' => htmlspecialchars(trim($data['name']), ENT_QUOTES, 'UTF-8'),
        'email' => filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL),
        'phone' => htmlspecialchars(trim($data['phone'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'subject' => htmlspecialchars($data['subject'], ENT_QUOTES, 'UTF-8'),
        'message' => htmlspecialchars(trim($data['message']), ENT_QUOTES, 'UTF-8'),
        'consent_marketing' => !empty($data['consent_marketing']) && $data['consent_marketing'] === true,
        'timestamp' => $data['timestamp'] ?? date('c'),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        'referrer' => $data['referrer'] ?? 'Direct'
    ];

    // Check if SMTP password is configured
    if (empty(SMTP_PASSWORD)) {
        throw new Exception('SMTP configuration incomplete. Please contact administrator.');
    }

    // Initialize SMTP mailer
    $mailer = new SMTPMailer(SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_NAME);
    if (DEBUG_MODE) {
        $mailer->setDebug(true);
    }

    // Test SMTP connection
    if (!$mailer->testConnection()) {
        throw new Exception('Unable to connect to email server. Please try again later.');
    }

    // Determine recipient based on subject
    $subject_routing = [
        'privacy' => PRIVACY_EMAIL,
        'legal' => LEGAL_EMAIL,
        'support' => SUPPORT_EMAIL,
        'general' => ADMIN_EMAIL,
        'business' => ADMIN_EMAIL,
        'advertising' => ADMIN_EMAIL,
        'newsletter' => ADMIN_EMAIL,
        'technical' => SUPPORT_EMAIL,
        'feedback' => ADMIN_EMAIL,
        'other' => ADMIN_EMAIL
    ];

    $admin_recipient = $subject_routing[$clean_data['subject']] ?? ADMIN_EMAIL;

    // Subject mapping
    $subject_map = [
        'general' => 'General Inquiry',
        'support' => 'Customer Support Request',
        'business' => 'Business Partnership Inquiry',
        'privacy' => 'Privacy Question',
        'advertising' => 'Advertising Inquiry',
        'newsletter' => 'Newsletter Support',
        'technical' => 'Technical Issue Report',
        'feedback' => 'Website Feedback',
        'legal' => 'Legal Matter',
        'other' => 'Other Inquiry'
    ];

    $email_subject = '[Smart Finance Hub Contact] ' . ($subject_map[$clean_data['subject']] ?? 'Contact Form Submission');

    // Create HTML email templates
    $admin_email_body_html = createAdminEmailHTML($clean_data, $subject_map);
    $customer_email_body_html = createCustomerEmailHTML($clean_data, $subject_map);

    // Send admin notification
    $admin_mail_sent = false;
    try {
        $admin_mail_sent = $mailer->sendMail(
            $admin_recipient,
            'Smart Finance Hub Admin',
            $email_subject,
            $admin_email_body_html,
            $clean_data['email'],
            true // HTML email
        );
    } catch (Exception $e) {
        error_log("Failed to send admin email: " . $e->getMessage());
    }

    // Send customer confirmation
    $customer_mail_sent = false;
    try {
        $customer_mail_sent = $mailer->sendMail(
            $clean_data['email'],
            $clean_data['name'],
            'Thank you for contacting Smart Finance Hub',
            $customer_email_body_html,
            ADMIN_EMAIL,
            true // HTML email
        );
    } catch (Exception $e) {
        error_log("Failed to send customer confirmation: " . $e->getMessage());
        // Customer confirmation failure is not critical
    }

    if (!$admin_mail_sent) {
        throw new Exception('Failed to send notification email. Please try again or contact us directly.');
    }

    // Log successful submission
    $_SESSION['form_submissions'][] = $current_time;

    // Log to file if enabled
    if (LOG_EMAILS) {
        $log_entry = [
            'timestamp' => date('c'),
            'name' => $clean_data['name'],
            'email' => $clean_data['email'],
            'subject' => $clean_data['subject'],
            'ip_address' => $clean_data['ip_address'],
            'user_agent' => $clean_data['user_agent'],
            'admin_email_sent' => $admin_mail_sent,
            'customer_email_sent' => $customer_mail_sent,
            'admin_recipient' => $admin_recipient
        ];
        
        file_put_contents(
            __DIR__ . '/contact_log.json', 
            json_encode($log_entry) . "\n", 
            FILE_APPEND | LOCK_EX
        );
    }

    // Success response with delivery confirmation
    echo json_encode([
        'success' => true,
        'message' => 'Message sent successfully',
        'delivery_status' => [
            'admin_notified' => $admin_mail_sent,
            'confirmation_sent' => $customer_mail_sent,
            'recipient_department' => getDepartmentName($admin_recipient)
        ],
        'response_time' => getResponseTime($clean_data['subject']),
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while processing your message. Please try again or contact us directly.',
        'error_id' => uniqid('contact_error_'),
        'support_email' => ADMIN_EMAIL
    ]);
}

/**
 * Create HTML email template for admin notification
 */
function createAdminEmailHTML($data, $subject_map) {
    $subject_display = $subject_map[$data['subject']] ?? $data['subject'];
    
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px; border-left: 4px solid #667eea; }
            .field-label { font-weight: bold; color: #4a5568; margin-bottom: 5px; }
            .field-value { color: #2d3748; }
            .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>💰 Smart Finance Hub - New Contact Form Submission</h2>
            </div>
            
            <div class='content'>
                <div class='field'>
                    <div class='field-label'>Name:</div>
                    <div class='field-value'>{$data['name']}</div>
                </div>
                
                <div class='field'>
                    <div class='field-label'>Email:</div>
                    <div class='field-value'><a href='mailto:{$data['email']}'>{$data['email']}</a></div>
                </div>
                
                <div class='field'>
                    <div class='field-label'>Phone:</div>
                    <div class='field-value'>" . ($data['phone'] ?: 'Not provided') . "</div>
                </div>
                
                <div class='field'>
                    <div class='field-label'>Subject Category:</div>
                    <div class='field-value'>$subject_display</div>
                </div>
                
                <div class='field'>
                    <div class='field-label'>Marketing Consent:</div>
                    <div class='field-value'>" . ($data['consent_marketing'] ? 'Yes' : 'No') . "</div>
                </div>
                
                <div class='message-box'>
                    <div class='field-label'>Message:</div>
                    <div style='margin-top: 10px; line-height: 1.6;'>" . nl2br($data['message']) . "</div>
                </div>
                
                <div class='field'>
                    <div class='field-label'>Submission Details:</div>
                    <div class='field-value'>
                        <strong>Date:</strong> {$data['timestamp']}<br>
                        <strong>IP Address:</strong> {$data['ip_address']}<br>
                        <strong>User Agent:</strong> {$data['user_agent']}<br>
                        <strong>Referrer:</strong> {$data['referrer']}
                    </div>
                </div>
            </div>
            
            <div class='footer'>
                <p>This message was sent via the Smart Finance Hub contact form.</p>
                <p>Please respond directly to the customer's email address: <a href='mailto:{$data['email']}'>{$data['email']}</a></p>
                <p><a href='" . WEBSITE_URL . "'>Smart Finance Hub</a> | Professional Financial Guidance</p>
            </div>
        </div>
    </body>
    </html>";
}

/**
 * Create HTML email template for customer confirmation
 */
function createCustomerEmailHTML($data, $subject_map) {
    $subject_display = $subject_map[$data['subject']] ?? $data['subject'];
    $response_time = getResponseTime($data['subject']);
    
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background: #e6fffa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38b2ac; }
            .submission-summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .contact-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>💰 Thank You for Contacting Us!</h1>
                <p style='margin: 0; opacity: 0.9;'>Smart Finance Hub - Professional Financial Guidance</p>
            </div>
            
            <div class='content'>
                <p>Dear {$data['name']},</p>
                
                <p>Thank you for contacting Smart Finance Hub! We have received your message and will respond within <strong>$response_time hours</strong> during business days (Monday-Friday, 9 AM - 6 PM EST).</p>
                
                <div class='highlight'>
                    <h3 style='margin-top: 0; color: #2d3748;'>📧 Your Message Has Been Received</h3>
                    <p style='margin-bottom: 0;'>We appreciate you taking the time to reach out to us. Our team will review your inquiry and provide a comprehensive response.</p>
                </div>
                
                <div class='submission-summary'>
                    <h4 style='color: #4a5568; margin-bottom: 15px;'>📋 Submission Summary:</h4>
                    <p><strong>Subject:</strong> $subject_display</p>
                    <p><strong>Submitted:</strong> " . date('F j, Y g:i A T', strtotime($data['timestamp'])) . "</p>
                    <p><strong>Reference ID:</strong> " . strtoupper(substr(md5($data['email'] . $data['timestamp']), 0, 8)) . "</p>
                </div>
                
                <div class='contact-info'>
                    <h4 style='color: #4a5568;'>📞 Need Immediate Assistance?</h4>
                    <p>For urgent matters, please don't hesitate to contact us directly:</p>
                    <p>
                        <strong>General Information:</strong> <a href='mailto:" . ADMIN_EMAIL . "'>" . ADMIN_EMAIL . "</a><br>
                        <strong>Customer Support:</strong> <a href='mailto:" . SUPPORT_EMAIL . "'>" . SUPPORT_EMAIL . "</a><br>
                        <strong>Privacy Questions:</strong> <a href='mailto:" . PRIVACY_EMAIL . "'>" . PRIVACY_EMAIL . "</a>
                    </p>
                </div>
                
                <p>Best regards,<br>
                <strong>Smart Finance Hub Team</strong></p>
            </div>
            
            <div class='footer'>
                <p><strong>Smart Finance Hub</strong><br>
                Professional Financial Guidance & Education</p>
                <p>
                    🌐 <a href='" . WEBSITE_URL . "'>smartfinancehub.vip</a> | 
                    📧 <a href='mailto:" . ADMIN_EMAIL . "'>" . ADMIN_EMAIL . "</a><br>
                    📜 <a href='" . WEBSITE_URL . "/privacy.html'>Privacy Policy</a> | 
                    📋 <a href='" . WEBSITE_URL . "/terms.html'>Terms of Service</a>
                </p>
                <p style='font-size: 10px; margin-top: 15px;'>
                    This is an automated confirmation. Please do not reply to this email.<br>
                    If you have additional questions, please use our contact form or email us directly.
                </p>
            </div>
        </div>
    </body>
    </html>";
}

/**
 * Get department name from email address
 */
function getDepartmentName($email) {
    $departments = [
        ADMIN_EMAIL => 'General Information',
        PRIVACY_EMAIL => 'Privacy & Data Protection',
        LEGAL_EMAIL => 'Legal Department',
        SUPPORT_EMAIL => 'Customer Support',
        TEAM_EMAIL => 'Team Inquiries'
    ];
    
    return $departments[$email] ?? 'General Information';
}

/**
 * Get response time for subject category
 */
function getResponseTime($subject) {
    $response_times = [
        'general' => 24,
        'privacy' => 48,
        'legal' => 48,
        'support' => 24,
        'team' => 24,
        'business' => 24,
        'advertising' => 24,
        'newsletter' => 24,
        'technical' => 24,
        'feedback' => 24,
        'other' => 24
    ];
    
    return $response_times[$subject] ?? 24;
}
?>