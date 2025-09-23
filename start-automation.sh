#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[🚀]${NC} $1"
}

# Function to create directory if it doesn't exist
create_dir_if_not_exists() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        print_status "Created directory: $1"
    fi
}

# Header
echo -e "${CYAN}"
echo "======================================================"
echo "  Smart Finance Hub Automation Startup Script"
echo "======================================================"
echo -e "${NC}"

print_header "Starting Smart Finance Hub Automation System..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found! Please run this script from the project root directory."
    exit 1
fi

print_status "Found package.json - we're in the right directory"

# 1. Check if node_modules exists, run npm install if not
print_info "Checking for node_modules..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Running npm install..."
    if npm install; then
        print_status "npm install completed successfully"
    else
        print_error "npm install failed"
        exit 1
    fi
else
    print_status "node_modules found"
fi

# 2. Check if .env exists, prompt to create if not
print_info "Checking for .env file..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found!"
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Would you like to copy .env.example to .env? (y/n):${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            cp .env.example .env
            print_status "Created .env from .env.example"
            print_warning "Please edit .env file with your actual API keys and tokens before continuing"
            echo -e "${YELLOW}Press Enter when you've finished editing .env...${NC}"
            read -r
        else
            print_error "Cannot proceed without .env file. Please create one manually."
            exit 1
        fi
    else
        print_error "No .env.example found. Please create .env file manually with required environment variables."
        exit 1
    fi
else
    print_status ".env file found"
fi

# Validate required environment variables
print_info "Validating environment variables..."
source .env

required_vars=("OPENAI_API_KEY" "GITHUB_TOKEN" "GITHUB_OWNER" "GITHUB_REPO")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo -e "  ${RED}- $var${NC}"
    done
    print_warning "Please set these variables in your .env file"
    exit 1
fi

print_status "All required environment variables are set"

# 3. Create any missing directories in content/
print_info "Creating content directories..."

content_dirs=(
    "content"
    "content/articles"
    "content/drafts"
    "content/published"
    "content/archived"
    "content/images"
    "content/templates"
    "automation/logs"
    "automation/data"
    "automation/backups"
)

for dir in "${content_dirs[@]}"; do
    create_dir_if_not_exists "$dir"
done

# 4. Check if automation directory and files exist
print_info "Checking automation system files..."

automation_files=(
    "automation/server.js"
    "automation/package.json"
    "automation/config/settings.json"
)

missing_files=()
for file in "${automation_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    print_error "Missing automation files:"
    for file in "${missing_files[@]}"; do
        echo -e "  ${RED}- $file${NC}"
    done
    print_error "Please ensure all automation files are properly created"
    exit 1
fi

print_status "All automation files found"

# Install automation dependencies if needed
print_info "Checking automation dependencies..."
cd automation
if [ ! -d "node_modules" ]; then
    print_warning "Installing automation dependencies..."
    if npm install; then
        print_status "Automation dependencies installed"
    else
        print_error "Failed to install automation dependencies"
        exit 1
    fi
else
    print_status "Automation dependencies already installed"
fi
cd ..

# Function to start a service in background
start_service() {
    local service_name="$1"
    local command="$2"
    local log_file="automation/logs/${service_name}.log"
    
    print_info "Starting $service_name..."
    
    # Create log file if it doesn't exist
    mkdir -p "$(dirname "$log_file")"
    touch "$log_file"
    
    # Start the service
    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    
    # Wait a moment to check if the process started successfully
    sleep 2
    
    if kill -0 "$pid" 2>/dev/null; then
        print_status "$service_name started successfully (PID: $pid)"
        echo "$pid" > "automation/logs/${service_name}.pid"
        return 0
    else
        print_error "Failed to start $service_name"
        print_error "Check log file: $log_file"
        return 1
    fi
}

# 4. Start the main automation server
print_header "Starting automation services..."

# Start the main automation server
start_service "automation-server" "cd automation && node server.js"

if [ $? -ne 0 ]; then
    print_error "Failed to start automation server. Check automation/logs/automation-server.log for details."
    exit 1
fi

# Wait for services to stabilize
print_info "Waiting for services to stabilize..."
sleep 5

# Check service health
print_info "Checking service health..."

check_service() {
    local service_name="$1"
    local pid_file="automation/logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "$service_name is running (PID: $pid)"
        else
            print_error "$service_name is not running"
            return 1
        fi
    else
        print_error "No PID file found for $service_name"
        return 1
    fi
}

check_service "automation-server"

# Display service URLs and information
echo -e "${CYAN}"
echo "======================================================"
echo "  Smart Finance Hub Automation System Started!"
echo "======================================================"
echo -e "${NC}"

print_status "Review Console: http://localhost:${PORT:-3000}"
print_status "Log files: automation/logs/"
print_info "Use 'tail -f automation/logs/automation-server.log' to monitor the server"

# Create stop script
print_info "Creating stop-automation.sh script..."
cat > stop-automation.sh << 'EOF'
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo -e "${YELLOW}Stopping Smart Finance Hub Automation System...${NC}"

stop_service() {
    local service_name="$1"
    local pid_file="automation/logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL "$pid"
                print_warning "Force killed $service_name (PID: $pid)"
            else
                print_status "Gracefully stopped $service_name (PID: $pid)"
            fi
            rm -f "$pid_file"
        else
            print_warning "$service_name was not running"
        fi
    else
        print_warning "No PID file found for $service_name"
    fi
}

stop_service "automation-server"

print_status "All services stopped"
EOF

chmod +x stop-automation.sh
print_status "Created stop-automation.sh script"

echo -e "${GREEN}"
echo "======================================================"
echo "  Automation system is now running!"
echo "======================================================"
echo -e "${NC}"

print_info "To stop all services, run: ./stop-automation.sh"
print_info "To view logs: tail -f automation/logs/automation-server.log"

# Keep the script running to show real-time logs
print_info "Press Ctrl+C to stop monitoring logs (services will continue running)"
echo -e "${CYAN}Real-time logs:${NC}"
echo "------------------------------------------------------"

tail -f automation/logs/automation-server.log