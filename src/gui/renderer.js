import { ipcRenderer } from 'electron';

const state = {
  token: '',
  clientId: '',
  guildIds: [],
  audioDir: '',
  guildSummaries: [],
  botOnline: false
};

const refs = {
  tokenInput: document.getElementById('tokenInput'),
  clientIdInput: document.getElementById('clientIdInput'),
  guildInput: document.getElementById('guildInput'),
  guildChipContainer: document.getElementById('guildChipContainer'),
  folderPath: document.getElementById('folderPath'),
  saveBtn: document.getElementById('saveSettings'),
  refreshBtn: document.getElementById('refreshGuilds'),
  launchBtn: document.getElementById('launchBot'),
  stopBtn: document.getElementById('stopBot'),
  logPane: document.getElementById('log'),
  guildTableBody: document.getElementById('guildTableBody'),
  statusIndicator: document.getElementById('statusIndicator')
};

function renderStatus() {
  const dot = state.botOnline ? 'online' : 'offline';
  const text = state.botOnline ? 'Bot running' : 'Bot offline';
  refs.statusIndicator.innerHTML = `<span class="status-dot ${dot}"></span> ${text}`;
}

function renderChips() {
  refs.guildChipContainer.innerHTML = '';
  if (state.guildIds.length === 0) {
    const empty = document.createElement('span');
    empty.style.color = 'var(--text-muted)';
    empty.textContent = 'No guild IDs registered yet.';
    refs.guildChipContainer.appendChild(empty);
    return;
  }

  state.guildIds.forEach((id) => {
    const chip = document.createElement('div');
    chip.className = 'guild-chip';
    chip.innerHTML = `<span>${id}</span>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Remove guild ${id}`);
    btn.textContent = '✕';
    btn.addEventListener('click', () => {
      state.guildIds = state.guildIds.filter((gid) => gid !== id);
      renderChips();
    });
    chip.appendChild(btn);
    refs.guildChipContainer.appendChild(chip);
  });
}

function renderFolder() {
  refs.folderPath.textContent = state.audioDir || 'Not set';
}

function renderGuildTable() {
  refs.guildTableBody.innerHTML = '';
  if (!state.guildSummaries.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.style.textAlign = 'center';
    cell.style.padding = '24px';
    cell.style.color = 'var(--text-muted)';
    cell.textContent = 'No data yet. Refresh to load.';
    row.appendChild(cell);
    refs.guildTableBody.appendChild(row);
    return;
  }

  for (const guild of state.guildSummaries) {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.innerHTML = `<strong>${guild.name}</strong><br /><small style="color: var(--text-muted)">${guild.id}</small>`;
    row.appendChild(nameCell);

    const statusCell = document.createElement('td');
    const tagClass = guild.inGuild ? 'tag' : 'tag';
    const statusText = guild.inGuild ? 'Joined' : 'Not in guild';
    statusCell.innerHTML = `<span class="${tagClass}">${statusText}</span>`;
    row.appendChild(statusCell);

    const consentCell = document.createElement('td');
    const consenting = guild.consenting || [];
    if (!consenting.length) {
      consentCell.innerHTML = '<span class="consent-empty">No recorded consents.</span>';
    } else {
      const list = document.createElement('div');
      list.className = 'consent-list';
      consenting.forEach((member) => {
        const span = document.createElement('span');
        const name = member.tag || member.id;
        const updated = new Date(member.updatedAt).toLocaleString();
        span.textContent = `${name} • last updated ${updated}`;
        list.appendChild(span);
      });
      consentCell.appendChild(list);
    }
    row.appendChild(consentCell);

    refs.guildTableBody.appendChild(row);
  }
}

function appendLog(message) {
  refs.logPane.textContent += message;
  if (refs.logPane.textContent.length > 32000) {
    refs.logPane.textContent = refs.logPane.textContent.slice(-32000);
  }
  refs.logPane.scrollTop = refs.logPane.scrollHeight;

  if (/Bot exited/i.test(message)) {
    state.botOnline = false;
    renderStatus();
  } else if (/Starting bot process|Logged in as/i.test(message)) {
    state.botOnline = true;
    renderStatus();
  }
}

async function loadInitial() {
  const settings = await ipcRenderer.invoke('load-settings');
  if (settings) {
    state.token = settings.token || '';
    state.clientId = settings.clientId || '';
    state.guildIds = Array.isArray(settings.guildIds) ? settings.guildIds : [];
    state.audioDir = settings.audioDir || '';
  }

  refs.tokenInput.value = state.token;
  refs.clientIdInput.value = state.clientId;
  renderChips();
  renderFolder();
  renderGuildTable();
  renderStatus();

  if (!state.token) {
    appendLog('[Setup] Bot token is not configured.\n');
    }

refs.tokenInput.addEventListener('input', (e) => {
  state.token = e.target.value.trim();
});

refs.clientIdInput.addEventListener('input', (e) => {
  state.clientId = e.target.value.trim();
});

function addGuildId() {
  const value = refs.guildInput.value.trim();
  if (!value) return;
  if (!state.guildIds.includes(value)) {
    state.guildIds.push(value);
    renderChips();
  }
  refs.guildInput.value = '';
}

document.getElementById('addGuild').addEventListener('click', addGuildId);
refs.guildInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addGuildId();
  }
});

document.getElementById('chooseFolder').addEventListener('click', async () => {
  const dir = await ipcRenderer.invoke('choose-recording-folder', state.audioDir);
  if (dir) {
    state.audioDir = dir;
    renderFolder();
    appendLog(`[Setup] Recording folder set to ${dir}\n`);
  }
});

document.getElementById('openFolder').addEventListener('click', async () => {
  const dir = await ipcRenderer.invoke('open-folder');
  if (dir) appendLog(`[Info] Opened folder ${dir}\n`);
});

refs.saveBtn.addEventListener('click', async () => {
  const saved = await ipcRenderer.invoke('save-settings', {
    token: state.token,
    clientId: state.clientId,
    guildIds: state.guildIds,
    audioDir: state.audioDir
  });
  state.token = saved.token;
  state.clientId = saved.clientId;
  state.guildIds = saved.guildIds;
  state.audioDir = saved.audioDir;
  renderChips();
  renderFolder();
  appendLog('[Setup] Settings saved successfully.\n');
});

refs.refreshBtn.addEventListener('click', async () => {
  refs.refreshBtn.disabled = true;
  appendLog('[Info] Fetching guild overview...\n');
  try {
    const response = await ipcRenderer.invoke('fetch-guilds', state.token);
    state.guildSummaries = response?.entries || [];
    if (response?.warnings?.length) {
      response.warnings.forEach((w) => appendLog(`[Warn] ${w}\n`));
    }
    renderGuildTable();
    appendLog(`[Info] Retrieved ${state.guildSummaries.length} guild entries.\n`);
  } catch (err) {
    appendLog(`[Error] Failed to fetch guilds: ${err.message || err}\n`);
  } finally {
    refs.refreshBtn.disabled = false;
  }
});

refs.launchBtn.addEventListener('click', () => {
  ipcRenderer.send('launch-bot');
  appendLog('[Control] Launch command sent.\n');
});

refs.stopBtn.addEventListener('click', () => {
  ipcRenderer.send('stop-bot');
  appendLog('[Control] Stop command sent.\n');
});

ipcRenderer.on('log', (_, msg) => {
  appendLog(msg);
});

loadInitial();
}