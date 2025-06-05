#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const mcpConfig = JSON.parse(readFileSync(join(process.cwd(), 'mcp-servers.json'), 'utf8'));

const servers = Object.keys(mcpConfig.mcpServers);

function runServer(serverName) {
  const server = mcpConfig.mcpServers[serverName];
  
  if (!server) {
    console.error(`Server "${serverName}" not found`);
    process.exit(1);
  }

  console.log(`Starting MCP server: ${serverName}`);
  
  const child = spawn(server.command, server.args, {
    cwd: server.cwd || process.cwd(),
    env: { ...process.env, ...server.env },
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error(`Error starting ${serverName}:`, err);
  });

  child.on('close', (code) => {
    console.log(`${serverName} exited with code ${code}`);
  });

  return child;
}

function listServers() {
  console.log('Available MCP servers:');
  servers.forEach(server => {
    console.log(`  - ${server}`);
  });
}

const command = process.argv[2];
const serverName = process.argv[3];

switch (command) {
  case 'list':
    listServers();
    break;
  case 'run':
    if (!serverName) {
      console.error('Please specify a server name');
      listServers();
      process.exit(1);
    }
    runServer(serverName);
    break;
  case 'install':
    console.log('Installing MCP dependencies...');
    spawn('pnpm', ['add', '-D', '@smithery/cli', '@21st-dev/magic', 'cursor-mcp-installer-free'], {
      stdio: 'inherit'
    });
    break;
  default:
    console.log('Usage:');
    console.log('  node mcp-manager.js list                 - List available servers');
    console.log('  node mcp-manager.js run <server-name>    - Run a specific server');
    console.log('  node mcp-manager.js install              - Install MCP dependencies');
    break;
}
