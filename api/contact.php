<?php
/**
 * Smart Finance Hub - Contact Form Handler
 * Professional contact form processing with email integration
 */

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

// Rate limiting (simple implementation)
session_start();
$current_time = time();
$rate_limit_window = 300; // 5 minutes
$max_submissions = 3;

if (!isset($_SESSION['form_submissions'])) {
    $_SESSION['form_submissions'] = [];
}

// Clean old submissions
$_SESSION['form_submissions'] = array_filter(
    $_SESSION['form_submissions'],
    function($timestamp) use ($current_time, $rate_limit_window) {
        return ($current_time - $timestamp) < $rate_limit_window;
    }
);

// Check rate limit
if (count($_SESSION['form_submissions']) >= $max_submissions) {
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
    if (!empty($data['message']) && (strlen($data['message']) < 10 || strlen($data['message']) > 2000)) {
        $errors[] = 'Message must be between 10 and 2000 characters';
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

    // Email configuration
    $to_email = 'info@smartfinancehub.vip';
    $subject_prefix = '[Smart Finance Hub Contact] ';
    $from_email = 'noreply@smartfinancehub.vip';
    $reply_to = $clean_data['email'];

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
        'other' => 'Other Inquiry'
    ];

    $email_subject = $subject_prefix . ($subject_map[$clean_data['subject']] ?? 'Contact Form Submission');

    // Email templates
    $admin_email_body = "
Smart Finance Hub - New Contact Form Submission

Name: {$clean_data['name']}
Email: {$clean_data['email']}
Phone: " . ($clean_data['phone'] ?: 'Not provided') . "
Subject: " . ($subject_map[$clean_data['subject']] ?? $clean_data['subject']) . "
Marketing Consent: " . ($clean_data['consent_marketing'] ? 'Yes' : 'No') . "
Submitted: {$clean_data['timestamp']}
IP Address: {$clean_data['ip_address']}
User Agent: {$clean_data['user_agent']}
Referrer: {$clean_data['referrer']}

Message:
{$clean_data['message']}

---
This message was sent via the Smart Finance Hub contact form.
Please respond directly to the customer's email address: {$clean_data['email']}
    ";

    $customer_email_body = "
Dear {$clean_data['name']},

Thank you for contacting Smart Finance Hub! We've received your message and will respond within 24 hours.

Here's a copy of your submission:

Subject: " . ($subject_map[$clean_data['subject']] ?? $clean_data['subject']) . "
Message: {$clean_data['message']}
Submitted: " . date('F j, Y g:i A T', strtotime($clean_data['timestamp'])) . "

If you need immediate assistance, please don't hesitate to call us or send a direct email to info@smartfinancehub.vip.

Best regards,
Smart Finance Hub Team

---
Smart Finance Hub
Professional Financial Guidance & Education
Website: https://smartfinancehub.vip
Email: info@smartfinancehub.vip
Privacy: privacy@smartfinancehub.vip

This is an automated confirmation. Please do not reply to this email.
    ";

    // Email headers
    $admin_headers = [
        'From' => $from_email,
        'Reply-To' => $reply_to,
        'Return-Path' => $from_email,
        'X-Mailer' => 'Smart Finance Hub Contact Form',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'X-Priority' => '3',
        'X-Contact-Form' => 'Smart Finance Hub'
    ];

    $customer_headers = [
        'From' => 'Smart Finance Hub <' . $from_email . '>',
        'Reply-To' => $to_email,
        'Return-Path' => $from_email,
        'X-Mailer' => 'Smart Finance Hub Contact Form',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'X-Priority' => '3'
    ];

    // Convert headers to string format
    $admin_headers_string = '';
    $customer_headers_string = '';

    foreach ($admin_headers as $key => $value) {
        $admin_headers_string .= "$key: $value\r\n";
    }

    foreach ($customer_headers as $key => $value) {
        $customer_headers_string .= "$key: $value\r\n";
    }

    // Send emails
    $admin_mail_sent = mail($to_email, $email_subject, $admin_email_body, $admin_headers_string);
    $customer_mail_sent = mail($clean_data['email'], 'Thank you for contacting Smart Finance Hub', $customer_email_body, $customer_headers_string);

    if (!$admin_mail_sent) {
        throw new Exception('Failed to send admin notification email');
    }

    // Log successful submission
    $_SESSION['form_submissions'][] = $current_time;

    // Optional: Log to database or file
    $log_entry = [
        'timestamp' => date('c'),
        'name' => $clean_data['name'],
        'email' => $clean_data['email'],
        'subject' => $clean_data['subject'],
        'ip_address' => $clean_data['ip_address'],
        'user_agent' => $clean_data['user_agent'],
        'admin_email_sent' => $admin_mail_sent,
        'customer_email_sent' => $customer_mail_sent
    ];

    // You can add database logging here if needed
    // logContactSubmission($log_entry);

    // Success response
    echo json_encode([
        'success' => true,
        'message' => 'Message sent successfully',
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while processing your message. Please try again or contact us directly.',
        'error_id' => uniqid('contact_error_')
    ]);
}

/**
 * Optional: Database logging function
 * Uncomment and modify as needed for your database setup
 */
/*
function logContactSubmission($data) {
    try {
        $pdo = new PDO('mysql:host=localhost;dbname=smartfinancehub', $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $sql = "INSERT INTO contact_submissions (
            name, email, subject, message, ip_address, user_agent, 
            consent_marketing, admin_email_sent, customer_email_sent, created_at
        ) VALUES (
            :name, :email, :subject, :message, :ip_address, :user_agent, 
            :consent_marketing, :admin_email_sent, :customer_email_sent, NOW()
        )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($data);
    } catch (PDOException $e) {
        error_log("Database logging error: " . $e->getMessage());
    }
}
*/
?>