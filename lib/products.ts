export interface Product {
  id: string;
  model: string;
  storage: string;
  isNew?: boolean;
  discontinued?: boolean;
  priceGood: number;
  priceFair: number;
  pricePoor: number;
}

export const iphones: Product[] = [
  { id: "i17pm",   model: "iPhone 17 Pro Max",  storage: "256GB / 512GB / 1TB",          isNew: true,  priceGood: 38000, priceFair: 34000, pricePoor: 26000 },
  { id: "i17p",    model: "iPhone 17 Pro",      storage: "256GB / 512GB / 1TB",          isNew: true,  priceGood: 32000, priceFair: 28000, pricePoor: 21000 },
  { id: "i17air",  model: "iPhone 17 Air",      storage: "128GB / 256GB / 512GB",        isNew: true,  priceGood: 28000, priceFair: 24000, pricePoor: 18000 },
  { id: "i17",     model: "iPhone 17",          storage: "128GB / 256GB / 512GB",        isNew: true,  priceGood: 26000, priceFair: 22000, pricePoor: 16000 },
  { id: "i17e",    model: "iPhone 17e",         storage: "128GB / 256GB",                isNew: true,  priceGood: 18000, priceFair: 15000, pricePoor: 10000 },
  { id: "i16pm",   model: "iPhone 16 Pro Max",  storage: "256GB / 512GB / 1TB",                        priceGood: 30000, priceFair: 26000, pricePoor: 19000 },
  { id: "i16p",    model: "iPhone 16 Pro",      storage: "256GB / 512GB / 1TB",                        priceGood: 25000, priceFair: 21000, pricePoor: 15000 },
  { id: "i16",     model: "iPhone 16",          storage: "128GB / 256GB / 512GB",                      priceGood: 20000, priceFair: 17000, pricePoor: 12000 },
  { id: "i16plus", model: "iPhone 16 Plus",     storage: "128GB / 256GB / 512GB",                      priceGood: 22000, priceFair: 18000, pricePoor: 13000 },
  { id: "i15pm",   model: "iPhone 15 Pro Max",  storage: "256GB / 512GB / 1TB",                        priceGood: 24000, priceFair: 20000, pricePoor: 14000 },
  { id: "i15p",    model: "iPhone 15 Pro",      storage: "128GB / 256GB / 512GB / 1TB",               priceGood: 19000, priceFair: 16000, pricePoor: 11000 },
  { id: "i15",     model: "iPhone 15",          storage: "128GB / 256GB / 512GB",                      priceGood: 15000, priceFair: 12500, pricePoor: 8500  },
  { id: "i15plus", model: "iPhone 15 Plus",     storage: "128GB / 256GB / 512GB",                      priceGood: 16500, priceFair: 13500, pricePoor: 9500  },
  { id: "i14pm",   model: "iPhone 14 Pro Max",  storage: "128GB / 256GB / 512GB / 1TB",               priceGood: 18000, priceFair: 14500, pricePoor: 9500  },
  { id: "i14p",    model: "iPhone 14 Pro",      storage: "128GB / 256GB / 512GB / 1TB",               priceGood: 14000, priceFair: 11000, pricePoor: 7000  },
  { id: "i14",     model: "iPhone 14",          storage: "128GB / 256GB / 512GB",                      priceGood: 11000, priceFair: 8500,  pricePoor: 5500  },
  { id: "i14plus", model: "iPhone 14 Plus",     storage: "128GB / 256GB / 512GB",                      priceGood: 12000, priceFair: 9500,  pricePoor: 6000  },
  { id: "i13pm",   model: "iPhone 13 Pro Max",  storage: "128GB / 256GB / 512GB / 1TB",               priceGood: 13500, priceFair: 10500, pricePoor: 6500  },
  { id: "i13p",    model: "iPhone 13 Pro",      storage: "128GB / 256GB / 512GB / 1TB",               priceGood: 10500, priceFair: 8000,  pricePoor: 5000  },
  { id: "i13",     model: "iPhone 13",          storage: "128GB / 256GB / 512GB",                      priceGood: 8500,  priceFair: 6500,  pricePoor: 4000  },
  { id: "i13mini", model: "iPhone 13 mini",     storage: "128GB / 256GB / 512GB",  discontinued: true, priceGood: 0,     priceFair: 0,     pricePoor: 0     },
  { id: "i12pm",   model: "iPhone 12 Pro Max",  storage: "128GB / 256GB / 512GB",                      priceGood: 9000,  priceFair: 7000,  pricePoor: 4200  },
  { id: "i12p",    model: "iPhone 12 Pro",      storage: "128GB / 256GB / 512GB",                      priceGood: 7500,  priceFair: 5800,  pricePoor: 3500  },
  { id: "i12",     model: "iPhone 12",          storage: "64GB / 128GB / 256GB",                       priceGood: 6000,  priceFair: 4500,  pricePoor: 2800  },
  { id: "i12mini", model: "iPhone 12 mini",     storage: "64GB / 128GB / 256GB",   discontinued: true, priceGood: 0,     priceFair: 0,     pricePoor: 0     },
  { id: "i11pm",   model: "iPhone 11 Pro Max",  storage: "64GB / 256GB / 512GB",                       priceGood: 7000,  priceFair: 5500,  pricePoor: 3200  },
  { id: "i11p",    model: "iPhone 11 Pro",      storage: "64GB / 256GB / 512GB",                       priceGood: 5800,  priceFair: 4300,  pricePoor: 2500  },
  { id: "i11",     model: "iPhone 11",          storage: "64GB / 128GB / 256GB",                       priceGood: 4800,  priceFair: 3500,  pricePoor: 2000  },
];

