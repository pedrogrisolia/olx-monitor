import fs from 'fs/promises';
import path from 'path';
import config from '../config';

const pad2 = (n: number): string => String(n).padStart(2, '0');

const timestamp = (): string => {
  const d = new Date();
  return (
    d.getFullYear() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    '-' +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds())
  );
};

const resolveDbPath = (): string => {
  // Permite override por env (útil em Docker/CI)
  const envPath = process.env.DB_FILE || process.env.SQLITE_DB_FILE;
  const relativeOrAbsolute = envPath || config.dbFile || '../data/ads.db';

  // Mantém o mesmo padrão usado em database.ts
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.resolve(process.cwd(), relativeOrAbsolute);
};

const main = async (): Promise<void> => {
  const dbPath = resolveDbPath();

  const backupsDir = path.resolve(path.dirname(dbPath), 'backups');
  await fs.mkdir(backupsDir, { recursive: true });

  const baseName = path.basename(dbPath);
  const destPath = path.join(backupsDir, `${baseName}.${timestamp()}.bak`);

  await fs.copyFile(dbPath, destPath);

  // eslint-disable-next-line no-console
  console.log(`Backup criado: ${destPath}`);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Falha ao criar backup do banco:', error);
  process.exitCode = 1;
});
