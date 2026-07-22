import ComboItem from "../models/ComboItem.js";

export const reserveComboStock = async (
  comboIds = []
) => {
  for (const item of comboIds) {
    const comboItems =
      await ComboItem.find({
        combo: item.combo,
      }).populate("inventoryItem");

    for (const comboItem of comboItems) {
      const inventory =
        comboItem.inventoryItem;

      const requiredQuantity =
        comboItem.quantity *
        item.quantity;

      const available =
        inventory.stockQuantity -
        inventory.reservedQuantity;

      if (available <= 0) {
  throw new Error(
    `${inventory.name} đã hết hàng`
  );
}

if (available < requiredQuantity) {
  throw new Error(
    `${inventory.name} chỉ còn ${available} ${inventory.unit}`
  );
}

      inventory.reservedQuantity +=
        requiredQuantity;

      await inventory.save();
    }
  }
};

export const deductReservedStock =
  async (comboIds = []) => {
    for (const item of comboIds) {
      const comboItems =
        await ComboItem.find({
          combo: item.combo,
        }).populate(
          "inventoryItem"
        );

      for (const comboItem of comboItems) {
        const inventory =
          comboItem.inventoryItem;

        const quantity =
          comboItem.quantity *
          item.quantity;

        inventory.reservedQuantity = Math.max(
  0,
  inventory.reservedQuantity - quantity
);

inventory.stockQuantity = Math.max(
  0,
  inventory.stockQuantity - quantity
);

        await inventory.save();
      }
    }
  };

export const releaseReservedStock = async (comboIds = []) => {
  for (const item of comboIds) {
    if (item.quantity <= 0) {
      throw new Error("Số lượng combo không hợp lệ");
    }

    const comboItems = await ComboItem.find({
      combo: item.combo,
    }).populate("inventoryItem");

    for (const comboItem of comboItems) {
      const inventory = comboItem.inventoryItem;

      if (!inventory || !inventory.isActive) {
        throw new Error(
          "Sản phẩm kho không tồn tại hoặc đã bị khóa"
        );
      }

      const quantity =
        comboItem.quantity * item.quantity;

      inventory.reservedQuantity = Math.max(
        0,
        inventory.reservedQuantity - quantity
      );

      await inventory.save();
    }
  }
};