import { createSeats, sessions, cinemaMeta } from './data.js';
import { loadState, saveState, clearState } from './storage.js';

export class CinemaBookingApp {
  constructor() {
    this.seats = createSeats();
    this.sessions = structuredClone ? structuredClone(sessions) : JSON.parse(JSON.stringify(sessions));

    const storageState = loadState();

    this.state = {
      currentSessionId: this.sessions[0].id,
      rowFilter: 'all',
      priceFilter: 'all',
      freeOnly: false,
      selectedSeatIds: [],
      bookings: Array.isArray(storageState.bookings) ? storageState.bookings : [],
      isSubmitting: false,
      storageError: storageState.storageError || ''
    };

    this.elements = this.getElements();
    this.bindEvents();
    this.renderSessionOptions();
    this.renderAll();
  }

  getElements() {
    return {
      sessionSelect: document.getElementById('session-select'),
      rowFilter: document.getElementById('row-filter'),
      priceFilter: document.getElementById('price-filter'),
      freeOnly: document.getElementById('free-only'),
      resetFiltersButton: document.getElementById('reset-filters'),
      resetDemoButton: document.getElementById('reset-demo'),
      hallGrid: document.getElementById('hall-grid'),
      seatList: document.getElementById('seat-list'),
      listEmpty: document.getElementById('list-empty'),
      bookingsList: document.getElementById('bookings-list'),
      bookingsEmpty: document.getElementById('bookings-empty'),
      appMessage: document.getElementById('app-message'),
      storageMessage: document.getElementById('storage-message'),
      bookingForm: document.getElementById('booking-form'),
      viewerName: document.getElementById('viewer-name'),
      viewerEmail: document.getElementById('viewer-email'),
      nameError: document.getElementById('name-error'),
      emailError: document.getElementById('email-error'),
      selectionError: document.getElementById('selection-error'),
      summaryMovie: document.getElementById('summary-movie'),
      summarySession: document.getElementById('summary-session'),
      summarySeats: document.getElementById('summary-seats'),
      summaryCount: document.getElementById('summary-count'),
      summaryTotal: document.getElementById('summary-total'),
      confirmButton: document.getElementById('confirm-booking')
    };
  }

