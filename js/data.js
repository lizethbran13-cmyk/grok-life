/* Grok Life - game data: careers, cars, houses, furniture, food, clothes, pets, goals */
(function () {
'use strict';
const GL = window.GL = window.GL || {};
GL.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
GL.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
GL.money = (n) => '$' + Math.round(n).toLocaleString('en-US');

/* ---------------- town layout constants ---------------- */
GL.ROADS = [-48, 0, 48];      // road centre lines (x for N-S roads, z for E-W roads)
GL.RW = 4;                     // road half width
GL.SW = 7;                     // sidewalk outer edge from road centre
GL.LOTS = [-42, -30, -18, -6, 6, 18, 30, 42]; // Maple Street lot centres (x), houses face north toward road z=48
GL.LOT_Z = 64;                 // house centre z

/* ---------------- character creator ---------------- */
GL.SKINS = ['#ffe0c7', '#f6c9a3', '#e8b48a', '#d29a6c', '#b97c50', '#8f5b37', '#6b4226', '#4a2c19'];
GL.HAIR_COLS = ['#1b1210', '#3b2414', '#6b3e1f', '#a0622d', '#d9a35b', '#f2d27a', '#c0392b', '#ff7ac8', '#8b5cf6', '#38bdf8', '#e5e7eb', '#22c55e'];
GL.HAIRS = [['short', 'Short'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['curly', 'Curly'], ['pigtails', 'Pigtails'], ['bob', 'Bob'], ['spiky', 'Spiky'], ['buzz', 'Buzz']];
GL.CLOTH_COLS = ['#ff4fd8', '#f43f5e', '#fb923c', '#facc15', '#4ade80', '#14b8a6', '#38bdf8', '#3b82f6', '#8b5cf6', '#f8fafc', '#94a3b8', '#1f2937', '#a16207', '#fda4af'];
/* tops: free ones + boutique ones (price) */
GL.TOPS = { tee: { name: 'T-Shirt', price: 0 }, hoodie: { name: 'Hoodie', price: 0 }, dress: { name: 'Dress', price: 0 },
  overalls: { name: 'Overalls', price: 120 }, jacket: { name: 'Denim Jacket', price: 160 }, suit: { name: 'Fancy Suit', price: 260 }, sparkle: { name: 'Sparkle Jacket', price: 320 }, sweater: { name: 'Cozy Sweater', price: 140 } };
GL.HATS = { none: { name: 'No Hat', price: 0, icon: '\u274C' }, cap: { name: 'Ball Cap', price: 60, icon: '\uD83E\uDDE2' }, beanie: { name: 'Beanie', price: 70, icon: '\uD83E\uDDF6' },
  sunhat: { name: 'Sun Hat', price: 90, icon: '\uD83D\uDC52' }, cowboy: { name: 'Cowboy Hat', price: 130, icon: '\uD83E\uDD20' }, flower: { name: 'Flower Crown', price: 110, icon: '\uD83C\uDF3C' },
  headphones: { name: 'Headphones', price: 150, icon: '\uD83C\uDFA7' }, crown: { name: 'Royal Crown', price: 900, icon: '\uD83D\uDC51' }, bow: { name: 'Big Bow', price: 80, icon: '\uD83C\uDF80' } };
GL.GLASSES = { none: { name: 'None', price: 0, icon: '\u274C' }, round: { name: 'Round Glasses', price: 70, icon: '\uD83D\uDC53' }, shades: { name: 'Sunglasses', price: 110, icon: '\uD83D\uDE0E' }, stars: { name: 'Star Shades', price: 180, icon: '\u2B50' }, hearts: { name: 'Heart Shades', price: 180, icon: '\uD83D\uDE0D' } };
GL.defaultLook = () => ({ skin: GL.SKINS[1], hair: 'long', hc: GL.HAIR_COLS[1], top: 'tee', tc: '#ff4fd8', bc: '#3b82f6', sc: '#f8fafc', hat: 'none', gl: 'none' });

/* ---------------- careers ---------------- */
/* uni = uniform override; place = workplace area; game = shift mini game */
GL.CAREERS = {
  chef: { name: 'Chef', icon: '\uD83D\uDC69\u200D\uD83C\uDF73', place: 'cafe', placeName: 'Sunny Side Caf\u00e9', base: 120, col: '#fb923c', game: 'chef',
    desc: 'Cook up orders before the customers get hungry!', uni: { top: 'tee', tc: '#f8fafc', bc: '#1f2937', hat: 'chef', apron: '#f8fafc' },
    titles: ['Kitchen Helper', 'Line Cook', 'Sous Chef', 'Head Chef', 'Celebrity Chef'] },
  doctor: { name: 'Doctor', icon: '\uD83E\uDDD1\u200D\u2695\uFE0F', place: 'hospital', placeName: 'Maple Hospital', base: 160, col: '#38bdf8', game: 'doctor',
    desc: 'Match symptoms to the right treatment and help patients feel better.', uni: { top: 'coat', tc: '#f8fafc', bc: '#38bdf8', hat: 'none', gl: 'round' },
    titles: ['Med Student', 'Nurse', 'Doctor', 'Specialist', 'Chief of Medicine'] },
  fire: { name: 'Firefighter', icon: '\uD83E\uDDD1\u200D\uD83D\uDE92', place: 'fire', placeName: 'Fire Station', base: 150, col: '#ef4444', game: 'fire', drive: 'firetruck',
    desc: 'Drive the fire truck around town and spray out the fires!', uni: { top: 'jacket', tc: '#facc15', bc: '#1f2937', hat: 'helmet' },
    titles: ['Cadet', 'Firefighter', 'Engineer', 'Lieutenant', 'Fire Chief'] },
  police: { name: 'Police Officer', icon: '\uD83D\uDC6E', place: 'police', placeName: 'Police Station', base: 150, col: '#3b82f6', game: 'police', drive: 'police',
    desc: 'Chase the cartoon robber around town in your police car and catch him!', uni: { top: 'tee', tc: '#1e3a8a', bc: '#1e293b', hat: 'police' },
    titles: ['Cadet', 'Officer', 'Detective', 'Sergeant', 'Police Chief'] },
  teacher: { name: 'Teacher', icon: '\uD83E\uDDD1\u200D\uD83C\uDFEB', place: 'school', placeName: 'Maple School', base: 130, col: '#a78bfa', game: 'teacher',
    desc: 'Run a quick quiz for the class. Get the answers right!', uni: { top: 'sweater', tc: '#a78bfa', bc: '#475569', hat: 'none', gl: 'round' },
    titles: ['Student Teacher', 'Teacher', 'Senior Teacher', 'Vice Principal', 'Principal'] },
  vet: { name: 'Vet', icon: '\uD83E\uDDD1\u200D\u2695\uFE0F', place: 'petstore', placeName: 'Pet Store & Vet', base: 140, col: '#2dd4bf', game: 'vet',
    desc: 'Treat the pets that come in: wash, feed, bandage and cuddle!', uni: { top: 'tee', tc: '#2dd4bf', bc: '#2dd4bf', hat: 'none' },
    titles: ['Vet Helper', 'Vet Tech', 'Vet', 'Animal Surgeon', 'Head Vet'] },
  clerk: { name: 'Shop Clerk', icon: '\uD83E\uDDD1\u200D\uD83D\uDCBC', place: 'grocery', placeName: 'Fresh Mart', base: 105, col: '#22c55e', game: 'clerk',
    desc: 'Scan the groceries and pick the right total.', uni: { top: 'tee', tc: '#22c55e', bc: '#1f2937', hat: 'cap', hatc: '#16a34a', apron: '#bbf7d0' },
    titles: ['Bagger', 'Cashier', 'Head Cashier', 'Assistant Manager', 'Store Manager'] },
  mechanic: { name: 'Mechanic', icon: '\uD83E\uDDD1\u200D\uD83D\uDD27', place: 'garage', placeName: 'Marco\u2019s Garage', base: 130, col: '#f59e0b', game: 'mechanic',
    desc: 'Pump tires, tighten bolts and fill the oil at just the right moment.', uni: { top: 'overalls', tc: '#f8fafc', bc: '#1d4ed8', hat: 'cap', hatc: '#f59e0b' },
    titles: ['Grease Monkey', 'Mechanic', 'Master Mechanic', 'Race Engineer', 'Garage Boss'] },
  popstar: { name: 'Pop Star', icon: '\uD83C\uDFA4', place: 'stage', placeName: 'Starlight Stage (Park)', base: 115, col: '#ff4fd8', game: 'popstar',
    desc: 'Sing on stage! Tap the notes to the beat.', uni: { top: 'sparkle', tc: '#ff4fd8', bc: '#1f2937', hat: 'headphones', gl: 'stars' },
    titles: ['Street Singer', 'Opening Act', 'Rising Star', 'Headliner', 'Superstar'] },
  animalcontrol: { name: 'Animal Control', icon: '\uD83D\uDC15\u200D\uD83E\uDDBA', place: 'shelter', placeName: 'Grokville Animal Shelter', base: 135, col: '#84cc16', game: 'animalcontrol', drive: 'acvan',
    desc: 'Drive the rescue van, net the stray pets in town and bring them to the shelter for adoption!', uni: { top: 'jacket', tc: '#65a30d', bc: '#1f2937', hat: 'cap', hatc: '#f59e0b' },
    titles: ['Pet Catcher', 'Rescue Ranger', 'Animal Officer', 'Shelter Hero', 'Chief Pet Rescuer'] }
};
GL.CAREER_ORDER = ['chef', 'doctor', 'fire', 'police', 'teacher', 'vet', 'clerk', 'mechanic', 'popstar', 'animalcontrol'];
GL.LEVEL_STARS = [0, 4, 10, 18, 28]; // total stars needed for levels 1..5
GL.payFor = (cid, lv, stars) => Math.round(GL.CAREERS[cid].base * (1 + 0.3 * (lv - 1)) * (0.6 + 0.2 * stars) / 5) * 5;

/* ---------------- cars ---------------- */
GL.CARS = {
  golf: { name: 'Putt-Putt Golf Cart', price: 400, top: 10, acc: 6, seats: 2, desc: 'Slow, silly and super fun.' },
  compact: { name: 'Zippy Hatchback', price: 900, top: 16, acc: 8, seats: 3, desc: 'Small, zippy and easy to park.' },
  van: { name: 'Groovy Retro Van', price: 1300, top: 14, acc: 7, seats: 3, desc: 'Peace, love and road trips!' },
  pickup: { name: 'Ranch Hand Pickup', price: 1600, top: 17, acc: 8, seats: 3, desc: 'Tough truck with a big bed.' },
  suv: { name: 'Trail Boss SUV', price: 2000, top: 18, acc: 8.5, seats: 3, desc: 'Big, comfy family cruiser.' },
  convertible: { name: 'Sunset Convertible', price: 2800, top: 21, acc: 10, seats: 2, desc: 'Top down, wind in your hair.' },
  sports: { name: 'Bolt GT Sports Car', price: 4000, top: 25, acc: 12, seats: 2, desc: 'The fastest car in Grokville!' }
};
GL.CAR_ORDER = ['golf', 'compact', 'van', 'pickup', 'suv', 'convertible', 'sports'];
GL.WORK_CARS = { firetruck: { name: 'Fire Truck', top: 19, acc: 9, seats: 3 }, police: { name: 'Police Car', top: 22, acc: 11, seats: 3 }, acvan: { name: 'Rescue Van', top: 18, acc: 10, seats: 3 }, ambulance: { name: 'Ambulance', top: 18, acc: 9, seats: 3 }, tow: { name: 'Tow Truck', top: 16, acc: 8, seats: 3 } };
GL.CAR_COLS = ['#ef4444', '#fb923c', '#facc15', '#4ade80', '#14b8a6', '#38bdf8', '#3b82f6', '#8b5cf6', '#ff4fd8', '#f8fafc', '#1f2937', '#94a3b8'];

/* ---------------- houses ---------------- */
/* lot: preferred Maple Street lot (null = apartment). w,d = interior size */
GL.HOUSES = {
  apt: { name: 'Starter Apartment', price: 0, w: 12, d: 9, lot: null, icon: '\uD83C\uDFE2', desc: 'A cozy little place to start. Free!' },
  cottage: { name: 'Cozy Cottage', price: 3000, w: 15, d: 10, lot: 0, icon: '\uD83C\uDFE1', desc: 'A sweet cottage with a garden and a driveway.' },
  bungalow: { name: 'Sunny Bungalow', price: 5500, rent: 40, w: 17, d: 11, lot: 5, icon: '\uD83C\uDFE0', desc: 'Bright and roomy. Buy it, or rent it for $40 a day!' },
  family: { name: 'Family Home', price: 10000, w: 21, d: 13, lot: 2, icon: '\uD83C\uDFD8\uFE0F', desc: 'Two floors of space for you, your pets and all your stuff.' },
  villa: { name: 'Modern Villa', price: 25000, w: 27, d: 15, lot: 7, icon: '\uD83C\uDFDB\uFE0F', desc: 'Glass walls, a pool and the best view in town!' }
};
GL.HOUSE_ORDER = ['apt', 'cottage', 'bungalow', 'family', 'villa'];
GL.SALE_LOTS = [0, 2, 5, 7];
GL.WALLS = ['#fde7c4', '#fce7f3', '#e0f2fe', '#dcfce7', '#ede9fe', '#fef9c3', '#f1f5f9', '#fecaca', '#cbd5e1', '#3f3f46'];
GL.FLOORS = [['wood', 'Light Wood'], ['dark', 'Dark Wood'], ['tile', 'White Tiles'], ['blue', 'Blue Tiles'], ['pink', 'Pink Carpet'], ['purple', 'Purple Carpet'], ['green', 'Green Carpet'], ['check', 'Checkers']];

/* ---------------- furniture (home) ---------------- */
/* use: what tapping it does. w,d footprint. solid blocks walking */
GL.FURN = {
  bed: { name: 'Bed', price: 150, w: 1.6, d: 2.4, solid: 1, use: 'sleep', icon: '\uD83D\uDECF\uFE0F' },
  bigbed: { name: 'Royal Bed', price: 480, w: 2.4, d: 2.6, solid: 1, use: 'sleep', icon: '\uD83D\uDC51', comfy: 1 },
  stove: { name: 'Stove', price: 200, w: 1.2, d: 0.9, solid: 1, use: 'cook', icon: '\uD83C\uDF73' },
  fridge: { name: 'Fridge', price: 180, w: 1, d: 0.9, solid: 1, use: 'fridge', icon: '\uD83E\uDDCA' },
  shower: { name: 'Shower', price: 220, w: 1.3, d: 1.3, solid: 1, use: 'shower', icon: '\uD83D\uDEBF' },
  tub: { name: 'Bubble Bath', price: 380, w: 2, d: 1.1, solid: 1, use: 'bath', icon: '\uD83D\uDEC1' },
  sofa: { name: 'Comfy Sofa', price: 250, w: 2.6, d: 1.1, solid: 1, use: 'sit', icon: '\uD83D\uDECB\uFE0F' },
  armchair: { name: 'Armchair', price: 110, w: 1.1, d: 1.1, solid: 1, use: 'sit', icon: '\uD83E\uDE91' },
  table: { name: 'Dining Table', price: 140, w: 1.8, d: 1.1, solid: 1, use: 'eat', icon: '\uD83C\uDF7D\uFE0F' },
  chair: { name: 'Chair', price: 40, w: 0.7, d: 0.7, solid: 1, use: 'sit', icon: '\uD83E\uDE91' },
  tv: { name: 'Big TV', price: 300, w: 2, d: 0.6, solid: 1, use: 'tv', icon: '\uD83D\uDCFA' },
  console: { name: 'Game Console', price: 350, w: 1.4, d: 0.7, solid: 1, use: 'game', icon: '\uD83C\uDFAE' },
  computer: { name: 'Computer Desk', price: 280, w: 1.6, d: 0.8, solid: 1, use: 'computer', icon: '\uD83D\uDCBB' },
  bookshelf: { name: 'Bookshelf', price: 160, w: 1.8, d: 0.6, solid: 1, use: 'read', icon: '\uD83D\uDCDA' },
  wardrobe: { name: 'Wardrobe', price: 150, w: 1.6, d: 0.7, solid: 1, use: 'wardrobe', icon: '\uD83D\uDC57' },
  piano: { name: 'Piano', price: 600, w: 1.8, d: 0.8, solid: 1, use: 'piano', icon: '\uD83C\uDFB9' },
  arcade: { name: 'Arcade Machine', price: 800, w: 1, d: 0.9, solid: 1, use: 'game', icon: '\uD83D\uDD79\uFE0F' },
  petbed: { name: 'Pet Bed', price: 60, w: 1.4, d: 1.2, use: 'petbed', icon: '\uD83D\uDC3E' },
  plant: { name: 'Big Plant', price: 45, w: 0.8, d: 0.8, solid: 1, icon: '\uD83E\uDEB4' },
  lamp: { name: 'Floor Lamp', price: 60, w: 0.7, d: 0.7, solid: 1, icon: '\uD83D\uDCA1' },
  rug: { name: 'Round Rug', price: 70, w: 2.6, d: 2.6, flat: 1, icon: '\uD83D\uDFE0' },
  aquarium: { name: 'Aquarium', price: 260, w: 1.8, d: 0.7, solid: 1, use: 'look', icon: '\uD83D\uDC20' },
  fireplace: { name: 'Fireplace', price: 450, w: 2, d: 0.8, solid: 1, use: 'look', icon: '\uD83D\uDD25' },
  painting: { name: 'Painting', price: 90, w: 1.4, d: 0.3, solid: 1, icon: '\uD83D\uDDBC\uFE0F' },
  toybox: { name: 'Toy Box', price: 65, w: 1.2, d: 0.8, solid: 1, icon: '\uD83E\uDDF8' }
};
GL.FURN_ORDER = Object.keys(GL.FURN);
GL.STARTER_INV = { bed: 1, stove: 1, shower: 1, wardrobe: 1, armchair: 1, table: 1, chair: 1 };

/* ---------------- food & items ---------------- */
/* h hunger, e energy, f fun. where: grocery / cafe / pet */
GL.ITEMS = {
  apple: { name: 'Apple', icon: '\uD83C\uDF4E', price: 3, h: 12, where: 'grocery', cat: 'food' },
  banana: { name: 'Banana', icon: '\uD83C\uDF4C', price: 3, h: 12, e: 4, where: 'grocery', cat: 'food' },
  sandwich: { name: 'Sandwich', icon: '\uD83E\uDD6A', price: 8, h: 28, where: 'grocery', cat: 'food' },
  juice: { name: 'Juice Box', icon: '\uD83E\uDDC3', price: 4, h: 8, f: 6, where: 'grocery', cat: 'food' },
  chips: { name: 'Chips', icon: '\uD83E\uDD54', price: 5, h: 14, f: 6, where: 'grocery', cat: 'food' },
  cookie: { name: 'Cookies', icon: '\uD83C\uDF6A', price: 6, h: 12, f: 10, where: 'grocery', cat: 'food' },
  groceries: { name: 'Grocery Bag', icon: '\uD83D\uDECD\uFE0F', price: 15, where: 'grocery', cat: 'cook', desc: 'Ingredients for one home-cooked meal (use your stove).' },
  flowers: { name: 'Flowers', icon: '\uD83D\uDC90', price: 12, where: 'grocery', cat: 'gift', desc: 'A lovely gift for a friend.' },
  chocolate: { name: 'Box of Chocolates', icon: '\uD83C\uDF6B', price: 18, where: 'grocery', cat: 'gift', desc: 'Sweet gift (not for pets!).' },
  coffee: { name: 'Coffee', icon: '\u2615', price: 5, h: 4, e: 25, where: 'cafe', cat: 'food' },
  cocoa: { name: 'Hot Cocoa', icon: '\uD83E\uDD64', price: 5, h: 8, f: 10, where: 'cafe', cat: 'food' },
  pancakes: { name: 'Pancakes', icon: '\uD83E\uDD5E', price: 12, h: 45, f: 5, where: 'cafe', cat: 'food' },
  burger: { name: 'Burger', icon: '\uD83C\uDF54', price: 14, h: 55, where: 'cafe', cat: 'food' },
  pizza: { name: 'Pizza Slice', icon: '\uD83C\uDF55', price: 9, h: 35, f: 4, where: 'cafe', cat: 'food' },
  smoothie: { name: 'Berry Smoothie', icon: '\uD83E\uDD64', price: 8, h: 18, e: 12, where: 'cafe', cat: 'food' },
  cake: { name: 'Cake Slice', icon: '\uD83C\uDF70', price: 10, h: 25, f: 15, where: 'cafe', cat: 'food' },
  kibble: { name: 'Pet Food', icon: '\uD83E\uDD63', price: 8, where: 'pet', cat: 'pet', ph: 40, desc: 'Feeds any pet.' },
  treat: { name: 'Meaty Treat', icon: '\uD83C\uDF56', price: 15, where: 'pet', cat: 'pet', ph: 30, pf: 15, desc: 'Pets LOVE these. So does Brutus\u2026' },
  veggies: { name: 'Veggie Bowl', icon: '\uD83E\uDD55', price: 10, where: 'pet', cat: 'pet', ph: 40, pf: 6, desc: 'Tortoises and bunnies love it.' },
  seeds: { name: 'Seed Mix', icon: '\uD83C\uDF3B', price: 6, where: 'pet', cat: 'pet', ph: 35, pf: 6, desc: 'Rats and hamsters love it.' },
  ball: { name: 'Tennis Ball', icon: '\uD83C\uDFBE', price: 20, where: 'pet', cat: 'toy', desc: 'For playing fetch.' },
  bandage: { name: 'Cartoon Bandage', icon: '\uD83E\uDE79', price: 8, where: 'pharm', cat: 'med', hp: 15, desc: 'For bumps and scrapes. +15 health.' },
  icepack: { name: 'Ice Pack', icon: '\uD83E\uDDCA', price: 12, where: 'pharm', cat: 'med', hp: 22, desc: 'Cools a bonk. +22 health.' },
  ointment: { name: 'Owie Ointment', icon: '\uD83E\uDDF4', price: 18, where: 'pharm', cat: 'med', hp: 35, desc: 'Super soothing. +35 health.' },
  umbrella: { name: 'Umbrella', icon: '\u2602\uFE0F', price: 15, where: 'grocery', cat: 'gear', desc: 'Keeps you dry in rain + blocks some hail.' },
  flashlight: { name: 'Flashlight', icon: '\uD83D\uDD26', price: 12, where: 'grocery', cat: 'gear', desc: 'Lights your way in a power outage.' },
  smartphone: { name: 'Smartphone X', icon: '\uD83D\uDCF1', price: 120, where: 'tech', cat: 'tech', f: 10, s: 6, desc: 'Watch funny cat videos. +fun' },
  laptop: { name: 'Laptop', icon: '\uD83D\uDCBB', price: 280, where: 'tech', cat: 'tech', f: 14, desc: 'Play browser games. +fun' },
  console: { name: 'Game Console', icon: '\uD83C\uDFAE', price: 240, where: 'tech', cat: 'tech', f: 22, e: -4, desc: 'Big fun! (a little tiring)' },
  tv: { name: 'Mega TV', icon: '\uD83D\uDCFA', price: 360, where: 'tech', cat: 'tech', f: 18, e: 6, desc: 'Cozy cartoon marathon. +fun +energy' },
  headphones: { name: 'Headphones', icon: '\uD83C\uDFA7', price: 60, where: 'tech', cat: 'tech', f: 8, desc: 'Jam out to music. +fun' },
  vitamins: { name: 'Gummy Vitamins', icon: '\uD83C\uDF6C', price: 10, where: 'pharm', cat: 'med', hp: 10, e: 10, desc: '+10 health, +10 energy.' }
};
GL.itemsAt = (w) => Object.keys(GL.ITEMS).filter((k) => GL.ITEMS[k].where === w);
GL.RECIPES = [['spaghetti', 'Spaghetti', '\uD83C\uDF5D', 60, 6], ['tacos', 'Tacos', '\uD83C\uDF2E', 60, 8], ['pancakes', 'Pancake Stack', '\uD83E\uDD5E', 55, 10], ['soup', 'Veggie Soup', '\uD83C\uDF72', 65, 4]];

/* ---------------- pets (models + data reused from Grok Pets) ---------------- */
GL.SPECIES = {
  schnauzer: { name: 'Schnauzer', kind: 'dog', r: 'common', price: 150, size: 0.92, snd: 'bark', icon: '\uD83D\uDC15', vars: [['Salt & Pepper', '#8b9099', '#e5e7eb'], ['Black', '#34343c', '#a1a7b0'], ['Silver', '#c4c9d1', '#f4f6f8']], opt: { ears: 'fold', tail: 'stub', beard: 1, snout: 0.2 } },
  retriever: { name: 'Golden Puppy', kind: 'dog', r: 'common', price: 150, size: 1, snd: 'bark', icon: '\uD83D\uDC36', vars: [['Golden', '#e0a84a', '#f3d9a4'], ['Cream', '#f0dcb0', '#fff7e6'], ['Red', '#c46a2a', '#e8a56a']], opt: { ears: 'flop', tail: 'fluffy', snout: 0.2 } },
  corgi: { name: 'Corgi', kind: 'dog', r: 'uncommon', price: 240, size: 0.9, snd: 'bark', icon: '\uD83D\uDC15', vars: [['Red', '#e08a3a', '#ffffff'], ['Tricolor', '#3b2a20', '#ffffff'], ['Sable', '#a8642e', '#fff4e0']], opt: { ears: 'point', tail: 'fluffy', short: 1, snout: 0.18 } },
  pug: { name: 'Pug', kind: 'dog', r: 'uncommon', price: 240, size: 0.82, snd: 'bark', icon: '\uD83D\uDC36', vars: [['Fawn', '#d9b98a', '#2b2420'], ['Black', '#2b2b30', '#151518'], ['Apricot', '#e3a86a', '#3a2a20']], opt: { ears: 'fold', tail: 'curl', snout: 0.07, mask: 1 } },
  bulldog: { name: 'Bulldog', kind: 'dog', r: 'uncommon', price: 240, size: 0.95, snd: 'bark', icon: '\uD83D\uDC36', vars: [['Fawn', '#d6a66a', '#fff4e6'], ['Brindle', '#7a5a3a', '#f5e6d3'], ['White', '#f3efe8', '#f0c9b0']], opt: { ears: 'fold', earCol: '#8a6240', tail: 'stub', snout: 0, jowls: 1, bw: 0.46, bh: 0.34, len: 0.56, legH: 0.16, legW: 0.1, headR: 0.25, headSy: 0.82, headSz: 0.9 } },
  tabby: { name: 'Tabby Kitten', kind: 'cat', r: 'common', price: 140, size: 0.85, snd: 'meow', icon: '\uD83D\uDC31', vars: [['Orange', '#e8923a', '#fff1dc'], ['Grey', '#8a8f98', '#eef0f3'], ['Brown', '#8a6440', '#f3e3cc']], opt: { stripes: 1 } },
  siamese: { name: 'Siamese Kitten', kind: 'cat', r: 'uncommon', price: 240, size: 0.85, snd: 'meow', icon: '\uD83D\uDC08', vars: [['Seal Point', '#f2e6cf', '#5a4030'], ['Blue Point', '#eef0f4', '#6a7690'], ['Lilac Point', '#f6efe9', '#a08a98']], opt: { points: 1, eye: '#2f7df6' } },
  rat: { name: 'Fancy Rat', kind: 'rat', r: 'common', price: 90, size: 0.62, snd: 'squeak', icon: '\uD83D\uDC00', vars: [['Agouti', '#9a7b5c', '#efe4d4'], ['Hooded', '#2f2f36', '#ffffff'], ['Cinnamon', '#c08a5a', '#f5e6d3']] },
  tortoise: { name: 'Desert Tortoise', kind: 'tortoise', r: 'uncommon', price: 220, size: 0.8, snd: 'chirp', icon: '\uD83D\uDC22', vars: [['Desert', '#8a6a3a', '#a89060'], ['Olive', '#6a7a3a', '#a8a868'], ['Sunset', '#a0522d', '#c8a070']] },
  bunny: { name: 'Bunny', kind: 'bunny', r: 'common', price: 130, size: 0.72, snd: 'squeak', icon: '\uD83D\uDC07', vars: [['Snow', '#f6f6f6', '#ffc6d3'], ['Cocoa', '#9a6a44', '#f3e3cc'], ['Grey', '#a4abb5', '#f1f5f9']] },
  hamster: { name: 'Hamster', kind: 'hamster', r: 'common', price: 80, size: 0.55, snd: 'squeak', icon: '\uD83D\uDC39', vars: [['Golden', '#e8b060', '#fff4e0'], ['Panda', '#2f2f36', '#ffffff'], ['Cream', '#f3dfb8', '#ffffff']] },
  parrot: { name: 'Parrot', kind: 'bird', r: 'uncommon', price: 260, size: 0.7, snd: 'tweet', icon: '\uD83E\uDD9C', vars: [['Green', '#22c55e', '#facc15'], ['Blue', '#3b82f6', '#fde047'], ['Scarlet', '#ef4444', '#3b82f6']] },
  goldfish: { name: 'Goldfish', kind: 'fish', r: 'common', price: 60, size: 0.75, snd: 'bubble', icon: '\uD83D\uDC20', vars: [['Gold', '#f59e0b', '#fde68a'], ['Calico', '#fb923c', '#ffffff'], ['Black Moor', '#2f2f35', '#8b8b96']] },
  hedgehog: { name: 'Hedgehog', kind: 'hedgehog', r: 'rare', price: 420, size: 0.6, snd: 'squeak', icon: '\uD83E\uDD94', vars: [['Classic', '#8a6a4a', '#f3e3cc'], ['Snowflake', '#e2ddd3', '#ffffff'], ['Cinnamon', '#b07a4a', '#f8e8d4']] },
  robodog: { name: 'Robot Dog', kind: 'robodog', r: 'rare', egg: 1, size: 0.9, snd: 'beep', icon: '\uD83E\uDD16', vars: [['Chrome', '#cbd5e1', '#38bdf8'], ['Gold', '#fbbf24', '#f43f5e'], ['Midnight', '#3b4659', '#4ade80']] },
  dragon: { name: 'Mini Dragon', kind: 'dragon', r: 'epic', egg: 1, size: 0.95, snd: 'roar', icon: '\uD83D\uDC09', vars: [['Ember', '#ef4444', '#fbbf24'], ['Jade', '#10b981', '#a7f3d0'], ['Royal', '#7c3aed', '#f0abfc']] },
  unicorn: { name: 'Unicorn Pony', kind: 'pony', r: 'epic', egg: 1, size: 1.05, snd: 'neigh', icon: '\uD83E\uDD84', vars: [['Pearl', '#fdf4ff', '#f472b6'], ['Sky', '#e0f2fe', '#a78bfa'], ['Peach', '#ffedd5', '#38bdf8']] },
  galaxycat: { name: 'Galaxy Cat', kind: 'cat', r: 'legendary', egg: 1, size: 0.9, snd: 'meow', icon: '\uD83C\uDF0C', vars: [['Nebula', '#4c1d95', '#22d3ee'], ['Aurora', '#0f766e', '#f0abfc'], ['Cosmic', '#1e1b4b', '#fbbf24']], opt: { galaxy: 1, eye: '#fde047' } }
};
GL.PET_ORDER = Object.keys(GL.SPECIES).filter((k) => !GL.SPECIES[k].egg);
GL.FAMILY = [
  { id: 'candy', sp: 'schnauzer', name: 'Candy', col: ['#8e939c', '#eceef1'], acc: { neck: 'pinkcollar' }, blurb: 'A sweet, bouncy miniature schnauzer with a fluffy beard.' },
  { id: 'martina', sp: 'tortoise', name: 'Martina', col: ['#8d6b3c', '#b59a68'], acc: { head: 'flower' }, blurb: 'A calm desert tortoise who loves veggies and sunny naps.' },
  { id: 'luna', sp: 'rat', name: 'Luna', col: ['#8f93a3', '#f4f2f7'], acc: { head: 'bow' }, blurb: 'A curious fancy rat with soft moon-grey fur.' },
  { id: 'pirat', sp: 'rat', name: 'Pi-rat', col: ['#b98b62', '#f6eadb'], oneEye: 1, acc: { neck: 'bandana' }, blurb: 'A brave little fancy rat with one eye and a big heart. Arr!' },
  { id: 'snowie', sp: 'rat', name: 'Snowie', col: ['#fbfbfb', '#ffe4ec'], eye: '#d9466f', acc: {}, blurb: 'A snow-white fancy rat with rosy eyes.' }
];
GL.familyById = (id) => GL.FAMILY.find((f) => f.id === id);
GL.FAMILY_PRICE = 50;
GL.PET_ACC = { pinkcollar: 1, bandana: 1, bow: 1, flower: 1, redcollar: 1, partyhat: 1, bowtie: 1, cap: 1, grumpycap: 1 }; // accessory ids the pet model understands
GL.TRICKS = [['sit', 'Sit', '\u2B07\uFE0F'], ['jump', 'Jump', '\u2B06\uFE0F'], ['spin', 'Spin', '\uD83D\uDD04'], ['wave', 'Wave', '\uD83D\uDC4B'], ['roll', 'Roll Over', '\uD83C\uDF00']];
GL.TRICK_NEED = 3;
GL.stageScale = () => 1;

/* ---------------- health ---------------- */
/* lv 1 minor (heals with rest / pharmacy), 2 serious (doctor appointment at the clinic), 3 very serious (ambulance + hospital) */
GL.INJ = {
  scrape: { lv: 1, name: 'Scraped knee', icon: '\uD83E\uDE79' }, bonk: { lv: 1, name: 'Bonked head', icon: '\uD83E\uDD15' }, bruise: { lv: 1, name: 'Bruised elbow', icon: '\uD83E\uDE79' }, finger: { lv: 1, name: 'Sore finger', icon: '\uD83E\uDE79' },
  sprain: { lv: 2, name: 'Sprained ankle', icon: '\uD83E\uDDB5' }, wrist: { lv: 2, name: 'Twisted wrist', icon: '\uD83E\uDDBE' },
  broken: { lv: 3, name: 'Broken leg', icon: '\uD83E\uDDB4' }, bigbonk: { lv: 3, name: 'Super-bonked noggin', icon: '\uD83D\uDCAB' },
  // illnesses + mishaps from the Scenarios app (cartoony, no gore)
  sunburn: { lv: 1, name: 'Sunburn', icon: '\uD83E\uDD75', ill: 1 }, cold: { lv: 1, name: 'Sniffly cold', icon: '\uD83E\uDD27', ill: 1 },
  tummy: { lv: 2, name: 'Food poisoning', icon: '\uD83E\uDD22', ill: 1 }, allergy: { lv: 3, name: 'Puffy allergic reaction', icon: '\uD83E\uDD2F', ill: 1 }
};
/* ---------------- pets: health + the Grokville Vet Clinic ---------------- */
GL.PET_ILL = {
  sick: { name: 'Sick (tummy bug + sniffles)', icon: '\uD83E\uDD12', fee: 60, hp: 55, fix: ['\uD83E\uDD44', 'Dr. Kiki: \u201CA spoonful of yummy banana medicine. Down the hatch!\u201D', 'GULP \uD83C\uDF4C'] },
  hurt: { name: 'Hurt paw', icon: '\uD83E\uDE79', fee: 90, hp: 45, fix: ['\uD83E\uDE7B', 'Dr. Kiki: \u201CA tiny X-ray\u2026 just a sprain! A teeny cast with sparkly stickers.\u201D', 'STICKERS! \u2B50'] },
  ate: { name: 'Ate something bad (a sock!)', icon: '\uD83E\uDDE6', fee: 120, hp: 40, fix: ['\uD83E\uDE7B', 'Dr. Kiki: \u201CThe X-ray shows\u2026 a SOCK! A special fizzy drink helps it come back out. Ewww, but all better!\u201D', 'EWW, OKAY \uD83E\uDDE6'] },
  checkup: { name: 'Due for a check-up', icon: '\uD83D\uDCCB', fee: 30, hp: 100, fix: ['\uD83D\uDC89', 'Dr. Kiki: \u201CA quick vaccine boop and a nail trim. Brave pet!\u201D', 'BOOP \uD83D\uDC3E'] }
};
GL.PET_INS = { price: 80, days: 7, cover: 0.8 }; // Paws Protect pet insurance (way nicer than Gary)
GL.PET_TAXI = 10;
GL.CLINIC_FEE = 40; GL.HOSPITAL_BILL = 420;

/* ---------------- crime (optional + cartoony) ---------------- */
GL.LOOT = {
  gem: { name: 'Big Blue Gem', icon: '\uD83D\uDC8E', price: 380 }, crownj: { name: 'Jeweled Crown', icon: '\uD83D\uDC51', price: 300 }, llama: { name: 'Golden Llama Statue', icon: '\uD83E\uDD99', price: 260 },
  dinoegg: { name: 'Dino Egg Fossil', icon: '\uD83E\uDD5A', price: 220 }, ring: { name: 'Sparkly Ring', icon: '\uD83D\uDC8D', price: 90 }, necklace: { name: 'Pearl Necklace', icon: '\uD83D\uDCFF', price: 120 },
  watch: { name: 'Fancy Watch', icon: '\u231A', price: 80 }, hphone: { name: 'Shiny Phone', icon: '\uD83D\uDCF1', price: 110 }, hlaptop: { name: 'Laptop', icon: '\uD83D\uDCBB', price: 160 }, hconsole: { name: 'Game Console', icon: '\uD83C\uDFAE', price: 140 }, goldbar: { name: 'Gold Bar', icon: '\uD83E\uDE99', price: 200 }, cashbag: { name: 'Money Bag', icon: '\uD83D\uDCB0', price: 150 }
};
/* area: building it's in; hot: id of the display; diff 1..3; stars = wanted level after */
GL.HEISTS = {
  gems: { name: 'Gem Gallery', area: 'museum', icon: '\uD83D\uDC8E', diff: 3, stars: 3, loot: { gem: 1, crownj: 1 } },
  relics: { name: 'Ancient Relics', area: 'museum', icon: '\uD83E\uDD99', diff: 2, stars: 2, loot: { llama: 1, dinoegg: 1 } },
  jewels: { name: 'Jewelry Cases', area: 'jewelry', icon: '\uD83D\uDC8D', diff: 1, stars: 1, loot: { ring: 2, necklace: 1, watch: 1 } },
  tech: { name: 'Gadget Wall', area: 'tech', icon: '\uD83C\uDFAE', diff: 2, stars: 2, loot: { hphone: 1, hlaptop: 1, hconsole: 1 } },
  vault: { name: 'Bank Vault', area: 'bank', icon: '\uD83E\uDE99', diff: 3, stars: 3, loot: { goldbar: 1, cashbag: 2 } }
};
GL.JAIL_SECS = 12; GL.FINE = 80;

/* ---------------- goals / achievements ---------------- */
/* p(save) -> [have, need] */
GL.GOALS = [
  { id: 'paycheck', icon: '\uD83D\uDCB5', name: 'First Paycheck', desc: 'Finish your first work shift', p: (s) => [s.stats.shifts, 1], r: 50 },
  { id: 'shifts20', icon: '\uD83D\uDCBC', name: 'Hard Worker', desc: 'Finish 20 work shifts', p: (s) => [s.stats.shifts, 20], r: 300 },
  { id: 'car1', icon: '\uD83D\uDE97', name: 'Road Trip!', desc: 'Buy your first car', p: (s) => [s.cars.length, 1], r: 100 },
  { id: 'car3', icon: '\uD83C\uDFCE\uFE0F', name: 'Car Collector', desc: 'Own 3 cars', p: (s) => [s.cars.length, 3], r: 500 },
  { id: 'drive', icon: '\uD83D\uDEE3\uFE0F', name: 'Sunday Driver', desc: 'Drive 2 km', p: (s) => [Math.floor(s.stats.drive), 2000], r: 150 },
  { id: 'lv3', icon: '\u2B50', name: 'Moving Up', desc: 'Reach career level 3', p: (s) => [Math.max(0, ...Object.values(s.jobs).map((j) => j.lv)), 3], r: 200 },
  { id: 'lv5', icon: '\uD83C\uDF1F', name: 'Top of the Ladder', desc: 'Reach career level 5', p: (s) => [Math.max(0, ...Object.values(s.jobs).map((j) => j.lv)), 5], r: 1000 },
  { id: 'jobs3', icon: '\uD83D\uDD04', name: 'Jack of All Trades', desc: 'Try 3 different careers', p: (s) => [Object.keys(s.jobs).length, 3], r: 200 },
  { id: 'house1', icon: '\uD83C\uDFE1', name: 'Home Sweet Home', desc: 'Buy or rent a house', p: (s) => [s.stats.houses, 1], r: 200 },
  { id: 'family', icon: '\uD83C\uDFD8\uFE0F', name: 'Room to Grow', desc: 'Own the Family Home or the Villa', p: (s) => [s.house === 'family' || s.house === 'villa' ? 1 : 0, 1], r: 500 },
  { id: 'villa', icon: '\uD83C\uDFDB\uFE0F', name: 'Living Large', desc: 'Own the Modern Villa', p: (s) => [s.house === 'villa' ? 1 : 0, 1], r: 2000 },
  { id: 'friends3', icon: '\uD83D\uDC9E', name: 'Best Friends Forever', desc: 'Max friendship with 3 townsfolk', p: (s) => [Object.values(s.npc || {}).filter((n) => n.fr >= 15).length, 3], r: 800 },
  { id: 'friend1', icon: '\uD83E\uDD1D', name: 'Friendly Face', desc: 'Reach 3 hearts with someone', p: (s) => [Object.values(s.npc || {}).filter((n) => n.fr >= 9).length, 1], r: 100 },
  { id: 'hang5', icon: '\uD83C\uDF89', name: 'Social Butterfly', desc: 'Hang out with townsfolk 5 times', p: (s) => [s.stats.hangs, 5], r: 200 },
  { id: 'pet1', icon: '\uD83D\uDC3E', name: 'Pet Parent', desc: 'Have a pet', p: (s) => [s.pets.length, 1], r: 50 },
  { id: 'pet3', icon: '\uD83D\uDC15', name: 'Full House', desc: 'Have 3 pets', p: (s) => [s.pets.length, 3], r: 300 },
  { id: 'fam5', icon: '\u2764\uFE0F', name: 'The Whole Family', desc: 'Have Candy, Martina, Luna, Pi-rat & Snowie', p: (s) => [GL.FAMILY.filter((f) => s.pets.some((p) => p.fam === f.id)).length, 5], r: 600 },
  { id: 'tricks3', icon: '\uD83C\uDFAA', name: 'Show-Off Pet', desc: 'Teach your pets 3 tricks', p: (s) => [s.stats.tricks, 3], r: 200 },
  { id: 'furn10', icon: '\uD83D\uDECB\uFE0F', name: 'Interior Designer', desc: 'Have 10 pieces of furniture placed', p: (s) => [s.home.length, 10], r: 250 },
  { id: 'cook5', icon: '\uD83C\uDF5D', name: 'Home Cook', desc: 'Cook 5 meals at home', p: (s) => [s.stats.cooked, 5], r: 150 },
  { id: 'rich', icon: '\uD83D\uDCB0', name: 'Money Bags', desc: 'Earn $10,000 in total', p: (s) => [Math.floor(s.stats.earned), 10000], r: 500 },
  { id: 'explore', icon: '\uD83E\uDDED', name: 'Explorer', desc: 'Visit 10 different places in town', p: (s) => [Object.keys(s.visited).length, 10], r: 150 },
  { id: 'style', icon: '\uD83D\uDC57', name: 'Fashionista', desc: 'Buy 3 things at the boutique', p: (s) => [s.stats.clothes, 3], r: 150 },
  { id: 'online', icon: '\uD83C\uDF10', name: 'Neighbours', desc: 'Play online with a friend', p: (s) => [s.stats.online, 1], r: 150 },
  { id: 'gifts5', icon: '\uD83C\uDF81', name: 'Generous', desc: 'Give 5 gifts', p: (s) => [s.stats.gifts, 5], r: 150 },
  { id: 'streak7', icon: '\uD83D\uDCC5', name: 'Every Day!', desc: 'Get a 7-day login streak', p: (s) => [s.daily.best || 0, 7], r: 500 },
  { id: 'stars3', icon: '\uD83C\uDFC6', name: 'Perfect Shift', desc: 'Get 3 stars on a work shift', p: (s) => [s.stats.perfect, 1], r: 150 },
  { id: 'doc', icon: '\uD83E\uDE7A', name: 'Doctor\u2019s Orders', desc: 'Get patched up at the clinic or hospital', p: (s) => [(s.stats.healed || 0), 1], r: 75 },
  { id: 'strays5', icon: '\uD83D\uDC36', name: 'Rescue Ranger', desc: 'Bring 5 strays to the shelter', p: (s) => [(s.stats.strays || 0), 5], r: 250 },
  { id: 'vet1', icon: '\uD83E\uDDB4', name: 'Pet Doctor', desc: 'Take a pet to the Grokville Vet Clinic', p: (s) => [(s.stats.vet || 0), 1], r: 75 },
  { id: 'grump', icon: '\uD83D\uDE24', name: 'Melted His Heart', desc: 'Make Old Man Grumbleton smile', p: (s) => [s.npc && s.npc.grumble && s.npc.grumble.fr >= 15 ? 1 : 0, 1], r: 400 }
];
})();
