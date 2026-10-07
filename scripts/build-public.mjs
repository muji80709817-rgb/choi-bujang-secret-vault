import fs from 'fs';
import path from 'path';

// 기존 빌드 로직 수행 후 index.html 파일 읽기
const indexPath = path.join(process.cwd(), 'public', 'index.html');

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