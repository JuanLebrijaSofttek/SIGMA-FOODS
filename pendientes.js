// pendientes.js
// Resuelve los pendientes y parciales listados en PENDIENTES_Y_PARCIALES.md.
// Se aplica como capa final de overrides sobre el estado compartido (store).
(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Utilidades comunes
  // -----------------------------------------------------------------------
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const now = () => '16/10/2026 12:' + String(10 + Math.floor(Math.random() * 40)).padStart(2, '0') + ':00';

  function audit(accion, entidad, resultado = 'Exitoso') {
    store.audits.unshift([now(), store.user ? store.user[0] : 'Daniela Ríos', accion, entidad, resultado]);
  }

  // Exportación segura: guarda el dataset en store y lo recupera por clave,
  // en lugar de incrustar HTML/JSON dentro de atributos onclick (origen del
  // defecto visual reportado en Cavas, Anaqueles y Auditoría).
  store._exportSets = store._exportSets || {};
  window.exportSet = function (key) {
    const s = store._exportSets[key];
    if (!s) { showToast('No hay datos para exportar.'); return; }
    exportXlsx(s.name, s.headers, s.rows);
  };
  // Registra un dataset de exportación y devuelve un onclick seguro.
  function exportButton(key, name, headers, rows) {
    store._exportSets[key] = { name, headers, rows };
    return `<button class="btn" onclick="exportSet('${key}')">${I('download')} Exportar XLSX</button>`;
  }

  // Quita etiquetas HTML para exportar texto limpio.
  const plain = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();

  // -----------------------------------------------------------------------
  // RF-03 / RF-04 / RF-23 — Defecto visual compartido en las exportaciones
  // La causa es incrustar filas con HTML dentro de JSON.stringify en el
  // atributo onclick. Se reescriben las pantallas afectadas para usar
  // exportButton() con datos ya limpios.
  // -----------------------------------------------------------------------

  // Anaqueles (RF-04): toolbar con export seguro arriba de "Nuevo anaquel".
  window.racks = function () {
    const cava = store.filters.rackCava || '';
    const data = store.racks.filter(x => !cava || x.cava === cava);
    const rows = data.map(x => ({
      _id: x.uid,
      Clave: `<span class="mono">${x.id}</span>`,
      Nombre: x.nombre, Cava: x.cava, Filas: x.filas, Columnas: x.columnas,
      Celdas: x.celdas, Ocupadas: x.ocupadas,
      Ocupación: `${(x.ocupadas / x.celdas * 100).toFixed(1)}%`,
      Estado: status(x.estado)
    }));
    const exportRows = data.map(x => ({
      Clave: x.id, Nombre: x.nombre, Cava: x.cava, Filas: x.filas, Columnas: x.columnas,
      Celdas: x.celdas, Ocupadas: x.ocupadas,
      Ocupación: `${(x.ocupadas / x.celdas * 100).toFixed(1)}%`, Estado: x.estado
    }));
    const exportHeaders = ['Clave', 'Nombre', 'Cava', 'Filas', 'Columnas', 'Celdas', 'Ocupadas', 'Ocupación', 'Estado'];
    return `<div class="page">${pageHead('Anaqueles', 'Administración de capacidad y ubicaciones')}<div class="table-card"><div class="toolbar"><select class="select" onchange="store.filters.rackCava=this.value;render()"><option value="">Todas las cavas</option>${store.cavas.map(c => `<option ${c.id === cava ? 'selected' : ''}>${c.id}</option>`).join('')}</select>${exportButton('racks', 'Anaqueles', exportHeaders, exportRows)}<button class="btn primary" onclick="newForm('rack')">${I('plus')} Nuevo anaquel</button></div>${table(['Clave', 'Nombre', 'Cava', 'Filas', 'Columnas', 'Celdas', 'Ocupadas', 'Ocupación', 'Estado'], rows, "id=>openDetail('rack',id)")}</div></div>`;
  };

  // Cavas (RF-03): usa exportCurrent que ya es seguro; sin cambios de datos,
  // pero aseguramos que el export de la matriz sea seguro (ver matrix abajo).

  // Auditoría (RF-23): pestañas funcionales + export seguro + drawer de detalle.
  store.auditTab = store.auditTab || 'Movimientos y cambios';

  function auditRowsFor(tab) {
    // Clasifica cada registro de store.audits por tipo de pestaña.
    const isAccess = a => /sesión|inicio de sesión|expiración|cierre/i.test(a[2]);
    const isExport = a => /exportar/i.test(a[2]);
    return store.audits
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => tab === 'Accesos' ? isAccess(a) : tab === 'Exportaciones' ? isExport(a) : (!isAccess(a) && !isExport(a)));
  }

  window.auditDetail = function (i) {
    const a = store.audits[i];
    if (!a) return;
    const antes = /autoriz/i.test(a[2]) ? 'Por autorizar' : /baja|inactiv/i.test(a[2]) ? 'Activo' : /salida/i.test(a[2]) ? 'Ubicada' : 'Estado previo';
    const despues = /autoriz/i.test(a[2]) ? 'Autorizado' : /baja|inactiv/i.test(a[2]) ? 'Inactivo' : /salida/i.test(a[2]) ? 'Fuera de cava' : 'Estado resultante';
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Registro de auditoría</span><h2 class="mono">AUD-${String(i + 1).padStart(4, '0')}</h2><p>${esc(a[2])}</p></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <div class="form-grid">
        <div class="field"><label>Usuario</label><strong>${esc(a[1])}</strong></div>
        <div class="field"><label>Entidad</label><strong class="mono">${esc(a[3])}</strong></div>
        <div class="field"><label>Hora local (America/Monterrey)</label><strong>${esc(a[0])}</strong></div>
        <div class="field"><label>Hora UTC</label><strong>${esc(a[0].replace(/(\d{2}):(\d{2}):/, (m, h, mm) => String((+h + 6) % 24).padStart(2, '0') + ':' + mm + ':'))}</strong></div>
        <div class="field"><label>Correlación</label><strong class="mono">COR-${String(90000 + i).toString(16).toUpperCase()}</strong></div>
        <div class="field"><label>Origen</label><strong>Web · Chrome · 10.12.4.${(i % 250) + 1}</strong></div>
        <div class="field full"><label>Resultado</label>${status(a[4])}</div>
      </div>
      <div class="card"><strong>Antes / Después</strong><div class="activity-row"><span>Antes</span><span style="margin-left:auto">${esc(antes)}</span></div><div class="activity-row"><span>Después</span><span style="margin-left:auto">${esc(despues)}</span></div></div>
      <div class="drawer-footer"><button class="btn" onclick="store.drawer=null;render()">Cerrar</button><button class="btn primary" onclick="store.drawer=null;store.filters.query='${esc(a[3])}';goto('consultas')">${I('history')} Ver entidad en Consultas</button></div>`;
    render();
  };

  window.audit_view = function () {
    const tab = store.auditTab;
    const entries = auditRowsFor(tab);
    const rows = entries.map(({ a, i }) => ({
      _id: i,
      Fecha: a[0], Usuario: a[1], Acción: a[2],
      Entidad: `<span class="mono">${esc(a[3])}</span>`,
      Resultado: status(a[4])
    }));
    const exportRows = entries.map(({ a }) => ({ Fecha: a[0], Usuario: a[1], Acción: a[2], Entidad: a[3], Resultado: a[4] }));
    const tabs = ['Movimientos y cambios', 'Accesos', 'Exportaciones'];
    return `<div class="page">${pageHead('Auditoría', 'Registro inmutable de accesos, cambios y exportaciones')}
      <div class="tabs">${tabs.map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="store.auditTab='${t}';render()">${t} (${auditRowsFor(t).length})</button>`).join('')}</div>
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Entidad o correlación" oninput="store.filters.audit=this.value;render()" value="${esc(store.filters.audit || '')}"><select class="select" onchange="store.filters.auditResult=this.value;render()"><option value="">Todos los resultados</option><option ${store.filters.auditResult === 'Exitoso' ? 'selected' : ''}>Exitoso</option><option ${store.filters.auditResult === 'Fallido' ? 'selected' : ''}>Fallido</option></select>${exportButton('audit', 'Auditoría ' + tab, ['Fecha', 'Usuario', 'Acción', 'Entidad', 'Resultado'], exportRows)}</div>
      ${table(['Fecha', 'Usuario', 'Acción', 'Entidad', 'Resultado'], filterAuditRows(rows), "id=>auditDetail(id)")}</div></div>`;
  };

  function filterAuditRows(rows) {
    const q = (store.filters.audit || '').toLowerCase();
    const res = store.filters.auditResult || '';
    return rows.filter(r => {
      const text = (plain(r.Entidad) + ' ' + r.Usuario + ' ' + r.Acción).toLowerCase();
      const okQ = !q || text.includes(q);
      const okR = !res || plain(r.Resultado).includes(res);
      return okQ && okR;
    });
  }

  // Matrix: reemplaza el export inseguro por uno con exportButton.
  const matrixBase = window.matrix;
  window.matrix = function () {
    let html = matrixBase();
    // Reemplaza cualquier onclick de exportXlsx(...) remanente por export seguro.
    html = html.replace(/onclick="exportXlsx\([^"]*"/g, m => {
      const r = store.racks.find(x => x.uid === (store.filters.rack || 'R3')) || store.racks[3];
      const key = 'matrix-' + r.uid;
      const cells = [];
      const rowsL = 'ABCDEFGHIJKL'.slice(0, r.filas).split('');
      for (let ri = 0; ri < r.filas; ri++) for (let c = 1; c <= r.columnas; c++) cells.push({ Celda: `${rowsL[ri]}${c}`, Estado: (ri * r.columnas + c) > r.ocupadas ? 'Libre' : 'Ocupada' });
      store._exportSets[key] = { name: `Matriz ${r.id}`, headers: ['Celda', 'Estado'], rows: cells };
      return `onclick="exportSet('${key}')"`;
    });
    return html;
  };

  // -----------------------------------------------------------------------
  // RF-06 — Grupos de vino (prioridad alta)
  // Página con columnas Orden, Grupo, Comentarios, Vinos ligados y Estado.
  // Alta, detalle con selección múltiple de vinos, reordenar y baja bloqueada.
  // -----------------------------------------------------------------------
  store.groups = store.groups || [
    { orden: 1, nombre: 'Tintos nacionales', comentarios: 'Reserva base de eventos', vinos: ['V-001', 'V-004', 'V-005', 'V-006', 'V-007'], estado: 'Activo' },
    { orden: 2, nombre: 'Blancos nacionales', comentarios: 'Servicio frío', vinos: ['V-002', 'V-003'], estado: 'Activo' },
    { orden: 3, nombre: 'Españoles y otros', comentarios: '', vinos: ['V-008'], estado: 'Activo' },
    { orden: 4, nombre: 'Blanco francés', comentarios: '', vinos: ['V-009'], estado: 'Activo' },
    { orden: 5, nombre: 'Tinto francés', comentarios: 'Guarda premium', vinos: ['V-010'], estado: 'Activo' },
    { orden: 6, nombre: 'Para eventos', comentarios: 'Rotación rápida', vinos: ['V-001', 'V-003', 'V-005'], estado: 'Activo' },
    { orden: 7, nombre: 'Champagne', comentarios: '', vinos: [], estado: 'Activo' }
  ];

  function wineName(id) { const w = store.wines.find(x => x.id === id); return w ? w.nombre : id; }

  function groupsPage() {
    const q = (store.filters.groups || '').toLowerCase();
    const list = store.groups
      .filter(g => store.showGroupInactive || g.estado === 'Activo')
      .filter(g => (g.nombre + g.comentarios).toLowerCase().includes(q))
      .sort((a, b) => a.orden - b.orden);
    const rows = list.map((g, idx) => {
      const gi = store.groups.indexOf(g);
      return {
        _id: gi,
        Orden: `<div class="order-cell"><button class="icon-btn mini" title="Subir" onclick="event.stopPropagation();groupMove(${gi},-1)">${I('chevron-up')}</button><strong>${g.orden}</strong><button class="icon-btn mini" title="Bajar" onclick="event.stopPropagation();groupMove(${gi},1)">${I('chevron-down')}</button></div>`,
        Grupo: `<strong>${esc(g.nombre)}</strong>`,
        Comentarios: esc(g.comentarios) || '<span class="muted">—</span>',
        'Vinos ligados': `<span class="status info">${g.vinos.length}</span>`,
        Estado: status(g.estado)
      };
    });
    const exportRows = list.map(g => ({ Orden: g.orden, Grupo: g.nombre, Comentarios: g.comentarios, 'Vinos ligados': g.vinos.length, Estado: g.estado }));
    return `<div class="page">${pageHead('Grupos de vino', 'Agrupaciones muchos a muchos con vinos', `<button class="btn primary" onclick="groupNew()">${I('plus')} Nuevo grupo</button>`)}
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Buscar grupo" oninput="store.filters.groups=this.value;render()" value="${esc(store.filters.groups || '')}">${exportButton('groups', 'Grupos de vino', ['Orden', 'Grupo', 'Comentarios', 'Vinos ligados', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showGroupInactive ? 'checked' : ''} onchange="store.showGroupInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Orden', 'Grupo', 'Comentarios', 'Vinos ligados', 'Estado'], rows, "id=>groupDetail(id)")}</div></div>`;
  }

  window.groupMove = function (gi, dir) {
    const g = store.groups[gi];
    const sorted = [...store.groups].sort((a, b) => a.orden - b.orden);
    const pos = sorted.indexOf(g);
    const swap = sorted[pos + dir];
    if (!swap) return;
    const tmp = g.orden; g.orden = swap.orden; swap.orden = tmp;
    // Renumera de forma contigua.
    store.groups.sort((a, b) => a.orden - b.orden).forEach((x, n) => x.orden = n + 1);
    audit('Reordenar grupo', g.nombre);
    render();
  };

  window.groupNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo grupo</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();groupSave(event)"><div class="form-grid">
      <label class="field"><span>Nombre</span><input class="input" name="nombre" required></label>
      <label class="field"><span>Orden</span><input class="input" type="number" name="orden" min="1" value="${store.groups.length + 1}" required></label>
      <label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label>
      </div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.groupSave = function (event) {
    const fd = new FormData(event.target);
    const nombre = fd.get('nombre').trim();
    if (store.groups.some(g => g.nombre.toLowerCase() === nombre.toLowerCase())) { showToast('Ya existe un grupo con ese nombre.'); return; }
    store.groups.push({ orden: parseInt(fd.get('orden')) || store.groups.length + 1, nombre, comentarios: fd.get('comentarios') || '', vinos: [], estado: 'Activo' });
    store.groups.sort((a, b) => a.orden - b.orden).forEach((x, n) => x.orden = n + 1);
    audit('Crear grupo', nombre);
    store.drawer = null;
    showToast(`Grupo "${nombre}" creado.`, 'Ya puedes ligar vinos desde su detalle.');
  };

  window.groupDetail = function (gi) {
    const g = store.groups[gi];
    if (!g) return;
    const q = (store.groupWineFilter || '').toLowerCase();
    const wineList = store.wines.filter(w => w.nombre.toLowerCase().includes(q));
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Grupo · Orden ${g.orden}</span><h2>${esc(g.nombre)}</h2><p>${esc(g.comentarios) || 'Sin comentarios'}</p></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <div class="field"><label>Vinos ligados</label><strong>${g.vinos.length}</strong></div>
      <label class="field"><span>Buscar vino</span><input class="input" value="${esc(store.groupWineFilter || '')}" oninput="store.groupWineFilter=this.value;groupDetail(${gi})"></label>
      <div class="check-list">${wineList.map(w => `<label class="check-row"><input type="checkbox" ${g.vinos.includes(w.id) ? 'checked' : ''} onchange="groupToggleWine(${gi},'${w.id}',this.checked)"> <span><strong>${esc(w.nombre)}</strong><small class="muted"> · ${esc(w.tipo)}</small></span></label>`).join('')}</div>
      <div class="drawer-footer"><button class="btn danger" onclick="groupDeactivate(${gi})">${I('archive')} Dar de baja</button><button class="btn primary" onclick="store.drawer=null;store.groupWineFilter='';render()">Listo</button></div>`;
    render();
  };

  window.groupToggleWine = function (gi, wineId, checked) {
    const g = store.groups[gi];
    if (checked) { if (!g.vinos.includes(wineId)) g.vinos.push(wineId); }
    else g.vinos = g.vinos.filter(x => x !== wineId);
    // Mantiene en sincronía la columna "Grupos" de la pantalla Vinos.
    syncWineGroups();
    audit(checked ? 'Ligar vino a grupo' : 'Desligar vino de grupo', `${g.nombre} · ${wineId}`);
    groupDetail(gi);
  };

  // Recalcula el campo .grupos de cada vino a partir de store.groups.
  function syncWineGroups() {
    store.wines.forEach(w => {
      const names = store.groups.filter(g => g.estado === 'Activo' && g.vinos.includes(w.id)).map(g => g.nombre);
      w.grupos = names.join(', ');
    });
  }

  window.groupDeactivate = function (gi) {
    const g = store.groups[gi];
    if (g.vinos.length) { showToast(`No puedes dar de baja "${g.nombre}".`, `Tiene ${g.vinos.length} vinos ligados. Desligalos primero.`); return; }
    g.estado = 'Inactivo';
    audit('Dar de baja grupo', g.nombre);
    store.drawer = null;
    showToast(`Grupo "${g.nombre}" dado de baja.`, 'La historia se conserva.');
  };

  // -----------------------------------------------------------------------
  // RF-06 — Tipos de vino: alta, detalle, edición y baja bloqueada.
  // -----------------------------------------------------------------------
  store.types = store.types || [
    { nombre: 'Tinto', comentarios: 'Guarda y servicio', estado: 'Activo' },
    { nombre: 'Blanco', comentarios: 'Servicio frío', estado: 'Activo' },
    { nombre: 'Rosado', comentarios: '', estado: 'Activo' },
    { nombre: 'Espumoso', comentarios: '', estado: 'Activo' },
    { nombre: 'Generoso', comentarios: '', estado: 'Activo' },
    { nombre: 'Destilado', comentarios: '', estado: 'Activo' }
  ];

  const typeCount = nombre => store.wines.filter(w => w.tipo === nombre).length;

  function typesPage() {
    const list = store.types.filter(t => store.showTypeInactive || t.estado === 'Activo');
    const rows = list.map(t => ({
      _id: store.types.indexOf(t),
      Tipo: `<strong>${esc(t.nombre)}</strong>`,
      Comentarios: esc(t.comentarios) || '<span class="muted">—</span>',
      'Vinos ligados': `<span class="status info">${typeCount(t.nombre)}</span>`,
      Estado: status(t.estado)
    }));
    const exportRows = list.map(t => ({ Tipo: t.nombre, Comentarios: t.comentarios, 'Vinos ligados': typeCount(t.nombre), Estado: t.estado }));
    return `<div class="page">${pageHead('Tipos de vino', 'Catálogo administrable con baja lógica', `<button class="btn primary" onclick="typeNew()">${I('plus')} Nuevo tipo</button>`)}
      <div class="table-card"><div class="toolbar">${exportButton('types', 'Tipos de vino', ['Tipo', 'Comentarios', 'Vinos ligados', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showTypeInactive ? 'checked' : ''} onchange="store.showTypeInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Tipo', 'Comentarios', 'Vinos ligados', 'Estado'], rows, "id=>typeDetail(id)")}</div></div>`;
  }

  window.typeNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo tipo de vino</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();typeSave(event,-1)"><div class="form-grid"><label class="field full"><span>Nombre</span><input class="input" name="nombre" required></label><label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label></div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.typeDetail = function (ti) {
    const t = store.types[ti], n = typeCount(t.nombre);
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Tipo de vino</span><h2>${esc(t.nombre)}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <div class="form-grid"><div class="field"><label>Vinos ligados</label><strong>${n}</strong></div><div class="field"><label>Estado</label>${status(t.estado)}</div><div class="field full"><label>Comentarios</label><strong>${esc(t.comentarios) || '—'}</strong></div></div>
      <div class="drawer-footer"><button class="btn danger" onclick="typeDeactivate(${ti})">${I('archive')} Dar de baja</button><button class="btn primary" onclick="typeEdit(${ti})">${I('pencil')} Editar</button></div>`;
    render();
  };

  window.typeEdit = function (ti) {
    const t = store.types[ti];
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Edición</span><h2>${esc(t.nombre)}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();typeSave(event,${ti})"><div class="form-grid"><label class="field full"><span>Nombre</span><input class="input" name="nombre" required value="${esc(t.nombre)}"></label><label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500">${esc(t.comentarios)}</textarea></label></div><div class="drawer-footer"><button type="button" class="btn" onclick="typeDetail(${ti})">Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`;
    render();
  };

  window.typeSave = function (event, ti) {
    const fd = new FormData(event.target), nombre = fd.get('nombre').trim(), comentarios = fd.get('comentarios') || '';
    if (ti === -1) {
      if (store.types.some(t => t.nombre.toLowerCase() === nombre.toLowerCase())) { showToast('Ya existe ese tipo.'); return; }
      store.types.push({ nombre, comentarios, estado: 'Activo' });
      audit('Crear tipo de vino', nombre);
      showToast(`Tipo "${nombre}" creado.`);
    } else {
      store.types[ti].nombre = nombre; store.types[ti].comentarios = comentarios;
      audit('Editar tipo de vino', nombre);
      showToast(`Tipo "${nombre}" actualizado.`);
    }
    store.drawer = null; render();
  };

  window.typeDeactivate = function (ti) {
    const t = store.types[ti], n = typeCount(t.nombre);
    if (n) { showToast(`No puedes dar de baja "${t.nombre}".`, `Tiene ${n} vinos ligados.`); return; }
    t.estado = 'Inactivo';
    audit('Dar de baja tipo de vino', t.nombre);
    store.drawer = null;
    showToast(`Tipo "${t.nombre}" dado de baja.`);
  };

  // -----------------------------------------------------------------------
  // RF-07 — Proveedores y contactos (prioridad alta)
  // -----------------------------------------------------------------------
  store.suppliers = store.suppliers || [
    {
      id: 'PRV-01', nombre: 'Vinos Selectos del Norte, S.A. de C.V.', direccion: 'Av. Gómez Morín 1100', ciudad: 'Monterrey, N.L.',
      telefono: '81 8123 4500', correo: 'ventas@vinosselectos.mx', comentarios: 'Proveedor principal de vino nacional.', estado: 'Activo',
      contactos: [
        { nombre: 'Laura Benavides', puesto: 'Gerente de cuenta', correo: 'laura@vinosselectos.mx', telefono: '81 8123 4501', principal: true },
        { nombre: 'Marco Treviño', puesto: 'Logística', correo: 'marco@vinosselectos.mx', telefono: '81 8123 4502', principal: false }
      ],
      lotes: Array.from({ length: 14 }, (_, i) => ({ id: `LT-2026-${String(128 + i).padStart(4, '0')}`, fecha: `${String((i % 28) + 1).padStart(2, '0')}/09/2026`, botellas: 12 + (i % 5) * 6 }))
    },
    {
      id: 'PRV-02', nombre: 'Importadora Gourmet del Bajío, S.A. de C.V.', direccion: 'Blvd. Bernardo Quintana 200', ciudad: 'Querétaro, Qro.',
      telefono: '442 215 7788', correo: 'compras@gourmetbajio.mx', comentarios: '', estado: 'Activo',
      contactos: [{ nombre: 'Patricia Luna', puesto: 'Dirección comercial', correo: 'patricia@gourmetbajio.mx', telefono: '442 215 7789', principal: true }],
      lotes: Array.from({ length: 9 }, (_, i) => ({ id: `LT-2026-${String(201 + i).padStart(4, '0')}`, fecha: `${String((i % 28) + 1).padStart(2, '0')}/08/2026`, botellas: 12 }))
    },
    {
      id: 'PRV-03', nombre: 'Casa Vinícola Peninsular, S.A. de C.V.', direccion: 'Carr. Ensenada-Tecate km 90', ciudad: 'Ensenada, B.C.',
      telefono: '646 178 3322', correo: 'contacto@peninsular.mx', comentarios: 'Entregas quincenales.', estado: 'Activo',
      contactos: [{ nombre: 'Rodrigo Meza', puesto: 'Ventas', correo: 'rodrigo@peninsular.mx', telefono: '646 178 3323', principal: true }],
      lotes: Array.from({ length: 6 }, (_, i) => ({ id: `LT-2026-${String(301 + i).padStart(4, '0')}`, fecha: `${String((i % 28) + 1).padStart(2, '0')}/07/2026`, botellas: 24 }))
    }
  ];

  function suppliersPage() {
    const q = (store.filters.suppliers || '').toLowerCase();
    const list = store.suppliers.filter(s => store.showSupplierInactive || s.estado === 'Activo').filter(s => (s.nombre + s.ciudad).toLowerCase().includes(q));
    const rows = list.map(s => ({
      _id: s.id,
      Proveedor: `<strong>${esc(s.nombre)}</strong>`,
      Ciudad: esc(s.ciudad),
      Contactos: `<span class="status info">${s.contactos.length}</span>`,
      Lotes: s.lotes.length,
      Estado: status(s.estado)
    }));
    const exportRows = list.map(s => ({ Proveedor: s.nombre, Ciudad: s.ciudad, Contactos: s.contactos.length, Lotes: s.lotes.length, Estado: s.estado }));
    return `<div class="page">${pageHead('Proveedores', 'Datos, contactos y lotes recibidos', `<button class="btn primary" onclick="supplierNew()">${I('plus')} Nuevo proveedor</button>`)}
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Buscar proveedor" oninput="store.filters.suppliers=this.value;render()" value="${esc(store.filters.suppliers || '')}">${exportButton('suppliers', 'Proveedores', ['Proveedor', 'Ciudad', 'Contactos', 'Lotes', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showSupplierInactive ? 'checked' : ''} onchange="store.showSupplierInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Proveedor', 'Ciudad', 'Contactos', 'Lotes', 'Estado'], rows, "id=>supplierDetail(id)")}</div></div>`;
  }

  window.supplierNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo proveedor</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();supplierSave(event)"><div class="form-grid">
      <label class="field full"><span>Razón social</span><input class="input" name="nombre" required></label>
      <label class="field full"><span>Dirección</span><input class="input" name="direccion" required></label>
      <label class="field"><span>Ciudad</span><input class="input" name="ciudad" required></label>
      <label class="field"><span>Teléfono</span><input class="input" name="telefono" required pattern="[0-9 +()-]{7,}" title="Al menos 7 dígitos"></label>
      <label class="field"><span>Correo</span><input class="input" type="email" name="correo" required></label>
      <label class="field"><span>Contacto principal</span><input class="input" name="contacto" required></label>
      <label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label>
      </div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.supplierSave = function (event) {
    const fd = new FormData(event.target);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fd.get('correo'))) { showToast('Correo inválido.'); return; }
    const id = `PRV-${String(store.suppliers.length + 1).padStart(2, '0')}`;
    store.suppliers.push({
      id, nombre: fd.get('nombre').trim(), direccion: fd.get('direccion'), ciudad: fd.get('ciudad'),
      telefono: fd.get('telefono'), correo: fd.get('correo'), comentarios: fd.get('comentarios') || '', estado: 'Activo',
      contactos: [{ nombre: fd.get('contacto'), puesto: 'Contacto principal', correo: fd.get('correo'), telefono: fd.get('telefono'), principal: true }],
      lotes: []
    });
    audit('Crear proveedor', id);
    store.drawer = null;
    showToast(`Proveedor ${id} creado.`, 'Aparece al final del listado con 1 contacto.');
  };

  store.supplierTab = store.supplierTab || 'Datos';
  window.supplierDetail = function (id) {
    store.detailSupplier = id;
    store.supplierTab = 'Datos';
    store.page = 'supplier-detail';
    store.drawer = null;
    render(); window.scrollTo(0, 0);
  };

  function supplierDetailPage() {
    const s = store.suppliers.find(x => x.id === store.detailSupplier);
    if (!s) return groupsPage();
    const tab = store.supplierTab;
    let body;
    if (tab === 'Contactos') {
      body = `${table(['Nombre', 'Puesto', 'Correo', 'Teléfono', 'Principal'], s.contactos.map((c, i) => ({ _id: i, Nombre: esc(c.nombre), Puesto: esc(c.puesto), Correo: esc(c.correo), Teléfono: esc(c.telefono), Principal: c.principal ? status('Activo') : '—' })))}
        <div class="card"><strong>Agregar contacto</strong><form onsubmit="event.preventDefault();supplierAddContact(event)"><div class="form-grid"><label class="field"><span>Nombre</span><input class="input" name="nombre" required></label><label class="field"><span>Puesto</span><input class="input" name="puesto"></label><label class="field"><span>Correo</span><input class="input" type="email" name="correo" required></label><label class="field"><span>Teléfono</span><input class="input" name="telefono"></label></div><div class="button-row"><button class="btn primary">${I('plus')} Agregar contacto</button></div></form></div>`;
    } else if (tab === 'Lotes') {
      body = table(['Lote', 'Fecha', 'Botellas'], s.lotes.map((l, i) => ({ _id: i, Lote: `<span class="mono">${l.id}</span>`, Fecha: l.fecha, Botellas: l.botellas })));
    } else {
      body = `<div class="card"><div class="form-grid">
        <div class="field"><label>Razón social</label><strong>${esc(s.nombre)}</strong></div>
        <div class="field"><label>Ciudad</label><strong>${esc(s.ciudad)}</strong></div>
        <div class="field full"><label>Dirección</label><strong>${esc(s.direccion)}</strong></div>
        <div class="field"><label>Teléfono</label><strong>${esc(s.telefono)}</strong></div>
        <div class="field"><label>Correo</label><strong>${esc(s.correo)}</strong></div>
        <div class="field full"><label>Comentarios</label><strong>${esc(s.comentarios) || '—'}</strong></div>
        <div class="field"><label>Estado</label>${status(s.estado)}</div>
      </div></div>`;
    }
    const tabs = [`Datos`, `Contactos (${s.contactos.length})`, `Lotes (${s.lotes.length})`];
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('proveedores')">Proveedores</button>${I('chevron-right')}<span>${esc(s.nombre)}</span></div>
      ${pageHead(s.nombre, s.ciudad)}
      <div class="tabs">${tabs.map(t => { const key = t.split(' (')[0]; return `<button class="tab ${key === tab ? 'active' : ''}" onclick="store.supplierTab='${key}';render()">${t}</button>`; }).join('')}</div>
      ${body}</div>`;
  }

  window.supplierAddContact = function (event) {
    const fd = new FormData(event.target);
    const s = store.suppliers.find(x => x.id === store.detailSupplier);
    s.contactos.push({ nombre: fd.get('nombre'), puesto: fd.get('puesto') || 'Contacto', correo: fd.get('correo'), telefono: fd.get('telefono') || '', principal: false });
    audit('Agregar contacto', s.id);
    showToast('Contacto agregado.', `${s.nombre} ahora tiene ${s.contactos.length} contactos.`);
    render();
  };

  // -----------------------------------------------------------------------
  // RF-08 — Solicitantes (prioridad alta)
  // -----------------------------------------------------------------------
  store.requesters = store.requesters || [
    { id: 'SOL-01', nombre: 'Mariana Treviño Garza', puesto: 'Directora General', area: 'Dirección General', correo: 'mariana.trevino@sigma.mx', telefono: '81 8000 1001', estado: 'Activo', comentarios: '', eventos: ['EVT-58213'], ordenes: ['OS-2026-0318'] },
    { id: 'SOL-02', nombre: 'Héctor Ibarra Núñez', puesto: 'Director de Finanzas', area: 'Finanzas', correo: 'hector.ibarra@sigma.mx', telefono: '81 8000 1002', estado: 'Activo', comentarios: '', eventos: ['EVT-57802', 'EVT-57940'], ordenes: ['OS-2026-0301'] },
    { id: 'SOL-03', nombre: 'Sofía Paredes León', puesto: 'Directora de Comunicación', area: 'Comunicación', correo: 'sofia.paredes@sigma.mx', telefono: '81 8000 1003', estado: 'Activo', comentarios: '', eventos: ['EVT-58077', 'EVT-58240'], ordenes: ['OS-2026-0309'] },
    { id: 'SOL-04', nombre: 'Raúl Esquivel Montes', puesto: 'Gerente Comercial', area: 'Comercial', correo: 'raul.esquivel@sigma.mx', telefono: '81 8000 1004', estado: 'Inactivo', comentarios: 'Dado de baja temporalmente.', eventos: [], ordenes: [] }
  ];

  function requestersPage() {
    const q = (store.filters.requesters || '').toLowerCase();
    const list = store.requesters.filter(s => store.showRequesterInactive || s.estado === 'Activo').filter(s => (s.nombre + s.area).toLowerCase().includes(q));
    const rows = list.map(s => ({
      _id: s.id,
      Solicitante: `<strong>${esc(s.nombre)}</strong><br><span class="muted">${esc(s.puesto)}</span>`,
      Área: esc(s.area),
      Eventos: s.eventos.length,
      Órdenes: s.ordenes.length,
      Estado: status(s.estado)
    }));
    const exportRows = list.map(s => ({ Solicitante: s.nombre, Área: s.area, Eventos: s.eventos.length, Órdenes: s.ordenes.length, Estado: s.estado }));
    return `<div class="page">${pageHead('Solicitantes', 'Personas que solicitan salidas y eventos', `<button class="btn primary" onclick="requesterNew()">${I('plus')} Nuevo solicitante</button>`)}
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Buscar solicitante" oninput="store.filters.requesters=this.value;render()" value="${esc(store.filters.requesters || '')}">${exportButton('requesters', 'Solicitantes', ['Solicitante', 'Área', 'Eventos', 'Órdenes', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showRequesterInactive ? 'checked' : ''} onchange="store.showRequesterInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Solicitante', 'Área', 'Eventos', 'Órdenes', 'Estado'], rows, "id=>requesterDetail(id)")}</div></div>`;
  }

  window.requesterNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo solicitante</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();requesterSave(event)"><div class="form-grid">
      <label class="field full"><span>Nombre</span><input class="input" name="nombre" required></label>
      <label class="field"><span>Puesto</span><input class="input" name="puesto" required></label>
      <label class="field"><span>Área</span><input class="input" name="area" required></label>
      <label class="field"><span>Correo</span><input class="input" type="email" name="correo" required></label>
      <label class="field"><span>Teléfono</span><input class="input" name="telefono" required></label>
      <label class="field"><span>Estado</span><select class="select" name="estado"><option>Activo</option><option>Inactivo</option></select></label>
      <label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label>
      </div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.requesterSave = function (event) {
    const fd = new FormData(event.target);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fd.get('correo'))) { showToast('Correo inválido.'); return; }
    const id = `SOL-${String(store.requesters.length + 1).padStart(2, '0')}`;
    store.requesters.push({ id, nombre: fd.get('nombre').trim(), puesto: fd.get('puesto'), area: fd.get('area'), correo: fd.get('correo'), telefono: fd.get('telefono'), estado: fd.get('estado'), comentarios: fd.get('comentarios') || '', eventos: [], ordenes: [] });
    audit('Crear solicitante', id);
    store.drawer = null;
    showToast(`Solicitante ${id} creado.`, 'Ya aparece en el listado.');
  };

  store.requesterTab = store.requesterTab || 'Datos';
  window.requesterDetail = function (id) {
    store.detailRequester = id; store.requesterTab = 'Datos'; store.page = 'requester-detail'; store.drawer = null;
    render(); window.scrollTo(0, 0);
  };

  function requesterDetailPage() {
    const s = store.requesters.find(x => x.id === store.detailRequester);
    if (!s) return requestersPage();
    const tab = store.requesterTab;
    let body;
    if (tab === 'Eventos') {
      const evs = store.events.filter(e => s.eventos.includes(e.id));
      body = evs.length ? table(['Evento', 'Fecha', 'Estado'], evs.map(e => ({ _id: e.id, Evento: `<strong>${esc(e.nombre)}</strong>`, Fecha: e.fecha, Estado: status(e.estado) }))) : `<div class="empty">${I('calendar-days')}<h2>Sin eventos ligados</h2></div>`;
    } else if (tab === 'Órdenes') {
      const ords = store.orders.filter(o => s.ordenes.includes(o.id));
      body = ords.length ? table(['Folio', 'Motivo', 'Botellas', 'Estatus'], ords.map(o => ({ _id: o.id, Folio: `<span class="mono">${o.id}</span>`, Motivo: o.motivo, Botellas: o.botellas, Estatus: status(o.estado) }))) : `<div class="empty">${I('clipboard-list')}<h2>Sin órdenes ligadas</h2></div>`;
    } else {
      body = `<div class="card"><div class="form-grid">
        <div class="field"><label>Puesto</label><strong>${esc(s.puesto)}</strong></div>
        <div class="field"><label>Área</label><strong>${esc(s.area)}</strong></div>
        <div class="field"><label>Correo</label><strong>${esc(s.correo)}</strong></div>
        <div class="field"><label>Teléfono</label><strong>${esc(s.telefono)}</strong></div>
        <div class="field full"><label>Comentarios</label><strong>${esc(s.comentarios) || '—'}</strong></div>
        <div class="field"><label>Estado</label>${status(s.estado)}</div>
      </div><div class="button-row"><button class="btn" onclick="requesterToggleEstado('${s.id}')">${I('refresh-ccw')} ${s.estado === 'Activo' ? 'Marcar inactivo' : 'Reactivar'}</button></div></div>`;
    }
    const tabs = ['Datos', `Eventos (${s.eventos.length})`, `Órdenes (${s.ordenes.length})`];
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('solicitantes')">Solicitantes</button>${I('chevron-right')}<span>${esc(s.nombre)}</span></div>
      ${pageHead(s.nombre, `${s.puesto} · ${s.area}`)}
      <div class="tabs">${tabs.map(t => { const key = t.split(' (')[0]; return `<button class="tab ${key === tab ? 'active' : ''}" onclick="store.requesterTab='${key}';render()">${t}</button>`; }).join('')}</div>
      ${body}</div>`;
  }

  window.requesterToggleEstado = function (id) {
    const s = store.requesters.find(x => x.id === id);
    s.estado = s.estado === 'Activo' ? 'Inactivo' : 'Activo';
    audit('Cambiar estado de solicitante', `${id} · ${s.estado}`);
    showToast(`${s.nombre} ahora está ${s.estado.toLowerCase()}.`, 'El cambio se refleja en selectores de eventos.');
    render();
  };

  // Lista de solicitantes activos (se usa al crear eventos).
  window.activeRequesterNames = () => store.requesters.filter(s => s.estado === 'Activo').map(s => s.nombre);

  // -----------------------------------------------------------------------
  // RF-18 — Eventos: detalle completo, edición, cancelación y vínculo externo.
  // Se amplía entityDetail para eventos y se agregan acciones.
  // -----------------------------------------------------------------------
  const entityDetailBase = window.entityDetail;
  window.entityDetail = function () {
    const d = store.detail;
    if (d && d.type === 'event') return eventDetailPage();
    return entityDetailBase();
  };

  function eventDetailPage() {
    const x = store.events.find(e => e.id === store.detail.id);
    if (!x) return entityDetailBase();
    const tabs = ['Resumen', 'Vinos', 'Órdenes', 'Historial'];
    const tab = store.activeTab && tabs.includes(store.activeTab) ? store.activeTab : 'Resumen';
    const relatedOrders = store.orders.filter(o => o.evento === x.nombre);
    let body;
    if (tab === 'Vinos') {
      body = x.asignadas
        ? `<div class="summary-grid"><div class="kpi"><span>Asignadas</span><strong>${x.asignadas}</strong></div><div class="kpi"><span>Utilizadas</span><strong>${x.utilizadas}</strong></div><div class="kpi"><span>Devueltas</span><strong>${x.devueltas}</strong></div><div class="kpi"><span>Costo utilizado</span><strong>${x.id === 'EVT-58213' ? 'US$ 540.00' : money(0)}</strong></div></div>
          ${table(['Vino', 'Asignadas', 'Utilizadas', 'Devueltas'], [{ Vino: 'Monte Xanic Chenin Colombard', Asignadas: 8, Utilizadas: 8, Devueltas: 0 }, { Vino: 'Santo Tomás Único', Asignadas: 12, Utilizadas: 7, Devueltas: 5 }, { Vino: 'Matarromera Reserva', Asignadas: 4, Utilizadas: 4, Devueltas: 0 }])}`
        : `<div class="empty">${I('wine')}<h2>Este evento aún no tiene vinos asignados.</h2><button class="btn primary" onclick="newForm('order')">Crear orden de salida</button></div>`;
    } else if (tab === 'Órdenes') {
      body = relatedOrders.length ? table(['Folio', 'Motivo', 'Botellas', 'Estatus'], relatedOrders.map(o => ({ _id: o.id, Folio: `<span class="mono">${o.id}</span>`, Motivo: o.motivo, Botellas: o.botellas, Estatus: status(o.estado) }))) : `<div class="empty">${I('clipboard-list')}<h2>Sin órdenes para este evento</h2></div>`;
    } else if (tab === 'Historial') {
      body = `<section class="card"><h2>Línea de tiempo</h2>${[[x.fecha.split(' ')[0], 'Creación', 'Evento registrado'], ['14/10/2026', 'Asignación', `${x.asignadas || 0} botellas asignadas`], ['15/10/2026', 'Surtido', `${x.utilizadas || 0} utilizadas`], ['16/10/2026', 'Devolución', `${x.devueltas || 0} devueltas`]].map(r => `<div class="activity-row"><span class="state-icon info">${I('history')}</span><div><strong>${r[1]}</strong><div>${r[2]}</div><small class="muted">${r[0]}</small></div></div>`).join('')}</section>`;
    } else {
      body = `<div class="summary-grid"><div class="kpi"><span>Asignadas</span><strong>${x.asignadas}</strong></div><div class="kpi"><span>Utilizadas</span><strong>${x.utilizadas}</strong></div><div class="kpi"><span>Devueltas</span><strong>${x.devueltas}</strong></div><div class="kpi"><span>Órdenes</span><strong>${relatedOrders.length}</strong></div></div>
        <div class="card"><div class="form-grid">
        <div class="field"><label>Fecha y hora</label><strong>${esc(x.fecha)}</strong></div>
        <div class="field"><label>Lugar</label><strong>${esc(x.lugar)}</strong></div>
        <div class="field"><label>Solicitante</label><strong>${esc(x.solicitante)}</strong></div>
        <div class="field"><label>Origen</label><strong>${x.id.startsWith('EVT') ? 'Sistema de Eventos · ' + x.id : 'Alta local'}</strong></div>
        <div class="field full"><label>Comentarios</label><strong>${esc(x.comentarios) || 'Sin comentarios'}</strong></div>
        <div class="field"><label>Estado</label>${status(x.estado)}</div>
        </div></div>`;
    }
    const linked = x.id.startsWith('EVT');
    const actions = `<button class="btn" onclick="eventEdit('${x.id}')">${I('pencil')} Editar</button>${x.estado !== 'Cancelado' && x.estado !== 'Cerrado' ? `<button class="btn danger" onclick="eventCancel('${x.id}')">${I('circle-x')} Cancelar evento</button>` : ''}`;
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('eventos')">Eventos</button>${I('chevron-right')}<span>${esc(x.nombre)}</span></div>
      ${pageHead(x.nombre, `${x.fecha} · ${x.lugar}`, actions)}
      ${linked ? `<div class="ai-banner">${I('link')} Evento vinculado al Sistema de Eventos (${x.id}). Algunos campos se administran en el sistema origen.</div>` : ''}
      <div class="tabs">${tabs.map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="store.activeTab='${t}';render()">${t}</button>`).join('')}</div>
      ${body}</div>`;
  }

  window.eventEdit = function (id) {
    const x = store.events.find(e => e.id === id);
    const linked = x.id.startsWith('EVT');
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Edición</span><h2>${esc(x.nombre)}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();eventSaveEdit('${id}')"><div class="form-grid">
      <label class="field full"><span>Nombre</span><input id="ev-nombre" class="input" required value="${esc(x.nombre)}" ${linked ? 'readonly' : ''}></label>
      <label class="field"><span>Fecha y hora</span><input id="ev-fecha" class="input" value="${esc(x.fecha)}" ${linked ? 'readonly' : ''}></label>
      <label class="field"><span>Lugar</span><input id="ev-lugar" class="input" value="${esc(x.lugar)}"></label>
      <label class="field full"><span>Solicitante</span><select id="ev-sol" class="select">${activeRequesterNames().map(n => `<option ${n === x.solicitante ? 'selected' : ''}>${esc(n)}</option>`).join('')}${activeRequesterNames().includes(x.solicitante) ? '' : `<option selected>${esc(x.solicitante)}</option>`}</select></label>
      <label class="field full"><span>Comentarios</span><textarea id="ev-com" class="input" maxlength="500">${esc(x.comentarios || '')}</textarea></label>
      </div>${linked ? `<p class="muted">Nombre y fecha están bloqueados por estar vinculado al Sistema de Eventos.</p>` : ''}<div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`;
    render();
  };

  window.eventSaveEdit = function (id) {
    const x = store.events.find(e => e.id === id);
    if (!x.id.startsWith('EVT')) { x.nombre = $('#ev-nombre').value; x.fecha = $('#ev-fecha').value; }
    x.lugar = $('#ev-lugar').value; x.solicitante = $('#ev-sol').value; x.comentarios = $('#ev-com').value;
    audit('Editar evento', id);
    store.drawer = null;
    showToast('Evento actualizado.', `${id} guardado y registrado en auditoría.`);
  };

  window.eventCancel = function (id) {
    store.modal = 'event-cancel'; store.cancelEventId = id; render();
  };
  window.eventCancelConfirm = function () {
    const motivo = ($('#cancel-motivo')?.value || '').trim();
    if (motivo.length < 10) { showToast('Indica un motivo de al menos 10 caracteres.'); return; }
    const x = store.events.find(e => e.id === store.cancelEventId);
    x.estado = 'Cancelado';
    const freed = x.asignadas - x.utilizadas;
    audit('Cancelar evento', `${x.id} · ${motivo}`);
    store.modal = null;
    showToast(`Evento ${x.id} cancelado.`, freed > 0 ? `Se liberaron ${freed} botellas no surtidas.` : 'Sin botellas pendientes por liberar.');
  };

  window.eventLinkExternal = function () {
    store.modal = 'event-link'; render();
  };
  window.eventLinkImport = function (extId, nombre) {
    if (store.events.some(e => e.id === extId)) { showToast('Ese evento ya está vinculado.'); store.modal = null; render(); return; }
    store.events.push({ id: extId, nombre, fecha: '22/10/2026 19:00', lugar: 'Salón Consejo, Piso 12', solicitante: 'Mariana Treviño Garza', estado: 'Confirmado', asignadas: 0, utilizadas: 0, devueltas: 0, comentarios: 'Importado del Sistema de Eventos.' });
    audit('Vincular evento externo', extId);
    store.modal = null;
    showToast(`Evento ${extId} vinculado.`, 'Aparece en el listado con origen Sistema de Eventos.');
  };

  // Eventos: botón de vínculo real que abre modal de resultados simulados.
  const eventsBase2 = window.events;
  window.events = function () {
    let html = eventsBase2();
    html = html.replace(/onclick="showToast\('Sistema de Eventos'[^"]*"/, "onclick=\"eventLinkExternal()\"");
    return html;
  };

  // Modales RF-18 agregados al overlay.
  const overlayBase = window.overlay;
  window.overlay = function () {
    let html = overlayBase();
    if (store.modal === 'event-cancel') {
      html += `<div class="modal-backdrop"><div class="modal"><div class="drawer-head"><h2>Cancelar evento</h2><button class="close" onclick="store.modal=null;render()">${I('x')}</button></div><p>Esta acción cancela el evento y libera las botellas no surtidas. El motivo es obligatorio.</p><label class="field full"><span>Motivo de cancelación</span><textarea id="cancel-motivo" class="input" minlength="10" maxlength="300" placeholder="Describe el motivo (mínimo 10 caracteres)"></textarea></label><div class="button-row" style="justify-content:flex-end"><button class="btn" onclick="store.modal=null;render()">Volver</button><button class="btn danger" onclick="eventCancelConfirm()">Cancelar evento</button></div></div></div>`;
    }
    if (store.modal === 'event-link') {
      const results = [['EVT-58213', 'Cena del Consejo de Administración'], ['EVT-58301', 'Posada corporativa 2026'], ['EVT-58322', 'Lanzamiento línea Gourmet']];
      html += `<div class="modal-backdrop"><div class="modal account-modal"><div class="drawer-head"><div><h2>Sistema de Eventos</h2><p>Resultados simulados de la búsqueda</p></div><button class="close" onclick="store.modal=null;render()">${I('x')}</button></div>${results.map(r => `<button class="account-row" onclick="eventLinkImport('${r[0]}','${esc(r[1])}')"><span class="avatar-circle">${I('calendar-days')}</span><span><strong>${esc(r[1])}</strong><small class="mono">${r[0]}</small></span>${I('chevron-right')}</button>`).join('')}</div></div>`;
    }
    return html;
  };

  // -----------------------------------------------------------------------
  // RF-02 — Roles: persistir la matriz y avisar cambios sin guardar.
  // -----------------------------------------------------------------------
  store.permSaved = store.permSaved || {};       // overrides guardados por rol: {rol: "VCEBAX$"}
  store.permDraft = store.permDraft || null;     // {role, perms} en edición

  const basePerms = { 'Responsable de cavas': 'VCEBX$', 'Operador de cava': 'VCE', 'Solicitante': 'VC', 'Autorizador': 'VAX$', 'Auditor': 'VX$', 'Administrador': 'VCEBAX$' };
  const permCols = [['V', 'Ver'], ['C', 'Crear'], ['E', 'Editar'], ['B', 'Dar de baja'], ['A', 'Autorizar'], ['X', 'Exportar'], ['$', 'Ver costos']];
  const permGroups = [['Inicio', ['Inicio']], ['Operación', ['Recepción de lotes', 'Escaneo', 'Asignar y ubicar', 'Eventos', 'Órdenes de salida', 'Ajustes']], ['Inventario', ['Cavas', 'Anaqueles', 'Vinos', 'Consultas e historial']], ['Análisis', ['Reportes', 'Asistente IA']], ['Catálogos', ['Ubicaciones de origen', 'Grupos de vino', 'Tipos de vino', 'Presentaciones', 'Calidad', 'Proveedores', 'Solicitantes']], ['Administración', ['Usuarios', 'Roles y permisos', 'Parámetros', 'Auditoría', 'Registro de IA', 'Bitácora de exportaciones']]];

  function permsFor(role) {
    if (store.permDraft && store.permDraft.role === role) return store.permDraft.perms;
    return store.permSaved[role] || basePerms[role] || '';
  }

  window.rolesSelect = function (role) {
    if (store.permDraft && store.permDraft.role !== role && store.permDraft.dirty) {
      store.pendingRole = role; store.modal = 'perm-unsaved'; render(); return;
    }
    store.selectedRole = role; store.permDraft = null; render();
  };

  window.rolesTogglePerm = function (role, code, module, checked) {
    if (!store.permDraft || store.permDraft.role !== role) store.permDraft = { role, perms: permsFor(role), dirty: false };
    let set = new Set(store.permDraft.perms.split(''));
    const key = `${module}:${code}`;
    // Representación por módulo: usamos un mapa de módulos->permisos.
    store.permDraft.modMap = store.permDraft.modMap || buildModMap(role);
    const mods = store.permDraft.modMap;
    if (!checked && code === 'V') {
      // Desmarcar Ver desmarca las demás acciones del módulo.
      mods[module] = new Set();
    } else if (checked && code !== 'V') {
      mods[module] = mods[module] || new Set(); mods[module].add('V'); mods[module].add(code);
    } else if (checked) {
      mods[module] = mods[module] || new Set(); mods[module].add(code);
    } else {
      mods[module] = mods[module] || new Set(); mods[module].delete(code);
    }
    store.permDraft.dirty = true;
    render();
  };

  function buildModMap(role) {
    // Deriva permisos por módulo a partir de la cadena base (aplica a todos los módulos view-ables).
    const chars = (store.permSaved[role] || basePerms[role] || '').split('');
    const map = {};
    permGroups.forEach(g => g[1].forEach(m => { map[m] = new Set(chars); }));
    return map;
  }

  function rolesPagePersistent() {
    const role = store.selectedRole || 'Responsable de cavas';
    if (!store.permDraft || store.permDraft.role !== role) {
      // vista de solo lectura (sin draft) usa el mapa base
    }
    const draft = store.permDraft && store.permDraft.role === role ? store.permDraft : null;
    const modMap = draft ? (draft.modMap || buildModMap(role)) : buildModMap(role);
    const checkedFor = (module, code) => modMap[module] && modMap[module].has(code);
    return `<div class="page">${pageHead('Roles y permisos', 'Permisos por módulo y acción')}
      ${draft && draft.dirty ? `<div class="ai-banner" style="border-left-color:var(--warning)">${I('triangle-alert')} Tienes cambios sin guardar en <strong>${esc(role)}</strong>.</div>` : ''}
      <div class="roles-layout"><section class="card"><h2>Roles</h2>${Object.keys(basePerms).map(r => `<button class="role-card ${r === role ? 'active' : ''}" onclick="rolesSelect('${r}')">${I('shield')}<span><strong>${r}</strong><small>${store.permSaved[r] ? 'Personalizado' : 'Base'}</small></span></button>`).join('')}</section>
      <section class="table-card"><div class="toolbar"><h2>Matriz de permisos: ${esc(role)}</h2></div><div class="table-scroll"><table class="permission-table"><thead><tr><th>Módulo</th>${permCols.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${permGroups.map(g => `<tr class="group-row"><th colspan="8">${g[0]}</th></tr>${g[1].map(m => `<tr><td>${m}</td>${permCols.map(c => `<td><input type="checkbox" ${checkedFor(m, c[0]) ? 'checked' : ''} onchange="rolesTogglePerm('${role}','${c[0]}','${m.replace(/'/g, '')}',this.checked)"></td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div>
      <div class="permission-footer"><p>Los permisos se aplican en la interfaz y en el servidor.</p><div class="button-row">${draft && draft.dirty ? `<button class="btn" onclick="store.permDraft=null;render()">Descartar</button>` : ''}<button class="btn primary" onclick="rolesSaveMatrix('${role}')">Guardar cambios</button></div></div></section></div></div>`;
  }

  window.rolesSaveMatrix = function (role) {
    const draft = store.permDraft && store.permDraft.role === role ? store.permDraft : null;
    if (draft && draft.modMap) {
      // Consolida el mapa por módulo en una cadena global (unión de permisos).
      const all = new Set();
      Object.values(draft.modMap).forEach(set => set.forEach(c => all.add(c)));
      store.permSaved[role] = permCols.map(c => c[0]).filter(c => all.has(c)).join('');
    } else {
      store.permSaved[role] = store.permSaved[role] || basePerms[role];
    }
    store.permDraft = null;
    audit('Actualizar matriz de permisos', role);
    showToast(`Permisos de ${role} actualizados.`, 'Se reflejan en sidebar, botones y acciones protegidas.');
  };

  // -----------------------------------------------------------------------
  // Enrutamiento: inserta las páginas nuevas en generic().
  // -----------------------------------------------------------------------
  const genericBase = window.generic;
  window.generic = function (page) {
    if (page === 'grupos') return groupsPage();
    if (page === 'tipos') return typesPage();
    if (page === 'proveedores') return suppliersPage();
    if (page === 'supplier-detail') return supplierDetailPage();
    if (page === 'solicitantes') return requestersPage();
    if (page === 'requester-detail') return requesterDetailPage();
    if (page === 'auditoria') return audit_view();
    if (page === 'roles') return rolesPagePersistent();
    return genericBase(page);
  };

  // Modal RF-02: aviso de cambios sin guardar.
  const overlayBase2 = window.overlay;
  window.overlay = function () {
    let html = overlayBase2();
    if (store.modal === 'perm-unsaved') {
      html += `<div class="modal-backdrop"><div class="modal"><h2>Tienes cambios sin guardar</h2><p>Si cambias de rol perderás los cambios en la matriz de ${esc(store.permDraft ? store.permDraft.role : '')}.</p><div class="button-row" style="justify-content:flex-end"><button class="btn" onclick="store.modal=null;render()">Seguir editando</button><button class="btn danger" onclick="store.permDraft=null;store.selectedRole=store.pendingRole;store.modal=null;render()">Descartar y cambiar</button></div></div></div>`;
    }
    return html;
  };

  // Mantener sincronizada la columna Grupos de Vinos al cargar.
  syncWineGroups();

})();
