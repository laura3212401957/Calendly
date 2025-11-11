//importacion de archivos
import {supabase} from './supabase.js';
// ✅ Mostrar la página de registro al iniciar la app
import { mostrarRegistro } from './register.js';//seccion de registro
import { mostrarReservar } from './reservar.js'; //seccion publica de invitados sin login para reservar
import { mostrarLogin } from './login.js'; //seccion de inicio de sesión
import { verificarRol } from './auth.js'; // Verificar rol del usuario actual
import { mostrarMVP } from './mvp.js'; //seccion de eventos para organizadores
import { mostrarUser } from './user.js'; //seccion de perfil de usuario
import { mostrarAdmin } from './admin.js'; //seccion del panel administrativo (contiene: estadisticas, gestion de usuarios, eventos y reservas)
import { mostrarMisReservas } from './mis-reservas.js'; //seccion de reservas para organizadores
import { mostrarEventos } from './eventos.js'; //seccion de eventos-solo organizadores
import { mostrarDisponibilidad } from './disponibilidad.js'; //seccion de disponibilidad para organizadores (configurar horarios)

// Rutas disponibles
const routes = {
  'registro': mostrarRegistro,
  'login': mostrarLogin,
  'eventos': mostrarEventos,
  'disponibilidad': mostrarDisponibilidad,
  'reservas': mostrarMisReservas,
  'perfil': mostrarUser,
  'admin': mostrarAdmin,
  'reservar': mostrarReservar,
  'mvp': mostrarMVP
};

// Cerrar sesión
async function cerrarSesion() {
  await supabase.auth.signOut(); // Despuesp de cerrar sesión, recargar el menu y mostrar el registro
  await cargarMenu();
  mostrarRegistro();
}

// Cargar menú dinámico
async function cargarMenu() {
  const menu = document.getElementById('menu');
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // si usuario NO logueado
    menu.innerHTML = `
      <div class="menu-public">
        <h1>📅 Calendly</h1>
        <div class="menu-buttons">
          <button data-action="registro">Registrarse</button>
          <button data-action="login">Iniciar Sesión</button>
          <button data-action="reservar">Ver Eventos Públicos</button>
        </div>
      </div>
    `;
  } else {
    // Usuario logueado
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nombre, rol')
      .eq('id', user.id)
      .single();

      //MENU PARA USUARIOS LOGUEADOS
    menu.innerHTML = `
      <div class="menu-logged">
        <h1>📅 Calendly</h1>
        <p>Bienvenido, ${userData?.nombre || user.email}!</p>
        <nav>
          <button data-action="eventos">📅 Mis Eventos</button>
          <button data-action="disponibilidad">⏰ Disponibilidad</button>
          <button data-action="reservas">📋 Mis Reservas</button>
          <button data-action="perfil">👤 Mi Perfil</button>
          ${userData?.rol === 'admin' ? '<button data-action="admin">🔧 Admin</button>' : ''}
          <button data-action="logout" class="btn-logout">🚪 Cerrar Sesión</button>
        </nav>
      </div>
    `;
  }

  // Asignar event listeners a los botones
  menu.querySelectorAll('button').forEach(button => {
    const action = button.getAttribute('data-action');
    
    if (action === 'logout') {
      button.addEventListener('click', cerrarSesion);
    } else if (routes[action]) {
      button.addEventListener('click', routes[action]); //asigna la función correspondiente al evento click
    }
  });
}

document.addEventListener("DOMContentLoaded", cargarMenu); // Cargar el menú al cargar la página

// Inicializar la aplicación

// Crear el elemento del menú y insertarlo en el body antes de app
const app = document.getElementById('app');
const menuElement = document.createElement('div');
menuElement.id = 'menu';
document.body.insertBefore(menuElement, app);

// Cargar el menú
cargarMenu();

// Mostrar página inicial según estado de autenticación
supabase.auth.getUser().then(({ data: { user } }) => {
  if (user) {
    mostrarEventos();
  } else {
    mostrarReservar(); // Mostrar eventos públicos por defecto
  }
});

// Escuchar cambios en la autenticación
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    cargarMenu();
    mostrarEventos();
  } else if (event === 'SIGNED_OUT') {
    cargarMenu();
    mostrarReservar();
  }
});