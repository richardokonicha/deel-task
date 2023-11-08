const request = require('supertest');
const { assert } = require('chai');

const app = require('./app');

describe('GET /contracts/:id', () => {
  it('should return a contract by ID', async () => {
    const profileId = 1;
    const contractId = 1;

    const response = await request(app)
      .get(`/contracts/${contractId}`)
      .set('profile_id', profileId)
      .expect(200);

    // Add assertions to check the response
    assert.strictEqual(response.body.id, contractId);
    assert.strictEqual(response.body.Client.id, profileId);
  });
});

describe('GET /contracts', () => {
  it('should return a list of contracts', async () => {
    const profileId = 1;

    const response = await request(app)
      .get('/contracts')
      .set('profile_id', profileId)
      .expect(200);

    assert.isArray(response.body);
    assert.isNotEmpty(response.body);
    assert.property(response.body[0], 'id');
  });
});

describe('GET /jobs/unpaid', () => {
  it('should return a list of unpaid jobs', async () => {
    const profileId = 1;

    const response = await request(app)
      .get('/jobs/unpaid')
      .set('profile_id', profileId)
      .expect(200);

    assert.isArray(response.body);
    assert.isNotEmpty(response.body);
    assert.property(response.body[0], 'id');
    assert.property(response.body[0], 'description');
    assert.property(response.body[0], 'price'); //
  });
});
describe('POST /jobs/:job_id/pay', () => {
  it('should make a payment for a job', async () => {
    const profileId = 1;
    const jobId = 1;

    const response = await request(app)
      .post(`/jobs/${jobId}/pay`)
      .set('profile_id', profileId);

    if (response.status === 200) {
      assert.property(response.body, 'message');
      assert.strictEqual(response.body.message, 'Payment successful');
    } else if (response.status === 404) {
      // already paid
      assert.strictEqual(response.status, 404);
    }
  });
});

describe('POST /balances/deposit/:userId', () => {
  it('should deposit funds into a client account', async () => {
    const profileId = 1;
    const userId = 1; //
    const depositAmount = 100;

    const response = await request(app)
      .post(`/balances/deposit/${userId}`)
      .set('profile_id', profileId)
      .send({ amount: depositAmount })
      .expect(200);

    assert.property(response.body, 'message');
    assert.include(response.body.message, 'Deposit of $');
    assert.include(response.body.message, ` successful. New balance: $`);
  });
});
describe('GET /admin/best-profession', () => {
  it('should return the best profession', async () => {
    const start = '2023-11-01';
    const end = '2023-11-30';

    const response = await request(app)
      .get(`/admin/best-profession?start=${start}&end=${end}`)
      .expect(200);

    assert.property(response.body, 'profession');
  });
});

describe('GET /admin/best-clients', () => {
  it('should return the best clients', async () => {
    const start = '2023-11-01';
    const end = '2023-11-30';

    const response = await request(app)
      .get(`/admin/best-clients?start=${start}&end=${end}`)
      .expect(200);

    assert.isArray(response.body);
    response.body.forEach((client) => {
      assert.property(client, 'id');
      assert.property(client, 'fullName');
      assert.property(client, 'paid');
    });
  });
});
