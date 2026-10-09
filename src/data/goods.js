export const GOODS = {
  grain: { name: 'Grain', food: true, perResidentPerMonth: 0.25 },
};

export const FOOD_GOODS = Object.keys(GOODS).filter((k) => GOODS[k].food);
