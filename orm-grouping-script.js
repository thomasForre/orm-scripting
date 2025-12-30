const localStorageKey = "orm-grouping";
const groupSettingsCard = document.createElement("div");
const style = document.createElement("style");
const dropContainer = document.querySelector('.k-grouping-drop-container');
const chipList = document.querySelector('.k-chip-list');
const existingClearIcon = document.querySelector('svg[data-testid="ClearIcon"]');
const existingSettingsIcon = document.querySelector('svg[data-testid="SettingsIcon"]');
const wait = ms => new Promise(r => setTimeout(r, ms));

let columnList;
let btnClearGrouping = document.getElementById('btn-clear-grouping');
let btnGroupSettings = document.getElementById('btn-group-settings');

(async function main() {
  // Abort if elemenents not found
  if (!dropContainer || !chipList || !existingClearIcon || !existingSettingsIcon) {
    console.warn("Required elemenents not found")
    return;
  }

  const card = document.getElementById("group-settings-card");
  if (card) {
    card.remove();
  }

  applyStylingToDocument();

  groupSettingsCard.id = "group-settings-card";
  groupSettingsCard.classList.add("card");
  groupSettingsCard.innerHTML = `
    <div class="card-header">
      <b>AT gruppering
        <span class="button-card-close" id="close" title="Lukk">❌</span>
      </b>
      <i>Velg kolonner som skal grupperes</i>
      <div class="badge-container">
        <span class="badge" type="button" id="favorite" title="Hent favorittoppsett">⭐</span>
        <span class="badge" type="button" id="clear" title="Nullstill">🗑️</span >
        <span class="badge" type="button" id="save" title="Large favorittoppsett">💾</span>
      </div>
    </div>
    <hr>
    <div>
      <ul id="list"></ul>
      <hr>
    </div>
    <div class="alert-text-area"></div>
    <div class="card-footer">
      <button class="button-card-footer" title="Grupper valgte kolonner"; id="apply">✅ Bruk</button>
    </div>
  `
  
  columnList = groupSettingsCard.querySelector("#list");
  columnDetails = getColumnDetails();
  columnDetails.forEach((column, index) => {
    const id = index + 1;
    columnList.insertAdjacentHTML("beforeend", `
      <li draggable="true" title="Dra og slipp for å endre rekkefølge">
        <span class="grab-icon">≡</span>
        <label for="${id}">
        <input type="checkbox" id="${id}" title="${column.name}" data-field="${column.dataField}">
        ${column.name}
      </li>
    `)}
  );
  
  makeListDraggable();
  
  if (shouldShowCard()) {
    showCard();
    syncCardStateWithCurrentGrouping();
  } else {
    await applyGrouping(getCardStateFromLocalStorage());
  }
  
  // Apply grouping button
  groupSettingsCard.querySelector("#apply").onclick = async () => {
    if (getCurrentCardState().some(cb => cb.checked)) {
      closeCard();
      saveCardStateToLocalStorage();
      await applyGrouping(getCurrentCardState());
    }
  }

  // Save favorites
  groupSettingsCard.querySelector("#save").onclick = () => saveCardStateToLocalStorage();
  
  // Get favorites button
  groupSettingsCard.querySelector("#favorite").onclick = () => syncCardStateWithLocalStorage();

  // Empty card button
  groupSettingsCard.querySelector("#clear").onclick = () => {
    clearCard();
  }

  // Close card button
  groupSettingsCard.querySelector("#close").onclick = () => closeCard();

  // Close card when click outside card except on 'Settings' button
  document.addEventListener("click", (event) => {
    if (!groupSettingsCard?.contains(event.target) && !btnGroupSettings?.contains(event.target)) {
      closeCard();
    }
  });
  return null;
})();

