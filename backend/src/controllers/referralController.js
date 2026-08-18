// ================================================
// ÁGAPE — Controlador de Referidos
// ================================================
const referralService = require('../services/referralService');

exports.getMiCodigo = async (req, res, next) => {
  try {
    const data = await referralService.obtenerCodigoReferido(req.user.id);
    res.json({ success: true, ...data });
  } catch (e) { next(e); }
};

exports.getHistorial = async (req, res, next) => {
  try {
    const data = await referralService.getHistorialReferidos(req.user.id);
    res.json({ success: true, ...data });
  } catch (e) { next(e); }
};
