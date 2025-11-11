import { supabase } from './supabase.js';

export function mostrarMVP() {
  const app = document.getElementById('app');
  app.innerHTML = `
  <section>
    <h2>Crear Evento (MVP Calendly)</h2>
    <form id="evento-form">
      <input type="text" name="nombre" placeholder="Nombre del evento" required />
      <textarea name="descripcion" placeholder="Descripción del evento"></textarea>
      <input type="number" name="duracion" placeholder="Duración (minutos)" required />
      <input type="color" name="color" value="#6366f1" />
      <input type="text" name="url_personalizada" placeholder="URL personalizada" required />
      <select name="tipo_ubicacion" required>
        <option value="virtual">Virtual</option>
        <option value="presencial">Presencial</option>
      </select>
      <input type="text" name="ubicacion" placeholder="Enlace o dirección" required />
      <button type="submit">Crear Evento</button>
    </form>

    <p id="mensaje" style="text-align:center;"></p>

    <h3>Mis Eventos</h3>
    <div id="lista-eventos"></div>
  </section>
  `;

  const form = document.getElementById('evento-form');
  const mensaje = document.getElementById('mensaje');
  const lista = document.getElementById('lista-eventos');

  // 🔹 Cargar eventos del usuario
  async function cargarEventos() {
    lista.innerHTML = 'Cargando eventos...';
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      mensaje.textContent = '⚠️ Debes iniciar sesión para ver tus eventos.';
      lista.innerHTML = '';
      return;
    }

    const { data, error } = await supabase
      .from('eventos')
      .select('id, nombre, descripcion, duracion, color, url_personalizada, tipo_ubicacion, ubicacion')
      .eq('usuario_id', user.id)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      lista.innerHTML = '❌ Error al cargar eventos.';
      return;
    }

    if (!data.length) {
      lista.innerHTML = '<p>No tienes eventos creados.</p>';
      return;
    }

    lista.innerHTML = '';
    data.forEach(ev => {
      const div = document.createElement('div');
      div.innerHTML = `
        <hr>
        <h4 style="color:${ev.color}">${ev.nombre}</h4>
        <p>${ev.descripcion || ''}</p>
        <p><b>Duración:</b> ${ev.duracion} min</p>
        <p><b>Ubicación:</b> ${ev.tipo_ubicacion} - ${ev.ubicacion}</p>
        <p><b>URL:</b> ${ev.url_personalizada}</p>
      `;
      lista.appendChild(div);
    });
  }

  // 🔹 Crear un nuevo evento
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      mensaje.textContent = '⚠️ Debes iniciar sesión.';
      return;
    }

    const evento = {
      usuario_id: user.id,
      nombre: form.nombre.value.trim(),
      descripcion: form.descripcion.value.trim(),
      duracion: parseInt(form.duracion.value),
      color: form.color.value,
      url_personalizada: form.url_personalizada.value.trim(),
      tipo_ubicacion: form.tipo_ubicacion.value,
      ubicacion: form.ubicacion.value.trim(),
      activo: true,
      fecha_creacion: new Date().toISOString()
    };

    const { error } = await supabase.from('eventos').insert([evento]);

    if (error) {
      mensaje.textContent = '❌ Error al crear evento: ' + error.message;
    } else {
      mensaje.textContent = '✅ Evento creado correctamente.';
      form.reset();
      cargarEventos();
    }
  });

  // Inicializar
  cargarEventos();
}
