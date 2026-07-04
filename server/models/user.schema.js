import bcrypt from "bcryptjs";

const staticUser = {
  username: "SVLJ1983",
  passwordHash: bcrypt.hashSync("ANee12345", 10),
  role: "admin",
};

export default staticUser;