const UserStatus = require("../Usersmodel/UserStatus");

const startUserSession = async ({ sessionRef, userId, role, email }) => {
  return UserStatus.create({ sessionRef, userId, role, email });
};

const endUserSession = async (sessionRef, logoutReason) => {
  if (!sessionRef) return null;

  const allowedReasons = UserStatus.schema.path("logoutReason").enumValues;

  if (!allowedReasons.includes(logoutReason)) {
    throw new Error(`Invalid session logout reason: ${logoutReason}`);
  }

  const result = await UserStatus.collection.findOneAndUpdate(
    { sessionRef, logoutReason: "active" },
    [
      {
        $set: {
          logoutAt: "$$NOW",
          durationSeconds: {
            $max: [
              0,
              {
                $floor: {
                  $divide: [
                    { $subtract: ["$$NOW", "$loginAt"] },
                    1000
                  ]
                }
              }
            ]
          },
          logoutReason: { $literal: logoutReason },
          updatedAt: "$$NOW"
        }
      }
    ],
    { returnDocument: "after" }
  );

  return result;
};

module.exports = { startUserSession, endUserSession };