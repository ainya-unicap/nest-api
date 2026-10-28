import { Module } from '@nestjs/common';

import { PasswordRecoveryController } from './password-recovery.controller';
import { PasswordRecoveryService } from '../../services/passwordrecovery.service';
import { MailService } from '../../services/mail.service';

@Module({
  controllers: [PasswordRecoveryController],
  providers: [PasswordRecoveryService, MailService],
})
export class PasswordRecoveryModule {}
