// src/eventos.js
import { supabase } from './supabase.js';

export async function mostrarEventos() {
  const app = document.getElementById('app');
  
  // Verificar que haya usuario logueado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    app.innerHTML = '<p>⚠️ Debes iniciar sesión</p>';
    return;
  }

  app.innerHTML = `
    <section>
      <h2>📅 Mis Eventos</h2>
      <button id="crear-evento-btn">+ Crear Nuevo Evento</button>
      
      <div id="lista-eventos">Cargando...</div>
      
      <div id="form-evento" style="display:none;">
        <h3 id="form-titulo">Crear Evento</h3>
        <form id="evento-form">
          <input type="hidden" name="id" />
          <input type="text" name="nombre" placeholder="Nombre del evento" required />
          <textarea name="descripcion" placeholder="Descripción"></textarea>
          <input type="number" name="duracion" placeholder="Duración (minutos)" required min="15" step="15" value="30" />
          <input type="text" name="url_personalizada" placeholder="URL personalizada (ej: consultoria-gratis)" />
          <select name="tipo_ubicacion" required>
            <option value="virtual">Virtual</option>
            <option value="presencial">Presencial</option>
            <option value="telefono">Teléfono</option>
          </select>
          <input type="text" name="ubicacion" placeholder="Ubicación (ej: Google Meet, Zoom)" />
          <input type="number" name="precio" placeholder="Precio (0 = gratis)" min="0" step="0.01" value="0" />
          <input type="color" name="color" value="#667eea" />
          <button type="submit">Guardar Evento</button>
          <button type="button" id="cancelar-form">Cancelar</button>
        </form>
      </div>
      
      <p id="mensaje"></p>
    </section>
  `;

  const lista = document.getElementById('lista-eventos');
  const formDiv = document.getElementById('form-evento');
  const form = document.getElementById('evento-form');
  const mensaje = document.getElementById('mensaje');
  const crearBtn = document.getElementById('crear-evento-btn');
  const cancelarBtn = document.getElementById('cancelar-form');

  // Cargar eventos
  async function cargarEventos() {
    lista.innerHTML = 'Cargando...';
    
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('usuario_id', user.id)
      .order('nombre');

    if (error) {
      lista.innerHTML = `<p>Error: ${error.message}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      lista.innerHTML = '<p>No tienes eventos. Crea uno nuevo.</p>';
      return;
    }

    lista.innerHTML = data.map(evento => `
      <div class="evento-item" style="border-left: 4px solid ${evento.color}">
        <h3>${evento.nombre}</h3>
        <p>${evento.descripcion || ''}</p>
        <p><strong>${evento.duracion} min</strong> • ${evento.tipo_ubicacion} • ${evento.precio > 0 ? `$${evento.precio}` : 'Gratis'}</p>
        <p><small>URL: /reserva/${evento.url_personalizada || evento.id}</small></p>
        <button onclick="window.editarEvento('${evento.id}')">✏️ Editar</button>
        <button onclick="window.eliminarEvento('${evento.id}')">🗑️ Eliminar</button>
        <label><input type="checkbox" ${evento.activo ? 'checked' : ''} onchange="window.toggleEvento('${evento.id}', this.checked)"> Activo</label>
      </div>
    `).join('');
  }

  // Crear evento
  crearBtn.addEventListener('click', () => {
    form.reset();
    form.id.value = '';
    document.getElementById('form-titulo').textContent = 'Crear Evento';
    formDiv.style.display = 'block';
  });

  cancelarBtn.addEventListener('click', () => {
    formDiv.style.display = 'none';
    form.reset();
  });

  // Guardar evento
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';

    const datos = {
      nombre: form.nombre.value.trim(),
      descripcion: form.descripcion.value.trim(),
      duracion: parseInt(form.duracion.value),
      url_personalizada: form.url_personalizada.value.trim().toLowerCase().replace(/\s+/g, '-'),
      tipo_ubicacion: form.tipo_ubicacion.value,
      ubicacion: form.ubicacion.value.trim(),
      precio: parseFloat(form.precio.value),
      color: form.color.value,
      usuario_id: user.id
    };

    const eventoId = form.id.value;

    try {
      if (eventoId) {
        // Actualizar
        const { error } = await supabase
          .from('eventos')
          .update(datos)
          .eq('id', eventoId);
        
        if (error) throw error;
        mensaje.textContent = '✅ Evento actualizado';
      } else {
        // Crear
        const { error } = await supabase
          .from('eventos')
          .insert([datos]);
        
        if (error) throw error;
        mensaje.textContent = '✅ Evento creado';
      }

      mensaje.style.color = 'green';
      formDiv.style.display = 'none';
      form.reset();
      cargarEventos();

    } catch (error) {
      mensaje.textContent = `❌ Error: ${error.message}`;
      mensaje.style.color = 'red';
    }
  });

  // Funciones globales
  window.editarEvento = async (id) => {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return;

    form.id.value = data.id;
    form.nombre.value = data.nombre;
    form.descripcion.value = data.descripcion || '';
    form.duracion.value = data.duracion;
    form.url_personalizada.value = data.url_personalizada || '';
    form.tipo_ubicacion.value = data.tipo_ubicacion;
    form.ubicacion.value = data.ubicacion || '';
    form.precio.value = data.precio;
    form.color.value = data.color;

    document.getElementById('form-titulo').textContent = 'Editar Evento';
    formDiv.style.display = 'block';
  };

  window.eliminarEvento = async (id) => {
    if (!confirm('¿Eliminar este evento? Se borrarán todas las reservas asociadas.')) return;

    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      mensaje.textContent = '✅ Evento eliminado';
      mensaje.style.color = 'green';
      cargarEventos();
    }
  };

  window.toggleEvento = async (id, activo) => {
    const { error } = await supabase
      .from('eventos')
      .update({ activo })
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    }
  };

  cargarEventos();
}