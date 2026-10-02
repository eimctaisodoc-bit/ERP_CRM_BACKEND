const UserStatus = require("../Usersmodel/UserStatus");

const startUserSession = async ({ sessionRef, userId, role, email }) => {
  return UserStatus.create({ sessionRef, userId, role, email });
};

const endUserSession = async (sessionRef, logoutReason) => {
  if (!sessionRef) return null;

  const session = await UserStatus.findOne({
    sessionRef,
    logoutReason: "active",
  });

  if (!session) return null;

  const logoutAt = new Date();
  session.logoutAt = logoutAt;
  session.durationSeconds = Math.max(
    0,
    Math.floor((logoutAt.getTime() - session.loginAt.getTime()) / 1000)
  );
  session.logoutReason = logoutReason;
  await session.save();

  return session;
};

module.exports = { startUserSession, endUserSession };