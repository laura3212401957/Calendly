// Verificar rol del usuario actual
export async function verificarRol() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    console.warn("No hay usuario logueado.");
    return null;
  }

  // Consultar la tabla de usuarios para obtener su rol
  const { data, error } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error("Error al obtener el rol:", error);
    return null;
  }

  return data.rol;
}
