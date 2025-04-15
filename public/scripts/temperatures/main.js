let allReadings = [];
let selectedDeviceId = 'all';

function showLoading() {
  document.getElementById('loadingData').classList.remove('d-none');
  document.getElementById('noData').classList.add('d-none');
}

function hideLoading() {
  document.getElementById('loadingData').classList.add('d-none');
}

async function fetchReadingsByWeek(year, month, week) {
  showLoading();
  try {
    const response = await fetch(`/temperatures/readings?year=${year}&month=${month}&week=${week}`);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    hideLoading();
    return data;
  } catch (error) {
    console.error('Error al obtener los datos:', error);
    hideLoading();
    return { stats: {}, readings: [] };
  }
}

async function fetchDevices() {
  try {
    const response = await fetch('/api/devices');
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('Error al obtener los dispositivos:', error);
    return [];
  }
}

async function updateDeviceSelector() {
  const deviceSelect = document.getElementById('deviceSelect');
  const devices = await fetchDevices();
  deviceSelect.innerHTML = '<option value="all">Todos</option>';
  devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device;
    option.textContent = device;
    deviceSelect.appendChild(option);
  });
}

function filterByDevice(readings, deviceId) {
  return deviceId === 'all' ? readings : readings.filter(r => r.device_id === deviceId);
}

function updateMeasurementsTable(data) {
  const tableBody = document.getElementById('measurementsTable');
  const noDataDiv = document.getElementById('noData');
  const printBtn = document.getElementById('printReportBtn');

  allReadings = data.readings || [];
  const filteredReadings = filterByDevice(allReadings, selectedDeviceId);

  tableBody.innerHTML = '';

  if (filteredReadings.length === 0) {
    noDataDiv.classList.remove('d-none');
    document.getElementById('avgTemp').textContent = '--';
    document.getElementById('avgHum').textContent = '--';
    document.getElementById('totalMeasurements').textContent = '--';
    document.getElementById('periodDates').textContent = '--';
    printBtn.classList.add('d-none');
    return;
  }

  noDataDiv.classList.add('d-none');

  const stats = data.stats || {};
  document.getElementById('avgTemp').textContent = stats.avgTemperature || '--';
  document.getElementById('avgHum').textContent = stats.avgHumidity || '--';
  document.getElementById('totalMeasurements').textContent = stats.total || '--';
  document.getElementById('periodDates').textContent =
    stats.startDate && stats.endDate
      ? `${formatDate(stats.startDate)} - ${formatDate(stats.endDate)}`
      : '--';

  printBtn.classList.remove('d-none');
  printBtn.dataset.year = stats.startDate.split('-')[0];
  printBtn.dataset.month = parseInt(stats.startDate.split('-')[1]);
  printBtn.dataset.week = document.getElementById('week').value;

  filteredReadings.forEach(item => {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.setAttribute('data-id', item._id);
    row.innerHTML = `
      <td>${item.device_id}</td>
      <td>${item.temperature.toFixed(1)} °C</td>
      <td>${item.humidity} %</td>
      <td>${formatDateTime(item.timestamp)}</td>
    `;
    row.addEventListener('click', () => showMeasurementDetails(item));
    tableBody.appendChild(row);
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES');
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('es-ES');
}

function showMeasurementDetails(measurement) {
  const modalBody = document.getElementById('detailModalBody');
  modalBody.innerHTML = `
    <div class="card mb-3 bg-sensor">
      <div class="card-body">
        <h6 class="card-subtitle mb-2 text-muted">ID del Dispositivo</h6>
        <p class="card-text fs-5">${measurement.device_id}</p>
      </div>
    </div>
    <div class="row">
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-body text-center">
            <h6 class="card-subtitle mb-2 text-muted">Temperatura</h6>
            <p class="card-text display-6">${measurement.temperature.toFixed(1)} <small class="text-muted">°C</small></p>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-body text-center">
            <h6 class="card-subtitle mb-2 text-muted">Humedad</h6>
            <p class="card-text display-6">${measurement.humidity} <small class="text-muted">%</small></p>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-body">
        <h6 class="card-subtitle mb-2 text-muted">Información Temporal</h6>
        <table class="table table-sm">
          <tr><th>Timestamp</th><td>${measurement.timestamp}</td></tr>
          <tr><th>Fecha</th><td>${measurement.year}-${String(measurement.month).padStart(2, '0')}-${String(measurement.day).padStart(2, '0')}</td></tr>
          <tr><th>Hora</th><td>${String(measurement.hour).padStart(2, '0')}:${String(measurement.minute).padStart(2, '0')}</td></tr>
          <tr><th>ID</th><td><small class="text-muted">${measurement._id}</small></td></tr>
        </table>
      </div>
    </div>
  `;
  const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
  detailModal.show();
}

document.getElementById('filterForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const year = parseInt(document.getElementById('year').value);
  const month = parseInt(document.getElementById('month').value);
  const weekNumber = parseInt(document.getElementById('week').value);
  const data = await fetchReadingsByWeek(year, month, weekNumber);
  updateMeasurementsTable(data);
});

document.getElementById('deviceSelect').addEventListener('change', function (e) {
  selectedDeviceId = e.target.value;
  updateMeasurementsTable({ readings: allReadings, stats: {} });
});

document.getElementById('printReportBtn').addEventListener('click', function () {
  const year = this.dataset.year;
  const month = this.dataset.month;
  const week = this.dataset.week;
  window.open(`/temperatures/report?year=${year}&month=${month}&week=${week}`, '_blank');
});

document.addEventListener('DOMContentLoaded', async function () {
  await updateDeviceSelector();
  const year = parseInt(document.getElementById('year').value);
  const month = parseInt(document.getElementById('month').value);
  const weekNumber = parseInt(document.getElementById('week').value);
  const data = await fetchReadingsByWeek(year, month, weekNumber);
  updateMeasurementsTable(data);
  setInterval(fetchLiveReading, 5000); // cada 5 segundos
  fetchLiveReading(); // al cargar por primera vez
});


async function fetchLiveReading() {
    try {
      const res = await fetch('/temperatures/readings/live');
      if (!res.ok) throw new Error('No hay lectura en vivo');
      const { reading } = await res.json();
  
      document.getElementById('liveTemp').textContent = reading.temperature.toFixed(1);
      document.getElementById('liveHum').textContent = reading.humidity;
      document.getElementById('liveDevice').textContent = reading.device_id;
      document.getElementById('liveTimestamp').textContent = formatDateTime(reading.timestamp);
    } catch (err) {
      console.warn('Sin datos en tiempo real:', err.message);
    }
  }
  