// src/reservar.js
import { supabase } from './supabase.js';

export async function mostrarReservar(eventoId = null) {
  const app = document.getElementById('app');
  
  // Si no hay eventoId, mostrar lista de eventos públicos
  if (!eventoId) {
    mostrarEventosPublicos();
    return;
  }

  // Cargar el evento específico
  const { data: evento, error: eventoError } = await supabase
    .from('eventos')
    .select('*, usuarios(nombre)')
    .eq('id', eventoId)
    .eq('activo', true)
    .single();

  if (eventoError || !evento) {
    app.innerHTML = '<p>❌ Evento no encontrado</p>';
    return;
  }

  app.innerHTML = `
    <section class="reservar-container">
      <h2>${evento.nombre}</h2>
      <p><strong>Organizador:</strong> ${evento.usuarios.nombre}</p>
      <p><strong>Duración:</strong> ${evento.duracion} minutos</p>
      <p><strong>Ubicación:</strong> ${evento.ubicacion}</p>
      <p>${evento.descripcion || ''}</p>
      ${evento.precio > 0 ? `<p><strong>Precio:</strong> $${evento.precio}</p>` : '<p><strong>Gratuito</strong></p>'}
      
      <hr>
      
      <h3>Selecciona fecha y hora</h3>
      <form id="reserva-form">
        <input type="date" name="fecha" required min="${new Date().toISOString().split('T')[0]}" />
        
        <select name="hora" id="select-hora" required>
          <option value="">Selecciona una hora</option>
        </select>
        
        <h3>Tus datos</h3>
        <input type="text" name="nombre" placeholder="Tu nombre completo" required />
        <input type="email" name="email" placeholder="Tu correo" required />
        <input type="tel" name="telefono" placeholder="Tu teléfono" />
        <textarea name="notas" placeholder="Notas adicionales (opcional)"></textarea>
        
        <button type="submit">Confirmar Reserva</button>
      </form>
      <p id="mensaje"></p>
    </section>
  `;

  const form = document.getElementById('reserva-form');
  const mensaje = document.getElementById('mensaje');
  const fechaInput = form.fecha;
  const horaSelect = document.getElementById('select-hora');

  // Cargar horas disponibles cuando cambie la fecha
  fechaInput.addEventListener('change', async () => {
    await cargarHorasDisponibles(evento, fechaInput.value, horaSelect);
  });

  // Enviar reserva
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';

    const fecha = form.fecha.value;
    const hora = form.hora.value;
    const nombre = form.nombre.value.trim();
    const email = form.email.value.trim();
    const telefono = form.telefono.value.trim();
    const notas = form.notas.value.trim();

    if (!fecha || !hora || !nombre || !email) {
      mensaje.textContent = '❌ Por favor completa todos los campos obligatorios.';
      mensaje.style.color = 'red';
      return;
    }

    try {
      // 1️⃣ Crear o buscar invitado
      let invitadoId;
      const { data: invitadoExistente } = await supabase
        .from('invitados')
        .select('id')
        .eq('email', email)
        .single();

      if (invitadoExistente) {
        invitadoId = invitadoExistente.id;
      } else {
        const { data: nuevoInvitado, error: invitadoError } = await supabase
          .from('invitados')
          .insert([{ nombre, email, telefono, notas }])
          .select()
          .single();

        if (invitadoError) throw invitadoError;
        invitadoId = nuevoInvitado.id;
      }

      // 2️⃣ Calcular hora_fin
      const horaInicio = hora;
      const [horas, minutos] = horaInicio.split(':').map(Number);
      const totalMinutos = horas * 60 + minutos + evento.duracion;
      const horaFin = `${Math.floor(totalMinutos / 60).toString().padStart(2, '0')}:${(totalMinutos % 60).toString().padStart(2, '0')}`;

      // 3️⃣ Crear reserva
      const { error: reservaError } = await supabase.from('reservas').insert([
        {
          evento_id: evento.id,
          invitado_id: invitadoId,
          fecha: fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          estado: 'confirmada',
          notas: notas,
          link_reunion: evento.ubicacion
        }
      ]);

      if (reservaError) throw reservaError;

      mensaje.textContent = '✅ ¡Reserva confirmada! Te enviaremos un correo de confirmación.';
      mensaje.style.color = 'green';
      form.reset();

    } catch (error) {
      mensaje.textContent = `❌ Error al crear reserva: ${error.message}`;
      mensaje.style.color = 'red';
    }
  });
}

