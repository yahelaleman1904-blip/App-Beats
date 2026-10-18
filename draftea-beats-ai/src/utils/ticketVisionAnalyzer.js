// src/utils/ticketVisionAnalyzer.js
import Tesseract from 'tesseract.js';

/**
 * Escanea los píxeles de la captura de Draftea para detectar barras verdes (aciertos)
 * y barras rojas (fallos) sin intervención del usuario.
 */
async function analyzeTicketColors(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 500 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let redRows = 0;
      let greenRows = 0;

      // Escaneamos fila por fila buscando las barras horizontales características de Draftea
      for (let y = 0; y < height; y += 3) {
        let redPixelsInRow = 0;
        let greenPixelsInRow = 0;

        for (let x = 0; x < width; x += 2) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Rojo intenso de barra fallada en Draftea
          if (r > 185 && g < 95 && b < 105 && r - g > 100) {
            redPixelsInRow++;
          }
          // Verde esmeralda de barra acertada en Draftea
          if (g > 155 && r < 95 && b > 90 && b < 185 && g - r > 70) {
            greenPixelsInRow++;
          }
        }

        if (redPixelsInRow > 12) redRows++;
        if (greenPixelsInRow > 12) greenRows++;
      }

      resolve({
        hasErrors: redRows >= 2,
        redScore: redRows,
        greenScore: greenRows
      });
    };
    img.onerror = () => resolve({ hasErrors: true, redScore: 1, greenScore: 0 });
    img.src = imageUrl;
  });
}

/**
 * Procesa una imagen de un Beat de Draftea con OCR + Visión de Color
 * y devuelve automáticamente la regla de ajuste o refuerzo para el algoritmo.
 */
export async function analyzeDrafteaTicketImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const [colorStats, ocrResult] = await Promise.all([
      analyzeTicketColors(imageUrl),
      Tesseract.recognize(imageUrl, 'spa+eng')
    ]);

    const rawText = ocrResult?.data?.text || '';
    const upperText = rawText.toUpperCase();
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    // 1. Detectar qué mercados aparecen en la captura
    const hasPlayerSoT =
      upperText.includes('TIROS AL ARCO B+') || upperText.includes('TIRO AL ARCO');
    const hasTeamSoT = upperText.includes('TOTAL DE TIROS AL');
    const hasTotalGoals = upperText.includes('GOLES TOTALES');
    const hasMoneylinePA = upperText.includes('GANA PA');
    const hasNotStarter = upperText.includes('NO FUE TITULAR');

    // 2. Buscar marcadores cortos (ej. (0) vs (1), (1) vs (0), (0) vs (0)) que rompen el Over 1.5 / 2.5
    const lowScoreMatches = lines.filter((line) =>
      /\([01]\)\s*vs\s*\([01]\)/i.test(line)
    );

    // 3. Buscar líneas de jugadores o equipos mencionadas
    const detectedPlayersOrTeams = lines
      .filter((line) => /\d+\.\d+\+/.test(line) || /↑\s*\d+\.\d+/.test(line))
      .slice(0, 3)
      .join(' • ');

    const isWinningTicket = !colorStats.hasErrors && colorStats.greenScore > 4;

    let tag = 'AUTO-AJUSTE POR VISIÓN IA';
    let rule = '';
    let penaltyMarket = 'GENERAL';

    if (isWinningTicket) {
      tag = '✅ PATRÓN GANADOR VERIFICADO POR IMAGEN';
      rule = `La IA escaneó "${file.name}" y detectó ticket limpio en verde (${
        detectedPlayersOrTeams || 'Mercados seguros'
      }). Se mantiene y refuerza la ponderación actual de piso mínimo L5.`;
    } else if (hasTotalGoals && lowScoreMatches.length > 0) {
      tag = '🛡️ CORRECCIÓN AUTOMÁTICA: GOLES TOTALES 90\'';
      penaltyMarket = 'GOLES TOTALES 90\'';
      rule = `La IA leyó en tu captura marcadores cerrados (${lowScoreMatches
        .slice(0, 2)
        .join(', ')}) que fallaron la línea de goles. El algoritmo activa blindaje: reducirá ↑ 2.5 a ↑ 1.5 y protegerá con ↑ 0.5 en ligas tácticas.`;
    } else if (hasPlayerSoT) {
      tag = '🎯 CORRECCIÓN AUTOMÁTICA: TIROS AL ARCO JUGADOR (B+)';
      penaltyMarket = 'TIROS AL ARCO JUGADOR (B+)';
      rule = `La IA detectó en la captura fallos en Tiros al Arco de Jugador (${
        detectedPlayersOrTeams || 'Jugador en 0 tiros'
      }${
        hasNotStarter ? ' + Alerta NO FUE TITULAR' : ''
      }). Se eleva el filtro para exigir cumplimiento en 4 de los últimos 5 juegos partido por partido y titularidad fija.`;
    } else if (hasTeamSoT) {
      tag = '📊 CORRECCIÓN AUTOMÁTICA: TIROS AL ARCO EQUIPO';
      penaltyMarket = 'TIROS AL ARCO EQUIPO';
      rule = `La IA detectó en la imagen que un equipo no alcanzó su línea de tiros al arco (${
        detectedPlayersOrTeams || 'Línea alta'
      }). Se reduce el tope máximo de equipo a su piso mínimo real de visitante/local (3.0+ a 4.0+).`;
    } else if (hasMoneylinePA) {
      tag = '⚖️ CORRECCIÓN AUTOMÁTICA: GANADOR PA 90\'';
      penaltyMarket = 'GANA PA 90\'';
      rule = `La IA detectó empate o tropiezo de favorito en "Gana PA 90'". En modo Seguro se priorizará Doble Oportunidad o 1.0+ Tiro al Arco en lugar de ganador directo.`;
    } else {
      tag = '🧠 AJUSTE ALGORÍTMICO POR CAPTURA DRAFTEA';
      rule = `La IA procesó visualmente "${file.name}" (${
        detectedPlayersOrTeams || 'Análisis de barras rojas/verdes'
      }) y ajustó los pesos de riesgo para descartar líneas volátiles en tus próximos Beats.`;
    }

    return {
      id: `vision-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tag,
      source: `Leído automáticamente de imagen: ${file.name}`,
      rule,
      penaltyMarket
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}