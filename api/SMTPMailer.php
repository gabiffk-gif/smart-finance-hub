<?php
/**
 * Smart Finance Hub - SMTP Mailer Class
 * Lightweight SMTP implementation for Zoho Mail integration
 */

class SMTPMailer {
    private $smtp_host = 'smtp.zoho.com';
    private $smtp_port = 587;
    private $smtp_username;
    private $smtp_password;
    private $smtp_secure = 'tls';
    private $from_email;
    private $from_name;
    private $debug = false;
    
    public function __construct($username, $password, $from_name = 'Smart Finance Hub') {
        $this->smtp_username = $username;
        $this->smtp_password = $password;
        $this->from_email = $username;
        $this->from_name = $from_name;
    }
    
    public function setDebug($debug = true) {
        $this->debug = $debug;
    }
    
    private function log($message) {
        if ($this->debug) {
            error_log("[SMTPMailer] " . $message);
        }
    }
    
    public function sendMail($to_email, $to_name, $subject, $body, $reply_to = null, $html = true) {
        try {
            $this->log("Starting email send to: $to_email");
            
            // Create socket connection
            $socket = fsockopen($this->smtp_host, $this->smtp_port, $errno, $errstr, 30);
            if (!$socket) {
                throw new Exception("Failed to connect to SMTP server: $errstr ($errno)");
            }
            
            // Read initial response
            $this->readResponse($socket);
            
            // EHLO command
            $this->sendCommand($socket, "EHLO " . gethostname());
            $this->readResponse($socket);
            
            // Start TLS
            $this->sendCommand($socket, "STARTTLS");
            $this->readResponse($socket);
            
            // Enable crypto
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception("Failed to enable TLS encryption");
            }
            
            // EHLO again after TLS
            $this->sendCommand($socket, "EHLO " . gethostname());
            $this->readResponse($socket);
            
            // Authentication
            $this->sendCommand($socket, "AUTH LOGIN");
            $this->readResponse($socket);
            
            $this->sendCommand($socket, base64_encode($this->smtp_username));
            $this->readResponse($socket);
            
            $this->sendCommand($socket, base64_encode($this->smtp_password));
            $this->readResponse($socket);
            
            // Mail commands
            $this->sendCommand($socket, "MAIL FROM:<{$this->from_email}>");
            $this->readResponse($socket);
            
            $this->sendCommand($socket, "RCPT TO:<$to_email>");
            $this->readResponse($socket);
            
            // Data command
            $this->sendCommand($socket, "DATA");
            $this->readResponse($socket);
            
            // Email headers and body
            $email_data = $this->buildEmailData($to_email, $to_name, $subject, $body, $reply_to, $html);
            $this->sendCommand($socket, $email_data . "\r\n.");
            $this->readResponse($socket);
            
            // Quit
            $this->sendCommand($socket, "QUIT");
            
            fclose($socket);
            $this->log("Email sent successfully to: $to_email");
            
            return true;
            
        } catch (Exception $e) {
            $this->log("Error sending email: " . $e->getMessage());
            if (isset($socket) && is_resource($socket)) {
                fclose($socket);
            }
            throw $e;
        }
    }
    
    private function sendCommand($socket, $command) {
        $this->log("Sending: $command");
        fwrite($socket, $command . "\r\n");
    }
    
    private function readResponse($socket) {
        $response = fgets($socket, 512);
        $this->log("Received: " . trim($response));
        
        $code = substr($response, 0, 3);
        if ($code >= 400) {
            throw new Exception("SMTP Error: $response");
        }
        
        return $response;
    }
    
    private function buildEmailData($to_email, $to_name, $subject, $body, $reply_to, $html) {
        $boundary = "----=_NextPart_" . md5(uniqid());
        
        $headers = [];
        $headers[] = "From: {$this->from_name} <{$this->from_email}>";
        $headers[] = "To: $to_name <$to_email>";
        $headers[] = "Subject: $subject";
        $headers[] = "Date: " . date('r');
        $headers[] = "Message-ID: <" . md5(uniqid()) . "@smartfinancehub.vip>";
        
        if ($reply_to) {
            $headers[] = "Reply-To: $reply_to";
        }
        
        if ($html) {
            $headers[] = "MIME-Version: 1.0";
            $headers[] = "Content-Type: multipart/alternative; boundary=\"$boundary\"";
            
            $email_body = "--$boundary\r\n";
            $email_body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $email_body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
            $email_body .= strip_tags($body) . "\r\n\r\n";
            
            $email_body .= "--$boundary\r\n";
            $email_body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $email_body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
            $email_body .= $body . "\r\n\r\n";
            $email_body .= "--$boundary--\r\n";
        } else {
            $headers[] = "Content-Type: text/plain; charset=UTF-8";
            $email_body = $body;
        }
        
        return implode("\r\n", $headers) . "\r\n\r\n" . $email_body;
    }
    
    public function testConnection() {
        try {
            $socket = fsockopen($this->smtp_host, $this->smtp_port, $errno, $errstr, 10);
            if (!$socket) {
                return false;
            }
            
            $this->readResponse($socket);
            $this->sendCommand($socket, "EHLO test");
            $this->readResponse($socket);
            $this->sendCommand($socket, "QUIT");
            
            fclose($socket);
            return true;
            
        } catch (Exception $e) {
            $this->log("Connection test failed: " . $e->getMessage());
            return false;
        }
    }
}
?>