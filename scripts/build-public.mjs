import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

// 1. public 디렉터리가 없으면 생성
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 2. index.html 환경변수 주입
const indexPath = path.join(publicDir, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // index.html 내 전역 변수 설정 구문 치환
  html = html.replace(
    /const SUPABASE_URL = window\.ENV_SUPABASE_URL \|\| '.*?';/g,
    `const SUPABASE_URL = '${supabaseUrl}';`
  );
  html = html.replace(
    /const SUPABASE_ANON_KEY = window\.ENV_SUPABASE_ANON_KEY \|\| '.*?';/g,
    `const SUPABASE_ANON_KEY = '${supabaseAnonKey}';`
  );

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✅ Supabase 환경변수가 public/index.html에 성공적으로 주입되었습니다.');
}

// 3. public/aleph.json 자동 생성 (Vercel 메타데이터 활용)
const alephPath = path.join(publicDir, 'aleph.json');

const alephData = {
  repoUrl: process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
    : 'https://github.com/local/repo',
  publicAppUrl: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000',
  commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local-commit',
  builtAt: new Date().toISOString()
};

fs.writeFileSync(alephPath, JSON.stringify(alephData, null, 2), 'utf8');
console.log('✅ public/aleph.json 파일이 성공적으로 생성되었습니다.');