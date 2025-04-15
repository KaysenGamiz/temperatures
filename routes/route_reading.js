const express = require('express');
const router = express.Router();
const Reading = require('../models/model_reading'); // Asegúrate que la ruta sea correcta

// Última lectura temporal (almacenada en memoria)
let latestLiveReading = null;

// Ruta para obtener lecturas filtradas por semana
router.get('/readings', async (req, res) => {
  try {
    const { year, month, week } = req.query;
    
    // Verificar que todos los parámetros requeridos estén presentes
    if (!year || !month || !week) {
      return res.status(400).json({ error: 'Se requieren los parámetros year, month y week' });
    }

    // Convertir parámetros a números
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const weekNum = parseInt(week);

    // Calcular el rango de días para la semana seleccionada
    const { startDay, endDay } = calculateWeekDays(yearNum, monthNum, weekNum);

    // Construir la consulta para obtener las lecturas de la semana
    const query = {
      year: yearNum,
      month: monthNum,
      day: { $gte: startDay, $lte: endDay }
    };

    // Obtener las lecturas
    const readings = await Reading.find(query).sort({ timestamp: 1 });

    // Calcular estadísticas si hay lecturas
    let stats = {};
    if (readings.length > 0) {
      const totalTemp = readings.reduce((sum, reading) => sum + reading.temperature, 0);
      const totalHum = readings.reduce((sum, reading) => sum + reading.humidity, 0);
      
      stats = {
        total: readings.length,
        avgTemperature: (totalTemp / readings.length).toFixed(1),
        avgHumidity: (totalHum / readings.length).toFixed(1),
        startDate: `${yearNum}-${monthNum.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`,
        endDate: `${yearNum}-${monthNum.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`
      };
    }

    res.json({
      stats,
      readings
    });
  } catch (err) {
    console.error('Error obteniendo lecturas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para calcular los días de inicio y fin de una semana específica
function calculateWeekDays(year, month, weekNumber) {
  // El primer día del mes
  const firstDay = new Date(year, month - 1, 1);
  
  // Día de la semana del primer día (0: domingo, 1: lunes, ..., 6: sábado)
  let firstDayOfWeek = firstDay.getDay();
  // Ajustar para que la semana comience en lunes (1: lunes, ..., 7: domingo)
  firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;
  
  // Calcular el primer día de la primera semana
  // Si el mes comienza en lunes, el primer día es 1
  // Si comienza otro día, calculamos cuántos días faltan para completar la semana
  const daysToFirstMonday = (8 - firstDayOfWeek) % 7;
  
  // Día de inicio para la semana solicitada
  const startDay = 1 + daysToFirstMonday + (weekNumber - 1) * 7;
  
  // Día de fin para la semana solicitada (6 días después del inicio)
  let endDay = startDay + 6;
  
  // Verificar que no exceda el número de días del mes
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  if (endDay > lastDayOfMonth) {
    endDay = lastDayOfMonth;
  }
  
  return { startDay, endDay };
}

// Ruta para obtener todos los dispositivos únicos
router.get('/devices', async (req, res) => {
  try {
    const devices = await Reading.distinct('device_id');
    res.json({ devices });
  } catch (err) {
    console.error('Error obteniendo dispositivos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener el resumen de estadísticas por dispositivo
router.get('/devices/stats', async (req, res) => {
  try {
    const stats = await Reading.aggregate([
      {
        $group: {
          _id: '$device_id',
          count: { $sum: 1 },
          avgTemperature: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          lastReading: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          device_id: '$_id',
          _id: 0,
          count: 1,
          avgTemperature: { $round: ['$avgTemperature', 1] },
          avgHumidity: { $round: ['$avgHumidity', 1] },
          lastReading: 1
        }
      }
    ]);
    
    res.json({ stats });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/readings', async (req, res) => {
  const { temperature, device_id, humidity } = req.body;

  if (temperature === undefined || device_id === undefined || humidity === undefined) {
    return res.status(400).json({ error: 'temperature, device_id, and humidity are required' });
  }

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Actualizar la última lectura en memoria
  latestLiveReading = {
    device_id,
    temperature,
    humidity,
    timestamp: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour,
    minute
  };

  // Solo guardar si es 8:00, 15:00 o 22:00 (±1 minuto)
  const shouldSave = ([8, 15, 22].includes(hour) && minute === 0);

  if (!shouldSave) {
    return res.status(200).json({ message: 'Lectura recibida en tiempo real (no guardada)', realtime: true });
  }

  try {
    const newReading = new Reading(latestLiveReading);
    const saved = await newReading.save();
    res.status(201).json({ message: 'Lectura guardada en MongoDB', id: saved._id });
  } catch (err) {
    console.error('Error guardando lectura:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/readings/live', (req, res) => {
  if (!latestLiveReading) {
    return res.status(404).json({ error: 'No hay lectura en memoria aún' });
  }
  res.json({ reading: latestLiveReading });
});


module.exports = router;
