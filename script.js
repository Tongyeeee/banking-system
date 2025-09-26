// Simple mocked banking front-end with local persistence

// --- Utilities ---
const $ = (sel) => document.querySelector(sel)
const formatCurrency = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
const nowISO = () => new Date().toISOString()

function showToast(message) {
  const toast = $('#toast')
  toast.textContent = message
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2300)
}

// --- Mocked Bank Store (in-memory + localStorage) ---
const STORAGE_KEY = 'mini-bank-state-v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to parse saved state', e)
    return null
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function seedState() {
  const state = {
    accounts: {
      '1001': { id: '1001', name: 'Alice Johnson', pin: '1111', balance: 1200.5, transactions: [] },
      '1002': { id: '1002', name: 'Bob Smith', pin: '2222', balance: 800.0, transactions: [] },
      '1003': { id: '1003', name: 'Charlie Lee', pin: '3333', balance: 2300.25, transactions: [] }
    },
    session: { currentAccountId: null },
  }
  // Seed transactions
  Object.values(state.accounts).forEach(acc => {
    acc.transactions.push({ id: crypto.randomUUID(), type: 'seed', amount: 100, date: nowISO(), details: 'Welcome bonus' })
  })
  saveState(state)
  return state
}

const Bank = {
  _state: null,

  init() {
    this._state = loadState() || seedState()
  },

  getState() { return this._state },

  createAccount(name, pin, initialDeposit = 0) {
    const trimmedName = String(name || '').trim()
    const pinStr = String(pin || '').trim()
    const depositNum = Number(initialDeposit || 0)

    if (trimmedName.length < 2) throw new Error('Name must be at least 2 characters')
    if (!/^\d{4}$/.test(pinStr)) throw new Error('PIN must be 4 digits')
    if (depositNum < 0) throw new Error('Initial deposit cannot be negative')

    // Generate next numeric ID
    const ids = Object.keys(this._state.accounts).map(id => Number(id)).filter(n => Number.isFinite(n))
    const nextId = String((ids.length ? Math.max(...ids) : 1000) + 1)

    const account = {
      id: nextId,
      name: trimmedName,
      pin: pinStr,
      balance: 0,
      transactions: []
    }

    if (depositNum > 0) {
      account.balance += depositNum
      account.transactions.unshift({ id: crypto.randomUUID(), type: 'deposit', amount: depositNum, date: nowISO(), details: 'Initial deposit' })
    }

    this._state.accounts[nextId] = account
    this._state.session.currentAccountId = nextId
    saveState(this._state)
    return nextId
  },

  login(accountId, pin) {
    const acc = this._state.accounts[accountId]
    if (!acc || acc.pin !== pin) return false
    this._state.session.currentAccountId = accountId
    saveState(this._state)
    return true
  },

  logout() {
    this._state.session.currentAccountId = null
    saveState(this._state)
  },

  currentAccount() {
    const id = this._state.session.currentAccountId
    if (!id) return null
    return this._state.accounts[id]
  },

  deposit(amount) {
    if (amount <= 0) throw new Error('Amount must be positive')
    const acc = this.currentAccount()
    if (!acc) throw new Error('Not logged in')
    acc.balance += amount
    acc.transactions.unshift({ id: crypto.randomUUID(), type: 'deposit', amount, date: nowISO(), details: 'Cash deposit' })
    saveState(this._state)
  },

  withdraw(amount) {
    if (amount <= 0) throw new Error('Amount must be positive')
    const acc = this.currentAccount()
    if (!acc) throw new Error('Not logged in')
    if (acc.balance < amount) throw new Error('Insufficient funds')
    acc.balance -= amount
    acc.transactions.unshift({ id: crypto.randomUUID(), type: 'withdraw', amount, date: nowISO(), details: 'Cash withdrawal' })
    saveState(this._state)
  },

  transfer(targetId, amount) {
    if (amount <= 0) throw new Error('Amount must be positive')
    const from = this.currentAccount()
    if (!from) throw new Error('Not logged in')
    if (from.id === targetId) throw new Error('Cannot transfer to the same account')
    const to = this._state.accounts[targetId]
    if (!to) throw new Error('Target account not found')
    if (from.balance < amount) throw new Error('Insufficient funds')

    from.balance -= amount
    to.balance += amount

    const date = nowISO()
    from.transactions.unshift({ id: crypto.randomUUID(), type: 'transfer-out', amount, date, details: `To ${to.name} (${to.id})` })
    to.transactions.unshift({ id: crypto.randomUUID(), type: 'transfer-in', amount, date, details: `From ${from.name} (${from.id})` })
    saveState(this._state)
  }
}

