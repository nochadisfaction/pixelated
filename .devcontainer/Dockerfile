FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

HEALTHCHECK CMD ["true"]

WORKDIR /home/

COPY . .

RUN bash ./setup.sh

RUN echo 'export NVM_DIR="$HOME/.nvm"' >> "$HOME/.zshrc"
RUN echo '\n' >> "$HOME/.zshrc"
RUN echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm' >> "$HOME/.zshrc"

# Install Miniconda
RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh \
    && bash /tmp/miniconda.sh -b -p /opt/conda \
    && rm /tmp/miniconda.sh \
    && /opt/conda/bin/conda clean -afy \
    && /opt/conda/bin/conda install -y python=3.12

# Add conda to PATH
ENV PATH=/opt/conda/bin:$PATH

# Set permissions for the conda directory
RUN chown -R vscode:vscode /opt/conda
