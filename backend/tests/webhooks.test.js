const request = require('supertest');
const crypto = require('crypto');

// Mockeamos nuestra propia capa de verificación (no la librería de Apple en sí) —
// es la costura correcta: probamos que webhooks.js/webhookService.js reaccionan
// bien a un verificador que aprueba o rechaza, sin depender de certificados reales.
jest.mock('../src/config/appleIapVerifier', () => ({
  getVerifier: jest.fn(),
}));

// google-auth-library sí se mockea directo: solo nos interesa controlar qué
// devuelve verifyIdToken, no reimplementar el chequeo de audience/firma real.
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
}));

const { getVerifier } = require('../src/config/appleIapVerifier');
const supabase = require('../src/config/supabase');

describe('Webhooks', () => {
  let app, server;
  let mockUpdate, mockEq;
  const nodeEnvOriginal = process.env.NODE_ENV;
  const audienceOriginal = process.env.GOOGLE_PUBSUB_AUDIENCE;

  beforeAll(() => {
    ({ app, server } = require('../src/index'));
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ update: mockUpdate });
    process.env.GOOGLE_PUBSUB_AUDIENCE = audienceOriginal;
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnvOriginal;
    process.env.GOOGLE_PUBSUB_AUDIENCE = audienceOriginal;
  });

  describe('POST /api/webhooks/apple', () => {
    it('responde 400 si falta signedPayload', async () => {
      const res = await request(app).post('/api/webhooks/apple').send({});
      expect(res.status).toBe(400);
    });

    it('responde 500 si la firma no es válida (payload forjado, sin certificados)', async () => {
      getVerifier.mockReturnValue({
        verifyAndDecodeNotification: jest.fn().mockRejectedValue(new Error('firma inválida')),
      });

      const res = await request(app).post('/api/webhooks/apple').send({ signedPayload: 'x.y.z' });

      expect(res.status).toBe(500);
    });

    it.each(['SUBSCRIBED', 'DID_RENEW'])('activa/renueva la suscripción en %s', async (notificationType) => {
      const expiresDate = Date.now() + 30 * 86400000;
      getVerifier.mockReturnValue({
        verifyAndDecodeNotification: jest.fn().mockResolvedValue({
          notificationType,
          data: { signedTransactionInfo: 'jws-firmado' },
        }),
        verifyAndDecodeTransaction: jest.fn().mockResolvedValue({
          originalTransactionId: 'orig-123',
          expiresDate,
        }),
      });

      const res = await request(app).post('/api/webhooks/apple').send({ signedPayload: 'x.y.z' });

      expect(res.status).toBe(200);
      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        is_active: true,
        expires_at: new Date(expiresDate).toISOString(),
      }));
      expect(mockEq).toHaveBeenCalledWith('transaction_id', 'orig-123');
    });

    it.each(['EXPIRED', 'DID_FAIL_TO_RENEW', 'REVOKE', 'REFUND'])('desactiva la suscripción en %s', async (notificationType) => {
      getVerifier.mockReturnValue({
        verifyAndDecodeNotification: jest.fn().mockResolvedValue({
          notificationType,
          data: { signedTransactionInfo: 'jws-firmado' },
        }),
        verifyAndDecodeTransaction: jest.fn().mockResolvedValue({ originalTransactionId: 'orig-456' }),
      });

      const res = await request(app).post('/api/webhooks/apple').send({ signedPayload: 'x.y.z' });

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
      expect(mockEq).toHaveBeenCalledWith('transaction_id', 'orig-456');
    });

    it('no toca la base de datos si la notificación no trae signedTransactionInfo', async () => {
      getVerifier.mockReturnValue({
        verifyAndDecodeNotification: jest.fn().mockResolvedValue({
          notificationType: 'TEST',
          data: {},
        }),
      });

      const res = await request(app).post('/api/webhooks/apple').send({ signedPayload: 'x.y.z' });

      expect(res.status).toBe(200);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/webhooks/google', () => {
    const buildBody = (notificationType, purchaseToken) => ({
      message: {
        data: Buffer.from(JSON.stringify({
          subscriptionNotification: { notificationType, purchaseToken, subscriptionId: 'sub-1' },
        })).toString('base64'),
      },
    });

    it('en no-producción omite la verificación de Pub/Sub y procesa el mensaje', async () => {
      const res = await request(app).post('/api/webhooks/google').send(buildBody(13, 'tok-abc'));

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
      expect(mockEq).toHaveBeenCalledWith('transaction_id', 'tok-abc');
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('en producción responde 401 si falta el header Authorization', async () => {
      process.env.NODE_ENV = 'production';

      const res = await request(app).post('/api/webhooks/google').send(buildBody(13, 'tok-abc'));

      expect(res.status).toBe(401);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('en producción responde 401 si el token no es válido', async () => {
      process.env.NODE_ENV = 'production';
      mockVerifyIdToken.mockRejectedValue(new Error('token inválido'));

      const res = await request(app).post('/api/webhooks/google')
        .set('Authorization', 'Bearer token-malo')
        .send(buildBody(13, 'tok-abc'));

      expect(res.status).toBe(401);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('en producción procesa el mensaje si el token es válido', async () => {
      process.env.NODE_ENV = 'production';
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'pubsub@gcp-sa-pubsub.iam.gserviceaccount.com' }),
      });

      const res = await request(app).post('/api/webhooks/google')
        .set('Authorization', 'Bearer token-bueno')
        .send(buildBody(3, 'tok-xyz'));

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
      expect(mockEq).toHaveBeenCalledWith('transaction_id', 'tok-xyz');
    });

    it('no desactiva nada si el notificationType no es de cancelación (ej. RENEWED)', async () => {
      const res = await request(app).post('/api/webhooks/google').send(buildBody(2, 'tok-renew'));

      expect(res.status).toBe(200);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/wompi/webhook', () => {
    const firmar = (body, secret) => {
      const bodyStr = JSON.stringify(body);
      return crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
    };

    it('responde 401 si la firma no coincide', async () => {
      const body = { event: 'transaction.updated', data: { transaction: { reference: 'ref-1', status: 'APPROVED' } } };

      const res = await request(app)
        .post('/api/wompi/webhook')
        .set('x-event-checksum', 'firma-invalida')
        .send(body);

      expect(res.status).toBe(401);
    });

    it('con firma válida, actualiza payment_references a APPROVED', async () => {
      const body = { event: 'transaction.updated', data: { transaction: { reference: 'ref-2', status: 'APPROVED' } } };
      const firma = firmar(body, process.env.WOMPI_EVENTOS);

      const res = await request(app)
        .post('/api/wompi/webhook')
        .set('x-event-checksum', firma)
        .send(body);

      expect(res.status).toBe(200);
      expect(supabase.from).toHaveBeenCalledWith('payment_references');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'APPROVED' });
      expect(mockEq).toHaveBeenCalledWith('referencia', 'ref-2');
    });

    it('con firma válida pero status distinto de APPROVED, no toca la base', async () => {
      const body = { event: 'transaction.updated', data: { transaction: { reference: 'ref-3', status: 'DECLINED' } } };
      const firma = firmar(body, process.env.WOMPI_EVENTOS);

      const res = await request(app)
        .post('/api/wompi/webhook')
        .set('x-event-checksum', firma)
        .send(body);

      expect(res.status).toBe(200);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
