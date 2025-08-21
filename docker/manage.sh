#!/bin/bash

# Medical Challenge Arena - Docker Management Script

set -e

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="medicalchallenge"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to start services
start_services() {
    print_header "Starting Medical Challenge Arena Services"
    check_docker
    
    if [ "$1" = "core" ]; then
        print_status "Starting core services only (PostgreSQL + Redis)..."
        docker-compose up -d postgres redis
    elif [ "$1" = "dev" ]; then
        print_status "Starting development services..."
        docker-compose up -d postgres redis pgadmin redis-commander mailhog
    else
        print_status "Starting all services..."
        docker-compose up -d
    fi
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    docker-compose ps
    print_status "Services started successfully!"
    
    echo ""
    print_header "Service Access Information"
    echo "PostgreSQL: localhost:5432 (postgres:postgres123)"
    echo "Redis: localhost:6379"
    echo "pgAdmin: http://localhost:5050 (admin@medicalchallenge.com:admin123)"
    echo "Redis Commander: http://localhost:8081"
    echo "Mailhog: http://localhost:8025"
}

# Function to stop services
stop_services() {
    print_header "Stopping Medical Challenge Arena Services"
    check_docker
    
    docker-compose down
    print_status "Services stopped successfully!"
}

# Function to restart services
restart_services() {
    print_header "Restarting Medical Challenge Arena Services"
    stop_services
    sleep 2
    start_services "$1"
}

# Function to show logs
show_logs() {
    check_docker
    if [ -n "$1" ]; then
        print_status "Showing logs for $1..."
        docker-compose logs -f "$1"
    else
        print_status "Showing logs for all services..."
        docker-compose logs -f
    fi
}

# Function to show status
show_status() {
    print_header "Service Status"
    check_docker
    docker-compose ps
    
    echo ""
    print_header "Health Checks"
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "PostgreSQL: ${GREEN}✓ Healthy${NC}"
    else
        echo -e "PostgreSQL: ${RED}✗ Unhealthy${NC}"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "Redis: ${GREEN}✓ Healthy${NC}"
    else
        echo -e "Redis: ${RED}✗ Unhealthy${NC}"
    fi
}

# Function to reset data
reset_data() {
    print_warning "This will stop all services and delete all data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping services and removing data..."
        docker-compose down -v
        print_status "All data has been removed!"
    else
        print_status "Operation cancelled."
    fi
}

# Function to setup environment
setup_env() {
    print_header "Setting up Environment Files"
    
    # Database environment
    if [ ! -f "packages/database/.env" ]; then
        if [ -f "packages/database/.env.example" ]; then
            cp packages/database/.env.example packages/database/.env
            print_status "Created packages/database/.env from example"
        else
            print_warning "packages/database/.env.example not found"
        fi
    else
        print_status "packages/database/.env already exists"
    fi
    
    # Redis environment
    if [ ! -f "packages/redis/.env" ]; then
        if [ -f "packages/redis/.env.example" ]; then
            cp packages/redis/.env.example packages/redis/.env
            print_status "Created packages/redis/.env from example"
        else
            print_warning "packages/redis/.env.example not found"
        fi
    else
        print_status "packages/redis/.env already exists"
    fi
    
    print_status "Environment setup complete!"
}

# Function to run database migrations
migrate_db() {
    print_header "Running Database Migrations"
    print_status "Running npm run db:push..."
    npm run db:push
    print_status "Database migrations completed!"
}

# Function to show help
show_help() {
    echo "Medical Challenge Arena - Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [core|dev]    Start services (core=postgres+redis, dev=+tools, default=all)"
    echo "  stop                Stop all services"
    echo "  restart [core|dev]  Restart services"
    echo "  status              Show service status and health"
    echo "  logs [service]      Show logs (optional: specify service name)"
    echo "  reset               Stop services and delete all data (destructive!)"
    echo "  setup               Setup environment files from examples"
    echo "  migrate             Run database migrations"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start core       # Start only PostgreSQL and Redis"
    echo "  $0 start dev        # Start with development tools"
    echo "  $0 logs postgres    # Show PostgreSQL logs"
    echo "  $0 status           # Check service health"
}

# Main script logic
case "${1:-help}" in
    start)
        start_services "$2"
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services "$2"
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    reset)
        reset_data
        ;;
    setup)
        setup_env
        ;;
    migrate)
        migrate_db
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