async function applyGrouping(columns) {
  if (!dropContainer) {
    return;
  }

  const clearIcon = existingClearIcon ? existingClearIcon.cloneNode(true) : null;
  const settingsIcon = existingSettingsIcon ? existingSettingsIcon.cloneNode(true) : null;
  
  await clearGrouping();
  
  columnsToGroup = columns.filter(x => x.checked == true);
  for (const {name, dataField} of columnsToGroup) {
    if (!name) {
      continue;
    }
    let columnDataField = findHeaderByColumn(dataField);
    await dragHeaderToDropContainer(columnDataField, dropContainer);
    await new Promise(r => setTimeout(r, 20));
  }
  
  // Create a 'clear all grouping' button (❌)
  if (!btnClearGrouping) {
    btnClearGrouping = document.createElement('button');
    Object.assign(btnClearGrouping, {
      id: "btn-clear-grouping",
      title: "Fjern gruppering"
    });
    btnClearGrouping.classList.add("button-drop-container");
    btnClearGrouping.appendChild(clearIcon);
  }

  // Create an 'open group settings' button (⚙️)
  if (!btnGroupSettings) {
    btnGroupSettings = document.createElement('button');
    Object.assign(btnGroupSettings, {
      id: "btn-group-settings",
      title: "Åpne grupperingsvalg",
    });
    btnGroupSettings.classList.add("button-drop-container");
    btnGroupSettings.appendChild(settingsIcon);
  } 

  dropContainer.appendChild(btnClearGrouping);
  dropContainer.appendChild(btnGroupSettings);

  btnClearGrouping.addEventListener('click', async () => await clearGrouping());

  btnGroupSettings.addEventListener('click', () => {
    showCard();
    if (getColumnNamesFromCurrentGrouping().length == 0) {
      syncCardStateWithLocalStorage()
    } else {
      syncCardStateWithCurrentGrouping();
    }
  });
}

async function dragHeaderToDropContainer(source, target) {
  const src = source.getBoundingClientRect();
  const tgt = target.getBoundingClientRect();
  
  const steps = 10;
  
  const startX = src.left + src.width / 2;
  const startY = src.top + src.height / 2;
  const endX = tgt.left + tgt.width / 2;
  const endY = tgt.top + tgt.height / 2;

  function dispatch(type, x, y) {
    const el = document.elementFromPoint(x, y) || document;

    el.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true
    }));
  }

  // Start "dragging"
  dispatch("pointerdown", startX, startY);

  await wait(20);

  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);

    dispatch("pointermove", x, y);
  }

  // Drop to target container
  dispatch("pointerup", endX, endY);
}

async function clearGrouping() {
  while (true) {
    const btn = document.querySelector('.k-chip-remove-action');
    
    if (!btn) break;

    btn.click();
    await wait(20);
  }
}

function makeListDraggable() {
  const list = groupSettingsCard.querySelector("#list");
  let draggedItem = null;

  list.addEventListener("dragstart", (e) => {
    if (e.target.tagName !== "LI")
      return;
    draggedItem = e.target;
    e.target.classList.add("dragging");
  }
  );

  list.addEventListener("dragend", (e) => {
    e.target.classList.remove("dragging");
    draggedItem = null;
  }
  );

  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest("li");
    if (target.tagName !== "LI" || target === draggedItem)
      return;

    const rect = target.getBoundingClientRect();
    const next = (e.clientY - rect.top) / rect.height > 0.5;

    list.insertBefore(draggedItem, next ? target.nextSibling : target);
  }
  );

  list.addEventListener("drop", (e) => {
    e.preventDefault();
    draggedItem = null;
  }
  );
}

function findHeaderByColumn(column) {
  const field = document.querySelector(`th a[data-field="${column}"]`);
  return field?.closest("th") || null;
}

function showCard() {
  document.body.appendChild(groupSettingsCard);
}

function clearCard() {
  if (!columnList)
    return;
  reorderList(getColumnDetails());
  columnList.querySelectorAll("ul input[type='checkbox']").forEach(cb => cb.checked = false);
}

function closeCard() {
  groupSettingsCard.remove();
}

function getCardStateFromLocalStorage() {
  return JSON.parse(localStorage.getItem(localStorageKey) || "[]");
}

function getColumnNamesFromCurrentGrouping() {
  return [...chipList.querySelectorAll('.k-chip-label')].map(chip => chip.innerText);
}

function getColumnDetails() {
  const columnNames = [...document.querySelectorAll(`th a`)].map(a => a.innerText).filter(field => field == "" ? null : field);
  const columnDataField = [...document.querySelectorAll(`th a `)].map(a => a.dataset.field).filter(d => d == "workItemImage" ? null : d);
  
  const columnObject = columnNames.map((name, index) => ({
    name,
    dataField: columnDataField[index]
  }));

  return columnObject;
}

function getCurrentCardState() {
  return [...groupSettingsCard.querySelectorAll('ul li')].map(li => ({
    name: li.querySelector('ul li label').innerText.trim(),
    dataField: li.querySelector('input').dataset.field,
    checked: li.querySelector('input').checked
  }));
}

