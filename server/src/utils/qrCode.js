import QRCode from "qrcode";

export const generateQR = async (data) => {
  return await QRCode.toDataURL(JSON.stringify(data));
};

export const generatePlainQR = async (text) => {
  return await QRCode.toDataURL(text);
};