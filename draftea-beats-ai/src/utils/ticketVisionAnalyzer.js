// src/utils/ticketVisionAnalyzer.js
import Tesseract from 'tesseract.js';

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
  { keys: ['celta', 'cel'], label: 'Celta Vigo', code: 'cel' },
  { keys: ['getafe', 'get'], label: 'Getafe', code: 'get' },
  { keys: ['real sociedad', 'rso'], label: 'Real Sociedad', code: 'rso' },
  { keys: ['alaves', 'alavés', 'ala'], label: 'Alavés', code: 'ala' },
  { keys: ['malaga', 'málaga', 'mal'], label: 'Málaga', code: 'mal' },
  { keys: ['manchester city', 'mci'], label: 'Manchester City', code: 'mci' },
  { keys: ['liverpool', 'liv'], label: 'Liverpool', code: 'liv' },
  { keys: ['arsenal', 'ars'], label: 'Arsenal', code: 'ars' },
  { keys: ['chelsea', 'che'], label: 'Chelsea', code: 'che' },
  { keys: ['everton', 'eve'], label: 'Everton', code: 'eve' },
  { keys: ['aston villa', 'avl'], label: 'Aston Villa', code: 'avl' },
  { keys: ['nottingham', 'forest', 'for', 'nfo'], label: 'Nottingham Forest', code: 'nfo' },
  { keys: ['ipswich', 'ips'], label: 'Ipswich Town', code: 'ips' },
  { keys: ['bayern', 'mun'], label: 'Bayern Munich', code: 'mun' },
  { keys: ['dortmund', 'bvb', 'dor'], label: 'Borussia Dortmund', code: 'dor' },
  { keys: ['stuttgart', 'vfb'], label: 'VfB Stuttgart', code: 'vfb' },
  { keys: ['monchengladbach', 'mönchengladbach', 'bmg'], label: 'Borussia Mönchengladbach', code: 'bmg' },
  { keys: ['psg', 'paris'], label: 'Paris Saint-Germain', code: 'psg' },
  { keys: ['brest', 'bre'], label: 'Brest', code: 'bre' },
  { keys: ['nice', 'nic'], label: 'Nice', code: 'nic' },
  { keys: ['inter', 'int'], label: 'Inter Milan', code: 'int' },
  { keys: ['milan', 'mil'], label: 'AC Milan', code: 'mil' },
  { keys: ['juventus', 'juv'], label: 'Juventus', code: 'juv' },
  { keys: ['roma', 'rom'], label: 'Roma', code: 'rom' },
  { keys: ['torino', 'tor'], label: 'Torino', code: 'tor' },
  { keys: ['monza', 'mon'], label: 'Monza', code: 'mon' },
  { keys: ['parma', 'par'], label: 'Parma', code: 'par' },
  { keys: ['cagliari', 'cag'], label: 'Cagliari', code: 'cag' },
  { keys: ['america', 'américa', 'ame'], label: 'Club América', code: 'ame' },
  { keys: ['cruz azul', 'caz'], label: 'Cruz Azul', code: 'caz' },
  { keys: ['chivas', 'guadalajara', 'gdl', 'gua'], label: 'Guadalajara', code: 'gdl' },
  { keys: ['tigres', 'tig'], label: 'Tigres UANL', code: 'tig' },
  { keys: ['monterrey', 'mty'], label: 'Monterrey', code: 'mty' },
  { keys: ['toluca', 'tol'], label: 'Toluca', code: 'tol' },
  { keys: ['pumas', 'unam', 'pum'], label: 'Pumas UNAM', code: 'pum' },
  { keys: ['atlas', 'ats'], label: 'Atlas', code: 'ats' },
  { keys: ['leon', 'león', 'leo'], label: 'León', code: 'leo' },
  { keys: ['necaxa', 'nec'], label: 'Necaxa', code: 'nec' },
  { keys: ['santos', 'san'], label: 'Santos Laguna', code: 'san' },
  { keys: ['pachuca', 'pac'], label: 'Pachuca', code: 'pac' },
  { keys: ['tijuana', 'xolos', 'tij'], label: 'Tijuana', code: 'tij' },
  { keys: ['brisbane', 'bri'], label: 'Brisbane Roar FC', code: 'bri' },
  { keys: ['perth', 'per'], label: 'Perth Glory FC', code: 'per' }
];

function matchClubFromText(text) {
  const lower = (text || '').toLowerCase();
  const found = [];
  for (const club of KNOWN_CLUB_ALIASES) {
    const isHit = club.keys.some((k) => {
      const rx = new RegExp(`\\b${k}\\b`, 'i');
      return rx.test(lower);
    });
    if (isHit && !found.some((f) => f.code === club.code)) {
      found.push(club);
    }
  }
  return found;
}

