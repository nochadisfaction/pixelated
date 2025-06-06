FROM gitpod/workspace-full:2024-12-09-17-17-41

# Set environment variables to match Cursor setup
ENV NODE_VERSION=22.16.0
ENV PNPM_VERSION=latest

# Install system dependencies
USER root
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Switch back to gitpod user
USER gitpod

# Install Node.js version that matches Cursor setup
RUN bash -c "source /home/gitpod/.nvm/nvm.sh && \
    nvm install ${NODE_VERSION} && \
    nvm use ${NODE_VERSION} && \
    nvm alias default ${NODE_VERSION}"

# Install pnpm globally to match Cursor setup
RUN bash -c "source /home/gitpod/.nvm/nvm.sh && \
    nvm use ${NODE_VERSION} && \
    npm install -g pnpm@${PNPM_VERSION}"

# Install Miniconda for Python environment (to match Cursor setup)
RUN wget https://repo.anaconda.com/miniconda/Miniconda3-py312_24.7.1-0-Linux-x86_64.sh -O ~/miniconda.sh && \
    bash ~/miniconda.sh -b -p $HOME/miniconda && \
    rm ~/miniconda.sh

# Add conda to PATH
ENV PATH="/home/gitpod/miniconda/bin:$PATH"

# Initialize conda for bash
RUN conda init bash

# Create a startup script to activate the environment
RUN echo '#!/bin/bash' > /home/gitpod/.bashrc.d/99-pixelated-setup && \
    echo 'source /home/gitpod/.nvm/nvm.sh' >> /home/gitpod/.bashrc.d/99-pixelated-setup && \
    echo 'nvm use 22.16.0' >> /home/gitpod/.bashrc.d/99-pixelated-setup && \
    echo 'source /home/gitpod/miniconda/etc/profile.d/conda.sh' >> /home/gitpod/.bashrc.d/99-pixelated-setup && \
    echo 'conda activate pixel 2>/dev/null || true' >> /home/gitpod/.bashrc.d/99-pixelated-setup && \
    chmod +x /home/gitpod/.bashrc.d/99-pixelated-setup 