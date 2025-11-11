import { supabase } from './supabase.js';

export async function mostrarDisponibilidad() {
  const app = document.getElementById('app');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    app.innerHTML = '<p>⚠️ Debes iniciar sesión</p>';
    return;
  }

  app.innerHTML = `
    <section>
      <h2>⏰ Mi Disponibilidad</h2>
      <p>Define los horarios en los que estás disponible para reuniones</p>
      
      <form id="disponibilidad-form">
        <select name="dia_semana" required>
          <option value="">Selecciona un día</option>
          <option value="1">Lunes</option>
          <option value="2">Martes</option>
          <option value="3">Miércoles</option>
          <option value="4">Jueves</option>
          <option value="5">Viernes</option>
          <option value="6">Sábado</option>
          <option value="0">Domingo</option>
        </select>
        
        <input type="time" name="hora_inicio" required />
        <span>hasta</span>
        <input type="time" name="hora_fin" required />
        
        <button type="submit">+ Agregar Horario</button>
      </form>
      
      <p id="mensaje"></p>
      
      <div id="lista-disponibilidad">Cargando...</div>
    </section>
  `;

  const form = document.getElementById('disponibilidad-form');
  const mensaje = document.getElementById('mensaje');
  const lista = document.getElementById('lista-disponibilidad');

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Cargar disponibilidad
  async function cargarDisponibilidad() {
    lista.innerHTML = 'Cargando...';
    
    const { data, error } = await supabase
      .from('disponibilidad')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('activo', true)
      .order('dia_semana')
      .order('hora_inicio');

    if (error) {
      lista.innerHTML = `<p>Error: ${error.message}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      lista.innerHTML = '<p>No has configurado tu disponibilidad. Agrega horarios arriba.</p>';
      return;
    }

    // Agrupar por día
    const porDia = {};
    data.forEach(disp => {
      if (!porDia[disp.dia_semana]) porDia[disp.dia_semana] = [];
      porDia[disp.dia_semana].push(disp);
    });

    lista.innerHTML = Object.keys(porDia).sort().map(dia => `
      <div class="dia-disponibilidad">
        <h3>${diasSemana[dia]}</h3>
        ${porDia[dia].map(disp => `
          <div class="horario-item">
            ${disp.hora_inicio.substring(0, 5)} - ${disp.hora_fin.substring(0, 5)}
            <button onclick="window.eliminarDisponibilidad('${disp.id}')">🗑️</button>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Agregar disponibilidad
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';

    const dia_semana = parseInt(form.dia_semana.value);
    const hora_inicio = form.hora_inicio.value;
    const hora_fin = form.hora_fin.value;

    if (hora_fin <= hora_inicio) {
      mensaje.textContent = '❌ La hora de fin debe ser posterior a la hora de inicio';
      mensaje.style.color = 'red';
      return;
    }

    try {
      const { error } = await supabase.from('disponibilidad').insert([
        {
          usuario_id: user.id,
          dia_semana,
          hora_inicio,
          hora_fin,
          activo: true
        }
      ]);

      if (error) throw error;

      mensaje.textContent = '✅ Horario agregado';
      mensaje.style.color = 'green';
      form.reset();
      cargarDisponibilidad();

    } catch (error) {
      mensaje.textContent = `❌ Error: ${error.message}`;
      mensaje.style.color = 'red';
    }
  });

  // Eliminar disponibilidad
  window.eliminarDisponibilidad = async (id) => {
    if (!confirm('¿Eliminar este horario?')) return;

    const { error } = await supabase
      .from('disponibilidad')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      mensaje.textContent = '✅ Horario eliminado';
      mensaje.style.color = 'green';
      cargarDisponibilidad();
    }
  };

  cargarDisponibilidad();
}