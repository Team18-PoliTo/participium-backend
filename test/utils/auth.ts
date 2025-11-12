import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function generateCitizenToken(citizenId: number, email: string) {
  return jwt.sign(
    {
      sub: citizenId,
      kind: "citizen",
      email: email,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function generateInternalToken(
  userId: number,
  email: string,
  role?: string
) {
  return jwt.sign(
    {
      sub: userId,
      kind: "internal",
      email,
      role: role || "USER",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}
