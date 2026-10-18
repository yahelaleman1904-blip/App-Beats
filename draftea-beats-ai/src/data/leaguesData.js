// src/data/leaguesData.js

export const FAVORITE_TEAMS = [
  { id: 'BAR', name: 'FC Barcelona', league: 'LALIGA' },
  { id: 'RMA', name: 'Real Madrid', league: 'LALIGA' },
  // Agrega aquí los demás equipos que quieras fijar por defecto
];

export const LEAGUES_CATALOG = [
  {
    id: 'ALL',
    name: 'Todas',
    officialName: 'Todas las Competiciones',
    short: 'TODAS',
    logo: null,
    region: 'Global'
  },
  // México
  {
    id: 'LIGA_MX',
    name: 'Liga BBVA MX',
    officialName: 'Liga BBVA MX (Apertura / Clausura)',
    short: 'MX',
    logo: 'https://media.api-sports.io/football/leagues/262.png',
    region: 'América'
  },
  {
    id: 'LIGA_MX_FEM',
    name: 'Liga MX Femenil',
    officialName: 'Liga BBVA MX Femenil',
    short: 'MXF',
    logo: 'https://media.api-sports.io/football/leagues/673.png',
    region: 'América'
  },
  // Torneos UEFA
  {
    id: 'UCL',
    name: 'Champions League',
    officialName: 'UEFA Champions League',
    short: 'UCL',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    region: 'Europa'
  },
  {
    id: 'UEL',
    name: 'Europa League',
    officialName: 'UEFA Europa League',
    short: 'UEL',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
    region: 'Europa'
  },
  // Top 5 Ligas Europeas + FA Cup
  {
    id: 'LALIGA',
    name: 'LaLiga EA Sports',
    officialName: 'LaLiga EA Sports (España)',
    short: 'ESP',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    region: 'Europa'
  },
  {
    id: 'PREMIER',
    name: 'Premier League',
    officialName: 'English Premier League',
    short: 'ENG',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    region: 'Europa'
  },
  {
    id: 'FA_CUP',
    name: 'Emirates FA Cup',
    officialName: 'The Emirates FA Cup',
    short: 'FAC',
    logo: 'https://media.api-sports.io/football/leagues/45.png',
    region: 'Europa'
  },
  {
    id: 'SERIE_A',
    name: 'Serie A Enilive',
    officialName: 'Serie A Enilive (Italia)',
    short: 'ITA',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    region: 'Europa'
  },
  {
    id: 'BUNDESLIGA',
    name: 'Bundesliga',
    officialName: 'Fußball-Bundesliga (Alemania)',
    short: 'GER',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    region: 'Europa'
  },
  {
    id: 'LIGUE_1',
    name: 'Ligue 1 McDonald’s',
    officialName: 'Ligue 1 McDonald’s (Francia)',
    short: 'FRA',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    region: 'Europa'
  },
  // Ligas Europeas Goleadoras
  {
    id: 'EREDIVISIE',
    name: 'Eredivisie',
    officialName: 'VriendenLoterij Eredivisie (Países Bajos)',
    short: 'NED',
    logo: 'https://media.api-sports.io/football/leagues/88.png',
    region: 'Europa'
  },
  {
    id: 'JUPILER_PRO',
    name: 'Jupiler Pro League',
    officialName: 'Jupiler Pro League (Bélgica)',
    short: 'BEL',
    logo: 'https://media.api-sports.io/football/leagues/144.png',
    region: 'Europa'
  },
  {
    id: 'PRIMEIRA_LIGA',
    name: 'Liga Portugal',
    officialName: 'Liga Portugal Betclic',
    short: 'POR',
    logo: 'https://media.api-sports.io/football/leagues/94.png',
    region: 'Europa'
  },
  // CONMEBOL y Sudamérica
  {
    id: 'LIBERTADORES',
    name: 'Libertadores',
    officialName: 'CONMEBOL Libertadores',
    short: 'LIB',
    logo: 'https://media.api-sports.io/football/leagues/13.png',
    region: 'Sudamérica'
  },
  {
    id: 'SUDAMERICANA',
    name: 'Sudamericana',
    officialName: 'CONMEBOL Sudamericana',
    short: 'SUD',
    logo: 'https://media.api-sports.io/football/leagues/11.png',
    region: 'Sudamérica'
  },
  {
    id: 'ARGENTINA',
    name: 'Liga Profesional',
    officialName: 'Liga Profesional de Fútbol (Argentina)',
    short: 'ARG',
    logo: 'https://media.api-sports.io/football/leagues/128.png',
    region: 'Sudamérica'
  },
  {
    id: 'BRASILEIRAO',
    name: 'Brasileirão Betano',
    officialName: 'Campeonato Brasileiro Série A',
    short: 'BRA',
    logo: 'https://media.api-sports.io/football/leagues/71.png',
    region: 'Sudamérica'
  },
  {
    id: 'COLOMBIA',
    name: 'Liga BetPlay',
    officialName: 'Liga BetPlay Dimayor (Colombia)',
    short: 'COL',
    logo: 'https://media.api-sports.io/football/leagues/239.png',
    region: 'Sudamérica'
  },
  // Oceanía
  {
    id: 'A_LEAGUE',
    name: 'Isuzu A-League',
    officialName: 'Isuzu UTE A-League Men (Australia)',
    short: 'AUS',
    logo: 'https://media.api-sports.io/football/leagues/188.png',
    region: 'Oceanía'
  }
];

// En src/data/leaguesData.js, reemplaza AVAILABLE_DATES por esto:

export const AVAILABLE_DATES = (() => {
  const dates = [{ id: 'ALL', label: 'TODOS' }];
  const today = new Date();
  const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // Formatear YYYY-MM-DD en hora local de México (no UTC)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    dates.push({
      id: dateStr,
      label: i === 0 ? `HOY ${dd} ${meses[d.getMonth()]}` : `${dias[d.getDay()]} ${dd} ${meses[d.getMonth()]}`
    });
  }
  return dates;
})();

// Equipos para fijar en "Fila Cero" (Pin)
export const QUICK_PIN_TEAMS = [
  { id: 'BAR', name: 'FC Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' },
  { id: 'RMA', name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' },
  { id: 'BET', name: 'Real Betis', logo: 'https://media.api-sports.io/football/teams/543.png' },
  { id: 'BVB', name: 'Borussia Dortmund', logo: 'https://media.api-sports.io/football/teams/165.png' },
  { id: 'MCI', name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' },
  { id: 'CAZ', name: 'Cruz Azul', logo: 'https://media.api-sports.io/football/teams/2283.png' },
  { id: 'AME', name: 'Club América', logo: 'https://media.api-sports.io/football/teams/2287.png' },
  { id: 'PSV', name: 'PSV Eindhoven', logo: 'https://media.api-sports.io/football/teams/197.png' }
];