// --- UI Logic ---
function renderDashboard() {
  const acc = Bank.currentAccount()
  if (!acc) return
  $('#accountName').textContent = acc.name
  $('#accountIdDisplay').textContent = `ID: ${acc.id}`
  $('#balanceDisplay').textContent = formatCurrency(acc.balance)
  $('#lastUpdated').textContent = new Date().toLocaleString()

  const tbody = $('#txTableBody')
  tbody.innerHTML = ''
  acc.transactions
    .slice(0, 50)
    .forEach(tx => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td class="py-2 pr-4 whitespace-nowrap">${new Date(tx.date).toLocaleString()}</td>
        <td class="py-2 pr-4">${tx.type}</td>
        <td class="py-2 pr-4">${formatCurrency(tx.amount)}</td>
        <td class="py-2 pr-4">${tx.details || ''}</td>
      `
      tbody.appendChild(tr)
    })
}

function showSection(section) {
  const login = $('#loginSection')
  const dash = $('#dashboardSection')
  const logoutBtn = $('#logoutBtn')
  if (section === 'login') {
    login.classList.remove('hidden')
    dash.classList.add('hidden')
    logoutBtn.classList.add('hidden')
  } else {
    login.classList.add('hidden')
    dash.classList.remove('hidden')
    logoutBtn.classList.remove('hidden')
  }
}

// Modal helpers
function openModal(title, fields, onSubmit) {
  $('#modalTitle').textContent = title
  const container = $('#modalFieldContainer')
  container.innerHTML = ''
  fields.forEach(f => {
    const wrap = document.createElement('div')
    const id = `field-${f.name}`
    wrap.innerHTML = `
      <label for="${id}" class="block text-sm mb-1">${f.label}</label>
      <input id="${id}" name="${f.name}" type="${f.type || 'text'}" inputmode="${f.inputmode || ''}" step="${f.step || 'any'}" min="${f.min ?? ''}"
        class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="${f.placeholder || ''}" ${f.required === false ? '' : 'required'}>
    `
    container.appendChild(wrap)
  })

  const modal = $('#modalRoot')
  modal.classList.add('show')
  modal.classList.remove('hidden')

  const form = $('#modalForm')
  const handler = (e) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(form).entries())
    try {
      onSubmit(data)
      closeModal()
    } catch (err) {
      alert(err.message)
    }
  }
  form.addEventListener('submit', handler, { once: true })
}

function closeModal() {
  const modal = $('#modalRoot')
  modal.classList.add('hidden')
  modal.classList.remove('show')
}

// Event wiring
function wireEvents() {
  // Login
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const accountId = form.accountId.value.trim()
    const pin = form.pin.value.trim()
    const ok = Bank.login(accountId, pin)
    if (!ok) {
      $('#loginError').classList.remove('hidden')
      return
    }
    $('#loginError').classList.add('hidden')
    showSection('dashboard')
    renderDashboard()
    showToast('Logged in')
  })

  // Create account
  $('#createAccountBtn').addEventListener('click', () => {
    openModal('Create account', [
      { name: 'name', label: 'Full name', type: 'text', placeholder: 'e.g., Dana Green' },
      { name: 'pin', label: 'Choose a 4-digit PIN', type: 'password', inputmode: 'numeric', placeholder: 'e.g., 1234' },
      { name: 'initial', label: 'Initial deposit (optional)', type: 'number', step: '0.01', min: '0', inputmode: 'decimal', placeholder: 'e.g., 50.00', required: false }
    ], ({ name, pin, initial }) => {
      const newId = Bank.createAccount(name, pin, initial ? Number(initial) : 0)
      showSection('dashboard')
      renderDashboard()
      showToast(`Account ${newId} created`)
    })
  })

  // Logout
  $('#logoutBtn').addEventListener('click', () => {
    Bank.logout()
    showSection('login')
    showToast('Logged out')
  })

  // Actions: deposit, withdraw, transfer
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action
      if (action === 'deposit') {
        openModal('Deposit', [
          { name: 'amount', label: 'Amount', type: 'number', step: '0.01', min: '0.01', inputmode: 'decimal', placeholder: 'e.g., 100.00' }
        ], ({ amount }) => {
          const num = Number(amount)
          Bank.deposit(num)
          renderDashboard()
          showToast('Deposit successful')
        })
      } else if (action === 'withdraw') {
        openModal('Withdraw', [
          { name: 'amount', label: 'Amount', type: 'number', step: '0.01', min: '0.01', inputmode: 'decimal', placeholder: 'e.g., 50.00' }
        ], ({ amount }) => {
          const num = Number(amount)
          Bank.withdraw(num)
          renderDashboard()
          showToast('Withdrawal successful')
        })
      } else if (action === 'transfer') {
        openModal('Transfer', [
          { name: 'targetId', label: 'Target Account ID', type: 'text', inputmode: 'numeric', placeholder: 'e.g., 1002' },
          { name: 'amount', label: 'Amount', type: 'number', step: '0.01', min: '0.01', inputmode: 'decimal', placeholder: 'e.g., 25.00' }
        ], ({ targetId, amount }) => {
          const num = Number(amount)
          Bank.transfer(String(targetId).trim(), num)
          renderDashboard()
          showToast('Transfer successful')
        })
      }
    })
  })

  // Modal close
  $('#modalClose').addEventListener('click', closeModal)
  $('#modalRoot').addEventListener('click', (e) => {
    if (e.target === $('#modalRoot')) closeModal()
  })
}

function boot() {
  Bank.init()
  wireEvents()
  if (Bank.currentAccount()) {
    showSection('dashboard')
    renderDashboard()
  } else {
    showSection('login')
  }
}

document.addEventListener('DOMContentLoaded', boot)


