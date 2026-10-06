import { createClient } from '@supabase/supabase-js';
import { verifyLogin } from '../src/verify-login.mjs';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // 1. 인증 토큰 검증
  const authHeader = req.headers.authorization;
  const user = await verifyLogin(authHeader);

  // 미인증 요청 시 401 JSON 응답
  if (!user) {
    return res.status(401).json({ error: '인증되지 않은 요청입니다. 로그인이 필요합니다.' });
  }

  const { method } = req;
  const { id } = req.query;

  try {
    // GET /api/notes
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

      const { data, error } = await supabase
        .from('notes')
        .select('*');

      if (error) throw error;
      return res.status(200).json({ notes: data });
    }

    // POST /api/notes
    if (method === 'POST') {
      const { id: reqId, title, body, content } = req.body || {};
      const noteTitle = title || '제목 없음';
      const noteBody = body || content || '';
      
      const insertData = {
        title: noteTitle,
        content: noteBody,
        owner_id: user.id
      };

      if (reqId) {
        insertData.id = reqId;
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

    // PUT /api/notes
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

    // DELETE /api/notes
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

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${method} Not Allowed` });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}