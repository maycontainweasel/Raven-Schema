import path from 'path';
import os from 'os';
import { stat, writeFile, mkdir } from 'fs/promises';
import { spawn } from 'child_process';

const DEFAULT_CONFIG = `serversPath: /opt/homebrew/etc/nginx/servers
certsPath: ${os.homedir()}/certs
hostsPath: /etc/hosts
templatePath: ./config/nginx.template.conf
defaultListenPort: 4443
defaultProxyPort: 3000
restartCommand: "nginx -t && brew services restart nginx"
nginxSudo: false
mkcertCommand: "mkcert"
`;

const DEFAULT_TEMPLATE = `# Common proxy headers
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For   $remote_addr;

# WS upgrade (used only in dev/HMR; harmless otherwise)
map $http_upgrade $connection_upgrade { default upgrade; '' close; }

server {
    listen {LISTEN_PORT} ssl;
    http2 on;
    server_name {NAME};
    client_max_body_size 64m;
    client_body_temp_path /tmp/nginx-client-body 1 2;

    ssl_certificate     {CERTS_PATH}/{NAME}.pem;
    ssl_certificate_key {CERTS_PATH}/{NAME}-key.pem;

    location / {
      proxy_buffering off;
      proxy_request_buffering off;
      proxy_read_timeout 300s;
      proxy_pass http://127.0.0.1:{PORT};
    }

    location ~ ^/(?:_nuxt/)?__vitews$ {
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_pass http://127.0.0.1:{PORT};
    }

    location ~ ^/(?:_nuxt/)?__nuxt_vite_rpc$ {
      proxy_pass http://127.0.0.1:{PORT};
    }

    location ~ ^/(?:_nuxt/)?__vite_ping$ {
      proxy_pass http://127.0.0.1:{PORT};
    }

    access_log /opt/homebrew/var/log/nginx/{NAME}.access.log;
    error_log  /opt/homebrew/var/log/nginx/{NAME}.error.log;
}
`;

async function ensureFile(filePath: string, contents: string): Promise<boolean> {
  try {
    await stat(filePath);
    return false;
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf-8');
  return true;
}

export async function runNginxConfig(projectRoot: string, open = true): Promise<void> {
  const configPath = path.resolve(projectRoot, 'config', 'nginx.yaml');
  const templatePath = path.resolve(projectRoot, 'config', 'nginx.template.conf');

  const createdConfig = await ensureFile(configPath, DEFAULT_CONFIG);
  const createdTemplate = await ensureFile(templatePath, DEFAULT_TEMPLATE);

  if (createdConfig) {
    console.log(`Created ${configPath}`);
  } else {
    console.log(`Config already exists: ${configPath}`);
  }

  if (createdTemplate) {
    console.log(`Created ${templatePath}`);
  } else {
    console.log(`Template already exists: ${templatePath}`);
  }

  if (!open) return;

  await new Promise<void>((resolve) => {
    const proc = spawn('subl', [configPath], { stdio: 'inherit' });
    proc.on('error', (err) => {
      console.warn(`Could not open in Sublime. Error: ${String(err.message || err)}`);
      console.warn(`Open manually: ${configPath}`);
      resolve();
    });
    proc.on('close', () => resolve());
  });
}
