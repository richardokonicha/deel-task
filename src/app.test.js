const request = require("supertest");
const assert = require("assert");
const app = require("./app");

describe("GET /contracts/:id", () => {
  it("should return a contract by ID", async () => {
    const profileId = 1;
    const contractId = 1;

    const response = await request(app)
      .get(`/contracts/${contractId}`)
      .set("profile_id", profileId)
      .expect(200);

    // Add assertions to check the response
    assert.strictEqual(response.body.id, contractId);
    assert.strictEqual(response.body.Client.id, profileId);
  });
});

describe("GET /contracts", () => {
  it("should return a list of contracts", async () => {
    const profileId = 1;

    const response = await request(app)
      .get("/contracts")
      .set("profile_id", profileId)
      .expect(200);

    // Add assertions to check the response
    // For example:
    // assert.strictEqual(response.body.length, expectedContractCount);
  });
});

describe("GET /jobs/unpaid", () => {
  it("should return a list of unpaid jobs", async () => {
    const profileId = 1;

    const response = await request(app)
      .get("/jobs/unpaid")
      .set("profile_id", profileId)
      .expect(200);

    // Add assertions to check the response
    // For example:
    // assert.strictEqual(response.body.length, expectedUnpaidJobCount);
  });
});

// Add more test cases for other endpoints as needed

describe("POST /jobs/:job_id/pay", () => {
  it("should make a payment for a job", async () => {
    const profileId = 1;
    const jobId = 1; // Replace with the ID of the job you want to pay for

    const response = await request(app)
      .post(`/jobs/${jobId}/pay`)
      .set("profile_id", profileId)
      .expect(200);

    // Add assertions to check the response
    // For example:
    // assert.strictEqual(response.body.message, 'Payment successful');
  });
});

describe("POST /balances/deposit/:userId", () => {
  it("should deposit funds into a client account", async () => {
    const profileId = 1;
    const userId = 1; // Replace with the ID of the user you want to deposit for
    const depositAmount = 100; // Replace with the desired deposit amount

    const response = await request(app)
      .post(`/balances/deposit/${userId}`)
      .set("profile_id", profileId)
      .send({ amount: depositAmount })
      .expect(200);

    // Add assertions to check the response
    // For example:
    // assert.strictEqual(response.body.message, `Deposit of $${depositAmount} successful. New balance: $${newBalance}`);
  });
});

describe("GET /admin/best-profession", () => {
  it("should return the best profession", async () => {
    const start = "2023-11-01"; // Replace with the desired start date
    const end = "2023-11-30"; // Replace with the desired end date

    const response = await request(app)
      .get(`/admin/best-profession?start=${start}&end=${end}`)
      .expect(200);

    // Add assertions to check the response
    // For example:
    // assert.strictEqual(response.body.profession, 'Best Profession');
  });
});

describe("GET /admin/best-clients", () => {
  it("should return the best clients", async () => {
    const start = "2023-11-01"; // Replace with the desired start date
    const end = "2023-11-30"; // Replace with the desired end date

    const response = await request(app)
      .get(`/admin/best-clients?start=${start}&end=${end}`)
      .expect(200);

    // Add assertions to check the response
    // For example:
    // assert.strictEqual(response.body.length, expectedClientCount);
  });
});
