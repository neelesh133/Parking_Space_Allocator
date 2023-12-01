const User = require("../models/User");

exports.getUsersName = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
  try {
    const reqUser = await User.findById(req.userId);
    console.log(reqUser);
    //check if user making request is an admin
    if (reqUser.role !== "admin") {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    //get List of all user's firstName and lastName
    var users = await User.find(
      { role: "user" },
      { firstName: 1, lastName: 1 }
    );

    //send name concatenating both firstName and lastName
    users = users.map((user) => ({
      _id: user._id,
      name: user.firstName + " " + user.lastName,
    }));

    return res
      .status(200)
      .json({ msg: "Users List returned", usersName: users });
  } catch (err) {
    return res.status(500).json({ msg: "Something went wrong" });
  }
};
