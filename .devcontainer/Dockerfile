FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

HEALTHCHECK CMD ["true"]

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Miniconda
RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh \
    && bash /tmp/miniconda.sh -b -p /opt/conda \
    && rm /tmp/miniconda.sh \
    && /opt/conda/bin/conda clean -afy \
    && /opt/conda/bin/conda install -y python=3.10

# Add conda to PATH
ENV PATH=/opt/conda/bin:$PATH

# Set permissions for the conda directory
RUN chown -R vscode:vscode /opt/conda
