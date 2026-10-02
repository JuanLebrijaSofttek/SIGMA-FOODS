// Mejoras operativas sin alterar el estado compartido del prototipo.
(function () {
  const baseGeneric = generic;
  const originData = {
    Países: [['México', 3, 7], ['España', 2, 1], ['Francia', 2, 2], ['Argentina', 1, 0], ['Estados Unidos', 1, 0]],
    Regiones: [['Baja California', 'México', 2, 4], ['Coahuila', 'México', 1, 3], ['Querétaro', 'México', 1, 0], ['Castilla y León', 'España', 1, 1], ['La Rioja', 'España', 1, 0], ['Borgoña', 'Francia', 2, 2], ['Champagne', 'Francia', 1, 0], ['Mendoza', 'Argentina', 1, 0], ['California', 'Estados Unidos', 1, 0]],
    Subregiones: [['Valle de Guadalupe', 'Baja California', 'México', 3], ['Valle de Santo Tomás', 'Baja California', 'México', 1], ['Valle de Parras', 'Coahuila', 'México', 3], ['Tequisquiapan', 'Querétaro', 'México', 0], ['Ribera del Duero', 'Castilla y León', 'España', 1], ['Rioja Alta', 'La Rioja', 'España', 0], ['Chablis', 'Borgoña', 'Francia', 1], ['Côte de Nuits', 'Borgoña', 'Francia', 1], ['Montagne de Reims', 'Champagne', 'Francia', 0], ['Valle de Uco', 'Mendoza', 'Argentina', 0], ['Napa Valley', 'California', 'Estados Unidos', 0]]
  };
  store.originTab = store.originTab || 'Países';
  store.originData = store.originData || originData;

  function originsPage() {
    const tab = store.originTab;
    const columns = tab === 'Países' ? ['País', 'Regiones', 'Vinos ligados', 'Estado'] : tab === 'Regiones' ? ['Región', 'País', 'Subregiones', 'Vinos ligados', 'Estado'] : ['Subregión', 'Región', 'País', 'Vinos ligados', 'Estado'];
    const rows = store.originData[tab].map((v, i) => {
      const row = {_id: `${tab}-${i}`};
      columns.slice(0, -1).forEach((c, n) => row[c] = v[n]);
      row.Estado = status(v.estado || 'Activo');
      return row;
    });
    return `<div class="page">${pageHead('Ubicaciones de origen', 'Países, regiones y subregiones')}<div class="tabs">${Object.keys(store.originData).map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="store.originTab='${t}';render()">${t} (${store.originData[t].length})</button>`).join('')}</div><div class="table-card"><div class="toolbar"><input class="input" placeholder="Buscar ${tab.toLowerCase()}" oninput="store.filters.origins=this.value;render()"><button class="btn primary" onclick="originNewForm()">${I('plus')} Nuevo</button><button class="btn" onclick="exportOriginRows()">${I('download')} Exportar XLSX</button><label class="btn"><input type="checkbox" onchange="store.showOriginInactive=this.checked;render()"> Mostrar inactivos</label></div>${table(columns, rows, 'id=>originDetailNew(id)')}</div></div>`;
  }
  window.originNewForm = function () {
    const tab = store.originTab;
    const relation = tab === 'Países' ? '' : tab === 'Regiones' ? '<label class="field"><span>País</span><select class="select" name="parent"><option>México</option><option>España</option><option>Francia</option><option>Argentina</option><option>Estados Unidos</option></select></label>' : '<label class="field"><span>País</span><select class="select" name="country"><option>México</option><option>España</option><option>Francia</option></select></label><label class="field"><span>Región</span><select class="select" name="parent"><option>Querétaro</option><option>Baja California</option><option>Borgoña</option></select></label>';
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nueva ${tab.slice(0, -1).toLowerCase()}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div><form onsubmit="event.preventDefault();saveOriginNew(event)"><div class="form-grid"><label class="field"><span>Nombre</span><input class="input" name="name" required></label>${relation}</div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };
  window.saveOriginNew = function (event) {
    const fd = new FormData(event.target), tab = store.originTab, name = fd.get('name');
    const value = tab === 'Países' ? [name, 0, 0] : tab === 'Regiones' ? [name, fd.get('parent'), 0, 0] : [name, fd.get('parent'), fd.get('country'), 0];
    store.originData[tab].unshift(value); store.drawer = null; showToast(`${tab.slice(0, -1)} creada.`, `${name} aparece al inicio de la tabla.`);
  };
  window.originDetailNew = function (id) {
    const [tab, idx] = id.split('-'), value = store.originData[tab][Number(idx)], lig = value[value.length - 1];
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Detalle</span><h2>${value[0]}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div><div class="form-grid"><div class="field"><label>Vinos ligados</label><strong>${lig}</strong></div><div class="field"><label>Estado</label>${status(value.estado || 'Activo')}</div></div><p class="muted">Este registro tiene historial. Se dará de baja sin borrar su historia.</p><div class="drawer-footer"><button class="btn danger" onclick="originDeactivate('${tab}',${idx})">Dar de baja</button><button class="btn primary" onclick="originNewForm()">Editar</button></div>`;
    render();
  };
  window.originDeactivate = function (tab, idx) {
    const value = store.originData[tab][idx], lig = value[value.length - 1];
    if (lig) { showToast(`No puedes dar de baja ${value[0]}: tiene ${lig} vinos ligados.`); return; }
    value.estado = 'Inactivo'; store.drawer = null; showToast('Ubicación dada de baja.', 'La historia se conserva.');
  };
  window.exportOriginRows = function () {
    const tab = store.originTab, rows = store.originData[tab].map(v => ({Nombre: v[0], Estado: v.estado || 'Activo'}));
    exportXlsx(`Ubicaciones de origen ${tab}`, ['Nombre', 'Estado'], rows);
  };

  generic = function (page) {
    if (page === 'origenes') return originsPage();
    return baseGeneric(page);
  };
})();
