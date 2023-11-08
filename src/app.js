const express = require("express");
const bodyParser = require("body-parser");
const swaggerUI = require("swagger-ui-express");
const { sequelize } = require("./model");
const { Op } = require("sequelize");
const { getProfile } = require("./middleware/getProfile");
const specification = require("./swagger.json");
const app = express();

app.use(bodyParser.json());
app.use("/docs", swaggerUI.serve, swaggerUI.setup(specification));

app.set("sequelize", sequelize);
app.set("models", sequelize.models);

app.get("/contracts/:id", getProfile, async (req, res) => {
  const { Contract, Profile } = req.app.get("models");
  const { id } = req.params;
  const { profile } = req;

  try {
    const contract = await Contract.findOne({
      where: { id },
      include: [
        { model: Profile, as: "Client" },
        { model: Profile, as: "Contractor" }
      ]
    });

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    if (
      contract.Client.id !== profile.id &&
      contract.Contractor.id !== profile.id
    ) {
      return res.status(403).json({
        error: "Unauthorized - Profile not associated with this contract"
      });
    }

    res.json(contract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/contracts", getProfile, async (req, res) => {
  const { Contract, Profile } = req.app.get("models");
  const { profile } = req;

  try {
    const contracts = await Contract.findAll({
      where: {
        [Op.or]: [{ ClientId: profile.id }, { ContractorId: profile.id }],
        status: {
          [Op.not]: "terminated"
        }
      },
      include: [
        { model: Profile, as: "Client" },
        { model: Profile, as: "Contractor" }
      ]
    });

    res.json(contracts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/jobs/unpaid", getProfile, async (req, res) => {
  const { Job, Profile, Contract } = req.app.get("models");
  const { profile } = req;

  try {
    const unpaidJobs = await Job.findAll({
      where: {
        paid: {
          [Op.or]: [false, null]
        }
      },
      include: [
        {
          model: Contract,
          where: {
            status: "in_progress",
            [Op.or]: [{ ClientId: profile.id }, { ContractorId: profile.id }]
          },
          include: [
            { model: Profile, as: "Client" },
            { model: Profile, as: "Contractor" }
          ]
        }
      ]
    });

    res.json(unpaidJobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/jobs/:job_id/pay", getProfile, async (req, res) => {
  const { Job, Profile, Contract } = req.app.get("models");
  const { profile } = req;
  const { job_id } = req.params;

  try {
    const job = await Job.findOne({
      where: {
        id: job_id,
        paid: {
          [Op.or]: [false, null]
        }
      },
      include: [
        { model: Contract, include: [{ model: Profile, as: "Contractor" }] }
      ]
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found or already paid" });
    }

    const client = await Profile.findOne({ where: { id: profile.id } });
    const contractor = job.Contract.Contractor;

    if (client.balance >= job.price) {
      const transaction = await sequelize.transaction();
      try {
        await client.update(
          { balance: client.balance - job.price },
          { transaction }
        );
        await contractor.update(
          { balance: contractor.balance + job.price },
          { transaction }
        );
        await job.update(
          { paid: true, paymentDate: new Date() },
          { transaction }
        );
        await transaction.commit();

        res.json({ message: "Payment successful" });
      } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      res.status(403).json({ error: "Insufficient balance" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/balances/deposit/:userId", getProfile, async (req, res) => {
  const { Job, Contract } = req.app.get("models");
  const { profile } = req;
  const { userId } = req.params;

  try {
    if (profile.type !== "client") {
      return res.status(403).json({ error: "Only clients can make deposits" });
    }

    if (profile.id !== Number(userId)) {
      return res.status(403).json({
        error: "Unauthorized - You can only deposit to your own account"
      });
    }

    const totalJobsToPay = await Job.sum("price", {
      where: {
        paid: {
          [Op.or]: [false, null]
        },
        "$Contract.ClientId$": profile.id
      },
      include: [{ model: Contract }]
    });

    const maxDepositAmount = totalJobsToPay * 0.25;

    if (maxDepositAmount <= 0) {
      return res.status(403).json({ error: "No pending jobs to pay for" });
    }

    const depositAmount = Math.min(maxDepositAmount, req.body.amount);

    const transaction = await sequelize.transaction();
    try {
      const updatedProfile = await profile.increment(
        { balance: depositAmount },
        { transaction }
      );
      await transaction.commit();

      res.json({
        message: `Deposit of $${depositAmount} successful. New balance: $${updatedProfile.balance}`
      });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/admin/best-profession", async (req, res) => {
  const { Profile, Job } = req.app.get("models");
  const { start, end } = req.query;

  try {
    const results = await sequelize.query(
      `SELECT "Profile"."profession",
                    SUM("Job"."price") AS "totalEarned"
             FROM "Profiles" AS "Profile"
             INNER JOIN "Contracts" AS "Contract" ON "Profile"."id" = "Contract"."ContractorId"
             INNER JOIN "Jobs" AS "Job" ON "Contract"."id" = "Job"."ContractId"
             WHERE "Job"."paid" = true AND "Job"."paymentDate" BETWEEN :start AND :end
             GROUP BY "Profile"."profession"
             ORDER BY "totalEarned" DESC
             LIMIT 1`,
      {
        replacements: { start, end },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.json({ message: "No data available for the specified time range" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/admin/best-clients", async (req, res) => {
  const { start, end, limit = 2 } = req.query;

  try {
    const results = await sequelize.query(
      `SELECT "Profile"."id",
                    "Profile"."firstName" || ' ' || "Profile"."lastName" AS "fullName",
                    SUM("Job"."price") AS "paid"
             FROM "Profiles" AS "Profile"
             INNER JOIN "Contracts" AS "Contract" ON "Profile"."id" = "Contract"."ClientId"
             INNER JOIN "Jobs" AS "Job" ON "Contract"."id" = "Job"."ContractId"
             WHERE "Job"."paid" = true AND "Job"."paymentDate" BETWEEN :start AND :end
             GROUP BY "Profile"."id", "fullName"
             ORDER BY "paid" DESC
             LIMIT :limit`,
      {
        replacements: { start, end, limit: Number(limit) },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = app;
