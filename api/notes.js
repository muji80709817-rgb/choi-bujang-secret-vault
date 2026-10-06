import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Vercel 환경변수에서 Supabase 설정값 읽어오기
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
  }

  // 2. Supabase 클라이언트 생성 (서버 전용 SECRET_KEY 사용)
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  try {
    // 3. notes 테이블에서 메모 목록 가져오기
    const { data, error } = await supabase
      .from('notes')
      .select('*');

    if (error) {
      throw error;
    }

    // 4. 조회 성공 시 메모 데이터 응답
    return res.status(200).json({ notes: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}