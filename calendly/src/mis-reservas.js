// src/mis-reservas.js
import { supabase } from './supabase.js';

export async function mostrarMisReservas() {
  const app = document.getElementById('app');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    app.innerHTML = '<p>⚠️ Debes iniciar sesión</p>';
    return;
  }

  app.innerHTML = `
    <section>
      <h2>📋 Mis Reservas</h2>
      
      <div class="filtros">
        <button class="filtro-btn active" data-estado="todas">Todas</button>
        <button class="filtro-btn" data-estado="confirmada">Confirmadas</button>
        <button class="filtro-btn" data-estado="pendiente">Pendientes</button>
        <button class="filtro-btn" data-estado="cancelada">Canceladas</button>
        <button class="filtro-btn" data-estado="completada">Completadas</button>
      </div>
      
      <div id="lista-reservas">Cargando...</div>
      <p id="mensaje"></p>
    </section>
  `;

  const lista = document.getElementById('lista-reservas');
  const mensaje = document.getElementById('mensaje');
  const filtros = document.querySelectorAll('.filtro-btn');

  let estadoActual = 'todas';

  // Cargar reservas
  async function cargarReservas(estado = 'todas') {
    lista.innerHTML = 'Cargando...';

    // Primero obtener los eventos del usuario
    const { data: eventosUsuario } = await supabase
      .from('eventos')
      .select('id')
      .eq('usuario_id', user.id);

    if (!eventosUsuario || eventosUsuario.length === 0) {
      lista.innerHTML = '<p>No tienes eventos creados aún.</p>';
      return;
    }

    const eventosIds = eventosUsuario.map(e => e.id);

    // Luego obtener reservas de esos eventos
    let query = supabase
      .from('reservas')
      .select(`
        *,
        eventos(nombre, duracion, color),
        invitados(nombre, email, telefono)
      `)
      .in('evento_id', eventosIds)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (estado !== 'todas') {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) {
      lista.innerHTML = `<p>Error: ${error.message}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      lista.innerHTML = '<p>No hay reservas para mostrar.</p>';
      return;
    }

    lista.innerHTML = data.map(reserva => {
      const evento = reserva.eventos;
      const invitado = reserva.invitados;
      const estadoClass = reserva.estado;
      const estadoEmoji = {
        'confirmada': '✅',
        'pendiente': '⏳',
        'cancelada': '❌',
        'completada': '🎉',
        'no_asistio': '⚠️'
      }[reserva.estado] || '📅';

      return `
        <div class="reserva-card estado-${estadoClass}" style="border-left: 4px solid ${evento.color}">
          <div class="reserva-header">
            <h3>${estadoEmoji} ${evento.nombre}</h3>
            <span class="estado-badge estado-${estadoClass}">${reserva.estado}</span>
          </div>
          
          <div class="reserva-info">
            <p><strong>📅 Fecha:</strong> ${new Date(reserva.fecha).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>⏰ Hora:</strong> ${reserva.hora_inicio.substring(0, 5)} - ${reserva.hora_fin.substring(0, 5)} (${evento.duracion} min)</p>
            <p><strong>👤 Invitado:</strong> ${invitado.nombre}</p>
            <p><strong>📧 Email:</strong> ${invitado.email}</p>
            ${invitado.telefono ? `<p><strong>📱 Teléfono:</strong> ${invitado.telefono}</p>` : ''}
            ${reserva.notas ? `<p><strong>📝 Notas:</strong> ${reserva.notas}</p>` : ''}
            ${reserva.link_reunion ? `<p><strong>🔗 Link:</strong> <a href="${reserva.link_reunion}" target="_blank">${reserva.link_reunion}</a></p>` : ''}
          </div>
          
          <div class="reserva-acciones">
            ${reserva.estado === 'pendiente' ? `
              <button onclick="window.cambiarEstadoReserva('${reserva.id}', 'confirmada')">✅ Confirmar</button>
            ` : ''}
            ${reserva.estado === 'confirmada' ? `
              <button onclick="window.cambiarEstadoReserva('${reserva.id}', 'completada')">✔️ Marcar completada</button>
            ` : ''}
            ${['pendiente', 'confirmada'].includes(reserva.estado) ? `
              <button onclick="window.cambiarEstadoReserva('${reserva.id}', 'cancelada')" class="btn-danger">❌ Cancelar</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Cambiar estado de reserva
  window.cambiarEstadoReserva = async (id, nuevoEstado) => {
    const confirmMsg = nuevoEstado === 'cancelada' 
      ? '¿Estás seguro de cancelar esta reserva?' 
      : `¿Cambiar estado a "${nuevoEstado}"?`;
    
    if (!confirm(confirmMsg)) return;

    const updateData = { estado: nuevoEstado };
    if (nuevoEstado === 'cancelada') {
      updateData.fecha_cancelacion = new Date().toISOString();
    }

    const { error } = await supabase
      .from('reservas')
      .update(updateData)
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      mensaje.textContent = '✅ Estado actualizado';
      mensaje.style.color = 'green';
      cargarReservas(estadoActual);
      setTimeout(() => mensaje.textContent = '', 3000);
    }
  };

  // Filtros
  filtros.forEach(btn => {
    btn.addEventListener('click', () => {
      filtros.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      estadoActual = btn.dataset.estado;
      cargarReservas(estadoActual);
    });
  });

  cargarReservas();
}