// Función auxiliar: Cargar horas disponibles
async function cargarHorasDisponibles(evento, fecha, selectElement) {
  selectElement.innerHTML = '<option value="">Cargando...</option>';

  try {
    const diaSemana = new Date(fecha + 'T00:00:00').getDay();

    // Obtener disponibilidad del organizador para ese día
    const { data: disponibilidad, error: dispError } = await supabase
      .from('disponibilidad')
      .select('hora_inicio, hora_fin')
      .eq('usuario_id', evento.usuario_id)
      .eq('dia_semana', diaSemana)
      .eq('activo', true);

    if (dispError || !disponibilidad || disponibilidad.length === 0) {
      selectElement.innerHTML = '<option value="">No hay horarios disponibles este día</option>';
      return;
    }

    // Obtener reservas ya existentes para esa fecha
    const { data: reservasExistentes } = await supabase
      .from('reservas')
      .select('hora_inicio, hora_fin')
      .eq('evento_id', evento.id)
      .eq('fecha', fecha)
      .in('estado', ['confirmada', 'pendiente']);

    // Generar slots de tiempo disponibles
    const slots = [];
    disponibilidad.forEach(disp => {
      const inicio = timeToMinutes(disp.hora_inicio);
      const fin = timeToMinutes(disp.hora_fin);
      
      for (let minutos = inicio; minutos < fin; minutos += evento.duracion) {
        const horaSlot = minutesToTime(minutos);
        const horaFinSlot = minutesToTime(minutos + evento.duracion);
        
        // Verificar si el slot está ocupado
        const estaOcupado = reservasExistentes?.some(reserva => {
          const reservaInicio = timeToMinutes(reserva.hora_inicio);
          const reservaFin = timeToMinutes(reserva.hora_fin);
          return minutos < reservaFin && (minutos + evento.duracion) > reservaInicio;
        });

        if (!estaOcupado && minutos + evento.duracion <= fin) {
          slots.push(horaSlot);
        }
      }
    });

    if (slots.length === 0) {
      selectElement.innerHTML = '<option value="">No hay horarios disponibles</option>';
    } else {
      selectElement.innerHTML = '<option value="">Selecciona una hora</option>';
      slots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        selectElement.appendChild(option);
      });
    }

  } catch (error) {
    selectElement.innerHTML = '<option value="">Error al cargar horarios</option>';
    console.error(error);
  }
}

// Funciones auxiliares de tiempo
function timeToMinutes(time) {
  const [horas, minutos] = time.split(':').map(Number);
  return horas * 60 + minutos;
}

function minutesToTime(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Mostrar eventos públicos
async function mostrarEventosPublicos() {
  const app = document.getElementById('app');
  
  const { data: eventos, error } = await supabase
    .from('eventos')
    .select('*, usuarios(nombre)')
    .eq('activo', true)
    .order('nombre');

  if (error || !eventos || eventos.length === 0) {
    app.innerHTML = '<p>No hay eventos disponibles</p>';
    return;
  }

  app.innerHTML = `
    <section>
      <h2>📅 Eventos Disponibles para Reservar</h2>
      <div class="eventos-grid">
        ${eventos.map(evento => `
          <div class="evento-card" style="border-left: 4px solid ${evento.color}">
            <h3>${evento.nombre}</h3>
            <p><strong>${evento.duracion} minutos</strong> • ${evento.tipo_ubicacion}</p>
            <p>${evento.descripcion || ''}</p>
            <p><small>Organizador: ${evento.usuarios.nombre}</small></p>
            <button onclick="window.reservarEvento('${evento.id}')">Reservar</button>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  // Función global para reservar
  window.reservarEvento = (id) => mostrarReservar(id);
}