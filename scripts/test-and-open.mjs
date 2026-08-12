import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { platform } from 'node:os';

const PORT = 3001;
const URL = `http://127.0.0.1:${PORT}`;

const run = (cmd, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });

    child.on('error', reject);
  });

async function openBrowser(url) {
  const p = platform();
  const commands = {
    darwin: ['open', url],
    win32: ['cmd', '/c', 'start', '', url],
    linux: ['xdg-open', url],
  };

  const command = commands[p];
  if (!command) {
    console.log(`브라우저를 자동으로 열 수 없습니다. 직접 열어주세요: ${url}`);
    return;
  }

  try {
    await run(command[0], command.slice(1));
  } catch {
    console.log(`브라우저를 자동으로 열 수 없습니다. 직접 열어주세요: ${url}`);
  }
}

async function waitForServer(url) {
  const maxAttempts = 60;

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) {
        return;
      }
    } catch {
      // 서버가 아직 준비 중이므로 잠시 기다립니다.
    }

    await delay(1000);
  }

  throw new Error(`서버가 ${url}에서 준비되지 않았습니다.`);
}

async function main() {
  console.log('빌드를 시작합니다...');
  await run('npm', ['run', 'build']);
  console.log('서버를 시작합니다...');

  const server = spawn('npm', ['run', 'start'], {
    stdio: 'inherit',
    shell: true,
  });

  server.on('error', (error) => {
    console.error('서버 실행 중 오류:', error);
    process.exit(1);
  });

  try {
    await waitForServer(URL);
    console.log(`브라우저를 엽니다: ${URL}`);
    await openBrowser(URL);
  } catch (error) {
    console.error(error.message);
    server.kill('SIGTERM');
    process.exit(1);
  }
}

main();
