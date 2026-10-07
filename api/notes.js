import { createClient } from '@supabase/supabase-js';

// 공통 401 인증 실패 응답 헬퍼 함수
function respondUnauthorized(res) {
  return res.status(401).json({ error: "unauthorized" });
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  // 1. Authorization 헤더가 아예 없는 경우
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return respondUnauthorized(res);
  }

  const token = authHeader.split(' ')[1];

  // 2. 토큰 문자열 형식 체크 (토큰이 빈 값이거나 기본 구조 미충족 시)
  if (!token || token === 'not-a-token' || token.split('.').length !== 3) {
    return respondUnauthorized(res);
  }

  try {
    // Supabase Auth 클라이언트로 토큰 검증 (JWT 서명 및 신원 확인)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    // 3. 토큰이 만료되었거나 서명이 위조/유효하지 않아 신원 확인에 실패한 경우
    if (error || !user) {
      return respondUnauthorized(res);
    }

    // -------------------------------------------------------------
    // 4. 정상 로그인 사용자의 기존 비즈니스 로직 (수정 없이 보존)
    // -------------------------------------------------------------
    const { id } = req.query; // /api/notes/:id 지원

    if (req.method === 'GET') {
      // 메모 목록 또는 단건 조회
      return res.status(200).json({
        notes: [
          { id: '1', title: '과제', content: '실습용 가상 과제 기록' },
          { id: '2', title: '포트폴리오', content: '실습용 가상 포트폴리오 기록' },
          { id: '3', title: '아침 리추얼', content: '실습용 가상 리추얼 기록' },
          { id: '4', title: '훈련 행정 자료', content: '실습용 가상 행정 기록' }
        ]
      });
    } else if (req.method === 'POST') {
      // 메모 추가
      const { title, content } = req.body || {};
      return res.status(201).json({ message: "created", note: { id: Date.now().toString(), title, content } });
    } else if (req.method === 'PUT') {
      // 메모 수정
      const { title, content } = req.body || {};
      return res.status(200).json({ message: "updated", note: { id, title, content } });
    } else if (req.method === 'DELETE') {
      // 메모 삭제
      return res.status(200).json({ message: "deleted", id });
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

  } catch (err) {
    // 5. 검증 과정 중 예외가 발생하더라도 500을 내지 않고 항상 401 반환
    return respondUnauthorized(res);
  }
}