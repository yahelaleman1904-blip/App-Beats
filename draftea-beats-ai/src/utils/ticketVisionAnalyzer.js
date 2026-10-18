// src/utils/ticketVisionAnalyzer.js
import Tesseract from 'tesseract.js';

// Diccionario de clubes y siglas para identificar exactamente qué equipos vienen en la foto subida
const KNOWN_CLUB_ALIASES = [
  { keys: ['real madrid', 'madrid', 'rma'], label: 'Real Madrid', code: 'rma' },
  { keys: ['barcelona', 'barca', 'fcb', 'bar'], label: 'Barcelona', code: 'bar' },
  { keys: ['sevilla', 'sev'], label: 'Sevilla', code: 'sev' },
  { keys: ['real betis', 'betis', 'bet'], label: 'Real Betis', code: 'bet' },
  { keys: ['osasuna', 'osa'], label: 'Osasuna', code: 'osa' },
  { keys: ['racing', 'santander', 'rac'], label: 'Racing Santander', code: 'rac' },
  { keys: ['atletico', 'atlético', 'atm'], label: 'Atlético Madrid', code: 'atm' },
  { keys: ['villarreal', 'vil'], label: 'Villarreal', code: 'vil' },
  { keys: ['valencia', 'val'], label: 'Valencia', code: 'val' },
  { keys: ['athletic', 'ath'], label: 'Athletic Club', code: 'ath' },
  { keys: ['espanyol', 'esp'], label: 'Espanyol', code: 'esp' },
  { keys: ['manchester city', 'mci'], label: 'Manchester City', code: 'mci' },
  { keys: ['liverpool', 'liv'], label: 'Liverpool', code: 'liv' },
  { keys: ['arsenal', 'ars'], label: 'Arsenal', code: 'ars' },
  { keys: ['chelsea', 'che'], label: 'Chelsea', code: 'che' },
  { keys: ['everton', 'eve'], label: 'Everton', code: 'eve' },
  { keys: ['aston villa', 'avl'], label: 'Aston Villa', code: 'avl' },
  { keys: ['nottingham', 'for'], label: 'Nottingham Forest', code: 'for' },
  { keys: ['bayern', 'mun'], label: 'Bayern Munich', code: 'mun' },
  { keys: ['dortmund', 'bvb', 'dor'], label: 'Borussia Dortmund', code: 'dor' },
  { keys: ['psg', 'paris'], label: 'Paris Saint-Germain', code: 'psg' },
  { keys: ['inter', 'int'], label: 'Inter Milan', code: 'int' },
  { keys: ['milan', 'mil'], label: 'AC Milan', code: 'mil' },
  { keys: ['juventus', 'juv'], label: 'Juventus', code: 'juv' },
  { keys: ['roma', 'rom'], label: 'Roma', code: 'rom' },
  { keys: ['america', 'américa', 'ame'], label: 'Club América', code: 'ame' },
  { keys: ['cruz azul', 'caz'], label: 'Cruz Azul', code: 'caz' },
  { keys: ['chivas', 'guadalajara', 'gdl'], label: 'Guadalajara', code: 'gdl' },
  { keys: ['tigres', 'tig'], label: 'Tigres UANL', code: 'tig' },
  { keys: ['monterrey', 'mty'], label: 'Monterrey', code: 'mty' },
  { keys: ['toluca', 'tol'], label: 'Toluca', code: 'tol' },
  { keys: ['pumas', 'pum'], label: 'Pumas UNAM', code: 'pum' },
  { keys: ['atlas', 'ats'], label: 'Atlas', code: 'ats' },
  { keys: ['necaxa', 'nec'], label: 'Necaxa', code: 'nec' },
  { keys: ['santos', 'san'], label: 'Santos Laguna', code: 'san' }
];

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

      for (let y = 0; y < height; y += 3) {
        let redPixelsInRow = 0;
        let greenPixelsInRow = 0;

        for (let x = 0; x < width; x += 2) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          if (r > 185 && g < 95 && b < 105 && r - g > 100) redPixelsInRow++;
          if (g > 155 && r < 95 && b > 90 && b < 185 && g - r > 70) greenPixelsInRow++;
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

export async function analyzeDrafteaTicketImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const [colorStats, ocrResult] = await Promise.all([
      analyzeTicketColors(imageUrl),
      Tesseract.recognize(imageUrl, 'spa+eng')
    ]);

    const rawText = ocrResult?.data?.text || '';
    const lowerText = rawText.toLowerCase();
    const upperText = rawText.toUpperCase();
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    // PUNTO 3: Identificar qué equipos específicos aparecen en la imagen subida
    const detectedClubs = [];
    const targetTeamsKeywords = [];

    for (const club of KNOWN_CLUB_ALIASES) {
      const matched = club.keys.some((k) => {
        const regex = new RegExp(`\\b${k}\\b`, 'i');
        return regex.test(lowerText);
      });
      if (matched) {
        detectedClubs.push(club.label);
        targetTeamsKeywords.push(...club.keys);
      }
    }

    const clubsLabel =
      detectedClubs.length > 0
        ? detectedClubs.slice(0, 4).join(', ')
        : 'Equipos del Ticket';

    const hasPlayerSoT =
      upperText.includes('TIROS AL ARCO B+') || upperText.includes('TIRO AL ARCO');
    const hasTeamSoT = upperText.includes('TOTAL DE TIROS AL');
    const hasTotalGoals = upperText.includes('GOLES TOTALES');
    const hasMoneylinePA = upperText.includes('GANA PA');

    const isWinningTicket = !colorStats.hasErrors && colorStats.greenScore > 4;

    let tag = '';
    let rule = '';
    let marketType = 'GENERAL';
    const outcome = isWinningTicket ? 'WIN' : 'FAIL';

    if (isWinningTicket) {
      tag = `✅ PERFIL GANADOR CONFIRMADO (${clubsLabel})`;
      marketType = hasTotalGoals ? 'GOLES TOTALES' : 'TIROS AL ARCO';
      rule = `Exclusivo para [${clubsLabel}]: Tu ticket subido resultó ganador. Cuando vuelvan a jugar estos equipos, la IA priorizará sus mercados acertados manteniendo sus líneas actuales.`;
    } else if (hasTotalGoals) {
      tag = `🛡️ AJUSTE DE GOLES SOLO PARA: ${clubsLabel}`;
      marketType = 'GOLES TOTALES';
      rule = `Exclusivo para [${clubsLabel}]: Se detectó fallo en línea de goles en tu captura. Cuando jueguen específicamente ${clubsLabel}, la IA bajará un escalón la línea (de ↑ 2.5 a ↑ 1.5, o de ↑ 1.5 a ↑ 0.5) sin afectar al resto de clubes.`;
    } else if (hasPlayerSoT) {
      tag = `🎯 AJUSTE DE TIRADOR SOLO PARA: ${clubsLabel}`;
      marketType = 'TIROS AL ARCO JUGADOR';
      rule = `Exclusivo para [${clubsLabel}]: Se detectó fallo en Tiros al Arco de jugador en tu captura. En próximos juegos de ${clubsLabel} se exigirá 5/5 de consistencia titular o se cambiará a mercado colectivo.`;
    } else if (hasTeamSoT) {
      tag = `📊 AJUSTE TIROS AL ARCO SOLO PARA: ${clubsLabel}`;
      marketType = 'TOTAL DE TIROS AL ARCO';
      rule = `Exclusivo para [${clubsLabel}]: Se reduce en -1.0 la línea de Tiros al Arco de equipo únicamente cuando jueguen estos clubes.`;
    } else if (hasMoneylinePA) {
      tag = `⚖️ PROTECCIÓN RESULTADO SOLO PARA: ${clubsLabel}`;
      marketType = 'GANA PA';
      rule = `Exclusivo para [${clubsLabel}]: Se priorizará Doble Oportunidad sobre Ganador directo cuando participen estos equipos.`;
    } else {
      tag = `🧠 MEMORIA ESPECÍFICA DE EQUIPO: ${clubsLabel}`;
      rule = `Exclusivo para [${clubsLabel}]: La IA registró el comportamiento de este ticket y ajustará las líneas únicamente cuando jueguen estos equipos.`;
    }

    return {
      id: `vision-team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tag,
      source: `Equipos detectados en captura: ${clubsLabel}`,
      targetTeams: targetTeamsKeywords,
      marketType,
      outcome,
      rule
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}