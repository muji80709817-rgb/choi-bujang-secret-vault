import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server configuration error: Supabase credentials missing' });
  }

  // 1. 요청 헤더에서 인증 토큰 검증
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const method = req.method;
  const id = req.query.id;

  try {
    // [GET] 본인의 메모만 조회
    if (method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, owner_id')
          .eq('id', id)
          .eq('owner_id', user.id)
          .single();

        if (error || !data) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ id: data.id, title: data.title, content: data.content, body: data.content });
      } else {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, owner_id')
          .eq('owner_id', user.id);

        if (error) return res.status(500).json({ error: error.message });
        const result = data.map(n => ({ id: n.id, title: n.title, content: n.content, body: n.content }));
        return res.status(200).json(result);
      }
    }

    // [POST] 검증된 user.id로 작성
    if (method === 'POST') {
      const title = req.body?.title;
      const content = req.body?.content || req.body?.body;

      const { data, error } = await supabase
        .from('notes')
        .insert([{ title, content, owner_id: user.id }])
        .select('id, title, content')
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ id: data.id, title: data.title, content: data.content, body: data.content });
    }

    // [PUT / PATCH] 소유자 검증 후 수정
    if (method === 'PUT' || method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'Missing note ID' });
      
      const title = req.body?.title;
      const content = req.body?.content || req.body?.body;

      const { data: existing } = await supabase
        .from('notes')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not own this note' });
      }

      const { data, error } = await supabase
        .from('notes')
        .update({ title, content })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select('id, title, content')
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ id: data.id, title: data.title, content: data.content, body: data.content });
    }

    // [DELETE] 본인 메모만 삭제
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Missing note ID' });

      const { data: existing } = await supabase
        .from('notes')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not own this note' });
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}