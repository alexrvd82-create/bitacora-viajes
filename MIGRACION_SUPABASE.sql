-- Ejecuta esto en el SQL Editor de tu proyecto de Supabase.
-- Falta la política de UPDATE en la tabla trips: por eso los cambios al editar
-- un viaje (incluidos los comentarios) no se guardan.

create policy "usuarios editan sus viajes"
  on trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
