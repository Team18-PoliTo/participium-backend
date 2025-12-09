export type AuthInfo = {
  sub: number;
  kind: "internal" | "citizen";
  role?: string;
  email?: string;
};
