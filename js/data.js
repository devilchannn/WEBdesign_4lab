export const APP_STORAGE_KEY = 'frame-cinema-demo-v1';

export const cinemaMeta = {
  name: 'FRAME CINEMA',
  movieTitle: 'Midnight Archive',
  hallName: 'Hall 01'
};

export function createSeats() {
  const rowDefinitions = [
    { row: 'A', price: 900, zone: 'Premium' },
    { row: 'B', price: 900, zone: 'Premium' },
    { row: 'C', price: 750, zone: 'Standard' },
    { row: 'D', price: 650, zone: 'Standard' }
  ];

  const seats = [];

  rowDefinitions.forEach((rowData) => {
    for (let number = 1; number <= 6; number += 1) {
      seats.push({
        id: `${rowData.row}${number}`,
        label: `${rowData.row}${number}`,
        row: rowData.row,
        number,
        price: rowData.price,
        zone: rowData.zone
      });
    }
  });

  return seats;
}

export const sessions = [
  {
    id: 'session-1830',
    time: '18:30',
    dateLabel: 'Сегодня',
    movieTitle: cinemaMeta.movieTitle,
    hallName: cinemaMeta.hallName,
    occupiedSeatIds: ['A2', 'A5', 'B3', 'C1', 'D6']
  },
  {
    id: 'session-2115',
    time: '21:15',
    dateLabel: 'Сегодня',
    movieTitle: cinemaMeta.movieTitle,
    hallName: cinemaMeta.hallName,
    occupiedSeatIds: ['A1', 'B2', 'B6', 'C4', 'D3', 'D4']
  }
];
