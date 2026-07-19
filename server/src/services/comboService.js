import Combo from "../models/Combo.js";

export const getComboPrice = async (comboIds = []) => {
  if (!comboIds.length) {
    return {
      combos: [],
      totalComboPrice: 0,
    };
  }

  const comboMap = {};

  comboIds.forEach((item) => {
    comboMap[item.combo] = item.quantity;
  });

  const combos = await Combo.find({
    _id: {
      $in: comboIds.map((i) => i.combo),
    },
    isActive: true,
  });

  if (combos.length !== comboIds.length) {
    throw new Error("Combo không hợp lệ");
  }

  let totalComboPrice = 0;

  const bookingCombos = combos.map((combo) => {
    const quantity = comboMap[combo._id.toString()] || 1;

    totalComboPrice += combo.price * quantity;

    return {
      combo: combo._id,
      quantity,
      price: combo.price,
    };
  });

  return {
    combos: bookingCombos,
    totalComboPrice,
  };
};