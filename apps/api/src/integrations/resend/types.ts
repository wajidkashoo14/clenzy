export interface EmailAdapter {
  sendPasswordResetEmail(email: string, resetLink: string): Promise<void>;
}