/**
 * Carga la imagen en un Canvas y permite consultar si una franja vertical específica (yStart a yEnd)
 * tiene predominancia de píxeles verdes (acierto) o rojos (fallo).
 */
async function loadCanvasSampler(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const sampleBandOutcome = (yTop, yBottom) => {
        const startY = Math.max(0, Math.floor(yTop));
        const endY = Math.min(canvas.height - 1, Math.ceil(yBottom));
        let redPixels = 0;
        let greenPixels = 0;

        for (let y = startY; y <= endY; y += 2) {
          for (let x = 0; x < canvas.width; x += 3) {
            const idx = (y * canvas.width + x) * 4;
            const r = imgData.data[idx];
            const g = imgData.data[idx + 1];
            const b = imgData.data[idx + 2];

            // Rojo de barra/tache en Draftea
            if (r > 180 && g < 100 && b < 110 && r - g > 90) redPixels++;
            // Verde esmeralda de barra/palomita en Draftea
            if (g > 150 && r < 105 && b > 85 && b < 190 && g - r > 65) greenPixels++;
          }
        }

        if (redPixels > greenPixels && redPixels > 18) return 'FAIL';
        if (greenPixels >= redPixels && greenPixels > 18) return 'WIN';
        return 'WIN';
      };

      resolve({
        height: canvas.height,
        sampleBandOutcome
      });
    };
    img.onerror = () =>
      resolve({
        height: 1000,
        sampleBandOutcome: () => 'FAIL'
      });
    img.src = imageUrl;
  });
}

function classifyMarketCategory(upperLine) {
  if (upperLine.includes('1ER GOL') || upperLine.includes('PRIMER GOL')) return '1ER GOL DEL PARTIDO';
  if (upperLine.includes('DOBLE OPORTUNIDAD')) return 'DOBLE OPORTUNIDAD';
  if (upperLine.includes('PA(1)') || upperLine.includes('PAGO ANTICIPADO')) return 'MONEY LINE PA(1)';
  if (upperLine.includes('MONEY LINE') || upperLine.includes('GANA PA')) return 'MONEY LINE PA';
  if (upperLine.includes('AMBOS EQUIPOS ANOTAN') || upperLine.includes('AMBOS ANOTAN')) return 'AMBOS EQUIPOS ANOTAN';
  if (upperLine.includes('TOTAL DE GOLES')) return 'TOTAL DE GOLES EQUIPO';
  if (upperLine.includes('GOLES TOTALES')) return 'GOLES TOTALES';
  if ((upperLine.includes('B+') || upperLine.includes('BANCA+')) && upperLine.includes('ARCO')) {
    return 'TIROS AL ARCO JUGADOR';
  }
  if (upperLine.includes('B+') || upperLine.includes('BANCA+')) {
    return 'TIROS JUGADOR';
  }
  if (upperLine.includes('TIROS AL ARCO')) return 'TOTAL DE TIROS AL ARCO';
  if (upperLine.includes('TIROS DE ESQUINA') || upperLine.includes('CÓRNERS') || upperLine.includes('CORNERS')) {
    return 'CÓRNERS TOTALES';
  }
  if (upperLine.includes('TARJETAS')) return 'TARJETAS TOTALES';
  if (upperLine.includes('ATAJADAS') || upperLine.includes('PORTERO')) return 'ATAJADAS DE PORTERO';
  if (upperLine.includes('TIROS')) return 'TOTAL DE TIROS EQUIPO';
  return null;
}

/**
 * Analiza minuciosamente TODAS las predicciones dentro de la captura de un Beat
 * y devuelve una lista de reglas individuales asignadas a cada club participante.
 */
export async function analyzeDrafteaTicketImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const [sampler, ocrResult] = await Promise.all([
      loadCanvasSampler(imageUrl),
      Tesseract.recognize(imageUrl, 'spa+eng')
    ]);

    const rawLines = ocrResult?.data?.lines || [];
    const fallbackTextLines = (ocrResult?.data?.text || '')
      .split('\n')
      .map((t, idx, arr) => ({
        text: t.trim(),
        bbox: {
          y0: Math.floor((idx / Math.max(1, arr.length)) * sampler.height),
          y1: Math.floor(((idx + 2) / Math.max(1, arr.length)) * sampler.height)
        }
      }))
      .filter((l) => l.text.length > 2);

    const lines = rawLines.length > 0 ? rawLines : fallbackTextLines;
    const allClubsInTicket = matchClubFromText(ocrResult?.data?.text || '');

    const generatedRules = [];
    let activeMatchClubs = allClubsInTicket.slice(0, 2);

    for (let i = 0; i < lines.length; i++) {
      const lineText = (lines[i].text || '').trim();
      const upper = lineText.toUpperCase();

      // Si la línea menciona clubes (cabecera de partido), actualizamos el par de clubes activo
      const clubsInLine = matchClubFromText(lineText);
      if (clubsInLine.length > 0 && !classifyMarketCategory(upper)) {
        if (clubsInLine.length >= 2) {
          activeMatchClubs = clubsInLine.slice(0, 2);
        } else if (
          activeMatchClubs.length === 1 &&
          activeMatchClubs[0].code !== clubsInLine[0].code
        ) {
          activeMatchClubs = [activeMatchClubs[0], clubsInLine[0]];
        } else {
          activeMatchClubs = [clubsInLine[0], ...activeMatchClubs.slice(0, 1)];
        }
      }

      const marketType = classifyMarketCategory(upper);
      if (!marketType) continue;

      // Leer la siguiente línea que contiene la selección exacta (ej. "Barcelona | 7.0+" o "↑ 1.5" o "Elye Wahi NICE | 1.0+")
      const nextLineObj = lines[i + 1] || lines[i];
      const selectionText = (nextLineObj.text || lineText).trim();
      const thirdLineObj = lines[i + 2] || nextLineObj;

      // Muestrear el color de los píxeles exactamente en la franja vertical de esta predicción y su barra
      const yTop = lines[i].bbox?.y0 ?? 0;
      const yBottom = (thirdLineObj.bbox?.y1 ?? yTop + 110) + 45;
      const outcome = sampler.sampleBandOutcome(yTop, yBottom);

      // Extraer la línea objetivo apostada (ej. 4.0+, 1.5, 14.0+)
      const numsInSel = (selectionText.match(/\d+(?:\.\d+)?/g) || []).map(Number);
      const targetLineVal = numsInSel.length > 0 ? numsInSel[numsInSel.length - 1] : 1.0;

      // Determinar a qué club individual pertenece esta predicción específica
      const specificClubsInPick = matchClubFromText(`${lineText} ${selectionText}`);
      const clubsToAssign =
        specificClubsInPick.length > 0
          ? specificClubsInPick
          : activeMatchClubs.length > 0
          ? activeMatchClubs
          : [
              {
                label: 'Club Analizado',
                code: 'gen',
                keys: ['general']
              }
            ];

      // Crear un registro individual para cada club involucrado para que se aplique cuando enfrente a CUALQUIER otro rival
      clubsToAssign.forEach((clubObj, cIdx) => {
        const isWin = outcome === 'WIN';
        const estimatedActual = isWin
          ? Math.ceil(targetLineVal)
          : Math.max(0, Math.floor(targetLineVal - 1));

        generatedRules.push({
          id: `vision-leg-${Date.now()}-${i}-${cIdx}-${Math.random().toString(36).slice(2, 5)}`,
          tag: `${isWin ? 'ACIERTO' : 'AJUSTE'} INDIVIDUAL [${clubObj.label.toUpperCase()}]: ${marketType}`,
          source: `Ticket Subido (${file.name}) • ${selectionText}`,
          clubName: clubObj.label,
          clubCode: clubObj.code,
          targetTeams: clubObj.keys,
          marketType,
          selection: selectionText,
          targetLine: targetLineVal,
          actualValue: estimatedActual,
          outcome,
          rule: isWin
            ? `Perfil ${clubObj.label}: Cumplió '${selectionText}' en ${marketType}. Cuando ${clubObj.label} juegue su próximo partido (contra cualquier rival), se pondera positivamente este mercado combinándolo con su localía y estadísticas del oponente.`
            : `Perfil ${clubObj.label}: Falló '${selectionText}' en ${marketType}. En próximos partidos donde participe ${clubObj.label}, la IA reduce la línea sugerida o exige mayor vulnerabilidad del nuevo rival antes de activar este mercado.`
        });
      });
    }

    // Si la captura tenía formato compacto y no separó cabeceras individuales, crear reglas por cada club detectado en la foto
    if (generatedRules.length === 0) {
      const fullBandOutcome = sampler.sampleBandOutcome(0, sampler.height);
      const fallbackClubs =
        allClubsInTicket.length > 0
          ? allClubsInTicket
          : [{ label: 'Equipos del Ticket', code: 'tk', keys: [] }];

      fallbackClubs.forEach((clubObj, idx) => {
        generatedRules.push({
          id: `vision-club-${Date.now()}-${idx}`,
          tag: `${fullBandOutcome === 'WIN' ? 'ACIERTO' : 'AJUSTE'} INDIVIDUAL [${clubObj.label.toUpperCase()}]`,
          source: `Captura: ${file.name}`,
          clubName: clubObj.label,
          clubCode: clubObj.code,
          targetTeams: clubObj.keys,
          marketType: 'GENERAL',
          targetLine: 1.5,
          actualValue: fullBandOutcome === 'WIN' ? 2 : 0,
          outcome: fullBandOutcome,
          rule: `Memoria registrada para ${clubObj.label} a partir de tu ticket. Se aplicará individualmente en sus próximos enfrentamientos.`
        });
      });
    }

    return generatedRules;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}