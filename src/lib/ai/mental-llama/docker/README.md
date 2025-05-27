# MentalLLaMA Containerized Deployment

This directory contains all the necessary configuration files and scripts to deploy the MentalLLaMA API in a production-ready Docker environment.

## Features

- **Scalable Architecture**: Load-balanced containerized API with multiple replicas
- **Model Flexibility**: Support for both 7B and 13B MentalLLaMA models
- **High Performance**: Optimized for low-latency, high-throughput API responses
- **Comprehensive Monitoring**: Prometheus metrics and Grafana dashboards
- **Security**: Hardened configurations with proper access controls
- **High Availability**: Health checks and automatic container restarts
- **Caching**: Redis-based response caching for improved performance
- **Rate Limiting**: Protection against API abuse

## Prerequisites

- Docker and Docker Compose installed
- Environment variables configured in `.env` or equivalent file
- Machine with sufficient resources (RAM/CPU) for chosen model(s)

## Deployment

### Quick Start

The simplest way to deploy is using the deployment script:

```bash
# Deploy with 7B model support
./deploy.sh --7b

# Deploy with 13B model support
./deploy.sh --13b

# Deploy with both models
./deploy.sh --7b --13b

# Deploy in detached mode with monitoring
./deploy.sh --7b --detached --monitoring

# Production deployment with all features
./deploy.sh --7b --13b --production --monitoring --detached --build
```

### Environment Variables

Key environment variables that must be configured:

```
# MentalLLaMA 7B model configuration
USE_MENTAL_LLAMA_7B_MODEL=true
MENTAL_LLAMA_7B_API_URL=https://your-api-provider.com/v1
MENTAL_LLAMA_7B_API_KEY=your-api-key
MENTAL_LLAMA_7B_MODEL_NAME=MentalLLaMA-chat-7B

# MentalLLaMA 13B model configuration (optional but recommended)
USE_MENTAL_LLAMA_13B_MODEL=true
MENTAL_LLAMA_13B_API_URL=https://your-api-provider.com/v1
MENTAL_LLAMA_13B_API_KEY=your-api-key
MENTAL_LLAMA_13B_MODEL_NAME=MentalLLaMA-chat-13B
```

## Architecture

The deployment consists of several interconnected services:

1. **Nginx**: Load balancer and API gateway
2. **MentalLLaMA API**: Core API service (multiple replicas)
3. **Redis**: Caching and rate limiting
4. **Prometheus**: Metrics collection
5. **Grafana**: Monitoring dashboards

```
Client → Nginx → MentalLLaMA API → Model Provider API
                      ↑
                    Redis
                      ↑
Grafana → Prometheus --↑
```

## Scaling

To adjust the number of API instances:

```bash
# Deploy with 4 replicas
./deploy.sh --7b --scale 4
```

## Monitoring

Once deployed with monitoring enabled, access:

- **Grafana**: http://your-host:3001 (default credentials: admin/admin)
- **Prometheus**: http://your-host:9090

## Security

This deployment follows security best practices:

- Non-root container users
- Limited permissions
- Network isolation
- Rate limiting
- Request validation
- Secure HTTP headers

## Troubleshooting

### Common Issues

1. **API not responding**:
   ```bash
   docker-compose logs mental-llama-api
   ```

2. **Model initialization failure**:
   - Check model provider API credentials
   - Ensure model names are correct

3. **Performance issues**:
   - Check resource allocation
   - Review Prometheus metrics
   - Consider scaling API replicas

## Performance Tuning

For optimal performance:

1. Adjust container resources in `docker-compose.yml`
2. Enable caching for repetitive queries
3. Scale API instances based on load
4. Consider using the 13B model for critical tasks and 7B for lower-priority tasks

## Backup and Recovery

The deployment is designed for stateless operation, but Redis data can be persisted:

```bash
# Manual Redis backup
docker exec -it mental-llama_redis_1 redis-cli SAVE
```

## Advanced Configuration

For advanced scenarios, modify:

- `nginx/conf.d/mental-llama.conf`: Load balancing and routing
- `prometheus/prometheus.yml`: Metrics collection
- `grafana/dashboards/`: Custom dashboards
