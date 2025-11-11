// src/register.js
import { supabase } from './supabase.js';
import { mostrarLogin } from './login.js';

export function mostrarRegistro() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="auth-container">
      <h2>📅 Crear Cuenta de Organizador</h2>
      <form id="registro-form">
        <input type="text" name="nombre" placeholder="Nombre completo" required />
        <input type="email" name="email" placeholder="Correo electrónico" required />
        <input type="tel" name="telefono" placeholder="Teléfono (opcional)" />
        <input type="password" name="password" placeholder="Contraseña (mín. 6 caracteres)" required minlength="6" />
        <button type="submit">Registrarme</button>
      </form>
      <p id="error" style="color:red; display:none;"></p>
      <p>¿Ya tienes cuenta? <a href="#" id="ir-login">Inicia sesión</a></p>
    </section>
  `;

  const form = document.getElementById('registro-form');
  const errorMsg = document.getElementById('error');
  const irLogin = document.getElementById('ir-login');

  // Ir al login
  irLogin.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarLogin();
  });

  // Enviar REGISTRO (no login)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const nombre = form.nombre.value.trim();
    const email = form.email.value.trim();
    const telefono = form.telefono.value.trim();
    const password = form.password.value.trim();

    if (!nombre || !email || !password) {
      errorMsg.textContent = 'Por favor completa los campos obligatorios.';
      return;
    }

    try {
      // 1️⃣ Crear usuario en Supabase Auth (REGISTRO, no login)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        errorMsg.textContent = `Error: ${authError.message}`;
        return;
      }

      const uid = authData.user?.id;
      if (!uid) {
        errorMsg.textContent = 'No se pudo obtener el ID del usuario.';
        return;
      }

      // 2️⃣ Insertar en tabla usuarios
      const { error: dbError } = await supabase.from('usuarios').insert([
        {
          id: uid,
          nombre: nombre,
          email: email,
          telefono: telefono,
          rol: 'organizador'
        }
      ]);

      if (dbError) {
        errorMsg.textContent = `Error guardando datos: ${dbError.message}`;
        return;
      }

      alert('✅ Registro exitoso. Por favor verifica tu correo electrónico antes de iniciar sesión.');
      mostrarLogin();

    } catch (error) {
      errorMsg.textContent = `Error inesperado: ${error.message}`;
    }
  });
}