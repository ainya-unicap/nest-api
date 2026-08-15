export interface UserSchema {
  name: string;
  email: string;
  password: string;
  role?: string;
  institutionId?: string;
}
