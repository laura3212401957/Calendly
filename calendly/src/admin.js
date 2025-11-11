// Panel administrativo para gestionar usuarios, eventos y reservas
import { supabase } from './supabase.js';
import { verificarRol } from './auth.js';

export async function mostrarAdmin() {
  const app = document.getElementById('app');
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    app.innerHTML = '<p>⚠️ Debes iniciar sesión</p>';
    return;
  }

  // Verificar si es admin (cambiar por tu email de admin)
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!userData || userData.rol !== 'admin') {
    app.innerHTML = '<p>⛔ No tienes permisos de administrador</p>';
    return;
  }

  app.innerHTML = `
    <section>
      <h2>🔧 Panel Administrativo</h2>
      
      <div class="admin-stats">
        <div class="stat-card">
          <h3 id="total-usuarios">0</h3>
          <p>Organizadores</p>
        </div>
        <div class="stat-card">
          <h3 id="total-eventos">0</h3>
          <p>Eventos</p>
        </div>
        <div class="stat-card">
          <h3 id="total-reservas">0</h3>
          <p>Reservas</p>
        </div>
        <div class="stat-card">
          <h3 id="total-invitados">0</h3>
          <p>Invitados</p>
        </div>
      </div>
      
      <div class="admin-tabs">
        <button class="tab-btn active" data-tab="usuarios">👥 Usuarios</button>
        <button class="tab-btn" data-tab="eventos">📅 Eventos</button>
        <button class="tab-btn" data-tab="reservas">📋 Reservas</button>
      </div>
      
      <div id="admin-content">Cargando...</div>
      <p id="mensaje"></p>
    </section>
  `;

  const content = document.getElementById('admin-content');
  const mensaje = document.getElementById('mensaje');
  const tabs = document.querySelectorAll('.tab-btn');

  // Cargar estadísticas
  async function cargarEstadisticas() {
    const { count: usuarios } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
    const { count: eventos } = await supabase.from('eventos').select('*', { count: 'exact', head: true });
    const { count: reservas } = await supabase.from('reservas').select('*', { count: 'exact', head: true });
    const { count: invitados } = await supabase.from('invitados').select('*', { count: 'exact', head: true });

    document.getElementById('total-usuarios').textContent = usuarios || 0;
    document.getElementById('total-eventos').textContent = eventos || 0;
    document.getElementById('total-reservas').textContent = reservas || 0;
    document.getElementById('total-invitados').textContent = invitados || 0;
  }

  // Mostrar usuarios
  async function mostrarUsuarios() {
    content.innerHTML = 'Cargando...';

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('fecha_registro', { ascending: false });

    if (error) {
      content.innerHTML = `<p>Error: ${error.message}</p>`;
      return;
    }

    content.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Teléfono</th>
            <th>Registro</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(u => `
            <tr>
              <td>${u.nombre}</td>
              <td>${u.email}</td>
              <td><span class="badge">${u.rol}</span></td>
              <td>${u.telefono || '-'}</td>
              <td>${new Date(u.fecha_registro).toLocaleDateString()}</td>
              <td>${u.activo ? '✅ Activo' : '❌ Inactivo'}</td>
              <td>
                <button onclick="window.toggleUsuario('${u.id}', ${!u.activo})">${u.activo ? '🔒 Desactivar' : '✅ Activar'}</button>
                <button onclick="window.eliminarUsuario('${u.id}')" class="btn-danger">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Mostrar eventos
  async function mostrarEventos() {
    content.innerHTML = 'Cargando...';

    const { data, error } = await supabase
      .from('eventos')
      .select('*, usuarios(nombre, email)')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      content.innerHTML = `<p>Error: ${error.message}</p>`;
      return;
    }

    content.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Evento</th>
            <th>Organizador</th>
            <th>Duración</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(e => `
            <tr>
              <td>
                <div style="border-left: 4px solid ${e.color}; padding-left: 8px;">
                  <strong>${e.nombre}</strong><br>
                  <small>${e.url_personalizada || e.id}</small>
                </div>
              </td>
              <td>${e.usuarios.nombre}<br><small>${e.usuarios.email}</small></td>
              <td>${e.duracion} min</td>
              <td>${e.precio > 0 ? `$${e.precio}` : 'Gratis'}</td>
              <td>${e.activo ? '✅' : '❌'}</td>
              <td>
                <button onclick="window.eliminarEvento('${e.id}')" class="btn-danger">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Mostrar reservas
  async function mostrarReservas() {
    content.innerHTML = 'Cargando...';

    const { data, error } = await supabase
      .from('reservas')
      .select(`
        *,
        eventos(nombre, usuarios(nombre)),
        invitados(nombre, email)
      `)
      .order('fecha', { ascending: false });

    if (error) {
      content.innerHTML = `<p>Error: ${error.message}</p>`;
      return;
    }

    content.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Fecha/Hora</th>
            <th>Evento</th>
            <th>Organizador</th>
            <th>Invitado</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td>
                ${new Date(r.fecha).toLocaleDateString()}<br>
                <small>${r.hora_inicio.substring(0, 5)} - ${r.hora_fin.substring(0, 5)}</small>
              </td>
              <td>${r.eventos.nombre}</td>
              <td>${r.eventos.usuarios.nombre}</td>
              <td>${r.invitados.nombre}<br><small>${r.invitados.email}</small></td>
              <td><span class="badge estado-${r.estado}">${r.estado}</span></td>
              <td>
                <button onclick="window.eliminarReserva('${r.id}')" class="btn-danger">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Funciones globales
  window.toggleUsuario = async (id, activo) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo })
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      mostrarUsuarios();
    }
  };

  window.eliminarUsuario = async (id) => {
    if (!confirm('¿Eliminar este usuario? Se borrarán todos sus eventos y reservas.')) return;

    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      mensaje.textContent = '✅ Usuario eliminado';
      mensaje.style.color = 'green';
      mostrarUsuarios();
      cargarEstadisticas();
    }
  };

  window.eliminarEvento = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return;

    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      mostrarEventos();
      cargarEstadisticas();
    }
  };

  window.eliminarReserva = async (id) => {
    if (!confirm('¿Eliminar esta reserva?')) return;

    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      mostrarReservas();
      cargarEstadisticas();
    }
  };

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      if (tabName === 'usuarios') mostrarUsuarios();
      else if (tabName === 'eventos') mostrarEventos();
      else if (tabName === 'reservas') mostrarReservas();
    });
  });

  cargarEstadisticas();
  mostrarUsuarios();
}