import { supabase } from './supabase.js';

export async function mostrarUser() {
  const app = document.getElementById('app');
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    app.innerHTML = '<p>⚠️ Debes iniciar sesión</p>';
    return;
  }

  app.innerHTML = `
    <section class="user-profile">
      <h2>👤 Mi Perfil</h2>
      <form id="user-form">
        <label>Nombre completo</label>
        <input type="text" id="nombre" required />
        
        <label>Email (no editable)</label>
        <input type="email" id="email" disabled />
        
        <label>Teléfono</label>
        <input type="tel" id="telefono" />
        
        <label>Zona horaria</label>
        <select id="zona_horaria">
          <option value="America/Bogota">Bogotá (GMT-5)</option>
          <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
          <option value="America/New_York">Nueva York (GMT-5)</option>
          <option value="Europe/Madrid">Madrid (GMT+1)</option>
        </select>
        
        <label>Foto de perfil (URL)</label>
        <input type="url" id="foto_url" placeholder="https://..." />
        
        <button type="submit">💾 Actualizar Perfil</button>
      </form>
      
      <hr>
      
      <h3>🔐 Cambiar Contraseña</h3>
      <form id="password-form">
        <input type="password" name="new_password" placeholder="Nueva contraseña (mín. 6 caracteres)" required minlength="6" />
        <button type="submit">Cambiar Contraseña</button>
      </form>
      
      <p id="mensaje"></p>
      
      <hr>
      <button id="delete-account" class="btn-danger">🗑️ Eliminar Cuenta</button>
    </section>
  `;

  const form = document.getElementById('user-form');
  const passwordForm = document.getElementById('password-form');
  const mensaje = document.getElementById('mensaje');
  const deleteBtn = document.getElementById('delete-account');

  // Cargar datos del usuario
  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  if (userError) {
    mensaje.textContent = `❌ Error cargando datos: ${userError.message}`;
    mensaje.style.color = 'red';
    return;
  }

  // Llenar formulario
  document.getElementById('nombre').value = userData.nombre || '';
  document.getElementById('email').value = userData.email || '';
  document.getElementById('telefono').value = userData.telefono || '';
  document.getElementById('zona_horaria').value = userData.zona_horaria || 'America/Bogota';
  document.getElementById('foto_url').value = userData.foto_url || '';

  // Actualizar perfil
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';

    const datosActualizados = {
      nombre: document.getElementById('nombre').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      zona_horaria: document.getElementById('zona_horaria').value,
      foto_url: document.getElementById('foto_url').value.trim()
    };

    const { error: updateError } = await supabase
      .from('usuarios')
      .update(datosActualizados)
      .eq('id', user.id);

    if (updateError) {
      mensaje.textContent = `❌ Error: ${updateError.message}`;
      mensaje.style.color = 'red';
    } else {
      mensaje.textContent = '✅ Perfil actualizado correctamente';
      mensaje.style.color = 'green';
    }
  });

  // Cambiar contraseña
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';

    const newPassword = passwordForm.new_password.value;

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      mensaje.textContent = `❌ Error: ${error.message}`;
      mensaje.style.color = 'red';
    } else {
      mensaje.textContent = '✅ Contraseña actualizada';
      mensaje.style.color = 'green';
      passwordForm.reset();
    }
  });

  // Eliminar cuenta
  deleteBtn.addEventListener('click', async () => {
    const confirmacion = prompt('⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE. Escribe "ELIMINAR" para confirmar:');
    
    if (confirmacion !== 'ELIMINAR') return;

    try {
      // Primero eliminar de la tabla usuarios (cascade eliminará eventos y reservas)
      const { error: dbError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Luego eliminar de Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      // Cerrar sesión
      await supabase.auth.signOut();
      
      alert('✅ Cuenta eliminada correctamente');
      location.reload();

    } catch (error) {
      mensaje.textContent = `❌ Error eliminando cuenta: ${error.message}`;
      mensaje.style.color = 'red';
    }
  });
}