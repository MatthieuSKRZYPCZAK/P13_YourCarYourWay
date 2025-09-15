export interface Me {
  authenticated: boolean;
  username: string;
  role: 'EMPLOYEE' | 'CLIENT' | 'GUEST';
}
