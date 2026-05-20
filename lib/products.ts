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
  { id: "ipm7",   model: "iPad Pro 13\" M4",  storage: "256GB / 512GB / 1TB / 2TB",   isNew: true, priceGood: 28000, priceFair: 23000, pricePoor: 16000 },
  { id: "ipm4",   model: "iPad Pro 11\" M4",  storage: "256GB / 512GB / 1TB / 2TB",   isNew: true, priceGood: 22000, priceFair: 18000, pricePoor: 12000 },
  { id: "iair6",  model: "iPad Air 13\" M2",  storage: "128GB / 256GB / 512GB / 1TB",              priceGood: 18000, priceFair: 14500, pricePoor: 9500  },
  { id: "iair5",  model: "iPad Air 11\" M2",  storage: "128GB / 256GB / 512GB / 1TB",              priceGood: 14000, priceFair: 11000, pricePoor: 7000  },
  { id: "ipad10", model: "iPad (10th Gen)",   storage: "64GB / 256GB",                             priceGood: 9000,  priceFair: 7000,  pricePoor: 4500  },
];

export const macbooks: Product[] = [
  { id: "mbpm4max", model: "MacBook Pro 16\" M4 Max", storage: "512GB / 1TB / 2TB", isNew: true, priceGood: 95000, priceFair: 82000, pricePoor: 62000 },
  { id: "mbpm4",    model: "MacBook Pro 14\" M4 Pro", storage: "512GB / 1TB",       isNew: true, priceGood: 72000, priceFair: 62000, pricePoor: 46000 },
  { id: "mba15",    model: "MacBook Air 15\" M3",     storage: "256GB / 512GB / 1TB",             priceGood: 42000, priceFair: 35000, pricePoor: 25000 },
  { id: "mba13",    model: "MacBook Air 13\" M3",     storage: "256GB / 512GB / 1TB",             priceGood: 35000, priceFair: 29000, pricePoor: 20000 },
  { id: "mbpm3",    model: "MacBook Pro 14\" M3",     storage: "512GB / 1TB",                     priceGood: 55000, priceFair: 46000, pricePoor: 33000 },
];

export const watches: Product[] = [
  { id: "aws10",  model: "Apple Watch Series 10",    storage: "32GB",  isNew: true, priceGood: 8500,  priceFair: 7000,  pricePoor: 4500  },
  { id: "awu3",   model: "Apple Watch Ultra 2",      storage: "64GB",               priceGood: 18000, priceFair: 15000, pricePoor: 10000 },
  { id: "aws9",   model: "Apple Watch Series 9",     storage: "32GB",               priceGood: 6500,  priceFair: 5200,  pricePoor: 3300  },
  { id: "awse2",  model: "Apple Watch SE (2nd Gen)", storage: "32GB",               priceGood: 4200,  priceFair: 3300,  pricePoor: 2000  },
];

export const allProducts: Product[] = [...iphones, ...ipads, ...macbooks, ...watches];

export const CATEGORIES = [
  { key: "iphone",  label: "iPhone",      products: iphones  },
  { key: "ipad",    label: "iPad",        products: ipads    },
  { key: "macbook", label: "MacBook",     products: macbooks },
  { key: "watch",   label: "Apple Watch", products: watches  },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];
