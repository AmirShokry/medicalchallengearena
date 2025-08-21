# Medical Challenge Arena - Docker Management Script (PowerShell)

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Option = ""
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Header {
    param([string]$Message)
    Write-Host "=== $Message ===" -ForegroundColor Blue
}

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        exit 1
    }
}

# Function to start services
function Start-Services {
    param([string]$Mode = "")
    
    Write-Header "Starting Medical Challenge Arena Services"
    Test-Docker
    
    switch ($Mode) {
        "core" {
            Write-Status "Starting core services only (PostgreSQL + Redis)..."
            docker-compose up -d postgres redis
        }
        "dev" {
            Write-Status "Starting development services..."
            docker-compose up -d postgres redis pgadmin redis-commander mailhog
        }
        default {
            Write-Status "Starting all services..."
            docker-compose up -d
        }
    }
    
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    
    docker-compose ps
    Write-Status "Services started successfully!"
    
    Write-Host ""
    Write-Header "Service Access Information"
    Write-Host "PostgreSQL: localhost:5432 (postgres:postgres123)"
    Write-Host "Redis: localhost:6379"
    Write-Host "pgAdmin: http://localhost:5050 (admin@medicalchallenge.com:admin123)"
    Write-Host "Redis Commander: http://localhost:8081"
    Write-Host "Mailhog: http://localhost:8025"
}

# Function to stop services
function Stop-Services {
    Write-Header "Stopping Medical Challenge Arena Services"
    Test-Docker
    
    docker-compose down
    Write-Status "Services stopped successfully!"
}

# Function to restart services
function Restart-Services {
    param([string]$Mode = "")
    
    Write-Header "Restarting Medical Challenge Arena Services"
    Stop-Services
    Start-Sleep -Seconds 2
    Start-Services $Mode
}

# Function to show logs
function Show-Logs {
    param([string]$Service = "")
    
    Test-Docker
    if ($Service) {
        Write-Status "Showing logs for $Service..."
        docker-compose logs -f $Service
    }
    else {
        Write-Status "Showing logs for all services..."
        docker-compose logs -f
    }
}

# Function to show status
function Show-Status {
    Write-Header "Service Status"
    Test-Docker
    docker-compose ps
    
    Write-Host ""
    Write-Header "Health Checks"
    
    # Check PostgreSQL
    try {
        docker-compose exec -T postgres pg_isready -U postgres | Out-Null
        Write-Host "PostgreSQL: " -NoNewline
        Write-Host "✓ Healthy" -ForegroundColor Green
    }
    catch {
        Write-Host "PostgreSQL: " -NoNewline
        Write-Host "✗ Unhealthy" -ForegroundColor Red
    }
    
    # Check Redis
    try {
        docker-compose exec -T redis redis-cli ping | Out-Null
        Write-Host "Redis: " -NoNewline
        Write-Host "✓ Healthy" -ForegroundColor Green
    }
    catch {
        Write-Host "Redis: " -NoNewline
        Write-Host "✗ Unhealthy" -ForegroundColor Red
    }
}

# Function to reset data
function Reset-Data {
    Write-Warning "This will stop all services and delete all data!"
    $confirmation = Read-Host "Are you sure? (y/N)"
    if ($confirmation -eq "y" -or $confirmation -eq "Y") {
        Write-Status "Stopping services and removing data..."
        docker-compose down -v
        Write-Status "All data has been removed!"
    }
    else {
        Write-Status "Operation cancelled."
    }
}

# Function to setup environment
function Setup-Environment {
    Write-Header "Setting up Environment Files"
    
    # Database environment
    if (-not (Test-Path "packages/database/.env")) {
        if (Test-Path "packages/database/.env.example") {
            Copy-Item "packages/database/.env.example" "packages/database/.env"
            Write-Status "Created packages/database/.env from example"
        }
        else {
            Write-Warning "packages/database/.env.example not found"
        }
    }
    else {
        Write-Status "packages/database/.env already exists"
    }
    
    # Redis environment
    if (-not (Test-Path "packages/redis/.env")) {
        if (Test-Path "packages/redis/.env.example") {
            Copy-Item "packages/redis/.env.example" "packages/redis/.env"
            Write-Status "Created packages/redis/.env from example"
        }
        else {
            Write-Warning "packages/redis/.env.example not found"
        }
    }
    else {
        Write-Status "packages/redis/.env already exists"
    }
    
    Write-Status "Environment setup complete!"
}

# Function to run database migrations
function Invoke-DatabaseMigration {
    Write-Header "Running Database Migrations"
    Write-Status "Running npm run db:push..."
    npm run db:push
    Write-Status "Database migrations completed!"
}

# Function to show help
function Show-Help {
    Write-Host "Medical Challenge Arena - Docker Management Script (PowerShell)"
    Write-Host ""
    Write-Host "Usage: .\manage.ps1 [COMMAND] [OPTIONS]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start [core|dev]    Start services (core=postgres+redis, dev=+tools, default=all)"
    Write-Host "  stop                Stop all services"
    Write-Host "  restart [core|dev]  Restart services"
    Write-Host "  status              Show service status and health"
    Write-Host "  logs [service]      Show logs (optional: specify service name)"
    Write-Host "  reset               Stop services and delete all data (destructive!)"
    Write-Host "  setup               Setup environment files from examples"
    Write-Host "  migrate             Run database migrations"
    Write-Host "  help                Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\manage.ps1 start core       # Start only PostgreSQL and Redis"
    Write-Host "  .\manage.ps1 start dev        # Start with development tools"
    Write-Host "  .\manage.ps1 logs postgres    # Show PostgreSQL logs"
    Write-Host "  .\manage.ps1 status           # Check service health"
}

# Main script logic
switch ($Command.ToLower()) {
    "start" {
        Start-Services $Option
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Restart-Services $Option
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs $Option
    }
    "reset" {
        Reset-Data
    }
    "setup" {
        Setup-Environment
    }
    "migrate" {
        Invoke-DatabaseMigration
    }
    default {
        if ($Command -ne "help") {
            Write-Error "Unknown command: $Command"
            Write-Host ""
        }
        Show-Help
    }
}
