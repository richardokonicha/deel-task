const getProfile = async (req, res, next) => {
  const { Profile } = req.app.get("models");
  const profileId = req.get("profile_id"); // Assuming profile_id is provided in the request header

  try {
    if (!profileId) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Missing profile_id in header" });
    }

    const profile = await Profile.findOne({ where: { id: profileId } });

    if (!profile) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Invalid profile_id" });
    }

    req.profile = profile;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getProfile };
