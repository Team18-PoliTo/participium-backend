export type AuthInfo = {
  sub: number;
  kind: "internal" | "citizen";
  roles?: string[];
  email?: string;
};
