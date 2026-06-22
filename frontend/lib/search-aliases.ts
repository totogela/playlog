// Aliases de búsqueda: abreviaciones comunes → nombre real para RAWG
const ALIASES: Record<string, string> = {
  // Counter-Strike
  'cs':        'counter-strike',
  'cs2':       'counter-strike 2',
  'cs 2':      'counter-strike 2',
  'csgo':      'counter-strike global offensive',
  'cs go':     'counter-strike global offensive',
  'cs:go':     'counter-strike global offensive',
  'css':       'counter-strike source',
  'cs:s':      'counter-strike source',
  '1.6':       'counter-strike 1.6',
  'cs 1.6':    'counter-strike 1.6',

  // Grand Theft Auto
  'gta':       'grand theft auto',
  'gta5':      'grand theft auto v',
  'gta 5':     'grand theft auto v',
  'gta v':     'grand theft auto v',
  'gta4':      'grand theft auto iv',
  'gta 4':     'grand theft auto iv',
  'gta iv':    'grand theft auto iv',
  'gta sa':    'grand theft auto san andreas',
  'gta vc':    'grand theft auto vice city',
  'gtao':      'grand theft auto online',

  // League of Legends / Riot
  'lol':       'league of legends',
  'league':    'league of legends',
  'tft':       'teamfight tactics',
  'lor':       'legends of runeterra',
  'val':       'valorant',
  'valo':      'valorant',

  // World of Warcraft / Blizzard
  'wow':       'world of warcraft',
  'wotlk':     'world of warcraft wrath of the lich king',
  'hs':        'hearthstone',
  'hots':      'heroes of the storm',
  'ow':        'overwatch',
  'ow2':       'overwatch 2',
  'd2':        'diablo 2',
  'd3':        'diablo 3',
  'd4':        'diablo 4',
  'sc':        'starcraft',
  'sc2':       'starcraft 2',

  // Call of Duty
  'cod':       'call of duty',
  'mw':        'call of duty modern warfare',
  'mw2':       'call of duty modern warfare 2',
  'mw3':       'call of duty modern warfare 3',
  'bo':        'call of duty black ops',
  'bo2':       'call of duty black ops 2',
  'bo3':       'call of duty black ops 3',
  'bo4':       'call of duty black ops 4',
  'bocw':      'call of duty black ops cold war',
  'warzone':   'call of duty warzone',
  'wz':        'call of duty warzone',
  'wz2':       'call of duty warzone 2',

  // Fortnite / Battle Royale
  'fn':        'fortnite',
  'pubg':      'playerunknown battlegrounds',
  'apex':      'apex legends',

  // Minecraft / Sandbox
  'mc':        'minecraft',

  // FIFA / Football
  'fc25':      'ea sports fc 25',
  'fc24':      'ea sports fc 24',
  'fifa':      'ea sports fc',
  'fifa25':    'ea sports fc 25',
  'fifa24':    'ea sports fc 24',
  'fifa23':    'fifa 23',
  'eafc':      'ea sports fc',
  'pes':       'efootball',
  'efootball': 'efootball',

  // Rocket League
  'rl':        'rocket league',

  // Dota
  'dota':      'dota 2',
  'dota2':     'dota 2',

  // Pokémon
  'pokemon':   'pokemon',
  'poke':      'pokemon',

  // The Elder Scrolls
  'tes':       'the elder scrolls',
  'skyrim':    'the elder scrolls v skyrim',
  'oblivion':  'the elder scrolls iv oblivion',
  'morrowind': 'the elder scrolls iii morrowind',
  'eso':       'the elder scrolls online',

  // Dark Souls / FromSoftware
  'ds':        'dark souls',
  'ds1':       'dark souls',
  'ds2':       'dark souls 2',
  'ds3':       'dark souls 3',
  'er':        'elden ring',
  'bb':        'bloodborne',
  'sekiro':    'sekiro shadows die twice',

  // The Witcher
  'tw3':       'the witcher 3',
  'witcher':   'the witcher',
  'witcher3':  'the witcher 3 wild hunt',

  // Red Dead
  'rdr':       'red dead redemption',
  'rdr2':      'red dead redemption 2',
  'rdo':       'red dead online',

  // Assassin's Creed
  'ac':        "assassin's creed",
  'aco':       "assassin's creed origins",
  'acu':       "assassin's creed unity",
  'acv':       "assassin's creed valhalla",
  'acs':       "assassin's creed syndicate",

  // The Last of Us
  'tlou':      'the last of us',
  'tlou2':     'the last of us part 2',

  // God of War
  'gow':       'god of war',
  'gow4':      'god of war 2018',
  'gowr':      'god of war ragnarok',

  // Halo
  'h5':        'halo 5 guardians',
  'mcc':       'halo master chief collection',
  'hinfinite': 'halo infinite',

  // Cyberpunk
  'cp':        'cyberpunk',
  'cp2077':    'cyberpunk 2077',

  // Among Us / Social Deduction
  'au':        'among us',

  // Rust / Survival
  'rust':      'rust',

  // Terraria / 2D Sandbox
  'terra':     'terraria',

  // Stardew Valley
  'sdv':       'stardew valley',
  'stardew':   'stardew valley',

  // Hollow Knight
  'hk':        'hollow knight',
  'hksilksong': 'silksong',

  // Celeste
  'celes':     'celeste',

  // Cuphead
  'cup':       'cuphead',

  // NieR
  'nier':      'nier automata',
  'na':        'nier automata',

  // Persona
  'p3':        'persona 3',
  'p4':        'persona 4',
  'p5':        'persona 5',
  'p5r':       'persona 5 royal',

  // Final Fantasy
  'ff':        'final fantasy',
  'ff7':       'final fantasy vii',
  'ff14':      'final fantasy xiv',
  'ff16':      'final fantasy xvi',
  'ffxiv':     'final fantasy xiv',
  'ffvii':     'final fantasy vii',

  // Monster Hunter
  'mh':        'monster hunter',
  'mhw':       'monster hunter world',
  'mhrise':    'monster hunter rise',

  // Zelda
  'zelda':     'the legend of zelda',
  'botw':      'breath of the wild',
  'totk':      'tears of the kingdom',
  'oot':       'ocarina of time',

  // Mario
  'mario':     'super mario',
  'mk':        'mario kart',
  'mk8':       'mario kart 8',
  'smm':       'super mario maker',

  // Street Fighter / Fighting
  'sf6':       'street fighter 6',
  'sf5':       'street fighter v',
  'sf4':       'street fighter iv',
  'tekken':    'tekken',
  't8':        'tekken 8',
  'mk11':      'mortal kombat 11',
  'mk1':       'mortal kombat 2023',
  'dbfz':      'dragon ball fighterz',

  // Battlefields
  'bf':        'battlefield',
  'bf4':       'battlefield 4',
  'bf1':       'battlefield 1',
  'bf5':       'battlefield v',
  'bf2042':    'battlefield 2042',

  // Rainbow Six
  'r6':        'rainbow six siege',
  'r6s':       'rainbow six siege',
  'siege':     'rainbow six siege',

  // Escape from Tarkov
  'eft':       'escape from tarkov',
  'tarkov':    'escape from tarkov',

  // Hunt Showdown
  'hunt':      'hunt showdown',

  // Deep Rock Galactic
  'drg':       'deep rock galactic',

  // Sea of Thieves
  'sot':       'sea of thieves',

  // No Man's Sky
  'nms':       "no man's sky",

  // Subnautica
  'sub':       'subnautica',

  // Satisfactory
  'satis':     'satisfactory',

  // Factorio
  'facto':     'factorio',

  // Space Engineers
  'se':        'space engineers',

  // ARK
  'ark':       'ark survival evolved',

  // Palworld
  'pal':       'palworld',

  // Lethal Company
  'lc':        'lethal company',

  // Baldur's Gate
  'bg3':       "baldur's gate 3",
  'bg':        "baldur's gate",

  // Pathfinder
  'pf':        'pathfinder',

  // Divinity
  'dos2':      'divinity original sin 2',
  'dos':       'divinity original sin',

  // Hades
  'hades':     'hades',
  'hades2':    'hades 2',

  // Dead Cells
  'dc':        'dead cells',

  // Slay the Spire
  'sts':       'slay the spire',

  // Vampire Survivors
  'vs':        'vampire survivors',

  // Binding of Isaac
  'boi':       'the binding of isaac',
  'tboi':      'the binding of isaac',

  // Enter the Gungeon
  'etg':       'enter the gungeon',

  // Risk of Rain
  'ror':       'risk of rain',
  'ror2':      'risk of rain 2',

  // Shotgun King / indie
  'sk':        'shotgun king',

  // Fallout
  'fo3':       'fallout 3',
  'fo4':       'fallout 4',
  'fonv':      'fallout new vegas',
  'fo76':      'fallout 76',
  'fnv':       'fallout new vegas',

  // Mass Effect
  'me':        'mass effect',
  'me3':       'mass effect 3',
  'mel':       'mass effect legendary edition',

  // Dragon Age
  'da':        'dragon age',
  'dao':       'dragon age origins',
  'da2':       'dragon age 2',
  'dai':       'dragon age inquisition',
  'daveil':    'dragon age the veilguard',

  // Resident Evil
  're':        'resident evil',
  're2':       'resident evil 2',
  're3':       'resident evil 3',
  're4':       'resident evil 4',
  're7':       'resident evil 7',
  're8':       'resident evil village',

  // Silent Hill
  'sh':        'silent hill',
  'sh2':       'silent hill 2',

  // Metal Gear
  'mgs':       'metal gear solid',
  'mgs5':      'metal gear solid v',

  // Death Stranding
  'ds2strand': 'death stranding 2',

  // Ghostrunner
  'gr':        'ghostrunner',

  // Sifu
  'sifu':      'sifu',

  // It Takes Two
  'itt':       'it takes two',

  // A Way Out
  'awo':       'a way out',

  // Overcooked
  'oc':        'overcooked',
  'oc2':       'overcooked 2',

  // Fall Guys
  'fg':        'fall guys',

  // Phasmophobia
  'phas':      'phasmophobia',
  'phasm':     'phasmophobia',

  // Warframe
  'wf':        'warframe',

  // Path of Exile
  'poe':       'path of exile',
  'poe2':      'path of exile 2',

  // Lost Ark
  'la':        'lost ark',

  // New World
  'nw':        'new world',

  // Destiny
  'd1':        'destiny',
  'destiny2':  'destiny 2',
  'dest2':     'destiny 2',

  // Cyberpunk shortcuts
  'phantom':   'cyberpunk 2077 phantom liberty',

  // Spider-Man
  'spiderman': "marvel's spider-man",
  'sm2':       "marvel's spider-man 2",

  // Batman
  'bm':        'batman arkham',
  'bak':       'batman arkham knight',

  // Crash Bandicoot
  'crash':     'crash bandicoot',

  // Spyro
  'spyro':     'spyro',

  // Sonic
  'sonic':     'sonic the hedgehog',

  // Kirby
  'kirby':     'kirby',

  // Metroid
  'metroid':   'metroid',

  // Splatoon
  'splat':     'splatoon',
  'splat3':    'splatoon 3',

  // Animal Crossing
  'ac nh':     'animal crossing new horizons',
  'acnh':      'animal crossing new horizons',

  // Inscryption
  'inscr':     'inscryption',
};

export function expandQuery(query: string): string {
  const normalized = query.trim().toLowerCase();
  return ALIASES[normalized] ?? query;
}
