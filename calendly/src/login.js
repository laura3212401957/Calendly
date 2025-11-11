// src/login.js
import { supabase } from './supabase.js';
import { mostrarRegistro } from './register.js';

export function mostrarLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="auth-container">
      <h2>📅 Iniciar Sesión</h2>
      <form id="login-form">
        <input type="email" name="email" placeholder="Correo electrónico" required />
        <input type="password" name="password" placeholder="Contraseña" required />
        <button type="submit">Ingresar</button>
      </form>
      <p id="error" style="color:red; display:none;"></p>
      <p>¿No tienes cuenta? <a href="#" id="ir-registro">Regístrate</a></p>
    </section>
  `;

  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('error');
  const irRegistro = document.getElementById('ir-registro');
  
  // Ir al registro
  irRegistro.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarRegistro();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    // 🔍 VALIDACIONES
    if (!email || !email.includes('@')) {
      errorMsg.textContent = '❌ Email inválido';
      return;
    }

    if (!password || password.length < 6) {
      errorMsg.textContent = '❌ Password debe tener mínimo 6 caracteres';
      return;
    }

    // 🧪 DEBUG (quitar en producción)
    console.log('📧 Intentando login con:', email);
    console.log('🔒 Password length:', password.length);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      // 🧪 DEBUG
      console.log('📥 Response data:', data);
      console.log('❌ Response error:', error);

      if (error) {
        // Mensajes amigables
        if (error.message.includes('Invalid login credentials')) {
          errorMsg.textContent = '❌ Email o contraseña incorrectos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMsg.textContent = '❌ Debes confirmar tu email primero';
        } else {
          errorMsg.textContent = `❌ Error: ${error.message}`;
        }
        errorMsg.style.display = 'block';
        return;
      }

      console.log('✅ Login exitoso:', data.user);
      alert('✅ ¡Bienvenido!');
      location.reload();

    } catch (error) {
      console.error('💥 Error inesperado:', error);
      errorMsg.textContent = `❌ Error inesperado: ${error.message}`;
    }
  });
}