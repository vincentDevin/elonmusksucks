#!/bin/bash

################################################################################
# elonmusksucks.net - Automated Development Environment Setup
#
# This script automates the setup of the complete development environment
# for macOS. It installs all required dependencies, sets up databases,
# and prepares the project for development.
#
# Usage:
#   ./scripts/setup-dev-environment.sh
#
# What it does:
#   1. Checks for Homebrew and installs if missing
#   2. Installs PostgreSQL 15 and Redis
#   3. Starts database services
#   4. Creates the database
#   5. Installs npm dependencies
#   6. Sets up environment variables
#   7. Runs Prisma migrations
#   8. Seeds development data
#   9. Builds all packages
#
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "This script is designed for macOS. Detected: $OSTYPE"
    exit 1
fi

log_section "Starting Development Environment Setup"
log_info "This will install and configure all required dependencies"

################################################################################
# Step 1: Check Node.js version
################################################################################

log_section "Step 1: Checking Node.js Version"

if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    log_info "Please install Node.js 24.x.x using nvm:"
    echo ""
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  source ~/.zshrc"
    echo "  nvm install 24"
    echo "  nvm use 24"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 24 ]; then
    log_error "Node.js version must be >= 24.0.0. Current: $(node -v)"
    log_info "Please upgrade using nvm:"
    echo "  nvm install 24"
    echo "  nvm use 24"
    exit 1
fi

log_success "Node.js version: $(node -v)"
log_success "npm version: $(npm -v)"

################################################################################
# Step 2: Install Homebrew
################################################################################

log_section "Step 2: Checking Homebrew"

if ! command -v brew &> /dev/null; then
    log_warning "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi

    log_success "Homebrew installed successfully"
else
    log_success "Homebrew is already installed"
    log_info "Updating Homebrew..."
    brew update || log_warning "Failed to update Homebrew (continuing anyway)"
fi

################################################################################
# Step 3: Install PostgreSQL
################################################################################

log_section "Step 3: Setting up PostgreSQL"

if brew list postgresql@15 &> /dev/null; then
    log_success "PostgreSQL 15 is already installed"
else
    log_info "Installing PostgreSQL 15..."
    brew install postgresql@15
    log_success "PostgreSQL 15 installed"
fi

# Add PostgreSQL to PATH
if [[ ":$PATH:" != *":/opt/homebrew/opt/postgresql@15/bin:"* ]]; then
    log_info "Adding PostgreSQL to PATH..."
    echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
fi

# Start PostgreSQL service
log_info "Starting PostgreSQL service..."
brew services start postgresql@15
sleep 3  # Give PostgreSQL time to start

log_success "PostgreSQL service started"

################################################################################
# Step 4: Install Redis
################################################################################

log_section "Step 4: Setting up Redis"

if brew list redis &> /dev/null; then
    log_success "Redis is already installed"
else
    log_info "Installing Redis..."
    brew install redis
    log_success "Redis installed"
fi

# Start Redis service
log_info "Starting Redis service..."
brew services start redis
sleep 2  # Give Redis time to start

# Test Redis connection
if redis-cli ping &> /dev/null; then
    log_success "Redis service started and responding"
else
    log_warning "Redis may not be responding yet (this is usually fine)"
fi

################################################################################
# Step 5: Create Database
################################################################################

log_section "Step 5: Creating Database"

# Check if database already exists
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw elonmusksucks; then
    log_warning "Database 'elonmusksucks' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Dropping existing database..."
        dropdb elonmusksucks 2>/dev/null || true
        log_info "Creating new database..."
        createdb elonmusksucks
        log_success "Database recreated"
    else
        log_info "Keeping existing database"
    fi
else
    log_info "Creating database 'elonmusksucks'..."
    createdb elonmusksucks
    log_success "Database created"
fi

# Test database connection
if psql -d elonmusksucks -c "SELECT 1" &> /dev/null; then
    log_success "Database connection verified"
else
    log_error "Cannot connect to database"
    exit 1
fi

################################################################################
# Step 6: Install npm Dependencies
################################################################################

log_section "Step 6: Installing npm Dependencies"

log_info "Installing all workspace dependencies (this may take a few minutes)..."
npm install

log_success "Dependencies installed"

################################################################################
# Step 7: Setup Environment Variables
################################################################################

log_section "Step 7: Setting up Environment Variables"

