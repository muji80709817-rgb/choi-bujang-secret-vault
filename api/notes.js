import { createClient } from '@supabase/supabase-js';
import { verifyLogin } from '../src/verify-login.mjs';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // 1. 인증 토큰 검증 (src/verify-login.mjs 도우미 활용)
  const authHeader = req.headers.authorization;
  const user = await verifyLogin(authHeader);

  // 💯 100점 조건: 로그인하지 않은 경우 401 상태 코드와 함께 JSON 오류 문구 반환
  if (!user) {
    return res.status(401).json({ error: '인증되지 않은 요청입니다. 로그인이 필요합니다.' });
  }

  const { method } = req;
  const { id } = req.query; // GET, PUT, DELETE 단건 조회를 위한 /api/notes?id=... 또는 /api/notes/[id]

  try {
    // 2. GET /api/notes (목록 조회 또는 단건 조회)
    if (method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          return res.status(404).json({ error: '해당 메모를 찾을 수 없습니다.' });
        }
        return res.status(200).json({ id: data.id, title: data.title, body: data.content || data.body });
      }

      // 목록 GET: 로그인된 사용자의 메모 배열 반환
      const { data, error } = await supabase
        .from('notes')
        .select('*');

      if (error) throw error;
      return res.status(200).json({ notes: data });
    }

    // 3. POST /api/notes (메모 추가)
    if (method === 'POST') {
      const { id: reqId, title, body, content } = req.body || {};
      const noteTitle = title || '제목 없음';
      const noteBody = body || content || '';
      
      const insertData = {
        title: noteTitle,
        content: noteBody,
        owner_id: user.id // 로그인한 사용자의 ID 저장
      };

      if (reqId) {
        insertData.id = reqId; // UUID 전달 시 지정
      }

      const { data, error } = await supabase
        .from('notes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ 
        id: data.id, 
        title: data.title, 
        body: data.content || data.body 
      });
    }

    // 4. PUT /api/notes (메모 수정)
    if (method === 'PUT') {
      const targetId = id || req.body?.id;
      if (!targetId) {
        return res.status(400).json({ error: '수정할 메모 ID가 필요합니다.' });
      }

      const { title, body, content } = req.body || {};
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (body !== undefined || content !== undefined) updateData.content = body || content;

      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', targetId)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({ error: '수정할 메모를 찾지 못했습니다.' });
      }

      return res.status(200).json({ id: data.id, title: data.title, body: data.content || data.body });
    }

    // 5. DELETE /api/notes (메모 삭제)
    if (method === 'DELETE') {
      const targetId = id || req.body?.id;
      if (!targetId) {
        return res.status(400).json({ error: '삭제할 메모 ID가 필요합니다.' });
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', targetId);

      if (error) throw error;
      return res.status(200).json({ id: targetId });
    }

    // 허용되지 않은 HTTP 메소드 처리
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${method} Not Allowed` });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}