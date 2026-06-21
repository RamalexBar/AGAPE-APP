const router = require("express").Router();
const axios = require("axios");
const { body } = require("express-validator");
const { validate } = require("../middlewares/validate");
const { authenticateToken } = require("../middlewares/auth");

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";

router.post("/",
  authenticateToken,
  body("text").trim().notEmpty().withMessage("El texto a traducir es obligatorio."),
  body("target").trim().notEmpty().withMessage("El idioma destino es obligatorio."),
  body("source").optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { text, target, source } = req.body;
      const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Traducci\u00f3n no configurada en el servidor." });
      }

      const params = { q: text, target, key: apiKey };
      if (source) params.source = source;

      const respuesta = await axios.post(GOOGLE_TRANSLATE_URL, null, { params });
      const resultado = respuesta.data && respuesta.data.data && respuesta.data.data.translations && respuesta.data.data.translations[0];

      res.json({
        translatedText: (resultado && resultado.translatedText) || text,
        detectedSourceLanguage: (resultado && resultado.detectedSourceLanguage) || source || null,
      });
    } catch (e) {
      console.error("[Translator] Error:", (e.response && e.response.data) || e.message);
      next(e);
    }
  }
);

module.exports = router;
