import { APP_STORAGE_KEY } from './data.js';

export function loadState() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) {
      return { bookings: [] };
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.bookings)) {
      throw new Error('Повреждённый формат данных.');
    }

    return {
      bookings: parsed.bookings
    };
  } catch (error) {
    return {
      bookings: [],
      storageError: 'Не удалось прочитать сохранённые брони. Хранилище будет запущено с чистого состояния.'
    };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: 'Не удалось сохранить брони в localStorage. Возможно, хранилище недоступно.'
    };
  }
}

export function clearState() {
  try {
    localStorage.removeItem(APP_STORAGE_KEY);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: 'Не удалось очистить сохранённые данные демо.'
    };
  }
}
