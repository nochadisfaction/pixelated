#!/bin/bash

# MentalLLaMA Docker Deployment Script
# This script deploys the MentalLLaMA API with configurable model options

# Set to exit on error
set -e

# Default values
USE_7B=false
USE_13B=false
ENV_FILE=".env"
BUILD=false
DETACHED=false
MONITORING=false
SCALE=2
PRODUCTION=false
CLEAN=false

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print usage information
usage() {
	echo -e "${BLUE}MentalLLaMA Docker Deployment${NC}"
	echo "Usage: $0 [options]"
	echo "Options:"
	echo "  -7, --7b              Enable MentalLLaMA-chat-7B model"
	echo "  -1, --13b             Enable MentalLLaMA-chat-13B model"
	echo "  -e, --env-file FILE   Specify env file (default: .env)"
	echo "  -b, --build           Build images before starting"
	echo "  -d, --detached        Run in detached mode"
	echo "  -m, --monitoring      Enable Prometheus/Grafana monitoring"
	echo "  -s, --scale N         Number of API instances (default: 2)"
	echo "  -p, --production      Enable production mode with additional hardening"
	echo "  -c, --clean           Clean existing containers and volumes before starting"
	echo "  -h, --help            Show this help message"
	exit 1
}

log() {
	local type=$1
	local message=$2
	case ${type} in
	info)
		echo -e "${BLUE}[INFO]${NC} ${message}"
		;;
	success)
		echo -e "${GREEN}[SUCCESS]${NC} ${message}"
		;;
	warning)
		echo -e "${YELLOW}[WARNING]${NC} ${message}"
		;;
	error)
		echo -e "${RED}[ERROR]${NC} ${message}"
		;;
	*)
		echo "${message}"
		;;
	esac
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
	case "$1" in
	-7 | --7b)
		USE_7B=true
		shift
		;;
	-1 | --13b)
		USE_13B=true
		shift
		;;
	-e | --env-file)
		ENV_FILE="$2"
		shift 2
		;;
	-b | --build)
		BUILD=true
		shift
		;;
	-d | --detached)
		DETACHED=true
		shift
		;;
	-m | --monitoring)
		MONITORING=true
		shift
		;;
	-s | --scale)
		SCALE="$2"
		shift 2
		;;
	-p | --production)
		PRODUCTION=true
		shift
		;;
	-c | --clean)
		CLEAN=true
		shift
		;;
	-h | --help)
		usage
		;;
	*)
		log "error" "Unknown option: $1"
		usage
		;;
	esac
done

# Check if at least one model is enabled
if [ "${USE_7B}" = false ] && [ "${USE_13B}" = false ]; then
	log "error" "At least one model (7B or 13B) must be enabled"
	usage
fi

# Ensure the env file exists
if [ ! -f "${ENV_FILE}" ]; then
	log "error" "Environment file ${ENV_FILE} does not exist"
	exit 1
fi

# Validate Docker and Docker Compose installation
if ! command -v docker &>/dev/null; then
	log "error" "Docker is not installed. Please install Docker first."
	exit 1
fi

if ! command -v docker-compose &>/dev/null; then
	log "error" "Docker Compose is not installed. Please install Docker Compose first."
	exit 1
fi

# Clean up if requested
if [ "${CLEAN}" = true ]; then
	log "info" "Cleaning existing containers and volumes..."
	docker-compose down -v
fi

# Create necessary directories
log "info" "Creating required directories..."
mkdir -p certs
mkdir -p nginx/conf.d
mkdir -p prometheus
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards

# Create .env.deploy file with combined settings
log "info" "Creating deployment environment file..."
cp "${ENV_FILE}" .env.deploy

# Update model configuration in the .env.deploy file
if [ "${USE_7B}" = true ]; then
	log "info" "Enabling MentalLLaMA-chat-7B model..."
	echo "USE_MENTAL_LLAMA_7B_MODEL=true" >>.env.deploy
else
	echo "USE_MENTAL_LLAMA_7B_MODEL=false" >>.env.deploy
fi

if [ "${USE_13B}" = true ]; then
	log "info" "Enabling MentalLLaMA-chat-13B model..."
	echo "USE_MENTAL_LLAMA_13B_MODEL=true" >>.env.deploy
else
	echo "USE_MENTAL_LLAMA_13B_MODEL=false" >>.env.deploy
fi

# Configure monitoring if enabled
if [ "${MONITORING}" = true ]; then
	log "info" "Setting up monitoring configuration..."
	echo "PROMETHEUS_METRICS_ENABLED=true" >>.env.deploy

	# Create Prometheus config
	cat >prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mental-llama-api'
    scrape_interval: 5s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['mental-llama-api:3000']
EOF

	# Create Grafana datasource config
	cat >grafana/provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
fi

# Create Nginx configuration
log "info" "Creating Nginx configuration..."
cat >nginx/nginx.conf <<EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    sendfile on;
    keepalive_timeout 65;

    # Include all virtual host configs
    include /etc/nginx/conf.d/*.conf;
}
EOF

cat >nginx/conf.d/mental-llama.conf <<EOF
upstream mental_llama_api {
    server mental-llama-api:3000;
}

server {
    listen 80;

    location / {
        proxy_pass http://mental_llama_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        access_log off;
        return 200 'OK';
    }
}
EOF

# Set production configuration if enabled
if [ "${PRODUCTION}" = true ]; then
	log "info" "Configuring for production environment..."
	echo "NODE_ENV=production" >>.env.deploy
	echo "RATE_LIMIT_ENABLED=true" >>.env.deploy
	echo "CACHE_ENABLED=true" >>.env.deploy
fi

# Docker compose command construction
DOCKER_COMPOSE_CMD="docker-compose --env-file .env.deploy"

# Set replica scale
if [ -n "${SCALE}" ]; then
	log "info" "Setting API replicas to ${SCALE}..."
	export COMPOSE_DOCKER_CLI_BUILD=1
	export DOCKER_BUILDKIT=1
	export API_SCALE=${SCALE}
fi

# Build images if requested
if [ "${BUILD}" = true ]; then
	log "info" "Building images..."
	${DOCKER_COMPOSE_CMD} build
fi

# Deploy the services
log "info" "Deploying MentalLLaMA services..."
if [ "${DETACHED}" = true ]; then
	${DOCKER_COMPOSE_CMD} up -d
else
	${DOCKER_COMPOSE_CMD} up
fi

# If successful and in detached mode, show service status
if [ "$?" -eq 0 ] && [ "${DETACHED}" = true ]; then
	log "success" "Deployment complete! Services are running in the background."
	log "info" "API endpoints:"
	log "info" "- Status: http://localhost:8080/api/ai/mental-health/status"
	log "info" "- Analysis: http://localhost:8080/api/ai/mental-health/analyze"

	if [ "${MONITORING}" = true ]; then
		log "info" "Monitoring:"
		log "info" "- Prometheus: http://localhost:9090"
		log "info" "- Grafana: http://localhost:3001 (admin/admin)"
	fi

	log "info" "Use 'docker-compose logs -f' to view logs"
fi

# Register cleanup functions for graceful shutdown
trap 'log "info" "Shutting down services..."; docker-compose down' EXIT INT TERM