export const ipads: Product[] = [
  // iPad Gen
  { id: "ipad9w",     model: 'iPad Gen 9 (Wi-Fi)',                  storage: "64GB / 256GB",               priceGood: 2500,  priceFair: 2000,  pricePoor: 1400  },
  { id: "ipad9c",     model: 'iPad Gen 9 (Wi-Fi + Cellular)',       storage: "64GB / 256GB",               priceGood: 4500,  priceFair: 3600,  pricePoor: 2500  },
  { id: "ipad10w",    model: 'iPad Gen 10 (Wi-Fi)',                 storage: "64GB / 256GB",               priceGood: 5500,  priceFair: 4400,  pricePoor: 3000  },
  { id: "ipad10c",    model: 'iPad Gen 10 (Wi-Fi + Cellular)',      storage: "64GB / 256GB",               priceGood: 7500,  priceFair: 6000,  pricePoor: 4200  },
  { id: "ipad11w",    model: 'iPad Gen 11 A16 (Wi-Fi)',             storage: "128GB / 256GB",              isNew: true, priceGood: 7500,  priceFair: 6000,  pricePoor: 4200  },
  { id: "ipad11c",    model: 'iPad Gen 11 A16 (Wi-Fi + Cellular)',  storage: "128GB / 256GB",              isNew: true, priceGood: 9500,  priceFair: 7600,  pricePoor: 5300  },
  // iPad mini
  { id: "imini6w",    model: 'iPad mini 6 (Wi-Fi)',                 storage: "64GB / 256GB",               priceGood: 5000,  priceFair: 4000,  pricePoor: 2800  },
  { id: "imini6c",    model: 'iPad mini 6 (Wi-Fi + Cellular)',      storage: "64GB / 256GB",               priceGood: 7000,  priceFair: 5600,  pricePoor: 3900  },
  { id: "imini7w",    model: 'iPad mini 7 (Wi-Fi)',                 storage: "128GB / 256GB",              isNew: true, priceGood: 8500,  priceFair: 6800,  pricePoor: 4800  },
  { id: "imini7c",    model: 'iPad mini 7 (Wi-Fi + Cellular)',      storage: "128GB / 256GB",              isNew: true, priceGood: 10500, priceFair: 8400,  pricePoor: 5800  },
  // iPad Air
  { id: "iair5w",     model: 'iPad Air 5 (Wi-Fi)',                  storage: "64GB / 256GB",               priceGood: 6000,  priceFair: 4800,  pricePoor: 3300  },
  { id: "iair5c",     model: 'iPad Air 5 (Wi-Fi + Cellular)',       storage: "64GB / 256GB",               priceGood: 8000,  priceFair: 6400,  pricePoor: 4400  },
  { id: "iair611w",   model: 'iPad Air 6 11" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 9500,  priceFair: 7600,  pricePoor: 5300  },
  { id: "iair611c",   model: 'iPad Air 6 11" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 11500, priceFair: 9200,  pricePoor: 6400  },
  { id: "iair613w",   model: 'iPad Air 6 13" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 11500, priceFair: 9200,  pricePoor: 6400  },
  { id: "iair613c",   model: 'iPad Air 6 13" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 13500, priceFair: 10800, pricePoor: 7500  },
  { id: "iair711w",   model: 'iPad Air 7 11" (Wi-Fi)',              storage: "128GB / 256GB",              isNew: true, priceGood: 11500, priceFair: 9200,  pricePoor: 6400  },
  { id: "iair711c",   model: 'iPad Air 7 11" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              isNew: true, priceGood: 13500, priceFair: 10800, pricePoor: 7500  },
  { id: "iair713w",   model: 'iPad Air 7 13" (Wi-Fi)',              storage: "128GB / 256GB",              isNew: true, priceGood: 13500, priceFair: 10800, pricePoor: 7500  },
  { id: "iair713c",   model: 'iPad Air 7 13" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              isNew: true, priceGood: 15500, priceFair: 12400, pricePoor: 8600  },
  { id: "iair811w",   model: 'iPad Air 8 11" (Wi-Fi)',              storage: "128GB / 256GB",              isNew: true, priceGood: 15000, priceFair: 12000, pricePoor: 8400  },
  { id: "iair811c",   model: 'iPad Air 8 11" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              isNew: true, priceGood: 17000, priceFair: 13600, pricePoor: 9500  },
  { id: "iair813w",   model: 'iPad Air 8 13" (Wi-Fi)',              storage: "128GB / 256GB",              isNew: true, priceGood: 17500, priceFair: 14000, pricePoor: 9800  },
  { id: "iair813c",   model: 'iPad Air 8 13" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              isNew: true, priceGood: 19500, priceFair: 15600, pricePoor: 10900 },
  // iPad Pro 11"
  { id: "ipro11-20w", model: 'iPad Pro 11" (2020) (Wi-Fi)',         storage: "128GB / 256GB / 512GB",      priceGood: 8000,  priceFair: 6400,  pricePoor: 4400  },
  { id: "ipro11-20c", model: 'iPad Pro 11" (2020) (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB",   priceGood: 10000, priceFair: 8000,  pricePoor: 5500  },
  { id: "ipro11m1w",  model: 'iPad Pro 11" M1 (Wi-Fi)',             storage: "128GB / 256GB / 512GB",      priceGood: 10000, priceFair: 8000,  pricePoor: 5500  },
  { id: "ipro11m1c",  model: 'iPad Pro 11" M1 (Wi-Fi + Cellular)',  storage: "128GB / 256GB / 512GB",      priceGood: 12000, priceFair: 9600,  pricePoor: 6700  },
  { id: "ipro11m2w",  model: 'iPad Pro 11" M2 (Wi-Fi)',             storage: "128GB / 256GB / 512GB",      priceGood: 13000, priceFair: 10400, pricePoor: 7200  },
  { id: "ipro11m2c",  model: 'iPad Pro 11" M2 (Wi-Fi + Cellular)',  storage: "128GB / 256GB / 512GB",      priceGood: 15000, priceFair: 12000, pricePoor: 8400  },
  { id: "ipro11m4w",  model: 'iPad Pro 11" M4 (Wi-Fi)',             storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 20000, priceFair: 16000, pricePoor: 11200 },
  { id: "ipro11m4c",  model: 'iPad Pro 11" M4 (Wi-Fi + Cellular)',  storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 22000, priceFair: 17600, pricePoor: 12300 },
  { id: "ipro11m5w",  model: 'iPad Pro 11" M5 (Wi-Fi)',             storage: "256GB / 512GB",              isNew: true, priceGood: 23500, priceFair: 18800, pricePoor: 13200 },
  { id: "ipro11m5c",  model: 'iPad Pro 11" M5 (Wi-Fi + Cellular)',  storage: "256GB / 512GB",              isNew: true, priceGood: 25500, priceFair: 20400, pricePoor: 14300 },
  // iPad Pro 12.9" / 13"
  { id: "ipro12-20w", model: 'iPad Pro 12.9" (2020) (Wi-Fi)',       storage: "128GB / 256GB / 512GB",      priceGood: 9000,  priceFair: 7200,  pricePoor: 5000  },
  { id: "ipro12-20c", model: 'iPad Pro 12.9" (2020) (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB", priceGood: 11000, priceFair: 8800,  pricePoor: 6200  },
  { id: "ipro12m1w",  model: 'iPad Pro 12.9" M1 (Wi-Fi)',           storage: "128GB / 256GB / 512GB",      priceGood: 11500, priceFair: 9200,  pricePoor: 6400  },
  { id: "ipro12m1c",  model: 'iPad Pro 12.9" M1 (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB",     priceGood: 13500, priceFair: 10800, pricePoor: 7500  },
  { id: "ipro12m2w",  model: 'iPad Pro 12.9" M2 (Wi-Fi)',           storage: "128GB / 256GB / 512GB",      priceGood: 14500, priceFair: 11600, pricePoor: 8100  },
  { id: "ipro12m2c",  model: 'iPad Pro 12.9" M2 (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB",     priceGood: 16500, priceFair: 13200, pricePoor: 9200  },
  { id: "ipro13m4w",  model: 'iPad Pro 13" M4 (Wi-Fi)',             storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 22500, priceFair: 18000, pricePoor: 12600 },
  { id: "ipro13m4c",  model: 'iPad Pro 13" M4 (Wi-Fi + Cellular)',  storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 24500, priceFair: 19600, pricePoor: 13700 },
  { id: "ipro13m5w",  model: 'iPad Pro 13" M5 (Wi-Fi)',             storage: "256GB / 512GB",              isNew: true, priceGood: 25500, priceFair: 20400, pricePoor: 14300 },
  { id: "ipro13m5c",  model: 'iPad Pro 13" M5 (Wi-Fi + Cellular)',  storage: "256GB / 512GB",              isNew: true, priceGood: 27500, priceFair: 22000, pricePoor: 15400 },
];

export const macbooks: Product[] = [
  { id: "mbpm4max", model: "MacBook Pro 16\" M4 Max", storage: "512GB / 1TB / 2TB", isNew: true, priceGood: 95000, priceFair: 82000, pricePoor: 62000 },
  { id: "mbpm4",    model: "MacBook Pro 14\" M4 Pro", storage: "512GB / 1TB",       isNew: true, priceGood: 72000, priceFair: 62000, pricePoor: 46000 },
  { id: "mba15",    model: "MacBook Air 15\" M3",     storage: "256GB / 512GB / 1TB",             priceGood: 42000, priceFair: 35000, pricePoor: 25000 },
  { id: "mba13",    model: "MacBook Air 13\" M3",     storage: "256GB / 512GB / 1TB",             priceGood: 35000, priceFair: 29000, pricePoor: 20000 },
  { id: "mbpm3",    model: "MacBook Pro 14\" M3",     storage: "512GB / 1TB",                     priceGood: 55000, priceFair: 46000, pricePoor: 33000 },
];

export const watches: Product[] = [
  // Series 6 (40mm / 44mm)
  { id: "aws640g",  model: "Apple Watch Series 6 40mm (GPS)",          storage: "—", priceGood: 1000,  priceFair: 800,   pricePoor: 600   },
  { id: "aws644g",  model: "Apple Watch Series 6 44mm (GPS)",          storage: "—", priceGood: 1500,  priceFair: 1200,  pricePoor: 800   },
  { id: "aws640c",  model: "Apple Watch Series 6 40mm (GPS+Cellular)", storage: "—", priceGood: 1500,  priceFair: 1200,  pricePoor: 800   },
  { id: "aws644c",  model: "Apple Watch Series 6 44mm (GPS+Cellular)", storage: "—", priceGood: 2000,  priceFair: 1600,  pricePoor: 1100  },
  // Series 7 (41mm / 45mm)
  { id: "aws741g",  model: "Apple Watch Series 7 41mm (GPS)",          storage: "—", priceGood: 2000,  priceFair: 1600,  pricePoor: 1100  },
  { id: "aws745g",  model: "Apple Watch Series 7 45mm (GPS)",          storage: "—", priceGood: 2500,  priceFair: 2000,  pricePoor: 1400  },
  { id: "aws741c",  model: "Apple Watch Series 7 41mm (GPS+Cellular)", storage: "—", priceGood: 2500,  priceFair: 2000,  pricePoor: 1400  },
  { id: "aws745c",  model: "Apple Watch Series 7 45mm (GPS+Cellular)", storage: "—", priceGood: 3000,  priceFair: 2400,  pricePoor: 1700  },
  // Series 8 (41mm / 45mm)
  { id: "aws841g",  model: "Apple Watch Series 8 41mm (GPS)",          storage: "—", priceGood: 2500,  priceFair: 2000,  pricePoor: 1400  },
  { id: "aws845g",  model: "Apple Watch Series 8 45mm (GPS)",          storage: "—", priceGood: 3000,  priceFair: 2400,  pricePoor: 1700  },
  { id: "aws841c",  model: "Apple Watch Series 8 41mm (GPS+Cellular)", storage: "—", priceGood: 3000,  priceFair: 2400,  pricePoor: 1700  },
  { id: "aws845c",  model: "Apple Watch Series 8 45mm (GPS+Cellular)", storage: "—", priceGood: 3500,  priceFair: 2800,  pricePoor: 1900  },
  // Series 9 (41mm / 45mm)
  { id: "aws941g",  model: "Apple Watch Series 9 41mm (GPS)",          storage: "—", priceGood: 3000,  priceFair: 2400,  pricePoor: 1700  },
  { id: "aws945g",  model: "Apple Watch Series 9 45mm (GPS)",          storage: "—", priceGood: 3500,  priceFair: 2800,  pricePoor: 1900  },
  { id: "aws941c",  model: "Apple Watch Series 9 41mm (GPS+Cellular)", storage: "—", priceGood: 3500,  priceFair: 2800,  pricePoor: 1900  },
  { id: "aws945c",  model: "Apple Watch Series 9 45mm (GPS+Cellular)", storage: "—", priceGood: 4000,  priceFair: 3200,  pricePoor: 2200  },
  // Series 10 (42mm / 46mm)
  { id: "aws1042g", model: "Apple Watch Series 10 42mm (GPS)",          storage: "—", isNew: true, priceGood: 4000,  priceFair: 3200,  pricePoor: 2200  },
  { id: "aws1046g", model: "Apple Watch Series 10 46mm (GPS)",          storage: "—", isNew: true, priceGood: 4500,  priceFair: 3600,  pricePoor: 2500  },
  { id: "aws1042c", model: "Apple Watch Series 10 42mm (GPS+Cellular)", storage: "—", isNew: true, priceGood: 4500,  priceFair: 3600,  pricePoor: 2500  },
  { id: "aws1046c", model: "Apple Watch Series 10 46mm (GPS+Cellular)", storage: "—", isNew: true, priceGood: 5000,  priceFair: 4000,  pricePoor: 2800  },
  // Series 11 (42mm / 46mm)
  { id: "aws1142g", model: "Apple Watch Series 11 42mm (GPS)",          storage: "—", isNew: true, priceGood: 5500,  priceFair: 4400,  pricePoor: 3000  },
  { id: "aws1146g", model: "Apple Watch Series 11 46mm (GPS)",          storage: "—", isNew: true, priceGood: 6500,  priceFair: 5200,  pricePoor: 3600  },
  { id: "aws1142c", model: "Apple Watch Series 11 42mm (GPS+Cellular)", storage: "—", isNew: true, priceGood: 6500,  priceFair: 5200,  pricePoor: 3600  },
  { id: "aws1146c", model: "Apple Watch Series 11 46mm (GPS+Cellular)", storage: "—", isNew: true, priceGood: 7500,  priceFair: 6000,  pricePoor: 4100  },
  // SE Gen 1 (40mm / 44mm)
  { id: "awse140g", model: "Apple Watch SE (Gen 1) 40mm (GPS)",          storage: "—", priceGood: 1000,  priceFair: 800,   pricePoor: 600   },
  { id: "awse144g", model: "Apple Watch SE (Gen 1) 44mm (GPS)",          storage: "—", priceGood: 1500,  priceFair: 1200,  pricePoor: 800   },
  { id: "awse140c", model: "Apple Watch SE (Gen 1) 40mm (GPS+Cellular)", storage: "—", priceGood: 1500,  priceFair: 1200,  pricePoor: 800   },
  { id: "awse144c", model: "Apple Watch SE (Gen 1) 44mm (GPS+Cellular)", storage: "—", priceGood: 2000,  priceFair: 1600,  pricePoor: 1100  },
  // SE Gen 2 (40mm / 44mm)
  { id: "awse240g", model: "Apple Watch SE (Gen 2) 40mm (GPS)",          storage: "—", priceGood: 2000,  priceFair: 1600,  pricePoor: 1100  },
  { id: "awse244g", model: "Apple Watch SE (Gen 2) 44mm (GPS)",          storage: "—", priceGood: 2500,  priceFair: 2000,  pricePoor: 1400  },
  { id: "awse240c", model: "Apple Watch SE (Gen 2) 40mm (GPS+Cellular)", storage: "—", priceGood: 2500,  priceFair: 2000,  pricePoor: 1400  },
  { id: "awse244c", model: "Apple Watch SE (Gen 2) 44mm (GPS+Cellular)", storage: "—", priceGood: 3000,  priceFair: 2400,  pricePoor: 1700  },
  // SE Gen 3 (40mm / 44mm)
  { id: "awse340g", model: "Apple Watch SE (Gen 3) 40mm (GPS)",          storage: "—", isNew: true, priceGood: 3000,  priceFair: 2400,  pricePoor: 1700  },
  { id: "awse344g", model: "Apple Watch SE (Gen 3) 44mm (GPS)",          storage: "—", isNew: true, priceGood: 3500,  priceFair: 2800,  pricePoor: 1900  },
  { id: "awse340c", model: "Apple Watch SE (Gen 3) 40mm (GPS+Cellular)", storage: "—", isNew: true, priceGood: 4000,  priceFair: 3200,  pricePoor: 2200  },
  { id: "awse344c", model: "Apple Watch SE (Gen 3) 44mm (GPS+Cellular)", storage: "—", isNew: true, priceGood: 4500,  priceFair: 3600,  pricePoor: 2500  },
  // Ultra
  { id: "awu1",    model: "Apple Watch Ultra",   storage: "—", priceGood: 7000,  priceFair: 5600,  pricePoor: 3900  },
  { id: "awu2",    model: "Apple Watch Ultra 2", storage: "—", priceGood: 11000, priceFair: 8800,  pricePoor: 6000  },
  { id: "awu3",    model: "Apple Watch Ultra 3", storage: "—", isNew: true, priceGood: 20000, priceFair: 16000, pricePoor: 11000 },
];

export const allProducts: Product[] = [...iphones, ...ipads, ...macbooks, ...watches];

export const CATEGORIES = [
  { key: "iphone",  label: "iPhone",      products: iphones  },
  { key: "ipad",    label: "iPad",        products: ipads    },
  { key: "macbook", label: "MacBook",     products: macbooks },
  { key: "watch",   label: "Apple Watch", products: watches  },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];
