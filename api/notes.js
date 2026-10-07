import { createClient } from '@supabase/supabase-js';

// 1. 요청 헤더에서 검증된 사용자(Authenticated User) 가져오기
async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return { user, supabase };
}

export async function handleNotesRequest(req, res) {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { user, supabase } = auth;
  const method = req.method;
  const urlParams = new URL(req.url, `http://${req.headers.host}`);
  const id = urlParams.searchParams.get('id');

  try {
    // [GET] 본인의 메모만 조회
    if (method === 'GET') {
      const query = supabase.from('notes').select('id, title, content, owner_id');
      if (id) {
        const { data, error } = await query.eq('id', id).eq('owner_id', user.id).single();
        if (error || !data) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ id: data.id, title: data.title, body: data.content });
      } else {
        const { data, error } = await query.eq('owner_id', user.id);
        if (error) return res.status(500).json({ error: error.message });
        const result = data.map(n => ({ id: n.id, title: n.title, body: n.content }));
        return res.status(200).json(result);
      }
    }

    // [POST] 입력받은 owner_id는 무시하고 검증된 user.id로만 생성
    if (method === 'POST') {
      const { title, body } = req.body;
      const { data, error } = await supabase
        .from('notes')
        .insert([{ title, content: body, owner_id: user.id }])
        .select('id, title, content')
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ id: data.id, title: data.title, body: data.content });
    }

    // [PUT / PATCH] 기존 메모와 새 메모 소유자가 모두 본인인지 검증 후 수정
    if (method === 'PUT' || method === 'PATCH') {
      const { title, body } = req.body;
      
      // 기존 행 소유자 확인
      const { data: existing } = await supabase
        .from('notes')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data, error } = await supabase
        .from('notes')
        .update({ title, content: body })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select('id, title, content')
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ title: data.title, body: data.content });
    }

    // [DELETE] 본인 메모만 삭제
    if (method === 'DELETE') {
      const { data: existing } = await supabase
        .from('notes')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}