  bindEvents() {
    this.elements.sessionSelect.addEventListener('change', () => {
      this.state.currentSessionId = this.elements.sessionSelect.value;
      this.clearSelection();
      this.clearMessages();
      this.renderAll();
    });

    this.elements.rowFilter.addEventListener('change', () => {
      this.state.rowFilter = this.elements.rowFilter.value;
      this.handleFilterChange();
    });

    this.elements.priceFilter.addEventListener('change', () => {
      this.state.priceFilter = this.elements.priceFilter.value;
      this.handleFilterChange();
    });

    this.elements.freeOnly.addEventListener('change', () => {
      this.state.freeOnly = this.elements.freeOnly.checked;
      this.handleFilterChange();
    });

    this.elements.resetFiltersButton.addEventListener('click', () => {
      this.state.rowFilter = 'all';
      this.state.priceFilter = 'all';
      this.state.freeOnly = false;
      this.elements.rowFilter.value = 'all';
      this.elements.priceFilter.value = 'all';
      this.elements.freeOnly.checked = false;
      this.handleFilterChange('Фильтры сброшены.');
    });

    this.elements.resetDemoButton.addEventListener('click', () => {
      const approved = window.confirm('Сбросить все учебные брони и вернуть демо к начальному состоянию?');
      if (!approved) return;

      this.state.bookings = [];
      this.clearSelection();
      this.elements.bookingForm.reset();
      this.clearFieldErrors();
      const result = clearState();
      if (!result.ok) {
        this.state.storageError = result.message;
      } else {
        this.state.storageError = '';
      }
      this.setMessage('Учебное демо сброшено.');
      this.renderAll();
    });

    this.elements.hallGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-seat-id]');
      if (!button) return;
      this.toggleSeat(button.dataset.seatId);
    });

    this.elements.seatList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-seat-id]');
      if (!button) return;
      this.toggleSeat(button.dataset.seatId);
    });

    this.elements.bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.confirmBooking();
    });

    this.elements.bookingsList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cancel-booking-id]');
      if (!button) return;
      this.cancelBooking(button.dataset.cancelBookingId);
    });
  }

  renderSessionOptions() {
    this.elements.sessionSelect.innerHTML = this.sessions
      .map((session) => `<option value="${session.id}">${session.movieTitle} — ${session.dateLabel}, ${session.time}</option>`)
      .join('');
  }

  getCurrentSession() {
    return this.sessions.find((session) => session.id === this.state.currentSessionId) || this.sessions[0];
  }

  getOccupiedSeatIdsForSession(sessionId) {
    const baseSession = this.sessions.find((session) => session.id === sessionId);
    const bookedIds = this.state.bookings
      .filter((booking) => booking.sessionId === sessionId)
      .flatMap((booking) => booking.seatIds);

    return new Set([...(baseSession?.occupiedSeatIds || []), ...bookedIds]);
  }

  getFilteredSeats() {
    const occupied = this.getOccupiedSeatIdsForSession(this.state.currentSessionId);

    return this.seats.filter((seat) => {
      const rowMatches = this.state.rowFilter === 'all' ? true : seat.row === this.state.rowFilter;
      const priceMatches = this.state.priceFilter === 'all' ? true : seat.price <= Number(this.state.priceFilter);
      const freeMatches = this.state.freeOnly ? !occupied.has(seat.id) : true;
      return rowMatches && priceMatches && freeMatches;
    });
  }

  handleFilterChange(optionalMessage = '') {
    const filteredSeatIds = new Set(this.getFilteredSeats().map((seat) => seat.id));
    const beforeCount = this.state.selectedSeatIds.length;
    this.state.selectedSeatIds = this.state.selectedSeatIds.filter((id) => filteredSeatIds.has(id));

    if (beforeCount !== this.state.selectedSeatIds.length) {
      this.setMessage('Часть выбранных мест снята из выбора, потому что не соответствует фильтрам.');
    } else if (optionalMessage) {
      this.setMessage(optionalMessage);
    } else {
      this.clearMessages();
    }

    this.clearFieldErrors();
    this.renderAll();
  }

  toggleSeat(seatId) {
    const occupied = this.getOccupiedSeatIdsForSession(this.state.currentSessionId);
    const filteredSeatIds = new Set(this.getFilteredSeats().map((seat) => seat.id));

    if (occupied.has(seatId) || !filteredSeatIds.has(seatId)) {
      return;
    }

    if (this.state.selectedSeatIds.includes(seatId)) {
      this.state.selectedSeatIds = this.state.selectedSeatIds.filter((id) => id !== seatId);
    } else {
      this.state.selectedSeatIds = [...this.state.selectedSeatIds, seatId].sort(this.sortSeatIds);
    }

    this.clearFieldErrors();
    this.renderAll();
  }

  sortSeatIds(a, b) {
    const [rowA, rowB] = [a[0], b[0]];
    if (rowA === rowB) return Number(a.slice(1)) - Number(b.slice(1));
    return rowA.localeCompare(rowB);
  }

  clearSelection() {
    this.state.selectedSeatIds = [];
  }

  validateBookingForm() {
    const name = this.elements.viewerName.value.trim();
    const email = this.elements.viewerEmail.value.trim();
    let valid = true;

    this.clearFieldErrors();

    if (!this.state.selectedSeatIds.length) {
      this.elements.selectionError.textContent = 'Выберите хотя бы одно свободное место на схеме или в списке.';
      valid = false;
    }

    if (name.length < 2) {
      this.elements.nameError.textContent = 'Укажите имя не короче 2 символов.';
      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.elements.emailError.textContent = 'Введите корректный e-mail.';
      valid = false;
    }

    return valid;
  }

  confirmBooking() {
    if (this.state.isSubmitting) {
      return;
    }

    if (!this.validateBookingForm()) {
      return;
    }

    this.state.isSubmitting = true;
    this.elements.confirmButton.disabled = true;

    const currentSession = this.getCurrentSession();
    const selectedSeats = this.getSelectedSeats();
    const bookingId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

    const booking = {
      id: bookingId,
      movieTitle: currentSession.movieTitle,
      sessionId: currentSession.id,
      sessionLabel: `${currentSession.dateLabel}, ${currentSession.time}`,
      hallName: currentSession.hallName,
      viewerName: this.elements.viewerName.value.trim(),
      viewerEmail: this.elements.viewerEmail.value.trim(),
      seatIds: selectedSeats.map((seat) => seat.id),
      seatLabels: selectedSeats.map((seat) => seat.label),
      total,
      createdAt: new Date().toLocaleString('ru-RU')
    };

    this.state.bookings = [booking, ...this.state.bookings];

    const saveResult = saveState({ bookings: this.state.bookings });
    if (!saveResult.ok) {
      this.state.storageError = saveResult.message;
    } else {
      this.state.storageError = '';
    }

    this.elements.bookingForm.reset();
    this.clearSelection();
    this.state.isSubmitting = false;
    this.elements.confirmButton.disabled = false;
    this.setMessage(`Учебный билет ${bookingId} создан.`);
    this.renderAll();
  }

  cancelBooking(bookingId) {
    const booking = this.state.bookings.find((item) => item.id === bookingId);
    if (!booking) return;

    const approved = window.confirm(`Отменить билет ${booking.id} на места ${booking.seatLabels.join(', ')}?`);
    if (!approved) return;

    this.state.bookings = this.state.bookings.filter((item) => item.id !== bookingId);

    const saveResult = saveState({ bookings: this.state.bookings });
    if (!saveResult.ok) {
      this.state.storageError = saveResult.message;
    } else {
      this.state.storageError = '';
    }

    this.setMessage(`Билет ${booking.id} отменён, места снова свободны.`);
    this.renderAll();
  }

  getSelectedSeats() {
    return this.seats
      .filter((seat) => this.state.selectedSeatIds.includes(seat.id))
      .sort((a, b) => this.sortSeatIds(a.id, b.id));
  }

  formatPrice(value) {
    return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
  }

  renderHall() {
    const occupied = this.getOccupiedSeatIdsForSession(this.state.currentSessionId);
    const filteredSeatIds = new Set(this.getFilteredSeats().map((seat) => seat.id));

    this.elements.hallGrid.innerHTML = this.seats.map((seat) => {
      const isOccupied = occupied.has(seat.id);
      const isSelected = this.state.selectedSeatIds.includes(seat.id);
      const isFilteredOut = !filteredSeatIds.has(seat.id);
      const statusText = isOccupied ? 'Занято' : isSelected ? 'Выбрано' : 'Свободно';
      const className = [
        'seat-button',
        isOccupied ? 'is-occupied' : '',
        isSelected ? 'is-selected' : '',
        isFilteredOut ? 'is-filtered-out' : ''
      ].filter(Boolean).join(' ');

      return `
        <button
          type="button"
          class="${className}"
          data-seat-id="${seat.id}"
          ${isOccupied ? 'disabled aria-disabled="true"' : ''}
          aria-pressed="${isSelected ? 'true' : 'false'}"
          aria-label="Место ${seat.label}, ${seat.zone}, ${this.formatPrice(seat.price)}, ${statusText}"
        >
          <span class="seat-button__name">${seat.label}</span>
          <span class="seat-button__meta">${seat.zone} · ${this.formatPrice(seat.price)}</span>
          <span class="seat-button__status">${statusText}</span>
        </button>
      `;
    }).join('');
  }

  renderSeatList() {
    const filteredSeats = this.getFilteredSeats();
    const occupied = this.getOccupiedSeatIdsForSession(this.state.currentSessionId);

    if (!filteredSeats.length) {
      this.elements.seatList.innerHTML = '';
      this.elements.listEmpty.hidden = false;
      return;
    }

    this.elements.listEmpty.hidden = true;
    this.elements.seatList.innerHTML = filteredSeats.map((seat) => {
      const isOccupied = occupied.has(seat.id);
      const isSelected = this.state.selectedSeatIds.includes(seat.id);
      const statusText = isOccupied ? 'Занято' : isSelected ? 'Выбрано' : 'Свободно';

      return `
        <button
          type="button"
          class="seat-list-button ${isOccupied ? 'is-occupied' : ''} ${isSelected ? 'is-selected' : ''}"
          data-seat-id="${seat.id}"
          ${isOccupied ? 'disabled aria-disabled="true"' : ''}
          aria-pressed="${isSelected ? 'true' : 'false'}"
        >
          <div class="seat-list-button__top">
            <span class="seat-list-button__title">Место ${seat.label}</span>
            <span class="seat-list-button__price">${this.formatPrice(seat.price)}</span>
          </div>
          <div class="seat-list-button__bottom">
            <span>${seat.zone} · Ряд ${seat.row}</span>
            <span>${statusText}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  renderSummary() {
    const session = this.getCurrentSession();
    const selectedSeats = this.getSelectedSeats();
    const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

    this.elements.summaryMovie.textContent = session.movieTitle;
    this.elements.summarySession.textContent = `${session.dateLabel}, ${session.time}`;
    this.elements.summarySeats.textContent = selectedSeats.length ? selectedSeats.map((seat) => seat.label).join(', ') : 'Не выбраны';
    this.elements.summaryCount.textContent = String(selectedSeats.length);
    this.elements.summaryTotal.textContent = this.formatPrice(total);
  }

  renderBookings() {
    if (!this.state.bookings.length) {
      this.elements.bookingsList.innerHTML = '';
      this.elements.bookingsEmpty.hidden = false;
      return;
    }

    this.elements.bookingsEmpty.hidden = true;
    this.elements.bookingsList.innerHTML = this.state.bookings.map((booking) => `
      <article class="booking-card">
        <div class="booking-card__head">
          <div>
            <p class="booking-card__code">${booking.id}</p>
            <h3 class="booking-card__title">${booking.movieTitle}</h3>
          </div>
          <button type="button" class="booking-card__cancel" data-cancel-booking-id="${booking.id}">Отменить</button>
        </div>
        <div class="booking-card__meta">
          <div><strong>Сеанс:</strong> ${booking.sessionLabel}</div>
          <div><strong>Места:</strong> ${booking.seatLabels.join(', ')}</div>
          <div><strong>Имя:</strong> ${booking.viewerName}</div>
          <div><strong>E-mail:</strong> ${booking.viewerEmail}</div>
          <div><strong>Стоимость:</strong> ${this.formatPrice(booking.total)}</div>
          <div><strong>Создано:</strong> ${booking.createdAt}</div>
        </div>
      </article>
    `).join('');
  }

  renderStorageError() {
    this.elements.storageMessage.textContent = this.state.storageError || '';
  }

  renderAll() {
    this.elements.sessionSelect.value = this.state.currentSessionId;
    this.renderHall();
    this.renderSeatList();
    this.renderSummary();
    this.renderBookings();
    this.renderStorageError();
  }

  clearFieldErrors() {
    this.elements.nameError.textContent = '';
    this.elements.emailError.textContent = '';
    this.elements.selectionError.textContent = '';
  }

  setMessage(message) {
    this.elements.appMessage.textContent = message;
  }

  clearMessages() {
    this.elements.appMessage.textContent = '';
  }
}