if [ -f .env ]; then
    log_warning ".env file already exists"
    read -p "Do you want to overwrite it with defaults? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Keeping existing .env file"
        ENV_EXISTS=true
    fi
fi

if [ -z "$ENV_EXISTS" ]; then
    log_info "Creating .env file with default configuration..."

    # Generate random secrets
    ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    GAME_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    cat > .env << EOF
# Database
DATABASE_URL=postgresql://postgres@localhost:5432/elonmusksucks

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (auto-generated)
ACCESS_TOKEN_SECRET=${ACCESS_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_SECRET}

# Application URLs (local development)
CLIENT_APP_URL=http://localhost:3000
BASE_URL_CLIENT=http://localhost:3000
BASE_URL_SERVER=http://localhost:5000
BASE_URL_PUBLIC=http://localhost:5173
API_BASE_URL=http://localhost:5000

# Email (disabled for local development)
SKIP_EMAIL_FLOW=true

# Optional
BCRYPT_SALT_ROUNDS=12
GAME_SERVER_SECRET=${GAME_SECRET}

# Tigris S3 Storage (optional - update with your credentials if needed)
# TIGRIS_S3_ENDPOINT=https://fly.storage.tigris.dev
# TIGRIS_ACCESS_KEY_ID=tid_your_access_key
# TIGRIS_SECRET_ACCESS_KEY=tsec_your_secret_key
# TIGRIS_S3_BUCKET=your_bucket_name
EOF

    log_success ".env file created with auto-generated secrets"
fi

################################################################################
# Step 8: Build Types Package
################################################################################

log_section "Step 8: Building Shared Types Package"

log_info "Building @elonmusksucks/types package..."
npm run build:types

log_success "Types package built"

################################################################################
# Step 9: Prisma Setup
################################################################################

log_section "Step 9: Setting up Prisma"

log_info "Generating Prisma Client..."
npx prisma generate

log_info "Running database migrations..."
npx prisma migrate dev

log_success "Prisma setup complete"

################################################################################
# Step 10: Seed Development Data
################################################################################

log_section "Step 10: Seeding Development Data"

log_info "Seeding initial development data..."
npm run seed:dev

log_info "Seeding achievements (77 achievements)..."
npm run seed:achievements

log_success "Development data seeded"

################################################################################
# Step 11: Build All Packages
################################################################################

log_section "Step 11: Building All Packages"

log_info "Building all applications..."
npm run build

log_success "All packages built successfully"

################################################################################
# Final Verification
################################################################################

log_section "Final Verification"

# Check services
SERVICES_OK=true

if ! redis-cli ping &> /dev/null; then
    log_error "Redis is not responding"
    SERVICES_OK=false
else
    log_success "Redis is running"
fi

if ! psql -d elonmusksucks -c "SELECT 1" &> /dev/null; then
    log_error "PostgreSQL database is not accessible"
    SERVICES_OK=false
else
    log_success "PostgreSQL is running"
fi

if [ -f .env ]; then
    log_success ".env file exists"
else
    log_error ".env file not found"
    SERVICES_OK=false
fi

if [ -d node_modules ]; then
    log_success "Dependencies installed"
else
    log_error "node_modules not found"
    SERVICES_OK=false
fi

################################################################################
# Setup Complete
################################################################################

echo ""
log_section "Setup Complete! 🚀"
echo ""

if [ "$SERVICES_OK" = true ]; then
    echo -e "${GREEN}All systems are ready!${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Start all services:"
    echo -e "     ${BLUE}npm run dev${NC}"
    echo ""
    echo "  2. Visit the applications:"
    echo "     • Client App:    http://localhost:3000"
    echo "     • Public Site:   http://localhost:5173"
    echo "     • Server API:    http://localhost:5000"
    echo "     • Pong Server:   http://localhost:5001"
    echo ""
    echo "  3. Create a test user at http://localhost:3000"
    echo ""
    echo "  4. Check the documentation:"
    echo "     • Architecture:  CLAUDE.md"
    echo "     • Features:      README.md"
    echo "     • Setup Guide:   docs/new-dev-setup.md"
    echo ""
    echo -e "${GREEN}Happy coding!${NC}"
else
    echo -e "${YELLOW}Setup completed with some warnings.${NC}"
    echo "Please review the errors above and consult docs/new-dev-setup.md"
fi

echo ""
