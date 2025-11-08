export type AuthInfo = {
    sub: number;
    kind: 'internal' | 'public';
    role?: string;
    email?: string;
};