function saveCardStateToLocalStorage() {
  const cardState = getCurrentCardState();
  localStorage.setItem(localStorageKey, JSON.stringify(cardState));
  return;
}

function reorderList(order) {
  
  const liMap = new Map(
    [...columnList.children].map(li => {
      const input = li.querySelector('input');
      return input ? [input.dataset.field, li] : null;
    }).filter(Boolean)
  );
 
  order.forEach(input => {
    const li = liMap.get(input.dataField);
    if (li) {
      columnList.appendChild(li);
      li.querySelector('input').checked = input.checked;
      }
  });
}

function shouldShowCard() {
  // localStorage is empty or all items has checked == false
  if (getCardStateFromLocalStorage().some(c => c.checked)) {
     return false;
  }
  return true;
}

function syncCardStateWithLocalStorage() {
  const savedCardState = getCardStateFromLocalStorage();
  
  reorderList(getCardStateFromLocalStorage());
  
  savedCardState.forEach((li) => {
    const checkbox = columnList.querySelector(`input[data-field="${li.dataField}"]`);
    if (li.checked) {
      checkbox.checked = true;
    }
  });
}

function syncCardStateWithCurrentGrouping() {
  const currentGrouping = getColumnNamesFromCurrentGrouping();
  clearCard();  
  columnList.querySelectorAll('input').forEach(cb => {
    const field = cb.title;
    cb.checked = currentGrouping.includes(field);
  });
}

function applyStylingToDocument() {
  if (document.getElementById('custom-grouping-style')) {
    return;
  }
  style.id = "custom-grouping-style";
  style.textContent = `
    .card {
      background: #f4e5d1;
      border: 1px solid #5E3F17;
      border-radius: 6px;
      box-shadow: 0 6px 10px rgba(0,0,0,.4);
      font-family: sans-serif;
      position: fixed;
      padding: 10px;
      left: calc(50% - 140px);
      top: 80px;
      width: 280px;
      z-index: 99999;
    }
    
    .card-header b {
      align-items: center;
      display: flex; 
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }

    .card-footer {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-top: 10px;
    }

    .badge-container {
      display: flex;
      gap: 4px;
      justify-content: start;
      margin-top: 4px;
    }

    .badge {
      align-items: center;
      border-radius: 4px;
      cursor: default;
      display: flex;
      font-size: 1rem;
      height: 28px;
      justify-content: center;
      transition: linear 0.05s;
      width: 28px;
    }

    .badge:hover {
      background: #E8C9A1;
      font-size: 1.2rem;
    }
    
    .badge:active {
      background: transparent;
      font-size: 1rem;
    }

    .grab-icon {
      align-items: center;
      cursor: grab;
      display: flex;
      justify-content: center;
      margin-left: 4px;
      margin-right: 4px;
    }

    .grab-icon:active {
      cursor: grabbing;
    }
    
    ul {
      list-style-type: none;
      margin-top: 0px;
      margin-bottom: 0px;
      margin-left: 0;
      padding: 0;
    }
    
    input[type="checkbox"] {
      margin-right: 10px;
    }
    
    li {
      display: flex;
      flex-wrap: nowrap;
    }
    
    li:hover {
      background: #E8C9A1;
      border-radius: 2px;
      transition: ease .2s;
    }    
    
    li label {
      cursor: pointer;
      display: flex;
      width: 100%;
    }
    
    li span {
      font-size
      margin-left: 4px;
      margin-right: 4px;
    }
    
    li.dragging {
      background: #E8C9A1;
      opacity: 0.5;
    }

    .button-card-close {
      align-items: center;
      border-color: transparent;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      font-size: 12px;
      height: 28px;
      justify-content: center;
      margin-left: auto;
      width: 28px;
      transition: linear 0.1s;
    }

    .button-card-close:hover {
      font-size: 110%;
    }
    
    .button-card-footer {
      height: 32px;
      width: 100px;
    }

    .button-drop-container {
      align-items: center;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #9B0158;
      display: flex;
      height: 44px;
      justify-content: center;
      margin-left: 2px;
      margin-right: 2px;
      width: 44px;
    }

    .button-drop-container:hover {
      background-color: #FFE6F4;
    }
  `
  document.head.appendChild(style);
}
